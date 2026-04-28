from datetime import date, datetime
from decimal import Decimal

from ninja import Schema


# --- Auth ---
class LoginIn(Schema):
    username: str
    password: str


class TokenOut(Schema):
    access: str
    refresh: str


class UserOut(Schema):
    id: int
    username: str
    first_name: str
    last_name: str
    email: str
    is_staff: bool
    perfil: str = None

    @staticmethod
    def resolve_perfil(obj):
        from operacoes.permissions import get_perfil

        return get_perfil(obj)


# --- Moeda ---
class MoedaOut(Schema):
    id: int
    codigo_iso: str
    nome: str
    requer_ptax: bool


# --- Parceiro ---
class ParceiroOut(Schema):
    id: int
    nome: str


# --- Cliente ---
class ClienteOut(Schema):
    id: int
    cpf_cnpj: str
    nome: str
    tipo: str


class ClienteIn(Schema):
    cpf_cnpj: str
    nome: str


# --- Operação ---
class OperacaoIn(Schema):
    data: date
    cliente_id: int
    moeda_id: int
    montante: Decimal
    parceiro_id: int
    modalidade: str
    caminho: str
    isencao_iof: bool = False
    isencao_tarifa: bool = False
    tarifa_negociada: Decimal | None = None
    moeda_tarifa_negociada: str | None = None
    ptax: Decimal | None = None
    spot: Decimal
    taxa_cliente: Decimal
    indicacao: str | None = None
    comentario_fora_horario: str | None = None

    def validate_valores(self):
        erros = []
        if self.montante <= 0:
            erros.append("Montante deve ser maior que zero.")
        if self.spot <= 0:
            erros.append("Spot deve ser maior que zero.")
        if self.taxa_cliente <= 0:
            erros.append("Taxa cliente deve ser maior que zero.")
        if self.tarifa_negociada is not None and self.tarifa_negociada < 0:
            erros.append("Tarifa negociada não pode ser negativa.")
        if self.ptax is not None and self.ptax <= 0:
            erros.append("PTAX deve ser maior que zero.")
        return erros


class OperacaoOut(Schema):
    id: int
    data: date
    cliente: ClienteOut
    moeda: MoedaOut
    montante: Decimal
    parceiro: ParceiroOut
    modalidade: str
    caminho: str
    isencao_iof: bool
    isencao_tarifa: bool
    tarifa_negociada: Decimal | None
    moeda_tarifa_negociada: str | None
    ptax: Decimal | None
    spot: Decimal
    taxa_cliente: Decimal
    indicacao: str | None
    status: str
    hash_integridade: str
    registro_fora_horario: bool
    comentario_fora_horario: str | None = None

    # Campos calculados
    aliquota_iof: Decimal
    iof_nominal: Decimal
    tarifa_nominal: Decimal
    valor_base_brl: Decimal
    vet: Decimal
    spread: Decimal
    comissao_bruta: Decimal
    comissao_liquida: Decimal

    @staticmethod
    def resolve_aliquota_iof(obj):
        return obj.aliquota_iof

    @staticmethod
    def resolve_iof_nominal(obj):
        return obj.iof_nominal

    @staticmethod
    def resolve_tarifa_nominal(obj):
        return obj.tarifa_nominal

    @staticmethod
    def resolve_valor_base_brl(obj):
        return obj.valor_base_brl

    @staticmethod
    def resolve_vet(obj):
        return obj.vet

    @staticmethod
    def resolve_spread(obj):
        return obj.spread

    @staticmethod
    def resolve_comissao_bruta(obj):
        return obj.comissao_bruta

    @staticmethod
    def resolve_comissao_liquida(obj):
        return obj.comissao_liquida


# --- Transições de Status ---
class SubmeterIn(Schema):
    pass


class AprovarIn(Schema):
    pass


class CancelarIn(Schema):
    justificativa: str


class ExcluirIn(Schema):
    justificativa: str


# --- Configurações ---
class TarifaConfigOut(Schema):
    id: int
    parceiro: ParceiroOut
    tipo_pessoa: str
    caminho: str
    valor: Decimal
    moeda_tarifa: str


class ComissaoConfigOut(Schema):
    id: int
    parceiro: ParceiroOut
    fator: Decimal


class IOFConfigOut(Schema):
    id: int
    modalidade: str
    caminho: str
    aliquota: Decimal


class SimulacaoIn(Schema):
    cliente_id: int
    moeda_id: int
    montante: Decimal
    parceiro_id: int
    modalidade: str
    caminho: str
    isencao_iof: bool = False
    isencao_tarifa: bool = False
    tarifa_negociada: Decimal | None = None
    moeda_tarifa_negociada: str | None = None
    ptax: Decimal | None = None
    spot: Decimal
    taxa_cliente: Decimal

    def validate_valores(self):
        erros = []
        if self.montante <= 0:
            erros.append("Montante deve ser maior que zero.")
        if self.spot <= 0:
            erros.append("Spot deve ser maior que zero.")
        if self.taxa_cliente <= 0:
            erros.append("Taxa cliente deve ser maior que zero.")
        if self.tarifa_negociada is not None and self.tarifa_negociada < 0:
            erros.append("Tarifa negociada não pode ser negativa.")
        if self.ptax is not None and self.ptax <= 0:
            erros.append("PTAX deve ser maior que zero.")
        return erros


class SimulacaoOut(Schema):
    aliquota_iof: Decimal
    iof_nominal: Decimal
    tarifa_nominal: Decimal
    valor_base_brl: Decimal
    vet: Decimal
    spread: Decimal
    spread_com_sinal: Decimal
    comissao_bruta: Decimal
    comissao_liquida: Decimal
    spread_negativo: bool


# --- Métricas de Cliente ---
class MoedaMetricaOut(Schema):
    moeda: str
    total_operacoes: int
    volume_brl: Decimal
    taxa_media: Decimal | None


class ParceiroMetricaOut(Schema):
    parceiro: str
    total_operacoes: int
    volume_brl: Decimal


class ClienteMetricasOut(Schema):
    total_operacoes: int
    volume_total_brl: Decimal
    taxa_media_ponderada: Decimal | None
    ticket_medio: Decimal | None
    moedas_operadas: list[MoedaMetricaOut]
    primeira_operacao: date | None
    ultima_operacao: date | None
    spread_medio: Decimal | None
    comissao_total_liquida: Decimal
    por_parceiro: list[ParceiroMetricaOut]


# --- Solicitação de Edição ---
class SolicitacaoEdicaoIn(Schema):
    operacao_id: int
    justificativa: str
    dados_propostos: dict


class SolicitacaoAprovarIn(Schema):
    acao: str  # 'confirmar', 'manter_pendente'


class SolicitacaoRejeitarIn(Schema):
    comentario: str


class SolicitacaoEdicaoOut(Schema):
    id: int
    operacao_id: int
    solicitado_por: UserOut
    justificativa: str
    dados_propostos: dict
    dados_originais: dict
    status: str
    status_original_boleta: str
    respondido_por: UserOut | None = None
    comentario_gestor: str | None = None
    respondido_em: datetime | None = None
    criado_em: datetime
