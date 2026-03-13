from django.db import migrations


def seed_dados_iniciais(apps, schema_editor):
    Moeda = apps.get_model("operacoes", "Moeda")
    Parceiro = apps.get_model("operacoes", "Parceiro")
    IOFConfig = apps.get_model("operacoes", "IOFConfig")
    TarifaConfig = apps.get_model("operacoes", "TarifaConfig")
    ComissaoConfig = apps.get_model("operacoes", "ComissaoConfig")

    # --- Moedas ---
    moedas = [
        ("USD", "Dólar Americano", False),
        ("EUR", "Euro", True),
        ("GBP", "Libra Esterlina", True),
        ("JPY", "Iene Japonês", True),
        ("CHF", "Franco Suíço", True),
        ("CAD", "Dólar Canadense", True),
        ("AUD", "Dólar Australiano", True),
        ("NZD", "Dólar Neozelandês", True),
        ("CNY", "Yuan Chinês", True),
        ("HKD", "Dólar de Hong Kong", True),
        ("SGD", "Dólar de Singapura", True),
        ("SEK", "Coroa Sueca", True),
        ("NOK", "Coroa Norueguesa", True),
        ("DKK", "Coroa Dinamarquesa", True),
        ("MXN", "Peso Mexicano", True),
        ("ZAR", "Rand Sul-Africano", True),
        ("TRY", "Lira Turca", True),
        ("PLN", "Zloty Polonês", True),
        ("CLP", "Peso Chileno", True),
        ("COP", "Peso Colombiano", True),
    ]
    for codigo, nome, requer_ptax in moedas:
        Moeda.objects.create(codigo_iso=codigo, nome=nome, requer_ptax=requer_ptax)

    # --- Parceiros ---
    parceiros_nomes = [
        "Travelex",
        "Ouribank",
        "Moneycorp",
        "Cotação",
        "Mirae",
        "Rendimento",
        "Sofisa",
        "Daycoval",
        "XP",
    ]
    parceiros = {}
    for nome in parceiros_nomes:
        parceiros[nome] = Parceiro.objects.create(nome=nome)

    # --- IOFConfig ---
    iofs = [
        ("Disponibilidade", "SAIDA", "0.0350"),
        ("Manutenção de Residente", "SAIDA", "0.0350"),
        ("Investimento no Exterior", "SAIDA", "0.0110"),
        ("Demais modalidades", "SAIDA", "0.0038"),
        ("Pagamento de Invoice", "ENTRADA", "0.0000"),
        ("Pagamento de Serviços", "ENTRADA", "0.0000"),
        ("Aporte de Capital", "ENTRADA", "0.0000"),
        ("Demais modalidades", "ENTRADA", "0.0038"),
    ]
    for modalidade, caminho, aliquota in iofs:
        IOFConfig.objects.create(
            modalidade=modalidade, caminho=caminho, aliquota=aliquota
        )

    # --- TarifaConfig ---
    tarifas = [
        ("Travelex", "AMBOS", "AMBOS", "15.00", "USD"),
        ("Ouribank", "PF", "AMBOS", "50.00", "BRL"),
        ("Ouribank", "PJ", "AMBOS", "100.00", "BRL"),
        ("Mirae", "AMBOS", "SAIDA", "12.00", "USD"),
        ("Mirae", "AMBOS", "ENTRADA", "10.00", "USD"),
    ]
    for parceiro_nome, tipo_pessoa, caminho, valor, moeda in tarifas:
        TarifaConfig.objects.create(
            parceiro=parceiros[parceiro_nome],
            tipo_pessoa=tipo_pessoa,
            caminho=caminho,
            valor=valor,
            moeda_tarifa=moeda,
        )

    # --- ComissaoConfig ---
    comissoes = [
        ("Moneycorp", "0.65"),
        ("Travelex", "0.60"),
        ("Cotação", "0.60"),
        ("Mirae", "0.60"),
        ("Ouribank", "0.50"),
        ("Rendimento", "0.50"),
        ("Sofisa", "0.50"),
        ("Daycoval", "0.50"),
        ("XP", "0.50"),
    ]
    for parceiro_nome, fator in comissoes:
        ComissaoConfig.objects.create(parceiro=parceiros[parceiro_nome], fator=fator)


def reverter(apps, schema_editor):
    apps.get_model("operacoes", "ComissaoConfig").objects.all().delete()
    apps.get_model("operacoes", "TarifaConfig").objects.all().delete()
    apps.get_model("operacoes", "IOFConfig").objects.all().delete()
    apps.get_model("operacoes", "Parceiro").objects.all().delete()
    apps.get_model("operacoes", "Moeda").objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("operacoes", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_dados_iniciais, reverter),
    ]
