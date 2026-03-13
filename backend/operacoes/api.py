from ninja import NinjaAPI
from operacoes.auth import JWTAuth
from operacoes.schemas import UserOut
from operacoes.routers.auth import router as auth_router
from operacoes.routers.cadastros import router as cadastros_router
from operacoes.routers.operacoes import router as operacoes_router
from operacoes.routers.ptax import router as ptax_router

api = NinjaAPI(
    title="Sistema de Câmbio",
    version="1.0.0",
    description="API de gestão de operações de câmbio",
)

api.add_router("/auth", auth_router)
api.add_router("/cadastros", cadastros_router)
api.add_router("/operacoes", operacoes_router)
api.add_router("/ptax", ptax_router)


@api.get("/me", response=UserOut, auth=JWTAuth())
def me(request):
    return request.user
