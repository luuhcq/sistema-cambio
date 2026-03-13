from ninja import Router
from operacoes.models import TarifaConfig, ComissaoConfig, IOFConfig
from operacoes.schemas import TarifaConfigOut, ComissaoConfigOut, IOFConfigOut
from operacoes.auth import JWTAuth

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
