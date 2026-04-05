from ninja import Router

from operacoes.auth import JWTAuth
from operacoes.models import ComissaoConfig, IOFConfig, TarifaConfig
from operacoes.schemas import ComissaoConfigOut, IOFConfigOut, TarifaConfigOut

router = Router(tags=["Configurações"], auth=JWTAuth())


@router.get("/tarifas", response=list[TarifaConfigOut])
def listar_tarifas(request):
    return TarifaConfig.objects.select_related("parceiro").all()


@router.get("/comissoes", response=list[ComissaoConfigOut])
def listar_comissoes(request):
    return ComissaoConfig.objects.select_related("parceiro").all()


@router.get("/iof", response=list[IOFConfigOut])
def listar_iof(request):
    return IOFConfig.objects.all()
