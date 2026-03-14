from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin
from .models import (
    Moeda,
    Cliente,
    Parceiro,
    TarifaConfig,
    ComissaoConfig,
    IOFConfig,
    Operacao,
    LogExclusaoBoleta,
    SolicitacaoEdicao,
)


@admin.register(Moeda)
class MoedaAdmin(admin.ModelAdmin):
    list_display = ["codigo_iso", "nome", "requer_ptax", "ativo"]
    list_filter = ["ativo", "requer_ptax"]
    search_fields = ["codigo_iso", "nome"]


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ["cpf_cnpj", "nome", "tipo", "ativo"]
    list_filter = ["tipo", "ativo"]
    search_fields = ["cpf_cnpj", "nome"]


@admin.register(Parceiro)
class ParceiroAdmin(admin.ModelAdmin):
    list_display = ["nome", "ativo"]
    list_filter = ["ativo"]
    search_fields = ["nome"]


@admin.register(TarifaConfig)
class TarifaConfigAdmin(admin.ModelAdmin):
    list_display = ["parceiro", "tipo_pessoa", "caminho", "valor", "moeda_tarifa"]
    list_filter = ["parceiro", "tipo_pessoa", "caminho"]


@admin.register(ComissaoConfig)
class ComissaoConfigAdmin(admin.ModelAdmin):
    list_display = ["parceiro", "fator"]
    list_filter = ["parceiro"]


@admin.register(IOFConfig)
class IOFConfigAdmin(admin.ModelAdmin):
    list_display = ["modalidade", "caminho", "aliquota"]
    list_filter = ["caminho"]


@admin.register(Operacao)
class OperacaoAdmin(SimpleHistoryAdmin):
    list_display = [
        "id",
        "data",
        "cliente",
        "moeda",
        "montante",
        "parceiro",
        "caminho",
        "status",
    ]
    list_filter = ["status", "caminho", "parceiro", "moeda"]
    search_fields = ["cliente__nome", "cliente__cpf_cnpj"]
    readonly_fields = ["hash_integridade", "criado_por"]


@admin.register(LogExclusaoBoleta)
class LogExclusaoBoletaAdmin(admin.ModelAdmin):
    list_display = ["id", "excluido_por", "excluido_em"]
    readonly_fields = ["dados_boleta", "excluido_por", "excluido_em", "justificativa"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(SolicitacaoEdicao)
class SolicitacaoEdicaoAdmin(admin.ModelAdmin):
    list_display = ["id", "operacao", "solicitado_por", "status", "criado_em"]
    list_filter = ["status"]
    readonly_fields = ["operacao", "solicitado_por", "justificativa", "criado_em"]
