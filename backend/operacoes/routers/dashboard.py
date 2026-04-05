from datetime import date, timedelta
from decimal import Decimal

from ninja import Router

from operacoes.auth import JWTAuth
from operacoes.models import Operacao

router = Router(tags=["Dashboard"], auth=JWTAuth())


def calcular_indicadores(operacoes):
    """Calcula indicadores a partir de um queryset de operações confirmadas."""
    if not operacoes.exists():
        return {
            "volume_operado": Decimal("0"),
            "receita_bruta": Decimal("0"),
            "receita_liquida": Decimal("0"),
            "total_boletas": 0,
            "ticket_medio": Decimal("0"),
            "receita_media_por_operacao": Decimal("0"),
            "spread_medio": Decimal("0"),
            "por_parceiro": [],
            "por_moeda": [],
            "por_modalidade": [],
            "top_clientes": [],
            "ranking_operacoes": [],
        }

    lista = list(operacoes.select_related("cliente", "moeda", "parceiro", "criado_por"))

    volume = sum(op.vet for op in lista)
    receita_bruta = sum(op.comissao_bruta for op in lista)
    receita_liquida = sum(op.comissao_liquida for op in lista)
    total = len(lista)
    ticket_medio = volume / total if total else Decimal("0")
    receita_media = receita_liquida / total if total else Decimal("0")

    # Spread médio ponderado pelo volume
    soma_spread_volume = sum(op.spread * op.vet for op in lista)
    spread_medio = soma_spread_volume / volume if volume else Decimal("0")

    # Por parceiro
    parceiros = {}
    for op in lista:
        nome = op.parceiro.nome
        if nome not in parceiros:
            parceiros[nome] = Decimal("0")
        parceiros[nome] += op.comissao_liquida
    por_parceiro = sorted(
        [{"parceiro": k, "receita": v} for k, v in parceiros.items()],
        key=lambda x: x["receita"],
        reverse=True,
    )

    # Por moeda
    moedas = {}
    for op in lista:
        codigo = op.moeda.codigo_iso
        if codigo not in moedas:
            moedas[codigo] = {"volume": Decimal("0"), "count": 0}
        moedas[codigo]["volume"] += op.vet
        moedas[codigo]["count"] += 1
    por_moeda = sorted(
        [{"moeda": k, "volume": v["volume"], "operacoes": v["count"]} for k, v in moedas.items()],
        key=lambda x: x["volume"],
        reverse=True,
    )

    # Por modalidade
    modalidades = {}
    for op in lista:
        mod = op.modalidade
        if mod not in modalidades:
            modalidades[mod] = {"volume": Decimal("0"), "count": 0}
        modalidades[mod]["volume"] += op.vet
        modalidades[mod]["count"] += 1
    por_modalidade = sorted(
        [
            {"modalidade": k, "volume": v["volume"], "operacoes": v["count"]}
            for k, v in modalidades.items()
        ],
        key=lambda x: x["volume"],
        reverse=True,
    )

    # Top clientes
    clientes = {}
    for op in lista:
        nome = op.cliente.nome
        if nome not in clientes:
            clientes[nome] = {"volume": Decimal("0"), "receita": Decimal("0")}
        clientes[nome]["volume"] += op.vet
        clientes[nome]["receita"] += op.comissao_liquida
    top_clientes = sorted(
        [
            {"cliente": k, "volume": v["volume"], "receita": v["receita"]}
            for k, v in clientes.items()
        ],
        key=lambda x: x["volume"],
        reverse=True,
    )[:10]

    # Ranking de operadores
    operadores = {}
    for op in lista:
        nome = op.criado_por.get_full_name() or op.criado_por.username
        if nome not in operadores:
            operadores[nome] = {
                "volume": Decimal("0"),
                "receita": Decimal("0"),
                "count": 0,
            }
        operadores[nome]["volume"] += op.vet
        operadores[nome]["receita"] += op.comissao_liquida
        operadores[nome]["count"] += 1
    ranking_operadores = sorted(
        [
            {
                "operador": k,
                "volume": v["volume"],
                "receita": v["receita"],
                "boletas": v["count"],
            }
            for k, v in operadores.items()
        ],
        key=lambda x: x["volume"],
        reverse=True,
    )

    return {
        "volume_operado": volume,
        "receita_bruta": receita_bruta,
        "receita_liquida": receita_liquida,
        "total_boletas": total,
        "ticket_medio": ticket_medio,
        "receita_media_por_operacao": receita_media,
        "spread_medio": spread_medio,
        "por_parceiro": por_parceiro,
        "por_moeda": por_moeda,
        "por_modalidade": por_modalidade,
        "top_clientes": top_clientes,
        "ranking_operadores": ranking_operadores,
    }


@router.get("/indicadores", response=dict)
def indicadores(
    request,
    periodo: str = "mensal",
    data_inicio: str = None,
    data_fim: str = None,
    escopo: str = "minhas",
):
    from operacoes.permissions import is_gestor

    hoje = date.today()

    if periodo == "custom" and data_inicio and data_fim:
        try:
            inicio = date.fromisoformat(data_inicio)
            fim = date.fromisoformat(data_fim)
            if inicio.year < 2000 or fim.year < 2000:
                inicio = hoje.replace(day=1)
                fim = hoje
        except (ValueError, Exception):
            inicio = hoje.replace(day=1)
            fim = hoje
    elif periodo == "diario":
        inicio = hoje
        fim = hoje
    elif periodo == "semanal":
        inicio = hoje - timedelta(days=hoje.weekday())
        fim = hoje
    elif periodo == "mensal":
        inicio = hoje.replace(day=1)
        fim = hoje
    elif periodo == "trimestral":
        mes_inicio = ((hoje.month - 1) // 3) * 3 + 1
        inicio = hoje.replace(month=mes_inicio, day=1)
        fim = hoje
    elif periodo == "ytd":
        inicio = hoje.replace(month=1, day=1)
        fim = hoje
    else:
        inicio = hoje.replace(day=1)
        fim = hoje

    operacoes = Operacao.objects.filter(
        status="CONFIRMADA",
        data__gte=inicio,
        data__lte=fim,
    )

    # Filtro por escopo
    if is_gestor(request.user):
        if escopo == "minhas":
            operacoes = operacoes.filter(criado_por=request.user)
        # escopo == 'geral' → não filtra
    else:
        operacoes = operacoes.filter(criado_por=request.user)

    return calcular_indicadores(operacoes)


@router.get("/pendencias", response=dict)
def pendencias(request):
    from operacoes.models import SolicitacaoEdicao
    from operacoes.permissions import is_gestor

    if is_gestor(request.user):
        pendentes_aprovacao = Operacao.objects.filter(status="PENDENTE").count()
        solicitacoes_pendentes = SolicitacaoEdicao.objects.filter(status="PENDENTE").count()
        rascunhos = Operacao.objects.filter(criado_por=request.user, status="RASCUNHO").count()

        return {
            "rascunhos_pendentes": rascunhos,
            "pendentes_aprovacao": pendentes_aprovacao,
            "solicitacoes_edicao_pendentes": solicitacoes_pendentes,
        }
    else:
        rascunhos = Operacao.objects.filter(criado_por=request.user, status="RASCUNHO").count()
        solicitacoes_respondidas = SolicitacaoEdicao.objects.filter(
            solicitado_por=request.user,
            status__in=["APROVADA", "REJEITADA"],
            visualizada_em__isnull=True,
        ).count()

        return {
            "rascunhos_pendentes": rascunhos,
            "solicitacoes_respondidas": solicitacoes_respondidas,
        }
