from ninja import Schema
from datetime import date, datetime
from decimal import Decimal


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


# --- Solicitação de Edição ---
class SolicitacaoEdicaoIn(Schema):
    operacao_id: int
    justificativa: str


class SolicitacaoEdicaoOut(Schema):
    id: int
    operacao_id: int
    solicitado_por: UserOut
    justificativa: str
    status: str
    respondido_por: UserOut | None = None
    respondido_em: datetime | None = None
    criado_em: datetime
