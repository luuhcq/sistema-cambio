from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from ninja import Router, Schema

from operacoes.auth import JWTAuth
from operacoes.models import UserProfile
from operacoes.permissions import is_gestor

router = Router(tags=["Usuários"], auth=JWTAuth())
User = get_user_model()


class UsuarioIn(Schema):
    username: str
    email: str
    first_name: str
    last_name: str = ""
    senha: str
    perfil: str  # 'Operador' ou 'Gestor'


class UsuarioOut(Schema):
    id: int
    username: str
    email: str
    first_name: str
    last_name: str
    is_active: bool
    perfil: str
    deve_trocar_senha: bool

    @staticmethod
    def from_user(user):
        from operacoes.permissions import get_perfil

        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_active": user.is_active,
            "perfil": get_perfil(user) or "Sem perfil",
            "deve_trocar_senha": (
                getattr(user, "profile", None) and user.profile.deve_trocar_senha
                if hasattr(user, "profile")
                else False
            ),
        }


class AlterarPerfilIn(Schema):
    perfil: str


class ResetarSenhaIn(Schema):
    nova_senha: str


@router.get("/", response=list[dict])
def listar_usuarios(request):
    if not is_gestor(request.user):
        return []

    from operacoes.permissions import get_perfil

    users = User.objects.all().order_by("first_name", "username")
    resultado = []
    for u in users:
        resultado.append(
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "is_active": u.is_active,
                "perfil": get_perfil(u) or "Sem perfil",
                "deve_trocar_senha": hasattr(u, "profile") and u.profile.deve_trocar_senha,
            }
        )
    return resultado


@router.post("/", response={201: dict, 400: dict, 403: dict})
def criar_usuario(request, payload: UsuarioIn):
    if not is_gestor(request.user):
        return 403, {"detail": "Apenas gestores podem criar usuários."}

    if payload.perfil not in ("Operador", "Gestor"):
        return 400, {"detail": "Perfil deve ser Operador ou Gestor."}

    if User.objects.filter(username=payload.username).exists():
        return 400, {"detail": "Username já existe."}

    if User.objects.filter(email=payload.email).exists():
        return 400, {"detail": "Email já cadastrado."}

    if len(payload.senha) < 6:
        return 400, {"detail": "Senha deve ter no mínimo 6 caracteres."}

    user = User.objects.create_user(
        username=payload.username,
        email=payload.email,
        password=payload.senha,
        first_name=payload.first_name,
        last_name=payload.last_name,
    )

    grupo = Group.objects.filter(name=payload.perfil).first()
    if grupo:
        user.groups.add(grupo)

    # Marca pra trocar senha no primeiro login
    UserProfile.objects.create(user=user, deve_trocar_senha=True)

    return 201, {
        "detail": f"Usuário {user.username} criado com perfil {payload.perfil}.",
        "id": user.id,
    }


@router.post("/{user_id}/alternar-status", response={200: dict, 403: dict, 404: dict})
def alternar_status(request, user_id: int):
    if not is_gestor(request.user):
        return 403, {"detail": "Apenas gestores podem alterar status."}

    user = User.objects.filter(id=user_id).first()
    if not user:
        return 404, {"detail": "Usuário não encontrado."}

    if user == request.user:
        return 400, {"detail": "Você não pode desativar a si mesmo."}

    user.is_active = not user.is_active
    user.save()
    status = "ativado" if user.is_active else "desativado"
    return 200, {"detail": f"Usuário {status}.", "is_active": user.is_active}


@router.post("/{user_id}/alterar-perfil", response={200: dict, 400: dict, 403: dict, 404: dict})
def alterar_perfil(request, user_id: int, payload: AlterarPerfilIn):
    if not is_gestor(request.user):
        return 403, {"detail": "Apenas gestores podem alterar perfis."}

    if payload.perfil not in ("Operador", "Gestor"):
        return 400, {"detail": "Perfil deve ser Operador ou Gestor."}

    user = User.objects.filter(id=user_id).first()
    if not user:
        return 404, {"detail": "Usuário não encontrado."}

    # Remove grupos anteriores e adiciona o novo
    user.groups.clear()
    grupo = Group.objects.filter(name=payload.perfil).first()
    if grupo:
        user.groups.add(grupo)

    return 200, {"detail": f"Perfil alterado para {payload.perfil}."}


@router.post("/{user_id}/resetar-senha", response={200: dict, 400: dict, 403: dict, 404: dict})
def resetar_senha(request, user_id: int, payload: ResetarSenhaIn):
    if not is_gestor(request.user):
        return 403, {"detail": "Apenas gestores podem resetar senhas."}

    user = User.objects.filter(id=user_id).first()
    if not user:
        return 404, {"detail": "Usuário não encontrado."}

    if len(payload.nova_senha) < 6:
        return 400, {"detail": "Senha deve ter no mínimo 6 caracteres."}

    user.set_password(payload.nova_senha)
    user.save()

    # Marca pra trocar senha no próximo login
    if hasattr(user, "profile"):
        user.profile.deve_trocar_senha = True
        user.profile.save()

    return 200, {"detail": "Senha resetada. Usuário deverá trocar no próximo login."}
