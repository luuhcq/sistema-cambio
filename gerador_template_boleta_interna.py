#!/usr/bin/env python3
"""
Template de Boleta de Câmbio — Controle Interno — Controll Capital
Mesma identidade visual da boleta do cliente, com campos adicionais
de controle: spot, spread, comissão, parceiro, modalidade, indicação, operador.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image

# ── Cores (idênticas ao template do cliente) ──────────────────────────
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
ML = 25 * mm
MR = 25 * mm
CW = WIDTH - ML - MR
COL_VAL_X = ML + 55 * mm

# ── Dados ilustrativos ───────────────────────────────────────────────
DADOS = {
    "data_operacao": "17/03/2026",
    "numero_boleta": "CC-2026-00147",
    "cpf_cnpj": "12.345.678/0001-90",
    "nome": "Empresa Exemplo Importações Ltda.",
    "moeda": "USD",
    "montante": "50.000,00",
    "caminho": "Envio",
    "modalidade": "Disponibilidade",
    "parceiro": "Travelex",
    "indicacao": "João Silva",
    "operador": "Maria Oliveira",
    "taxa_cliente": "5,7832",
    "spot": "5,7420",
    "ptax": "—",
    "tarifa": "R$ 86,25",
    "iof": "R$ 10.119,06",
    "vet": "R$ 299.279,06",
    "spread": "0,72%",
    "comissao_bruta": "R$ 1.241,50",
    "comissao_liquida": "R$ 1.179,43",
}


def draw_header(c, logo_path):
    banner_h = 48 * mm
    banner_y = HEIGHT - banner_h
    c.setFillColor(DARK_GRAY)
    c.rect(0, banner_y, WIDTH, banner_h, fill=1, stroke=0)

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


def draw_gold_rule(c, y):
    y -= 3 * mm
    c.setFillColor(GOLD)
    c.rect(ML, y, CW, 0.7, fill=1, stroke=0)
    return y


def draw_section_title(c, y, title):
    y -= 4.5 * mm
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(ML, y, title)
    return y


def draw_fields(c, y, fields):
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
        c.drawString(COL_VAL_X, text_y, value)

    return y - len(fields) * ROW_H


def draw_highlight_box(c, y, label, valor):
    """Tarja navy — centralização por cap height."""
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


def draw_footer(c):
    foot_top = 20 * mm

    c.setStrokeColor(BORDER_LIGHT)
    c.setLineWidth(0.4)
    c.line(ML, foot_top, WIDTH - MR, foot_top)

    y = foot_top - 5 * mm
    foot_font_size = 7
    c.setFillColor(FOOTER_COLOR)
    c.setFont("Helvetica", foot_font_size)
    c.drawCentredString(
        WIDTH / 2, y, "Documento de controle interno — uso exclusivo da mesa de câmbio."
    )
    y -= 6 * mm
    c.setFont("Helvetica", foot_font_size)
    c.drawCentredString(WIDTH / 2, y, "Controll Capital — CNPJ: 47.621.546/0001-23")


def generate_boleta_interna(output_path, logo_path, dados):
    c = canvas.Canvas(output_path, pagesize=A4)
    c.setTitle("Boleta de Câmbio - Controle Interno - Controll Capital")
    c.setAuthor("Controll Capital")

    # Header
    banner_y = draw_header(c, logo_path)
    y = draw_subtitle(c, banner_y)

    # Número, data e operador
    y -= 6 * mm
    c.setFillColor(TEXT_MEDIUM)
    c.setFont("Helvetica", 8.5)
    c.drawRightString(WIDTH - MR, y + 3 * mm, f"N.º {dados['numero_boleta']}")
    c.drawRightString(WIDTH - MR, y - 1.5 * mm, f"Data: {dados['data_operacao']}")
    c.drawRightString(WIDTH - MR, y - 6 * mm, f"Operador: {dados['operador']}")

    # ── Dados do Cliente ──────────────────────────────────────────────
    y = draw_gold_rule(c, y - 4 * mm)
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
            ("Modalidade", dados["modalidade"]),
            ("Parceiro", dados["parceiro"]),
            ("Indicação", dados["indicacao"]),
        ],
    )

    # ── Taxas ─────────────────────────────────────────────────────────
    y = draw_gold_rule(c, y)
    y = draw_section_title(c, y, "TAXAS")
    y = draw_fields(
        c,
        y,
        [
            ("Spot", dados["spot"]),
            ("Taxa Cliente", dados["taxa_cliente"]),
            ("PTAX D-1", dados["ptax"]),
            ("Spread", dados["spread"], True),
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

    # ── Receita ───────────────────────────────────────────────────────
    y = draw_gold_rule(c, y)
    y = draw_section_title(c, y, "RECEITA")
    y = draw_fields(
        c,
        y,
        [
            ("Comissão Bruta", dados["comissao_bruta"]),
            ("Comissão Líquida", dados["comissao_liquida"], True),
        ],
    )

    # Tarja Comissão Líquida
    y = draw_highlight_box(c, y, "COMISSÃO LÍQUIDA", dados["comissao_liquida"])

    # Footer
    draw_footer(c)

    c.save()
    print(f"PDF gerado: {output_path}")


if __name__ == "__main__":
    generate_boleta_interna(
        "Boleta_Controle_Interno.pdf",
        "logo_clean.png",
        DADOS,
    )
