import os

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Cria superuser a partir de variáveis de ambiente"

    def handle(self, *args, **options):
        User = get_user_model()
        username = os.getenv("SUPERUSER_USERNAME", "admin")
        email = os.getenv("SUPERUSER_EMAIL", "admin@controllcapital.com.br")
        password = os.getenv("SUPERUSER_PASSWORD")

        if not password:
            self.stdout.write(self.style.WARNING("SUPERUSER_PASSWORD não definida. Pulando."))
            return

        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f"Usuário {username} já existe. Pulando."))
            return

        user = User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            first_name="Admin",
        )

        gestor = Group.objects.filter(name="Gestor").first()
        if gestor:
            user.groups.add(gestor)

        self.stdout.write(self.style.SUCCESS(f"Superuser {username} criado com sucesso."))
