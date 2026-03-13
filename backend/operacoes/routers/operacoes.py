from ninja import Router
from django.shortcuts import get_object_or_404
from operacoes.models import Operacao, Cliente, Moeda, Parceiro
from operacoes.schemas import OperacaoIn, OperacaoOut
from operacoes.auth import JWTAuth
from operacoes.models import Operacao, Cliente, Moeda, Parceiro, LogExclusaoBoleta
from operacoes.schemas import OperacaoIn, OperacaoOut, CancelarIn, ExcluirIn
from operacoes.hmac_utils import gerar_hmac
from decimal import Decimal
from operacoes.schemas import (
    OperacaoIn,
    OperacaoOut,
    CancelarIn,
    ExcluirIn,
    SimulacaoIn,
    SimulacaoOut,
)

router = Router(tags=["Operações"], auth=JWTAuth())


@router.post("/simular", response={200: dict, 400: dict})
def simular_operacao(request, payload: SimulacaoIn):
    try:
        cliente = get_object_or_404(Cliente, id=payload.cliente_id)
        moeda = get_object_or_404(Moeda, id=payload.moeda_id)
        parceiro = get_object_or_404(Parceiro, id=payload.parceiro_id)

        op = Operacao(
            cliente=cliente,
            moeda=moeda,
            montante=payload.montante,
            parceiro=parceiro,
            modalidade=payload.modalidade,
            caminho=payload.caminho,
            isencao_iof=payload.isencao_iof,
            isencao_tarifa=payload.isencao_tarifa,
            tarifa_negociada=payload.tarifa_negociada,
            moeda_tarifa_negociada=payload.moeda_tarifa_negociada,
            ptax=payload.ptax,
            spot=payload.spot,
            taxa_cliente=payload.taxa_cliente,
        )

        return 200, {
            "aliquota_iof": str(op.aliquota_iof),
            "iof_nominal": str(op.iof_nominal),
            "tarifa_nominal": str(op.tarifa_nominal),
            "valor_base_brl": str(op.valor_base_brl),
            "vet": str(op.vet),
            "spread": str(op.spread),
            "spread_com_sinal": str(op.spread_com_sinal),
            "comissao_bruta": str(op.comissao_bruta),
            "comissao_liquida": str(op.comissao_liquida),
            "spread_negativo": op.spread_negativo,
        }
    except Exception as e:
        return 400, {"detail": str(e)}


@router.get("/", response=list[OperacaoOut])
def listar_operacoes(request):
    return Operacao.objects.select_related("cliente", "moeda", "parceiro").all()


@router.get("/{operacao_id}", response={200: OperacaoOut, 404: dict})
def detalhar_operacao(request, operacao_id: int):
    operacao = (
        Operacao.objects.select_related("cliente", "moeda", "parceiro")
        .filter(id=operacao_id)
        .first()
    )
    if not operacao:
        return 404, {"detail": "Operação não encontrada."}
    return 200, operacao


@router.post("/", response={201: OperacaoOut, 400: dict})
def criar_operacao(request, payload: OperacaoIn):
    try:
        cliente = get_object_or_404(Cliente, id=payload.cliente_id)
        moeda = get_object_or_404(Moeda, id=payload.moeda_id)
        parceiro = get_object_or_404(Parceiro, id=payload.parceiro_id)

        operacao = Operacao(
            data=payload.data,
            cliente=cliente,
            moeda=moeda,
            montante=payload.montante,
            parceiro=parceiro,
            modalidade=payload.modalidade,
            caminho=payload.caminho,
            isencao_iof=payload.isencao_iof,
            isencao_tarifa=payload.isencao_tarifa,
            tarifa_negociada=payload.tarifa_negociada,
            moeda_tarifa_negociada=payload.moeda_tarifa_negociada,
            ptax=payload.ptax,
            spot=payload.spot,
            taxa_cliente=payload.taxa_cliente,
            indicacao=payload.indicacao,
            status="RASCUNHO",
            criado_por=request.user,
        )
        operacao.save()
        return 201, operacao
    except Exception as e:
        return 400, {"detail": str(e)}


@router.put(
    "/{operacao_id}", response={200: OperacaoOut, 400: dict, 403: dict, 404: dict}
)
def editar_operacao(request, operacao_id: int, payload: OperacaoIn):
    operacao = Operacao.objects.filter(id=operacao_id).first()
    if not operacao:
        return 404, {"detail": "Operação não encontrada."}

    # Operador só edita próprias boletas em RASCUNHO
    if not request.user.is_staff:
        if operacao.criado_por != request.user:
            return 403, {"detail": "Sem permissão para editar esta operação."}
        if operacao.status != "RASCUNHO":
            return 403, {"detail": "Operação não está em rascunho."}

    operacao.data = payload.data
    operacao.cliente = get_object_or_404(Cliente, id=payload.cliente_id)
    operacao.moeda = get_object_or_404(Moeda, id=payload.moeda_id)
    operacao.montante = payload.montante
    operacao.parceiro = get_object_or_404(Parceiro, id=payload.parceiro_id)
    operacao.modalidade = payload.modalidade
    operacao.caminho = payload.caminho
    operacao.isencao_iof = payload.isencao_iof
    operacao.isencao_tarifa = payload.isencao_tarifa
    operacao.tarifa_negociada = payload.tarifa_negociada
    operacao.moeda_tarifa_negociada = payload.moeda_tarifa_negociada
    operacao.ptax = payload.ptax
    operacao.spot = payload.spot
    operacao.taxa_cliente = payload.taxa_cliente
    operacao.indicacao = payload.indicacao
    operacao.save()
    return 200, operacao


@router.post(
    "/{operacao_id}/submeter",
    response={200: OperacaoOut, 400: dict, 403: dict, 404: dict},
)
def submeter_operacao(request, operacao_id: int):
    operacao = (
        Operacao.objects.select_related("cliente", "moeda", "parceiro")
        .filter(id=operacao_id)
        .first()
    )
    if not operacao:
        return 404, {"detail": "Operação não encontrada."}

    if operacao.status != "RASCUNHO":
        return 400, {"detail": "Apenas rascunhos podem ser submetidos."}

    if not request.user.is_staff and operacao.criado_por != request.user:
        return 403, {"detail": "Sem permissão."}

    operacao.status = "PENDENTE"
    operacao.save()

    spread_info = {}
    if operacao.spread_negativo:
        spread_info = {
            "aviso": "Spread negativo detectado. Boleta requer aprovação do Gestor."
        }

    return 200, operacao


@router.post(
    "/{operacao_id}/aprovar",
    response={200: OperacaoOut, 400: dict, 403: dict, 404: dict},
)
def aprovar_operacao(request, operacao_id: int):
    operacao = (
        Operacao.objects.select_related("cliente", "moeda", "parceiro")
        .filter(id=operacao_id)
        .first()
    )
    if not operacao:
        return 404, {"detail": "Operação não encontrada."}

    if not request.user.is_staff:
        return 403, {"detail": "Apenas gestores podem aprovar operações."}

    if operacao.status != "PENDENTE":
        return 400, {"detail": "Apenas operações pendentes podem ser aprovadas."}

    operacao.status = "CONFIRMADA"
    operacao.hash_integridade = gerar_hmac(operacao)
    operacao.save()
    return 200, operacao


@router.post(
    "/{operacao_id}/cancelar",
    response={200: OperacaoOut, 400: dict, 403: dict, 404: dict},
)
def cancelar_operacao(request, operacao_id: int, payload: CancelarIn):
    operacao = (
        Operacao.objects.select_related("cliente", "moeda", "parceiro")
        .filter(id=operacao_id)
        .first()
    )
    if not operacao:
        return 404, {"detail": "Operação não encontrada."}

    if not request.user.is_staff:
        return 403, {"detail": "Apenas gestores podem cancelar operações."}

    if operacao.status == "CANCELADA":
        return 400, {"detail": "Operação já está cancelada."}

    operacao.status = "CANCELADA"
    operacao.save()
    return 200, operacao


@router.delete("/{operacao_id}", response={200: dict, 400: dict, 403: dict, 404: dict})
def excluir_operacao(request, operacao_id: int, payload: ExcluirIn):
    operacao = (
        Operacao.objects.select_related("cliente", "moeda", "parceiro")
        .filter(id=operacao_id)
        .first()
    )
    if not operacao:
        return 404, {"detail": "Operação não encontrada."}

    if not request.user.is_staff:
        return 403, {"detail": "Apenas gestores podem excluir operações."}

    if not payload.justificativa or len(payload.justificativa.strip()) < 10:
        return 400, {"detail": "Justificativa deve ter no mínimo 10 caracteres."}

    # Snapshot completo antes de excluir
    snapshot = {
        "id": operacao.id,
        "data": str(operacao.data),
        "cliente": str(operacao.cliente),
        "moeda": str(operacao.moeda),
        "montante": str(operacao.montante),
        "parceiro": str(operacao.parceiro),
        "modalidade": operacao.modalidade,
        "caminho": operacao.caminho,
        "spot": str(operacao.spot),
        "taxa_cliente": str(operacao.taxa_cliente),
        "ptax": str(operacao.ptax) if operacao.ptax else None,
        "status": operacao.status,
        "vet": str(operacao.vet),
        "iof_nominal": str(operacao.iof_nominal),
        "tarifa_nominal": str(operacao.tarifa_nominal),
        "comissao_bruta": str(operacao.comissao_bruta),
        "comissao_liquida": str(operacao.comissao_liquida),
        "hash_integridade": operacao.hash_integridade,
    }

    LogExclusaoBoleta.objects.create(
        dados_boleta=snapshot,
        excluido_por=request.user,
        justificativa=payload.justificativa,
    )

    operacao.delete()
    return 200, {"detail": "Operação excluída. Log registrado permanentemente."}
