from ninja import Router
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken

from operacoes.schemas import LoginIn, TokenOut, UserOut

router = Router(tags=["Auth"])


@router.post("/login", response={200: TokenOut, 401: dict})
def login(request, payload: LoginIn):
    user = authenticate(username=payload.username, password=payload.password)
    if user is None:
        return 401, {"detail": "Credenciais inválidas."}

    refresh = RefreshToken.for_user(user)
    return 200, {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


@router.post("/refresh", response={200: TokenOut, 401: dict})
def refresh_token(request, refresh: str):
    try:
        token = RefreshToken(refresh)
        return 200, {
            "access": str(token.access_token),
            "refresh": str(token),
        }
    except Exception:
        return 401, {"detail": "Token inválido ou expirado."}
