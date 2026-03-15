from ninja import Router
from django.utils import timezone
from operacoes.models import Operacao, SolicitacaoEdicao
from operacoes.schemas import (
    SolicitacaoEdicaoIn,
    SolicitacaoEdicaoOut,
    SolicitacaoAprovarIn,
    SolicitacaoRejeitarIn,
)
from operacoes.auth import JWTAuth
from operacoes.permissions import is_gestor, pode_criar_boleta
from operacoes.hmac_utils import gerar_hmac

router = Router(tags=["Solicitações de Edição"], auth=JWTAuth())

# Campos editáveis da boleta
CAMPOS_EDITAVEIS = [
    "data",
    "cliente_id",
    "moeda_id",
    "montante",
    "parceiro_id",
    "modalidade",
    "caminho",
    "spot",
    "taxa_cliente",
    "ptax",
    "isencao_iof",
    "isencao_tarifa",
    "tarifa_negociada",
    "moeda_tarifa_negociada",
    "indicacao",
]


def snapshot_boleta(operacao):
    """Gera snapshot dos campos editáveis da boleta."""
    return {
        "data": str(operacao.data),
        "cliente_id": operacao.cliente_id,
        "cliente_nome": operacao.cliente.nome,
        "moeda_id": operacao.moeda_id,
        "moeda_codigo": operacao.moeda.codigo_iso,
        "montante": str(operacao.montante),
        "parceiro_id": operacao.parceiro_id,
        "parceiro_nome": operacao.parceiro.nome,
        "modalidade": operacao.modalidade,
        "caminho": operacao.caminho,
        "spot": str(operacao.spot),
        "taxa_cliente": str(operacao.taxa_cliente),
        "ptax": str(operacao.ptax) if operacao.ptax else None,
        "isencao_iof": operacao.isencao_iof,
        "isencao_tarifa": operacao.isencao_tarifa,
        "tarifa_negociada": (
            str(operacao.tarifa_negociada) if operacao.tarifa_negociada else None
        ),
        "moeda_tarifa_negociada": operacao.moeda_tarifa_negociada,
        "indicacao": operacao.indicacao,
    }


@router.get("/", response=list[SolicitacaoEdicaoOut])
def listar_solicitacoes(request):
    if is_gestor(request.user):
        return SolicitacaoEdicao.objects.select_related(
            "solicitado_por", "respondido_por"
        ).all()
    return SolicitacaoEdicao.objects.select_related(
        "solicitado_por", "respondido_por"
    ).filter(solicitado_por=request.user)


@router.post("/", response={201: SolicitacaoEdicaoOut, 400: dict, 403: dict, 404: dict})
def solicitar_edicao(request, payload: SolicitacaoEdicaoIn):
    if not pode_criar_boleta(request.user):
        return 403, {"detail": "Sem permissão."}

    operacao = (
        Operacao.objects.select_related("cliente", "moeda", "parceiro")
        .filter(id=payload.operacao_id)
        .first()
    )
    if not operacao:
        return 404, {"detail": "Operação não encontrada."}

    if operacao.status not in ("PENDENTE", "CONFIRMADA"):
        return 400, {
            "detail": "Só é possível solicitar edição de boletas PENDENTES ou CONFIRMADAS."
        }

    if not payload.justificativa or len(payload.justificativa.strip()) < 10:
        return 400, {"detail": "Justificativa deve ter no mínimo 10 caracteres."}

    pendente = SolicitacaoEdicao.objects.filter(
        operacao=operacao, status="PENDENTE"
    ).exists()
    if pendente:
        return 400, {"detail": "Já existe uma solicitação pendente para esta boleta."}

    # Valida que pelo menos um campo foi alterado
    originais = snapshot_boleta(operacao)
    alterados = {}
    for campo in payload.dados_propostos:
        if campo in originais:
            val_proposto = (
                str(payload.dados_propostos[campo])
                if payload.dados_propostos[campo] is not None
                else None
            )
            val_original = (
                str(originais[campo]) if originais[campo] is not None else None
            )
            if val_proposto != val_original:
                alterados[campo] = payload.dados_propostos[campo]

    if not alterados:
        return 400, {"detail": "Nenhuma alteração detectada nos dados propostos."}

    solicitacao = SolicitacaoEdicao.objects.create(
        operacao=operacao,
        solicitado_por=request.user,
        justificativa=payload.justificativa,
        dados_propostos=alterados,
        dados_originais=originais,
        status_original_boleta=operacao.status,
    )
    return 201, solicitacao


@router.post(
    "/{solicitacao_id}/aprovar",
    response={200: SolicitacaoEdicaoOut, 400: dict, 403: dict, 404: dict},
)
def aprovar_solicitacao(request, solicitacao_id: int, payload: SolicitacaoAprovarIn):
    if not is_gestor(request.user):
        return 403, {"detail": "Apenas gestores podem aprovar solicitações."}

    solicitacao = (
        SolicitacaoEdicao.objects.select_related(
            "solicitado_por",
            "respondido_por",
            "operacao",
            "operacao__cliente",
            "operacao__moeda",
            "operacao__parceiro",
        )
        .filter(id=solicitacao_id)
        .first()
    )
    if not solicitacao:
        return 404, {"detail": "Solicitação não encontrada."}

    if solicitacao.status != "PENDENTE":
        return 400, {"detail": "Solicitação já foi respondida."}

    if payload.acao not in ("confirmar", "manter_pendente"):
        return 400, {"detail": 'Ação inválida. Use "confirmar" ou "manter_pendente".'}

    operacao = solicitacao.operacao

    # Aplica as alterações na boleta
    from django.shortcuts import get_object_or_404
    from operacoes.models import Cliente, Moeda, Parceiro

    for campo, valor in solicitacao.dados_propostos.items():
        if campo == "cliente_id":
            operacao.cliente = get_object_or_404(Cliente, id=valor)
        elif campo == "moeda_id":
            operacao.moeda = get_object_or_404(Moeda, id=valor)
        elif campo == "parceiro_id":
            operacao.parceiro = get_object_or_404(Parceiro, id=valor)
        elif campo == "data":
            from datetime import date as date_cls

            operacao.data = date_cls.fromisoformat(valor)
        elif hasattr(operacao, campo):
            from decimal import Decimal

            field = operacao._meta.get_field(campo)
            if field.get_internal_type() == "DecimalField" and valor is not None:
                setattr(operacao, campo, Decimal(str(valor)))
            elif field.get_internal_type() == "BooleanField":
                setattr(operacao, campo, bool(valor))
            else:
                setattr(operacao, campo, valor)

    # Define status final
    if payload.acao == "confirmar":
        operacao.status = "CONFIRMADA"
        operacao.hash_integridade = gerar_hmac(operacao)
    else:
        operacao.status = "PENDENTE"
        operacao.hash_integridade = ""

    campos_alterados = ", ".join(solicitacao.dados_propostos.keys())
    razao = f"Edição aprovada por {request.user.get_full_name() or request.user.username}. Campos: {campos_alterados}"
    operacao._change_reason = razao[:100]
    operacao.save()

    # Atualiza solicitação
    solicitacao.status = "APROVADA"
    solicitacao.respondido_por = request.user
    solicitacao.respondido_em = timezone.now()
    solicitacao.save()

    return 200, solicitacao


@router.post(
    "/{solicitacao_id}/rejeitar",
    response={200: SolicitacaoEdicaoOut, 400: dict, 403: dict, 404: dict},
)
def rejeitar_solicitacao(request, solicitacao_id: int, payload: SolicitacaoRejeitarIn):
    if not is_gestor(request.user):
        return 403, {"detail": "Apenas gestores podem rejeitar solicitações."}

    solicitacao = (
        SolicitacaoEdicao.objects.select_related("solicitado_por", "respondido_por")
        .filter(id=solicitacao_id)
        .first()
    )
    if not solicitacao:
        return 404, {"detail": "Solicitação não encontrada."}

    if solicitacao.status != "PENDENTE":
        return 400, {"detail": "Solicitação já foi respondida."}

    if not payload.comentario or len(payload.comentario.strip()) < 5:
        return 400, {"detail": "Comentário deve ter no mínimo 5 caracteres."}

    solicitacao.status = "REJEITADA"
    solicitacao.respondido_por = request.user
    solicitacao.comentario_gestor = payload.comentario
    solicitacao.respondido_em = timezone.now()
    solicitacao.save()

    return 200, solicitacao
