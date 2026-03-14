import csv
import io
from datetime import date, timedelta
from decimal import Decimal

from django.http import HttpResponse
from ninja import Router
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from operacoes.models import Operacao
from operacoes.auth import JWTAuth

router = Router(tags=["Relatórios"], auth=JWTAuth())


def _get_operacoes(tipo, data_ref=None):
    """Retorna operações confirmadas no período."""
    if not data_ref:
        data_ref = date.today()

    if tipo == "diario":
        qs = Operacao.objects.filter(status="CONFIRMADA", data=data_ref)
    elif tipo == "mensal":
        inicio = data_ref.replace(day=1)
        if data_ref.month == 12:
            fim = data_ref.replace(year=data_ref.year + 1, month=1, day=1) - timedelta(
                days=1
            )
        else:
            fim = data_ref.replace(month=data_ref.month + 1, day=1) - timedelta(days=1)
        qs = Operacao.objects.filter(
            status="CONFIRMADA", data__gte=inicio, data__lte=fim
        )
    else:
        qs = Operacao.objects.filter(status="CONFIRMADA")

    return qs.select_related("cliente", "moeda", "parceiro").order_by("data", "id")


def _montar_linhas(operacoes):
    """Converte operações em linhas tabulares."""
    linhas = []
    for op in operacoes:
        linhas.append(
            [
                str(op.id),
                str(op.data),
                op.cliente.nome,
                op.cliente.cpf_cnpj,
                op.moeda.codigo_iso,
                f"{op.montante:,.2f}",
                op.parceiro.nome,
                op.modalidade,
                op.caminho,
                f"{op.spot:.6f}",
                f"{op.taxa_cliente:.6f}",
                f"{op.ptax:.6f}" if op.ptax else "N/A",
                f"{(op.aliquota_iof * 100):.2f}%",
                f"{op.iof_nominal:,.2f}",
                f"{op.tarifa_nominal:,.2f}",
                f"{op.vet:,.2f}",
                f"{op.spread:.4f}%",
                f"{op.comissao_bruta:,.2f}",
                f"{op.comissao_liquida:,.2f}",
            ]
        )
    return linhas


HEADERS = [
    "#",
    "Data",
    "Cliente",
    "CPF/CNPJ",
    "Moeda",
    "Montante",
    "Parceiro",
    "Modalidade",
    "Caminho",
    "Spot",
    "Taxa Cliente",
    "PTAX",
    "IOF %",
    "IOF R$",
    "Tarifa R$",
    "VET R$",
    "Spread",
    "Comissão Bruta",
    "Comissão Líq.",
]


# --- CSV ---
@router.get("/csv/{tipo}")
def exportar_csv(request, tipo: str, ano: int = None, mes: int = None, dia: int = None):
    data_ref = None
    if ano and mes:
        dia = dia or 1
        data_ref = date(ano, mes, dia)

    operacoes = _get_operacoes(tipo, data_ref)
    linhas = _montar_linhas(operacoes)

    response = HttpResponse(content_type="text/csv; charset=utf-8")
    nome = f"fechamento_{tipo}_{data_ref or date.today()}.csv"
    response["Content-Disposition"] = f'attachment; filename="{nome}"'

    writer = csv.writer(response)
    writer.writerow(HEADERS)
    for linha in linhas:
        writer.writerow(linha)

    # Linha de totais
    if linhas:
        total_vet = sum(op.vet for op in operacoes)
        total_comissao_bruta = sum(op.comissao_bruta for op in operacoes)
        total_comissao_liq = sum(op.comissao_liquida for op in operacoes)
        writer.writerow([])
        writer.writerow(
            [
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "TOTAL",
                f"{total_vet:,.2f}",
                "",
                f"{total_comissao_bruta:,.2f}",
                f"{total_comissao_liq:,.2f}",
            ]
        )

    return response


# --- PDF ---
@router.get("/pdf/{tipo}")
def exportar_pdf(request, tipo: str, ano: int = None, mes: int = None, dia: int = None):
    data_ref = None
    if ano and mes:
        dia = dia or 1
        data_ref = date(ano, mes, dia)

    operacoes = _get_operacoes(tipo, data_ref)
    linhas = _montar_linhas(operacoes)

    response = HttpResponse(content_type="application/pdf")
    nome = f"fechamento_{tipo}_{data_ref or date.today()}.pdf"
    response["Content-Disposition"] = f'attachment; filename="{nome}"'

    doc = SimpleDocTemplate(
        response,
        pagesize=landscape(A4),
        leftMargin=10 * mm,
        rightMargin=10 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )

    styles = getSampleStyleSheet()
    elements = []

    # Título
    titulo_periodo = data_ref or date.today()
    if tipo == "diario":
        subtitulo = f"Fechamento Diário — {titulo_periodo}"
    else:
        subtitulo = f'Fechamento Mensal — {titulo_periodo.strftime("%m/%Y") if data_ref else date.today().strftime("%m/%Y")}'

    titulo_style = ParagraphStyle(
        "TituloRelatorio",
        parent=styles["Title"],
        fontSize=14,
        spaceAfter=5 * mm,
    )
    elements.append(Paragraph("Sistema de Câmbio", titulo_style))
    elements.append(Paragraph(subtitulo, styles["Heading3"]))
    elements.append(Spacer(1, 5 * mm))

    if not linhas:
        elements.append(
            Paragraph("Nenhuma operação confirmada no período.", styles["Normal"])
        )
    else:
        # Totais
        total_vet = sum(op.vet for op in operacoes)
        total_comissao_bruta = sum(op.comissao_bruta for op in operacoes)
        total_comissao_liq = sum(op.comissao_liquida for op in operacoes)

        resumo = (
            f"Total de operações: {len(linhas)} | "
            f"VET Total: R$ {total_vet:,.2f} | "
            f"Comissão Bruta: R$ {total_comissao_bruta:,.2f} | "
            f"Comissão Líquida: R$ {total_comissao_liq:,.2f}"
        )
        elements.append(Paragraph(resumo, styles["Normal"]))
        elements.append(Spacer(1, 5 * mm))

        # Tabela com colunas reduzidas pra caber no PDF
        headers_pdf = [
            "#",
            "Data",
            "Cliente",
            "Moeda",
            "Montante",
            "Parceiro",
            "Caminho",
            "Taxa Cl.",
            "VET R$",
            "Spread",
            "Com. Líq.",
        ]

        linhas_pdf = []
        for op in operacoes:
            linhas_pdf.append(
                [
                    str(op.id),
                    str(op.data),
                    op.cliente.nome[:20],
                    op.moeda.codigo_iso,
                    f"{op.montante:,.2f}",
                    op.parceiro.nome[:12],
                    op.caminho[:3],
                    f"{op.taxa_cliente:.4f}",
                    f"{op.vet:,.2f}",
                    f"{op.spread:.2f}%",
                    f"{op.comissao_liquida:,.2f}",
                ]
            )

        # Linha de total
        linhas_pdf.append(
            [
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                f"{total_vet:,.2f}",
                "",
                f"{total_comissao_liq:,.2f}",
            ]
        )

        data_table = [headers_pdf] + linhas_pdf

        col_widths = [25, 55, 95, 30, 60, 60, 30, 50, 65, 40, 60]

        table = Table(data_table, colWidths=col_widths, repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTSIZE", (0, 0), (-1, -1), 7),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("ALIGN", (2, 1), (2, -1), "LEFT"),
                    ("ALIGN", (5, 1), (5, -1), "LEFT"),
                    (
                        "ROWBACKGROUNDS",
                        (0, 1),
                        (-1, -2),
                        [colors.white, colors.HexColor("#f0f4f8")],
                    ),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
                    ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#e8edf2")),
                    ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                ]
            )
        )

        elements.append(table)

    doc.build(elements)
    return response
