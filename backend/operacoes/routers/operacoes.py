from ninja import Router
from django.shortcuts import get_object_or_404
from decimal import Decimal, ROUND_HALF_UP

from operacoes.models import (
    Operacao,
    Cliente,
    Moeda,
    Parceiro,
    LogExclusaoBoleta,
    IOFConfig,
    TarifaConfig,
    ComissaoConfig,
)
from operacoes.schemas import (
    OperacaoIn,
    OperacaoOut,
    CancelarIn,
    ExcluirIn,
    SimulacaoIn,
)
from operacoes.auth import JWTAuth
from operacoes.hmac_utils import gerar_hmac, verificar_hmac
from operacoes.permissions import (
    pode_criar_boleta,
    pode_editar_boleta,
    pode_submeter_boleta,
    pode_aprovar,
    pode_cancelar,
    pode_excluir,
    is_auditor,
    fora_horario_comercial,
)

router = Router(tags=["Operações"], auth=JWTAuth())


@router.post("/simular", response={200: dict, 400: dict})
def simular_operacao(request, payload: SimulacaoIn):
    try:
        cliente = get_object_or_404(Cliente, id=payload.cliente_id)
        moeda = get_object_or_404(Moeda, id=payload.moeda_id)
        parceiro = get_object_or_404(Parceiro, id=payload.parceiro_id)

        # --- IOF ---
        aliquota_iof = Decimal("0")
        if not payload.isencao_iof:
            iof = IOFConfig.objects.filter(
                modalidade=payload.modalidade, caminho=payload.caminho
            ).first()
            if not iof:
                iof = IOFConfig.objects.filter(
                    modalidade="Demais modalidades", caminho=payload.caminho
                ).first()
            if iof:
                aliquota_iof = iof.aliquota

        iof_nominal = (payload.montante * aliquota_iof * payload.taxa_cliente).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

        # --- Tarifa ---
        tarifa_nominal = Decimal("0")
        valor_tarifa = None
        moeda_tarifa = None

        if payload.tarifa_negociada:
            valor_tarifa = payload.tarifa_negociada
            moeda_tarifa = payload.moeda_tarifa_negociada or "BRL"
        elif not payload.isencao_tarifa:
            tipo = cliente.tipo
            config = (
                TarifaConfig.objects.filter(
                    parceiro=parceiro, tipo_pessoa=tipo, caminho=payload.caminho
                ).first()
                or TarifaConfig.objects.filter(
                    parceiro=parceiro, tipo_pessoa=tipo, caminho="AMBOS"
                ).first()
                or TarifaConfig.objects.filter(
                    parceiro=parceiro, tipo_pessoa="AMBOS", caminho=payload.caminho
                ).first()
                or TarifaConfig.objects.filter(
                    parceiro=parceiro, tipo_pessoa="AMBOS", caminho="AMBOS"
                ).first()
            )
            if config:
                valor_tarifa = config.valor
                moeda_tarifa = config.moeda_tarifa

        if valor_tarifa and moeda_tarifa:
            if moeda_tarifa == "BRL":
                tarifa_nominal = valor_tarifa
            elif moeda_tarifa == "USD":
                if moeda.codigo_iso == "USD":
                    tarifa_nominal = valor_tarifa * payload.taxa_cliente
                else:
                    tarifa_nominal = valor_tarifa * (payload.ptax or Decimal("0"))
            tarifa_nominal = tarifa_nominal.quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )

        # --- VET ---
        valor_base = (payload.montante * payload.taxa_cliente).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        if payload.caminho == "SAIDA":
            vet = valor_base + iof_nominal + tarifa_nominal
        else:
            vet = valor_base - iof_nominal - tarifa_nominal

        # --- Spread ---
        spread = Decimal("0")
        spread_com_sinal = Decimal("0")
        spread_negativo = False
        if payload.spot and payload.spot != Decimal("0"):
            spread = (
                abs((payload.taxa_cliente - payload.spot) / payload.spot)
                * Decimal("100")
            ).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
            sinal = ((payload.taxa_cliente - payload.spot) / payload.spot) * Decimal(
                "100"
            )
            if payload.caminho == "ENTRADA":
                sinal = -sinal
            spread_com_sinal = sinal.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
            if payload.caminho == "SAIDA":
                spread_negativo = payload.taxa_cliente < payload.spot
            else:
                spread_negativo = payload.taxa_cliente > payload.spot

        # --- Comissão ---
        comissao_bruta = Decimal("0")
        comissao_config = ComissaoConfig.objects.filter(parceiro=parceiro).first()
        if comissao_config and payload.spot:
            spread_dec = spread / Decimal("100")
            comissao_bruta = (
                payload.spot * spread_dec * payload.montante * comissao_config.fator
            ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        comissao_liquida = (comissao_bruta * Decimal("0.95")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

        return 200, {
            "aliquota_iof": str(aliquota_iof),
            "iof_nominal": str(iof_nominal),
            "tarifa_nominal": str(tarifa_nominal),
            "valor_base_brl": str(valor_base),
            "vet": str(vet),
            "spread": str(spread),
            "spread_com_sinal": str(spread_com_sinal),
            "comissao_bruta": str(comissao_bruta),
            "comissao_liquida": str(comissao_liquida),
            "spread_negativo": spread_negativo,
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


@router.post("/", response={201: OperacaoOut, 400: dict, 403: dict})
def criar_operacao(request, payload: OperacaoIn):

    if not pode_criar_boleta(request.user):
        return 403, {"detail": "Sem permissão para criar boletas."}

    try:
        cliente = get_object_or_404(Cliente, id=payload.cliente_id)
        moeda = get_object_or_404(Moeda, id=payload.moeda_id)
        parceiro = get_object_or_404(Parceiro, id=payload.parceiro_id)

        is_fora = fora_horario_comercial()

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
            registro_fora_horario=is_fora,
            comentario_fora_horario=(
                payload.comentario_fora_horario if is_fora else None
            ),
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

    if not pode_editar_boleta(request.user, operacao):
        return 403, {"detail": "Sem permissão para editar esta operação."}

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

    if not dentro_horario_comercial():
        return 400, {
            "detail": "Fora do horário comercial (Seg-Sex, 9h-18h BRT). Submissão bloqueada."
        }
    operacao = (
        Operacao.objects.select_related("cliente", "moeda", "parceiro")
        .filter(id=operacao_id)
        .first()
    )
    if not operacao:
        return 404, {"detail": "Operação não encontrada."}

    if operacao.status != "RASCUNHO":
        return 400, {"detail": "Apenas rascunhos podem ser submetidos."}

    if not pode_submeter_boleta(request.user, operacao):
        return 403, {"detail": "Sem permissão."}

    operacao.status = "PENDENTE"
    operacao.save()
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

    if not pode_aprovar(request.user):
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

    if not pode_cancelar(request.user):
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

    if not pode_excluir(request.user):
        return 403, {"detail": "Apenas gestores podem excluir operações."}

    if not payload.justificativa or len(payload.justificativa.strip()) < 10:
        return 400, {"detail": "Justificativa deve ter no mínimo 10 caracteres."}

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


@router.get("/{operacao_id}/verificar-integridade", response={200: dict, 404: dict})
def verificar_integridade(request, operacao_id: int):
    operacao = Operacao.objects.select_related("moeda").filter(id=operacao_id).first()
    if not operacao:
        return 404, {"detail": "Operação não encontrada."}

    if not operacao.hash_integridade:
        return 200, {
            "status": "sem_hash",
            "mensagem": "Boleta ainda não foi confirmada.",
        }

    integro = verificar_hmac(operacao)
    return 200, {
        "status": "integro" if integro else "adulterado",
        "mensagem": (
            "Hash válido. Nenhuma adulteração detectada."
            if integro
            else "⚠ ALERTA: Hash não confere. Possível adulteração dos dados."
        ),
        "hash_armazenado": operacao.hash_integridade,
        "hash_recalculado": gerar_hmac(operacao),
    }
