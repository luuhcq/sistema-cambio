from django.contrib.postgres.operations import UnaccentExtension
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("operacoes", "0005_historicaloperacao_comentario_fora_horario_and_more"),
    ]

    operations = [
        UnaccentExtension(),
    ]
