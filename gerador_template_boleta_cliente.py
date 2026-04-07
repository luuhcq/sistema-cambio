#!/usr/bin/env python3
"""
Template de Boleta de Câmbio — Controll Capital
Versão cliente — usado para envio externo.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image

# ── Cores ─────────────────────────────────────────────────────────────
NAVY = HexColor("#242640")
DARK_GRAY = HexColor("#393536")
GOLD = HexColor("#c0a56a")
MEDIUM_GRAY = HexColor("#6b6b6b")
LIGHT_GRAY = HexColor("#f5f5f5")
TEXT_DARK = HexColor("#1a1a1a")
TEXT_MEDIUM = HexColor("#4a4a4a")
BORDER_LIGHT = HexColor("#d0d0d0")
FOOTER_COLOR = HexColor("#7a7a7a")

# ── Página ────────────────────────────────────────────────────────────
WIDTH, HEIGHT = A4
ML = 25 * mm  # margin left
MR = 25 * mm  # margin right
CW = WIDTH - ML - MR  # content width
COL_VAL_X = ML + 55 * mm  # coluna dos valores

# ── Dados ilustrativos ───────────────────────────────────────────────
DADOS = {
    "data_operacao": "17/03/2026",
    "numero_boleta": "CC-2026-00147",
    "cpf_cnpj": "12.345.678/0001-90",
    "nome": "Empresa Exemplo Importações Ltda.",
    "moeda": "USD",
    "montante": "50.000,00",
    "caminho": "Envio",
    "taxa_cliente": "5,7832",
    "tarifa": "R$ 86,25",
    "iof": "R$ 10.119,06",
    "vet": "R$ 299.279,06",
}

DISCLAIMER = (
    "O preço das cotações das moedas oscilam em todo o momento e o cancelamento "
    "da operação pode gerar prejuízo financeiro. Ao autorizar o fechamento da "
    "operação, o cliente se declara ciente e concorda em manter a Controll Capital "
    "indene de todo e qualquer prejuízo que possa vir a sofrer advindos direta "
    "e/ou indiretamente pelo cancelamento total ou parcial da operação."
)


def draw_header(c, logo_path):
    """Banner com logo grande."""
    banner_h = 48 * mm
    banner_y = HEIGHT - banner_h

    # Fundo do banner — preenche toda a largura
    c.setFillColor(DARK_GRAY)
    c.rect(0, banner_y, WIDTH, banner_h, fill=1, stroke=0)

    # Logo grande centralizada (ocupa o banner inteiro)
    logo_img = Image.open(logo_path)
    lw, lh = logo_img.size
    aspect = lw / lh
    display_h = 48 * mm
    display_w = display_h * aspect
    logo_x = (WIDTH - display_w) / 2
    logo_y = banner_y + (banner_h - display_h) / 2
    c.drawImage(
        ImageReader(logo_img),
        logo_x,
        logo_y,
        width=display_w,
        height=display_h,
        preserveAspectRatio=True,
        mask="auto",
    )
    return banner_y


def draw_subtitle(c, y):
    """Subtítulo dourado."""
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


def draw_gold_rule(c, y):
    """Linha dourada separadora — espaçamento compacto."""
    y -= 4 * mm
    c.setFillColor(GOLD)
    c.rect(ML, y, CW, 0.7, fill=1, stroke=0)
    return y


def draw_section_title(c, y, title):
    """Título de seção logo abaixo da linha dourada."""
    y -= 5.5 * mm
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 10.5)
    c.drawString(ML, y, title)
    return y


def draw_fields(c, y, fields):
    """
    Linhas de campo com fundo zebrado.
    fields: [(label, value, is_highlight?), ...]
    """
    ROW_H = 8.5 * mm
    y -= 3 * mm

    for i, field in enumerate(fields):
        label, value = field[0], field[1]
        highlight = field[2] if len(field) > 2 else False
        row_y = y - i * ROW_H

        # Zebra
        if i % 2 == 0:
            c.setFillColor(LIGHT_GRAY)
            c.rect(ML, row_y - 1.8 * mm, CW, ROW_H, fill=1, stroke=0)

        # Texto centralizado verticalmente na row
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
        c.drawString(COL_VAL_X, text_y, value)

    return y - len(fields) * ROW_H


def draw_vet_box(c, y, valor):
    """Tarja navy com VET — centralização por cap height."""
    y -= 5 * mm
    box_h = 15 * mm
    box_y = y - box_h
    c.setFillColor(NAVY)
    c.roundRect(ML, box_y, CW, box_h, 3, fill=1, stroke=0)

    center_y = box_y + box_h / 2

    # Para texto sem descenders (maiúsculas e números),
    # o centro visual ≈ baseline + cap_height/2
    # Cap height ≈ 70% do font size em Helvetica

    # Label 9pt
    label_baseline = center_y - 0.7 * 9 / 2 * (mm / 2.8346)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(ML + 6 * mm, label_baseline, "VALOR TOTAL DA OPERAÇÃO (VET)")

    # Valor 17pt
    value_baseline = center_y - 0.7 * 17 / 2 * (mm / 2.8346)
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 17)
    c.drawRightString(WIDTH - MR - 6 * mm, value_baseline, valor)

    return box_y


def wrap_text(text, c, font, size, max_width):
    """Quebra texto em linhas que cabem em max_width."""
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


def draw_justified_line(c, text, x, y, font, size, target_width):
    """Desenha uma linha com espaçamento justificado."""
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


def draw_footer(c):
    """Rodapé com disclaimer legal justificado e crédito."""
    foot_top = 52 * mm

    # Linha separadora fina
    c.setStrokeColor(BORDER_LIGHT)
    c.setLineWidth(0.4)
    c.line(ML, foot_top, WIDTH - MR, foot_top)

    # Disclaimer legal em itálico justificado
    disc_font = "Helvetica-Oblique"
    disc_size = 7
    foot_font_size = 7
    line_spacing = 2.8 * mm
    text_x = ML + 2 * mm
    text_width = CW - 4 * mm

    lines = wrap_text(DISCLAIMER, c, disc_font, disc_size, text_width)

    y = foot_top - 5 * mm
    c.setFillColor(FOOTER_COLOR)
    for i, line in enumerate(lines):
        is_last = i == len(lines) - 1
        if is_last:
            # Última linha: alinhada à esquerda
            c.setFont(disc_font, disc_size)
            c.drawString(text_x, y, line)
        else:
            draw_justified_line(c, line, text_x, y, disc_font, disc_size, text_width)
        y -= line_spacing

    # Informativo + crédito
    y -= 3.2 * mm
    c.setFillColor(FOOTER_COLOR)
    c.setFont("Helvetica", foot_font_size)
    c.drawCentredString(
        WIDTH / 2,
        y,
        "Esta boleta é um documento informativo e não constitui contrato de câmbio.",
    )
    y -= 6 * mm
    c.setFont("Helvetica", foot_font_size)
    c.drawCentredString(WIDTH / 2, y, "Controll Capital — CNPJ: 47.621.546/0001-23")


def generate_boleta(output_path, logo_path, dados):
    c = canvas.Canvas(output_path, pagesize=A4)
    c.setTitle("Boleta de Câmbio - Controll Capital")
    c.setAuthor("Controll Capital")

    # Header
    banner_y = draw_header(c, logo_path)
    y = draw_subtitle(c, banner_y)

    # Número e data
    y -= 7 * mm
    c.setFillColor(TEXT_MEDIUM)
    c.setFont("Helvetica", 8.5)
    c.drawRightString(WIDTH - MR, y + 3 * mm, f"N.º {dados['numero_boleta']}")
    c.drawRightString(WIDTH - MR, y - 1.5 * mm, f"Data: {dados['data_operacao']}")

    # ── Dados do Cliente ──────────────────────────────────────────────
    y = draw_gold_rule(c, y - 2 * mm)
    y = draw_section_title(c, y, "DADOS DO CLIENTE")
    y = draw_fields(
        c,
        y,
        [
            ("CPF / CNPJ", dados["cpf_cnpj"]),
            ("Nome / Razão Social", dados["nome"]),
        ],
    )

    # ── Dados da Operação ─────────────────────────────────────────────
    y = draw_gold_rule(c, y)
    y = draw_section_title(c, y, "DADOS DA OPERAÇÃO")
    y = draw_fields(
        c,
        y,
        [
            ("Moeda Estrangeira", dados["moeda"]),
            ("Montante", dados["montante"]),
            ("Operação", dados["caminho"]),
            ("Taxa Cliente", dados["taxa_cliente"]),
        ],
    )

    # ── Custos e VET ──────────────────────────────────────────────────
    y = draw_gold_rule(c, y)
    y = draw_section_title(c, y, "CUSTOS E VALOR EFETIVO TOTAL")
    y = draw_fields(
        c,
        y,
        [
            ("Tarifa", dados["tarifa"]),
            ("IOF", dados["iof"]),
            ("VET (Valor Efetivo Total)", dados["vet"], True),
        ],
    )

    # Tarja VET destaque
    y = draw_vet_box(c, y, dados["vet"])

    # Footer
    draw_footer(c)

    c.save()
    print(f"PDF gerado: {output_path}")


if __name__ == "__main__":
    generate_boleta(
        "Boleta_Cambio_Template_v2.pdf",
        "logo_clean.png",
        DADOS,
    )
