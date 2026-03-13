import hmac
import hashlib
import os


def gerar_hmac(operacao):
    """Gera HMAC-SHA256 dos campos críticos da operação."""
    chave = os.getenv("HMAC_SECRET_KEY", "").encode()
    mensagem = f"{operacao.montante}|{operacao.taxa_cliente}|{operacao.spot}|{operacao.caminho}|{operacao.moeda.codigo_iso}".encode()
    return hmac.new(chave, mensagem, hashlib.sha256).hexdigest()


def verificar_hmac(operacao):
    """Verifica se o hash armazenado bate com o recalculado."""
    if not operacao.hash_integridade:
        return True
    return operacao.hash_integridade == gerar_hmac(operacao)
