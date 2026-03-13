from ninja import Router
from operacoes.models import Moeda, Parceiro, Cliente
from operacoes.schemas import MoedaOut, ParceiroOut, ClienteOut, ClienteIn
from operacoes.auth import JWTAuth

router = Router(tags=["Cadastros"], auth=JWTAuth())


# --- Moedas ---
@router.get("/moedas", response=list[MoedaOut])
def listar_moedas(request):
    return Moeda.objects.filter(ativo=True)


# --- Parceiros ---
@router.get("/parceiros", response=list[ParceiroOut])
def listar_parceiros(request):
    return Parceiro.objects.filter(ativo=True)


# --- Clientes ---
@router.get("/clientes", response=list[ClienteOut])
def listar_clientes(request, q: str = ""):
    qs = Cliente.objects.filter(ativo=True)
    if q:
        qs = qs.filter(cpf_cnpj__startswith=q) | qs.filter(nome__icontains=q)
    return qs


@router.get("/clientes/{cpf_cnpj}", response={200: ClienteOut, 404: dict})
def buscar_cliente(request, cpf_cnpj: str):
    cliente = Cliente.objects.filter(cpf_cnpj=cpf_cnpj, ativo=True).first()
    if not cliente:
        return 404, {"detail": "Cliente não encontrado."}
    return 200, cliente


@router.post("/clientes", response={201: ClienteOut, 400: dict})
def criar_cliente(request, payload: ClienteIn):
    try:
        cliente = Cliente(cpf_cnpj=payload.cpf_cnpj, nome=payload.nome)
        cliente.save()
        return 201, cliente
    except Exception as e:
        return 400, {"detail": str(e)}
