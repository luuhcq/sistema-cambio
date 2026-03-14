from django.db import migrations


def criar_grupos(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Group.objects.create(name="Operador")
    Group.objects.create(name="Gestor")
    Group.objects.create(name="Auditor")


def reverter(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Group.objects.filter(name__in=["Operador", "Gestor", "Auditor"]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("operacoes", "0002_seed_dados_iniciais"),
    ]

    operations = [
        migrations.RunPython(criar_grupos, reverter),
    ]
