from ninja import NinjaAPI
from operacoes.auth import JWTAuth
from operacoes.schemas import UserOut
from operacoes.routers.auth import router as auth_router
from operacoes.routers.cadastros import router as cadastros_router
from operacoes.routers.operacoes import router as operacoes_router
from operacoes.routers.ptax import router as ptax_router
from operacoes.routers.configuracoes import router as config_router
from operacoes.routers.dashboard import router as dashboard_router
from operacoes.routers.relatorios import router as relatorios_router
from operacoes.routers.solicitacoes import router as solicitacoes_router
from operacoes.routers.usuarios import router as usuarios_router

api = NinjaAPI(
    title="Sistema de Câmbio",
    version="1.0.0",
    description="API de gestão de operações de câmbio",
)

api.add_router("/auth", auth_router)
api.add_router("/cadastros", cadastros_router)
api.add_router("/operacoes", operacoes_router)
api.add_router("/ptax", ptax_router)
api.add_router("/configuracoes", config_router)
api.add_router("/dashboard", dashboard_router)
api.add_router("/relatorios", relatorios_router)
api.add_router("/solicitacoes", solicitacoes_router)
api.add_router("/usuarios", usuarios_router)


@api.get("/me", response=dict, auth=JWTAuth())
def me(request):
    from operacoes.permissions import get_perfil

    user = request.user
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "perfil": get_perfil(user),
        "deve_trocar_senha": hasattr(user, "profile")
        and user.profile.deve_trocar_senha,
    }
