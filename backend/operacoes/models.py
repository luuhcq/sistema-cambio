# operacoes/models.py
from django.core.exceptions import ValidationError
from django.db import models
from django.conf import settings
from simple_history.models import HistoricalRecords


class Moeda(models.Model):
    codigo_iso = models.CharField(max_length=3, unique=True, verbose_name="Código ISO")
    nome = models.CharField(max_length=100, verbose_name="Nome")
    requer_ptax = models.BooleanField(default=True, verbose_name="Requer PTAX")
    ativo = models.BooleanField(default=True, verbose_name="Ativo")

    class Meta:
        ordering = ["codigo_iso"]
        verbose_name = "Moeda"
        verbose_name_plural = "Moedas"

    def __str__(self):
        return f"{self.codigo_iso} - {self.nome}"


def validar_cpf(cpf):
    if len(cpf) != 11 or cpf == cpf[0] * 11:
        return False

    # Primeiro dígito
    soma = sum(int(cpf[i]) * (10 - i) for i in range(9))
    resto = soma % 11
    d1 = 0 if resto < 2 else 11 - resto
    if int(cpf[9]) != d1:
        return False

    # Segundo dígito
    soma = sum(int(cpf[i]) * (11 - i) for i in range(10))
    resto = soma % 11
    d2 = 0 if resto < 2 else 11 - resto
    return int(cpf[10]) == d2


def validar_cnpj(cnpj):
    if len(cnpj) != 14 or cnpj == cnpj[0] * 14:
        return False

    # Primeiro dígito
    pesos = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    soma = sum(int(cnpj[i]) * pesos[i] for i in range(12))
    resto = soma % 11
    d1 = 0 if resto < 2 else 11 - resto
    if int(cnpj[12]) != d1:
        return False

    # Segundo dígito
    pesos = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    soma = sum(int(cnpj[i]) * pesos[i] for i in range(13))
    resto = soma % 11
    d2 = 0 if resto < 2 else 11 - resto
    return int(cnpj[13]) == d2


class Cliente(models.Model):
    TIPO_CHOICES = [
        ("PF", "Pessoa Física"),
        ("PJ", "Pessoa Jurídica"),
    ]

    cpf_cnpj = models.CharField(max_length=14, unique=True, verbose_name="CPF/CNPJ")
    nome = models.CharField(max_length=200, verbose_name="Nome / Razão Social")
    tipo = models.CharField(
        max_length=2, choices=TIPO_CHOICES, editable=False, verbose_name="Tipo"
    )
    ativo = models.BooleanField(default=True, verbose_name="Ativo")

    class Meta:
        ordering = ["nome"]
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"

    def clean(self):
        doc = self.cpf_cnpj.replace(".", "").replace("-", "").replace("/", "")
        if len(doc) == 11 and not validar_cpf(doc):
            raise ValidationError({"cpf_cnpj": "CPF inválido."})
        elif len(doc) == 14 and not validar_cnpj(doc):
            raise ValidationError({"cpf_cnpj": "CNPJ inválido."})
        elif len(doc) not in (11, 14):
            raise ValidationError(
                {"cpf_cnpj": "Documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos."}
            )

    def save(self, *args, **kwargs):
        self.cpf_cnpj = self.cpf_cnpj.replace(".", "").replace("-", "").replace("/", "")
        self.tipo = "PF" if len(self.cpf_cnpj) == 11 else "PJ"
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.cpf_cnpj} - {self.nome}"


class Parceiro(models.Model):
    nome = models.CharField(max_length=200, unique=True, verbose_name="Nome")
    ativo = models.BooleanField(default=True, verbose_name="Ativo")

    class Meta:
        ordering = ["nome"]
        verbose_name = "Parceiro"
        verbose_name_plural = "Parceiros"

    def __str__(self):
        return self.nome


class TarifaConfig(models.Model):
    TIPO_PESSOA_CHOICES = [
        ("PF", "Pessoa Física"),
        ("PJ", "Pessoa Jurídica"),
        ("AMBOS", "Ambos"),
    ]

    CAMINHO_CHOICES = [
        ("ENTRADA", "Entrada"),
        ("SAIDA", "Saída"),
        ("AMBOS", "Ambos"),
    ]

    MOEDA_TARIFA_CHOICES = [
        ("BRL", "Real"),
        ("USD", "Dólar"),
    ]

    parceiro = models.ForeignKey(
        Parceiro, on_delete=models.PROTECT, related_name="tarifas"
    )
    tipo_pessoa = models.CharField(
        max_length=5, choices=TIPO_PESSOA_CHOICES, verbose_name="Tipo Pessoa"
    )
    caminho = models.CharField(
        max_length=7, choices=CAMINHO_CHOICES, verbose_name="Caminho"
    )
    valor = models.DecimalField(
        max_digits=15, decimal_places=2, verbose_name="Valor da Tarifa"
    )
    moeda_tarifa = models.CharField(
        max_length=3, choices=MOEDA_TARIFA_CHOICES, verbose_name="Moeda da Tarifa"
    )

    class Meta:
        unique_together = ["parceiro", "tipo_pessoa", "caminho"]
        verbose_name = "Configuração de Tarifa"
        verbose_name_plural = "Configurações de Tarifa"

    def __str__(self):
        return f"{self.parceiro} | {self.tipo_pessoa} | {self.caminho} | {self.valor} {self.moeda_tarifa}"


class ComissaoConfig(models.Model):
    parceiro = models.OneToOneField(
        Parceiro, on_delete=models.PROTECT, related_name="comissao"
    )
    fator = models.DecimalField(
        max_digits=4, decimal_places=2, verbose_name="Fator de Comissão"
    )

    class Meta:
        verbose_name = "Configuração de Comissão"
        verbose_name_plural = "Configurações de Comissão"

    def __str__(self):
        return f"{self.parceiro} | Fator: {self.fator}"


class IOFConfig(models.Model):
    CAMINHO_CHOICES = [
        ("ENTRADA", "Entrada"),
        ("SAIDA", "Saída"),
    ]

    modalidade = models.CharField(max_length=100, verbose_name="Modalidade")
    caminho = models.CharField(
        max_length=7, choices=CAMINHO_CHOICES, verbose_name="Caminho"
    )
    aliquota = models.DecimalField(
        max_digits=5, decimal_places=4, verbose_name="Alíquota IOF"
    )

    class Meta:
        unique_together = ["modalidade", "caminho"]
        verbose_name = "Configuração de IOF"
        verbose_name_plural = "Configurações de IOF"

    def __str__(self):
        return f"{self.modalidade} | {self.caminho} | {self.aliquota}"


class Operacao(models.Model):
    CAMINHO_CHOICES = [
        ("ENTRADA", "Entrada"),
        ("SAIDA", "Saída"),
    ]

    STATUS_CHOICES = [
        ("RASCUNHO", "Rascunho"),
        ("PENDENTE", "Pendente"),
        ("CONFIRMADA", "Confirmada"),
        ("CANCELADA", "Cancelada"),
    ]

    # Dados da operação
    data = models.DateField(verbose_name="Data da Operação")
    cliente = models.ForeignKey(
        Cliente, on_delete=models.PROTECT, related_name="operacoes"
    )
    moeda = models.ForeignKey(Moeda, on_delete=models.PROTECT, related_name="operacoes")
    montante = models.DecimalField(
        max_digits=15, decimal_places=2, verbose_name="Montante ME"
    )
    parceiro = models.ForeignKey(
        Parceiro, on_delete=models.PROTECT, related_name="operacoes"
    )
    modalidade = models.CharField(max_length=100, verbose_name="Modalidade")
    caminho = models.CharField(
        max_length=7, choices=CAMINHO_CHOICES, verbose_name="Caminho"
    )

    # Isenções
    isencao_iof = models.BooleanField(default=False, verbose_name="Isento de IOF")
    isencao_tarifa = models.BooleanField(default=False, verbose_name="Isento de Tarifa")

    # Tarifa negociada (override)
    tarifa_negociada = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Tarifa Negociada",
    )
    moeda_tarifa_negociada = models.CharField(
        max_length=3, null=True, blank=True, verbose_name="Moeda Tarifa Negociada"
    )

    # Taxas
    ptax = models.DecimalField(
        max_digits=18, decimal_places=6, null=True, blank=True, verbose_name="PTAX D-1"
    )
    spot = models.DecimalField(max_digits=18, decimal_places=6, verbose_name="Spot")
    taxa_cliente = models.DecimalField(
        max_digits=18, decimal_places=6, verbose_name="Taxa Cliente"
    )

    # Informativo
    indicacao = models.CharField(
        max_length=200, null=True, blank=True, verbose_name="Indicação (Finder)"
    )

    # Controle
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default="RASCUNHO", verbose_name="Status"
    )
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="operacoes_criadas",
    )
    hash_integridade = models.CharField(
        max_length=64, blank=True, default="", verbose_name="Hash HMAC"
    )

    # Auditoria
    history = HistoricalRecords()

    class Meta:
        ordering = ["-data", "-id"]
        verbose_name = "Operação"
        verbose_name_plural = "Operações"

    def __str__(self):
        return f"#{self.id} | {self.data} | {self.cliente} | {self.moeda} | {self.montante}"

    # --- Properties dinâmicas (nunca armazenadas) ---

    @property
    def aliquota_iof(self):
        """Resolve a alíquota de IOF a partir da IOFConfig."""
        from decimal import Decimal

        if self.isencao_iof:
            return Decimal("0")

        # Busca configuração exata
        config = IOFConfig.objects.filter(
            modalidade=self.modalidade, caminho=self.caminho
        ).first()

        # Fallback: "Demais modalidades"
        if not config:
            config = IOFConfig.objects.filter(
                modalidade="Demais modalidades", caminho=self.caminho
            ).first()

        return config.aliquota if config else Decimal("0")

    @property
    def iof_nominal(self):
        """Montante × Alíquota IOF × Taxa do Cliente."""
        from decimal import Decimal, ROUND_HALF_UP

        valor = self.montante * self.aliquota_iof * self.taxa_cliente
        return valor.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @property
    def tarifa_base(self):
        """Resolve a tarifa base a partir da TarifaConfig."""
        from decimal import Decimal

        if self.isencao_tarifa or self.tarifa_negociada:
            return Decimal("0")

        tipo = self.cliente.tipo  # PF ou PJ

        # Busca exata: parceiro + tipo + caminho
        config = TarifaConfig.objects.filter(
            parceiro=self.parceiro, tipo_pessoa=tipo, caminho=self.caminho
        ).first()

        # Fallback 1: tipo exato + caminho AMBOS
        if not config:
            config = TarifaConfig.objects.filter(
                parceiro=self.parceiro, tipo_pessoa=tipo, caminho="AMBOS"
            ).first()

        # Fallback 2: tipo AMBOS + caminho exato
        if not config:
            config = TarifaConfig.objects.filter(
                parceiro=self.parceiro, tipo_pessoa="AMBOS", caminho=self.caminho
            ).first()

        # Fallback 3: AMBOS + AMBOS
        if not config:
            config = TarifaConfig.objects.filter(
                parceiro=self.parceiro, tipo_pessoa="AMBOS", caminho="AMBOS"
            ).first()

        if not config:
            return Decimal("0")

        return config.valor, config.moeda_tarifa

    @property
    def tarifa_nominal(self):
        """Converte a tarifa para BRL conforme regras do Blueprint."""
        from decimal import Decimal, ROUND_HALF_UP

        # Tarifa negociada tem prioridade
        if self.tarifa_negociada:
            valor = self.tarifa_negociada
            moeda = self.moeda_tarifa_negociada or "BRL"
        else:
            resultado = self.tarifa_base
            if isinstance(resultado, tuple):
                valor, moeda = resultado
            else:
                return Decimal("0")

        # Conversão para BRL
        if moeda == "BRL":
            nominal = valor
        elif moeda == "USD":
            if self.moeda.codigo_iso == "USD":
                nominal = valor * self.taxa_cliente
            else:
                nominal = valor * (self.ptax or Decimal("0"))
        else:
            nominal = valor

        return nominal.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @property
    def valor_base_brl(self):
        """Montante × Taxa do Cliente."""
        from decimal import Decimal, ROUND_HALF_UP

        valor = self.montante * self.taxa_cliente
        return valor.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @property
    def vet(self):
        """Valor Efetivo Total em BRL."""
        if self.caminho == "SAIDA":
            return self.valor_base_brl + self.iof_nominal + self.tarifa_nominal
        else:
            return self.valor_base_brl - self.iof_nominal - self.tarifa_nominal

    @property
    def spread(self):
        """Spread percentual absoluto."""
        from decimal import Decimal, ROUND_HALF_UP

        if not self.spot or self.spot == Decimal("0"):
            return Decimal("0")

        valor = abs((self.taxa_cliente - self.spot) / self.spot) * Decimal("100")
        return valor.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)

    @property
    def comissao_bruta(self):
        """Spot × Spread(decimal) × Montante × Fator do Parceiro."""
        from decimal import Decimal, ROUND_HALF_UP

        config = ComissaoConfig.objects.filter(parceiro=self.parceiro).first()
        if not config:
            return Decimal("0")

        spread_decimal = self.spread / Decimal("100")
        valor = self.spot * spread_decimal * self.montante * config.fator
        return valor.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @property
    def comissao_liquida(self):
        """Comissão Bruta × 0.95 (dedução de 5% de imposto)."""
        from decimal import Decimal, ROUND_HALF_UP

        valor = self.comissao_bruta * Decimal("0.95")
        return valor.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class LogExclusaoBoleta(models.Model):
    dados_boleta = models.JSONField(verbose_name="Snapshot da Boleta")
    excluido_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="exclusoes_boleta",
    )
    excluido_em = models.DateTimeField(
        auto_now_add=True, verbose_name="Data da Exclusão"
    )
    justificativa = models.TextField(verbose_name="Justificativa")

    class Meta:
        verbose_name = "Log de Exclusão de Boleta"
        verbose_name_plural = "Logs de Exclusão de Boleta"

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValueError("Registros de exclusão não podem ser alterados.")
        if not self.justificativa or len(self.justificativa.strip()) < 10:
            raise ValueError("Justificativa deve ter no mínimo 10 caracteres.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("Registros de exclusão não podem ser removidos.")

    def __str__(self):
        return f"Exclusão #{self.id} | {self.excluido_em} | por {self.excluido_por}"
