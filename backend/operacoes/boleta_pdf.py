"""Geração de PDF para boletas individuais — Controll Capital."""
import os
from io import BytesIO

from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

# ── Cores (idênticas ao template visual) ──────────────────────────────────────
NAVY = HexColor("#242640")
DARK_GRAY = HexColor("#393536")
GOLD = HexColor("#c0a56a")
MEDIUM_GRAY = HexColor("#6b6b6b")
LIGHT_GRAY = HexColor("#f5f5f5")
TEXT_DARK = HexColor("#1a1a1a")
TEXT_MEDIUM = HexColor("#4a4a4a")
BORDER_LIGHT = HexColor("#d0d0d0")
FOOTER_COLOR = HexColor("#7a7a7a")
RED_INTERNAL = HexColor("#dc2626")

# ── Layout ────────────────────────────────────────────────────────────────────
WIDTH, HEIGHT = A4
ML = 25 * mm
MR = 25 * mm
CW = WIDTH - ML - MR
COL_VAL_X = ML + 55 * mm

DISCLAIMER = (
    "O preço das cotações das moedas oscilam em todo o momento e o cancelamento "
    "da operação pode gerar prejuízo financeiro. Ao autorizar o fechamento da "
    "operação, o cliente se declara ciente e concorda em manter a Controll Capital "
    "indene de todo e qualquer prejuízo que possa vir a sofrer advindos direta "
    "e/ou indiretamente pelo cancelamento total ou parcial da operação."
)

_LOGO_PATH = os.path.join(os.path.dirname(__file__), "static", "logo_clean.png")


# ── Formatadores ──────────────────────────────────────────────────────────────

def _fmt_brl(valor):
    return f"R$ {float(valor):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _fmt_num(valor, casas=6):
    return f"{float(valor):.{casas}f}".replace(".", ",")


def _fmt_data(data):
    return data.strftime("%d/%m/%Y") if data else ""


def _fmt_doc(cpf_cnpj):
    d = cpf_cnpj
    if len(d) == 11:
        return f"{d[:3]}.{d[3:6]}.{d[6:9]}-{d[9:]}"
    if len(d) == 14:
        return f"{d[:2]}.{d[2:5]}.{d[5:8]}/{d[8:12]}-{d[12:]}"
    return d


def _numero_boleta(op):
    return f"CC-{op.data.year}-{op.id:05d}"


# ── Funções de desenho (portadas do template) ─────────────────────────────────

def _draw_header(c, logo_path):
    """Banner escuro com logo centralizada. Fallback para texto se logo ausente."""
    banner_h = 48 * mm
    banner_y = HEIGHT - banner_h

    c.setFillColor(DARK_GRAY)
    c.rect(0, banner_y, WIDTH, banner_h, fill=1, stroke=0)

    if os.path.exists(logo_path):
        try:
            from PIL import Image as PILImage
            logo_img = PILImage.open(logo_path)
            lw, lh = logo_img.size
            aspect = lw / lh
            display_h = 36 * mm
            display_w = display_h * aspect
            logo_x = (WIDTH - display_w) / 2
            logo_y = banner_y + (banner_h - display_h) / 2
            c.drawImage(
                ImageReader(logo_img),
                logo_x, logo_y,
                width=display_w, height=display_h,
                preserveAspectRatio=True, mask="auto",
            )
        except Exception:
            _draw_header_text(c, banner_y, banner_h)
    else:
        _draw_header_text(c, banner_y, banner_h)

    return banner_y


def _draw_header_text(c, banner_y, banner_h):
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(WIDTH / 2, banner_y + banner_h / 2 - 4 * mm, "CONTROLL CAPITAL")


def _draw_subtitle(c, y):
    y -= 10 * mm
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 13)
    c.drawCentredString(WIDTH / 2, y, "Boleta de Câmbio")

    y -= 5 * mm
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.6)
    half = 30 * mm
    cx = WIDTH / 2
    c.line(cx - half, y, cx + half, y)
    return y


def _draw_subtitle_controle(c, y):
    """Subtítulo dourado para boleta de controle interno."""
    y -= 9 * mm
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 13)
    c.drawCentredString(WIDTH / 2, y, "Boleta de Câmbio — Controle Interno")

    y -= 5 * mm
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.6)
    half = 42 * mm
    cx = WIDTH / 2
    c.line(cx - half, y, cx + half, y)
    return y


def _draw_number_date(c, y, numero, data_str):
    y -= 7 * mm
    c.setFillColor(TEXT_MEDIUM)
    c.setFont("Helvetica", 8.5)
    c.drawRightString(WIDTH - MR, y + 3 * mm, f"N.º {numero}")
    c.drawRightString(WIDTH - MR, y - 1.5 * mm, f"Data: {data_str}")
    return y


def _draw_gold_rule(c, y):
    y -= 4 * mm
    c.setFillColor(GOLD)
    c.rect(ML, y, CW, 0.7, fill=1, stroke=0)
    return y


def _draw_section_title(c, y, title):
    y -= 5.5 * mm
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 10.5)
    c.drawString(ML, y, title)
    return y


def _draw_fields(c, y, fields):
    """
    fields: [(label, value)] ou [(label, value, highlight)]
    highlight=True: valor em NAVY negrito maior.
    """
    ROW_H = 8.5 * mm
    y -= 3 * mm

    for i, field in enumerate(fields):
        label, value = field[0], field[1]
        highlight = field[2] if len(field) > 2 else False
        row_y = y - i * ROW_H

        if i % 2 == 0:
            c.setFillColor(LIGHT_GRAY)
            c.rect(ML, row_y - 1.8 * mm, CW, ROW_H, fill=1, stroke=0)

        text_y = row_y + 1.2 * mm

        c.setFillColor(TEXT_MEDIUM)
        c.setFont("Helvetica", 9)
        c.drawString(ML + 4 * mm, text_y, label)

        if highlight:
            c.setFillColor(NAVY)
            c.setFont("Helvetica-Bold", 11.5)
        else:
            c.setFillColor(TEXT_DARK)
            c.setFont("Helvetica-Bold", 10)
        c.drawString(COL_VAL_X, text_y, str(value))

    return y - len(fields) * ROW_H


def _draw_vet_box(c, y, valor):
    y -= 5 * mm
    box_h = 15 * mm
    box_y = y - box_h
    c.setFillColor(NAVY)
    c.roundRect(ML, box_y, CW, box_h, 3, fill=1, stroke=0)

    center_y = box_y + box_h / 2

    label_baseline = center_y - 0.7 * 9 / 2 * (mm / 2.8346)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(ML + 6 * mm, label_baseline, "VALOR TOTAL DA OPERAÇÃO (VET)")

    value_baseline = center_y - 0.7 * 17 / 2 * (mm / 2.8346)
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 17)
    c.drawRightString(WIDTH - MR - 6 * mm, value_baseline, valor)

    return box_y


def _wrap_text(text, c, font, size, max_width):
    c.setFont(font, size)
    words = text.split()
    lines = []
    current = ""
    for word in words:
        test = f"{current} {word}".strip()
        if c.stringWidth(test, font, size) <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def _draw_justified_line(c, text, x, y, font, size, target_width):
    c.setFont(font, size)
    words = text.split()
    if len(words) <= 1:
        c.drawString(x, y, text)
        return
    total_text_w = sum(c.stringWidth(w, font, size) for w in words)
    total_gap = target_width - total_text_w
    gap = total_gap / (len(words) - 1)
    cx = x
    for word in words:
        c.drawString(cx, y, word)
        cx += c.stringWidth(word, font, size) + gap


def _draw_footer(c):
    foot_top = 52 * mm
    c.setStrokeColor(BORDER_LIGHT)
    c.setLineWidth(0.4)
    c.line(ML, foot_top, WIDTH - MR, foot_top)

    disc_font = "Helvetica-Oblique"
    disc_size = 7
    line_spacing = 2.8 * mm
    text_x = ML + 2 * mm
    text_width = CW - 4 * mm

    lines = _wrap_text(DISCLAIMER, c, disc_font, disc_size, text_width)

    y = foot_top - 5 * mm
    c.setFillColor(FOOTER_COLOR)
    for i, line in enumerate(lines):
        if i == len(lines) - 1:
            c.setFont(disc_font, disc_size)
            c.drawString(text_x, y, line)
        else:
            _draw_justified_line(c, line, text_x, y, disc_font, disc_size, text_width)
        y -= line_spacing

    y -= 3.2 * mm
    c.setFillColor(FOOTER_COLOR)
    c.setFont("Helvetica", 7)
    c.drawCentredString(
        WIDTH / 2, y,
        "Esta boleta é um documento informativo e não constitui contrato de câmbio.",
    )
    y -= 6 * mm
    c.drawCentredString(WIDTH / 2, y, "Controll Capital — CNPJ: 47.621.546/0001-23")


def _draw_gold_rule_i(c, y):
    """Linha dourada separadora compacta (espaço menor que na boleta cliente)."""
    y -= 3 * mm
    c.setFillColor(GOLD)
    c.rect(ML, y, CW, 0.7, fill=1, stroke=0)
    return y


def _draw_section_title_i(c, y, title):
    """Título de seção compacto para boleta interna."""
    y -= 4.5 * mm
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(ML, y, title)
    return y


def _draw_fields_i(c, y, fields):
    """
    Versão compacta de draw_fields para boleta interna (ROW_H 7.8 mm).
    fields: [(label, value)] ou [(label, value, highlight)]
    """
    ROW_H = 7.8 * mm
    y -= 2.5 * mm

    for i, field in enumerate(fields):
        label, value = field[0], field[1]
        highlight = field[2] if len(field) > 2 else False
        row_y = y - i * ROW_H

        if i % 2 == 0:
            c.setFillColor(LIGHT_GRAY)
            c.rect(ML, row_y - 1.5 * mm, CW, ROW_H, fill=1, stroke=0)

        text_y = row_y + 1.2 * mm

        c.setFillColor(TEXT_MEDIUM)
        c.setFont("Helvetica", 8.5)
        c.drawString(ML + 4 * mm, text_y, label)

        if highlight:
            c.setFillColor(NAVY)
            c.setFont("Helvetica-Bold", 10.5)
        else:
            c.setFillColor(TEXT_DARK)
            c.setFont("Helvetica-Bold", 9.5)
        c.drawString(COL_VAL_X, text_y, str(value))

    return y - len(fields) * ROW_H


def _draw_highlight_box(c, y, label, valor):
    """Tarja navy com label e valor dourado — usada para COMISSÃO LÍQUIDA."""
    y -= 3 * mm
    box_h = 14 * mm
    box_y = y - box_h
    c.setFillColor(NAVY)
    c.roundRect(ML, box_y, CW, box_h, 3, fill=1, stroke=0)

    center_y = box_y + box_h / 2

    label_baseline = center_y - 0.7 * 9 / 2 * (mm / 2.8346)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(ML + 6 * mm, label_baseline, label)

    value_baseline = center_y - 0.7 * 16 / 2 * (mm / 2.8346)
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 16)
    c.drawRightString(WIDTH - MR - 6 * mm, value_baseline, valor)

    return box_y


def _draw_footer_controle(c):
    """Rodapé simples para boleta de controle interno."""
    foot_top = 20 * mm
    c.setStrokeColor(BORDER_LIGHT)
    c.setLineWidth(0.4)
    c.line(ML, foot_top, WIDTH - MR, foot_top)

    y = foot_top - 5 * mm
    c.setFillColor(FOOTER_COLOR)
    c.setFont("Helvetica", 7)
    c.drawCentredString(
        WIDTH / 2, y,
        "Documento de controle interno — uso exclusivo da mesa de câmbio.",
    )
    y -= 6 * mm
    c.drawCentredString(WIDTH / 2, y, "Controll Capital — CNPJ: 47.621.546/0001-23")


# ── API pública ───────────────────────────────────────────────────────────────

def gerar_pdf_cliente(op) -> bytes:
    """PDF voltado ao cliente: sem dados internos (spread, comissão, spot)."""
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    c.setTitle("Boleta de Câmbio - Controll Capital")
    c.setAuthor("Controll Capital")

    numero = _numero_boleta(op)
    caminho_label = "Envio" if op.caminho == "SAIDA" else "Recebimento"
    tarifa = _fmt_brl(op.tarifa_nominal) if not op.isencao_tarifa else "Isenta"
    iof = _fmt_brl(op.iof_nominal) if not op.isencao_iof else "Isento"

    banner_y = _draw_header(c, _LOGO_PATH)
    y = _draw_subtitle(c, banner_y)
    y = _draw_number_date(c, y, numero, _fmt_data(op.data))

    # Dados do Cliente
    y = _draw_gold_rule(c, y - 2 * mm)
    y = _draw_section_title(c, y, "DADOS DO CLIENTE")
    y = _draw_fields(c, y, [
        ("CPF / CNPJ", _fmt_doc(op.cliente.cpf_cnpj)),
        ("Nome / Razão Social", op.cliente.nome),
    ])

    # Dados da Operação
    y = _draw_gold_rule(c, y)
    y = _draw_section_title(c, y, "DADOS DA OPERAÇÃO")
    y = _draw_fields(c, y, [
        ("Moeda Estrangeira", f"{op.moeda.codigo_iso} — {op.moeda.nome}"),
        ("Montante", _fmt_num(op.montante, 2)),
        ("Operação", caminho_label),
        ("Taxa Cliente", _fmt_num(op.taxa_cliente, 4)),
    ])

    # Custos e VET
    y = _draw_gold_rule(c, y)
    y = _draw_section_title(c, y, "CUSTOS E VALOR EFETIVO TOTAL")
    y = _draw_fields(c, y, [
        ("Tarifa", tarifa),
        ("IOF", iof),
        ("VET (Valor Efetivo Total)", _fmt_brl(op.vet), True),
    ])

    _draw_vet_box(c, y, _fmt_brl(op.vet))
    _draw_footer(c)

    c.save()
    return buf.getvalue()


def gerar_pdf_controle(op) -> bytes:
    """PDF de controle interno com spread, comissão, parceiro e operador."""
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    c.setTitle("Boleta de Câmbio - Controle Interno - Controll Capital")
    c.setAuthor("Controll Capital")

    numero = _numero_boleta(op)
    caminho_label = "Envio" if op.caminho == "SAIDA" else "Recebimento"
    tarifa = _fmt_brl(op.tarifa_nominal) if not op.isencao_tarifa else "Isenta"
    iof = _fmt_brl(op.iof_nominal) if not op.isencao_iof else "Isento"
    ptax = _fmt_num(op.ptax, 4) if op.ptax else "—"
    spread = f"{float(op.spread):.2f}%".replace(".", ",")
    indicacao = op.indicacao if op.indicacao else "—"
    operador = op.criado_por.get_full_name() or op.criado_por.username

    # ── Header ────────────────────────────────────────────────────────────────
    banner_y = _draw_header(c, _LOGO_PATH)
    y = _draw_subtitle_controle(c, banner_y)

    # N.º, data e operador (três linhas à direita)
    y -= 6 * mm
    c.setFillColor(TEXT_MEDIUM)
    c.setFont("Helvetica", 8.5)
    c.drawRightString(WIDTH - MR, y + 3 * mm, f"N.º {numero}")
    c.drawRightString(WIDTH - MR, y - 1.5 * mm, f"Data: {_fmt_data(op.data)}")
    c.drawRightString(WIDTH - MR, y - 6 * mm, f"Operador: {operador}")

    # ── Dados do Cliente ──────────────────────────────────────────────────────
    y = _draw_gold_rule_i(c, y - 4 * mm)
    y = _draw_section_title_i(c, y, "DADOS DO CLIENTE")
    y = _draw_fields_i(c, y, [
        ("CPF / CNPJ", _fmt_doc(op.cliente.cpf_cnpj)),
        ("Nome / Razão Social", op.cliente.nome),
    ])

    # ── Dados da Operação ─────────────────────────────────────────────────────
    y = _draw_gold_rule_i(c, y)
    y = _draw_section_title_i(c, y, "DADOS DA OPERAÇÃO")
    y = _draw_fields_i(c, y, [
        ("Moeda Estrangeira", f"{op.moeda.codigo_iso} — {op.moeda.nome}"),
        ("Montante", _fmt_num(op.montante, 2)),
        ("Operação", caminho_label),
        ("Modalidade", op.modalidade),
        ("Parceiro", op.parceiro.nome),
        ("Indicação", indicacao),
    ])

    # ── Taxas ─────────────────────────────────────────────────────────────────
    y = _draw_gold_rule_i(c, y)
    y = _draw_section_title_i(c, y, "TAXAS")
    y = _draw_fields_i(c, y, [
        ("Spot", _fmt_num(op.spot, 4)),
        ("Taxa Cliente", _fmt_num(op.taxa_cliente, 4)),
        ("PTAX D-1", ptax),
        ("Spread", spread, True),
    ])

    # ── Custos e VET ──────────────────────────────────────────────────────────
    y = _draw_gold_rule_i(c, y)
    y = _draw_section_title_i(c, y, "CUSTOS E VALOR EFETIVO TOTAL")
    y = _draw_fields_i(c, y, [
        ("Tarifa", tarifa),
        ("IOF", iof),
        ("VET (Valor Efetivo Total)", _fmt_brl(op.vet), True),
    ])

    # ── Receita ───────────────────────────────────────────────────────────────
    y = _draw_gold_rule_i(c, y)
    y = _draw_section_title_i(c, y, "RECEITA")
    y = _draw_fields_i(c, y, [
        ("Comissão Bruta", _fmt_brl(op.comissao_bruta)),
        ("Comissão Líquida", _fmt_brl(op.comissao_liquida), True),
    ])

    _draw_highlight_box(c, y, "COMISSÃO LÍQUIDA", _fmt_brl(op.comissao_liquida))
    _draw_footer_controle(c)

    c.save()
    return buf.getvalue()
