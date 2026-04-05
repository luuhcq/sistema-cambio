from datetime import date, timedelta
from decimal import Decimal

import requests
from ninja import Router

from operacoes.auth import JWTAuth

router = Router(tags=["PTAX"], auth=JWTAuth())

# Cache simples em memória (por dia)
_cache_ptax = {}


def _buscar_ptax_bcb(data_referencia: date):
    """Busca PTAX Venda de Fechamento do USD na API do Banco Central."""

    # Tenta os últimos 10 dias úteis até achar
    for i in range(10):
        dt = data_referencia - timedelta(days=i)
        dt_str = dt.strftime("%m-%d-%Y")

        url = (
            f"https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/"
            f"CotacaoDolarDia(dataCotacao=@dataCotacao)?"
            f"@dataCotacao='{dt_str}'"
            f"&$format=json"
        )

        try:
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            dados = resp.json().get("value", [])

            if dados:
                # Pega a última cotação do dia (fechamento)
                cotacao = dados[-1]
                ptax_venda = Decimal(str(cotacao["cotacaoVenda"]))
                return {
                    "ptax": ptax_venda,
                    "data_cotacao": dt.isoformat(),
                }
        except Exception:
            continue

    return None


@router.get("/cotacao", response={200: dict, 503: dict})
def buscar_ptax(request):
    """Retorna a PTAX Venda de Fechamento do D-1."""
    hoje = date.today()

    # Verifica cache
    if hoje in _cache_ptax:
        return 200, _cache_ptax[hoje]

    # D-1: começa do dia anterior
    resultado = _buscar_ptax_bcb(hoje - timedelta(days=1))

    if resultado:
        _cache_ptax[hoje] = resultado
        return 200, resultado

    return 503, {"detail": "PTAX indisponível. Preencha manualmente."}
