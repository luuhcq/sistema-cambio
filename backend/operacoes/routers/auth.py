from django.contrib.auth import authenticate
from ninja import Router, Schema
from rest_framework_simplejwt.tokens import RefreshToken

from operacoes.auth import JWTAuth
from operacoes.schemas import LoginIn, TokenOut

router = Router(tags=["Auth"])


@router.post("/login", response={200: TokenOut, 401: dict})
def login(request, payload: LoginIn):
    from django.contrib.auth import get_user_model

    User = get_user_model()

    user_exists = User.objects.filter(username=payload.username).exists()
    if not user_exists:
        return 401, {"detail": "Usuário não cadastrado."}

    user = authenticate(username=payload.username, password=payload.password)
    if user is None:
        return 401, {"detail": "Senha incorreta."}

    if not user.is_active:
        return 401, {"detail": "Usuário desativado. Contate o gestor."}

    refresh = RefreshToken.for_user(user)
    return 200, {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


@router.post("/refresh", response={200: TokenOut, 401: dict})
def refresh_token(request, refresh: str):
    try:
        token = RefreshToken(refresh)
        user_id = token["user_id"]

        from django.contrib.auth import get_user_model

        User = get_user_model()
        user = User.objects.filter(id=user_id, is_active=True).first()

        if not user:
            return 401, {"detail": "Usuário inativo ou inexistente."}

        return 200, {
            "access": str(token.access_token),
            "refresh": str(token),
        }
    except Exception:
        return 401, {"detail": "Token inválido ou expirado."}


class TrocarSenhaIn(Schema):
    senha_atual: str
    nova_senha: str


@router.post("/trocar-senha", response={200: dict, 400: dict}, auth=JWTAuth())
def trocar_senha(request, payload: TrocarSenhaIn):
    user = request.user
    if not user.check_password(payload.senha_atual):
        return 400, {"detail": "Senha atual incorreta."}

    if len(payload.nova_senha) < 6:
        return 400, {"detail": "Nova senha deve ter no mínimo 6 caracteres."}

    user.set_password(payload.nova_senha)
    user.save()

    if hasattr(user, "profile"):
        user.profile.deve_trocar_senha = False
        user.profile.save()

    return 200, {"detail": "Senha alterada com sucesso."}


class TrocarSenhaIn(Schema):
    senha_atual: str
    nova_senha: str
