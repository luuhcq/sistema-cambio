from datetime import date as date_type
from decimal import ROUND_HALF_UP, Decimal

from django.contrib.auth import get_user_model
from django.http import HttpResponse
from ninja import Router

from operacoes.auth import JWTAuth
from operacoes.models import Cliente, IOFConfig, Moeda, Operacao, Parceiro
from operacoes.schemas import ClienteIn, ClienteMetricasOut, ClienteOut, MoedaOut, ParceiroOut

router = Router(tags=["Cadastros"], auth=JWTAuth())

CAMPO_LABELS = {
    "total_operacoes": "Total de Operações",
    "volume_total_brl": "Volume Total (BRL)",
    "taxa_media_ponderada": "Taxa Média Ponderada",
    "ticket_medio": "Ticket Médio (BRL)",
    "moedas_operadas": "Moedas Operadas",
    "primeira_operacao": "Primeira Operação",
    "ultima_operacao": "Última Operação",
    "spread_medio": "Spread Médio (%)",
    "comissao_total_liquida": "Comissão Total Líquida (BRL)",
    "por_parceiro": "Por Parceiro",
}


def _calcular_metricas(cliente, data_inicio=None, data_fim=None):
    qs = Operacao.objects.filter(
        cliente=cliente, status="CONFIRMADA"
    ).select_related("moeda", "parceiro")
    if data_inicio:
        qs = qs.filter(data__gte=data_inicio)
    if data_fim:
        qs = qs.filter(data__lte=data_fim)

    operacoes = list(qs)
    total = len(operacoes)

    if total == 0:
        return {
            "total_operacoes": 0,
            "volume_total_brl": Decimal("0"),
            "taxa_media_ponderada": None,
            "ticket_medio": None,
            "moedas_operadas": [],
            "primeira_operacao": None,
            "ultima_operacao": None,
            "spread_medio": None,
            "comissao_total_liquida": Decimal("0"),
            "por_parceiro": [],
        }

    soma_montante = sum(op.montante for op in operacoes)
    volume_total = sum(op.vet for op in operacoes)

    taxa_media = (
        (sum(op.taxa_cliente * op.montante for op in operacoes) / soma_montante).quantize(
            Decimal("0.000001"), rounding=ROUND_HALF_UP
        )
        if soma_montante
        else None
    )
    ticket_medio = (
        (volume_total / total).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if total
        else None
    )

    moedas_map: dict = {}
    for op in operacoes:
        cod = op.moeda.codigo_iso
        entry = moedas_map.setdefault(cod, {"total_operacoes": 0, "volume_brl": Decimal("0")})
        entry["total_operacoes"] += 1
        entry["volume_brl"] += op.vet
    moedas_operadas = [
        {
            "moeda": k,
            "total_operacoes": v["total_operacoes"],
            "volume_brl": v["volume_brl"].quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        }
        for k, v in moedas_map.items()
    ]

    datas = [op.data for op in operacoes]

    spread_medio = (
        (sum(op.spread * op.montante for op in operacoes) / soma_montante).quantize(
            Decimal("0.0001"), rounding=ROUND_HALF_UP
        )
        if soma_montante
        else None
    )

    comissao_total = sum(op.comissao_liquida for op in operacoes)

    parceiros_map: dict = {}
    for op in operacoes:
        nome = op.parceiro.nome
        entry = parceiros_map.setdefault(nome, {"total_operacoes": 0, "volume_brl": Decimal("0")})
        entry["total_operacoes"] += 1
        entry["volume_brl"] += op.vet
    por_parceiro = [
        {
            "parceiro": k,
            "total_operacoes": v["total_operacoes"],
            "volume_brl": v["volume_brl"].quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        }
        for k, v in parceiros_map.items()
    ]

    return {
        "total_operacoes": total,
        "volume_total_brl": volume_total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        "taxa_media_ponderada": taxa_media,
        "ticket_medio": ticket_medio,
        "moedas_operadas": moedas_operadas,
        "primeira_operacao": min(datas),
        "ultima_operacao": max(datas),
        "spread_medio": spread_medio,
        "comissao_total_liquida": comissao_total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        "por_parceiro": por_parceiro,
    }


def _valor_texto(campo, valor):
    if valor is None:
        return "—"
    if campo == "total_operacoes":
        return str(valor)
    if campo in ("volume_total_brl", "ticket_medio", "comissao_total_liquida"):
        return f"R$ {valor:,.2f}"
    if campo == "taxa_media_ponderada":
        return str(valor)
    if campo == "spread_medio":
        return f"{valor}%"
    if campo in ("primeira_operacao", "ultima_operacao"):
        return valor.strftime("%d/%m/%Y")
    if campo == "moedas_operadas":
        if not valor:
            return "—"
        return "; ".join(
            f"{m['moeda']}: {m['total_operacoes']} op. / R$ {m['volume_brl']:,.2f}"
            for m in valor
        )
    if campo == "por_parceiro":
        if not valor:
            return "—"
        return "; ".join(
            f"{p['parceiro']}: {p['total_operacoes']} op. / R$ {p['volume_brl']:,.2f}"
            for p in valor
        )
    return str(valor)


def _gerar_csv(cliente, metricas, campos):
    import csv
    import io

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([CAMPO_LABELS[c] for c in campos if c in CAMPO_LABELS])
    writer.writerow([_valor_texto(c, metricas.get(c)) for c in campos if c in CAMPO_LABELS])

    response = HttpResponse(output.getvalue(), content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = (
        f'attachment; filename="metricas_{cliente.cpf_cnpj}.csv"'
    )
    return response


def _gerar_pdf(cliente, metricas, campos):
    from io import BytesIO

    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    NAVY = colors.HexColor("#242640")
    GOLD = colors.HexColor("#c0a56a")

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
    )
    styles = getSampleStyleSheet()

    titulo_style = ParagraphStyle(
        "Titulo", parent=styles["Heading1"], textColor=NAVY, fontSize=18, spaceAfter=4
    )
    subtitulo_style = ParagraphStyle(
        "Subtitulo", parent=styles["Normal"], textColor=GOLD, fontSize=12, spaceAfter=16
    )
    header_cell_style = ParagraphStyle(
        "HeaderCell",
        parent=styles["Normal"],
        textColor=colors.white,
        fontSize=10,
        fontName="Helvetica-Bold",
    )
    label_cell_style = ParagraphStyle(
        "LabelCell",
        parent=styles["Normal"],
        textColor=NAVY,
        fontSize=10,
        fontName="Helvetica-Bold",
    )
    valor_cell_style = ParagraphStyle(
        "ValorCell", parent=styles["Normal"], fontSize=10
    )

    doc_num = cliente.cpf_cnpj
    if cliente.tipo == "PF":
        doc_fmt = f"{doc_num[:3]}.{doc_num[3:6]}.{doc_num[6:9]}-{doc_num[9:]}"
    else:
        doc_fmt = f"{doc_num[:2]}.{doc_num[2:5]}.{doc_num[5:8]}/{doc_num[8:12]}-{doc_num[12:]}"

    story = []
    story.append(Paragraph("Relatório de Métricas do Cliente", titulo_style))
    story.append(Paragraph(f"{cliente.nome}  |  {doc_fmt}", subtitulo_style))
    story.append(Spacer(1, 0.3 * cm))

    table_data = [
        [Paragraph("Campo", header_cell_style), Paragraph("Valor", header_cell_style)]
    ]
    for campo in campos:
        if campo not in CAMPO_LABELS:
            continue
        table_data.append([
            Paragraph(CAMPO_LABELS[campo], label_cell_style),
            Paragraph(_valor_texto(campo, metricas.get(campo)), valor_cell_style),
        ])

    page_width = A4[0] - 4 * cm
    table = Table(table_data, colWidths=[page_width * 0.4, page_width * 0.6], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f5f5")]),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e0e0e0")),
        ("LINEBELOW", (0, 0), (-1, 0), 2, GOLD),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(table)

    doc.build(story)
    buffer.seek(0)

    response = HttpResponse(buffer.read(), content_type="application/pdf")
    response["Content-Disposition"] = (
        f'attachment; filename="metricas_{cliente.cpf_cnpj}.pdf"'
    )
    return response


# --- Moedas ---
@router.get("/moedas", response=list[MoedaOut])
def listar_moedas(request):
    return Moeda.objects.filter(ativo=True)


# --- Parceiros ---
@router.get("/parceiros", response=list[ParceiroOut])
def listar_parceiros(request):
    return Parceiro.objects.filter(ativo=True)


# --- Clientes ---
@router.get("/clientes", response=list[ClienteOut])
def listar_clientes(request, q: str = ""):
    qs = Cliente.objects.filter(ativo=True)
    if q:
        qs = qs.filter(
            cpf_cnpj__startswith=q.replace(".", "").replace("-", "").replace("/", "")
        ) | qs.filter(nome__unaccent__icontains=q)
    return qs


# --- Modalidades ---
@router.get("/modalidades", response=list[dict])
def listar_modalidades(request):
    modalidades = IOFConfig.objects.values_list("modalidade", flat=True).distinct()
    return [{"nome": m} for m in modalidades if m != "Demais modalidades"]


@router.get("/clientes/{cpf_cnpj}", response={200: ClienteOut, 404: dict})
def buscar_cliente(request, cpf_cnpj: str):
    cliente = Cliente.objects.filter(cpf_cnpj=cpf_cnpj, ativo=True).first()
    if not cliente:
        return 404, {"detail": "Cliente não encontrado."}
    return 200, cliente


@router.post("/clientes", response={201: ClienteOut, 400: dict})
def criar_cliente(request, payload: ClienteIn):
    try:
        cliente = Cliente(cpf_cnpj=payload.cpf_cnpj, nome=payload.nome)
        cliente.save()
        return 201, cliente
    except Exception as e:
        return 400, {"detail": str(e)}


@router.get("/clientes/{cliente_id}/metricas", response={200: ClienteMetricasOut, 404: dict})
def metricas_cliente(
    request,
    cliente_id: int,
    data_inicio: date_type | None = None,
    data_fim: date_type | None = None,
):
    cliente = Cliente.objects.filter(id=cliente_id, ativo=True).first()
    if not cliente:
        return 404, {"detail": "Cliente não encontrado."}

    dados = _calcular_metricas(cliente, data_inicio, data_fim)
    return 200, ClienteMetricasOut(**dados)


@router.get("/clientes/{cliente_id}/relatorio")
def relatorio_cliente(
    request,
    cliente_id: int,
    formato: str = "pdf",
    campos: str = "",
    data_inicio: date_type | None = None,
    data_fim: date_type | None = None,
):
    from operacoes.permissions import is_gestor

    if not is_gestor(request.user):
        return HttpResponse(status=403)

    cliente = Cliente.objects.filter(id=cliente_id, ativo=True).first()
    if not cliente:
        return HttpResponse(status=404)

    metricas = _calcular_metricas(cliente, data_inicio, data_fim)
    campos_lista = [c.strip() for c in campos.split(",") if c.strip()] or list(CAMPO_LABELS.keys())

    if formato == "csv":
        return _gerar_csv(cliente, metricas, campos_lista)
    return _gerar_pdf(cliente, metricas, campos_lista)


@router.get("/operadores", response=list[dict])
def listar_operadores(request):
    from operacoes.permissions import is_gestor

    if not is_gestor(request.user):
        return []

    User = get_user_model()
    users = User.objects.filter(is_active=True).values("id", "username", "first_name", "last_name")
    return [
        {
            "id": u["id"],
            "nome": f"{u['first_name']} {u['last_name']}".strip() or u["username"],
        }
        for u in users
    ]
