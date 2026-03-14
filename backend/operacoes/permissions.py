def get_perfil(user):
    """Retorna o perfil do usuário baseado no grupo."""
    if user.is_superuser:
        return "Gestor"
    grupos = list(user.groups.values_list("name", flat=True))
    if "Gestor" in grupos:
        return "Gestor"
    if "Auditor" in grupos:
        return "Auditor"
    if "Operador" in grupos:
        return "Operador"
    return None


def is_gestor(user):
    return get_perfil(user) in ("Gestor",) or user.is_superuser


def is_operador(user):
    return get_perfil(user) == "Operador"


def is_auditor(user):
    return get_perfil(user) == "Auditor"


def pode_criar_boleta(user):
    perfil = get_perfil(user)
    return perfil in ("Operador", "Gestor")


def pode_editar_boleta(user, operacao):
    perfil = get_perfil(user)
    if perfil == "Gestor":
        return True
    if perfil == "Operador":
        return operacao.criado_por == user and operacao.status == "RASCUNHO"
    return False


def pode_submeter_boleta(user, operacao):
    perfil = get_perfil(user)
    if perfil == "Gestor":
        return True
    if perfil == "Operador":
        return operacao.criado_por == user
    return False


def pode_aprovar(user):
    return is_gestor(user)


def pode_cancelar(user):
    return is_gestor(user)


def pode_excluir(user):
    return is_gestor(user)
