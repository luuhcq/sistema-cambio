from django.http import HttpResponse
from ninja import Router

from operacoes.auth import JWTAuth
from operacoes.boleta_pdf import gerar_pdf_cliente, gerar_pdf_controle
from operacoes.models import Operacao
from operacoes.permissions import is_gestor

router = Router(tags=["Boletas PDF"], auth=JWTAuth())


def _get_confirmada(operacao_id: int):
    return Operacao.objects.select_related("cliente", "moeda", "parceiro").get(
        id=operacao_id, status="CONFIRMADA"
    )


@router.get("/{operacao_id}/cliente")
def download_pdf_cliente(request, operacao_id: int):
    try:
        op = _get_confirmada(operacao_id)
    except Operacao.DoesNotExist:
        return HttpResponse("Boleta não encontrada ou não confirmada.", status=404)

    pdf = gerar_pdf_cliente(op)
    response = HttpResponse(pdf, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="boleta_{op.id}_cliente.pdf"'
    return response


@router.get("/{operacao_id}/controle")
def download_pdf_controle(request, operacao_id: int):
    if not is_gestor(request.user):
        return HttpResponse("Acesso negado.", status=403)

    try:
        op = _get_confirmada(operacao_id)
    except Operacao.DoesNotExist:
        return HttpResponse("Boleta não encontrada ou não confirmada.", status=404)

    pdf = gerar_pdf_controle(op)
    response = HttpResponse(pdf, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="boleta_{op.id}_controle.pdf"'
    return response
