from ninja import Router
from django.utils import timezone
from operacoes.models import Operacao, SolicitacaoEdicao
from operacoes.schemas import SolicitacaoEdicaoIn, SolicitacaoEdicaoOut
from operacoes.auth import JWTAuth
from operacoes.permissions import is_gestor, pode_criar_boleta

router = Router(tags=["Solicitações de Edição"], auth=JWTAuth())


@router.get("/", response=list[SolicitacaoEdicaoOut])
def listar_solicitacoes(request):
    """Gestores veem todas. Operadores veem só as próprias."""
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

    operacao = Operacao.objects.filter(id=payload.operacao_id).first()
    if not operacao:
        return 404, {"detail": "Operação não encontrada."}

    if operacao.status not in ("PENDENTE", "CONFIRMADA"):
        return 400, {
            "detail": "Só é possível solicitar edição de boletas PENDENTES ou CONFIRMADAS."
        }

    if not payload.justificativa or len(payload.justificativa.strip()) < 10:
        return 400, {"detail": "Justificativa deve ter no mínimo 10 caracteres."}

    # Verifica se já tem solicitação pendente
    pendente = SolicitacaoEdicao.objects.filter(
        operacao=operacao, status="PENDENTE"
    ).exists()
    if pendente:
        return 400, {"detail": "Já existe uma solicitação pendente para esta boleta."}

    solicitacao = SolicitacaoEdicao.objects.create(
        operacao=operacao,
        solicitado_por=request.user,
        justificativa=payload.justificativa,
    )
    return 201, solicitacao


@router.post(
    "/{solicitacao_id}/aprovar",
    response={200: SolicitacaoEdicaoOut, 400: dict, 403: dict, 404: dict},
)
def aprovar_solicitacao(request, solicitacao_id: int):
    if not is_gestor(request.user):
        return 403, {"detail": "Apenas gestores podem aprovar solicitações."}

    solicitacao = (
        SolicitacaoEdicao.objects.select_related(
            "solicitado_por", "respondido_por", "operacao"
        )
        .filter(id=solicitacao_id)
        .first()
    )
    if not solicitacao:
        return 404, {"detail": "Solicitação não encontrada."}

    if solicitacao.status != "PENDENTE":
        return 400, {"detail": "Solicitação já foi respondida."}

    solicitacao.status = "APROVADA"
    solicitacao.respondido_por = request.user
    solicitacao.respondido_em = timezone.now()
    solicitacao.save()

    # Volta a boleta pra RASCUNHO com registro de quem autorizou
    operacao = solicitacao.operacao
    operacao.status = "RASCUNHO"
    operacao.hash_integridade = ""
    operacao._change_reason = f"Edição autorizada por {request.user.get_full_name() or request.user.username}. Motivo: {solicitacao.justificativa}"
    operacao.save()

    return 200, solicitacao


@router.post(
    "/{solicitacao_id}/rejeitar",
    response={200: SolicitacaoEdicaoOut, 400: dict, 403: dict, 404: dict},
)
def rejeitar_solicitacao(request, solicitacao_id: int):
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

    solicitacao.status = "REJEITADA"
    solicitacao.respondido_por = request.user
    solicitacao.respondido_em = timezone.now()
    solicitacao.save()

    return 200, solicitacao
