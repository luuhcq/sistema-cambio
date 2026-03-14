import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useCriarSolicitacao } from '../../hooks/useSolicitacoes'
import api from '../../api/axios'

function formatBRL(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function Campo({ label, valor, destaque, alerta }) {
  return (
    <div>
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
      <p className={`text-sm font-medium ${
        alerta
          ? 'text-red-600 dark:text-red-400'
          : destaque
          ? 'text-gray-900 dark:text-white text-base'
          : 'text-gray-700 dark:text-gray-300'
      }`}>
        {valor}
      </p>
    </div>
  )
}

const STATUS_CORES = {
  RASCUNHO: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  PENDENTE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  CONFIRMADA: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELADA: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export default function DetalheBoleta({ operacao, onFechar }) {
  const op = operacao
  const { user } = useAuth()
  const criarSolicitacao = useCriarSolicitacao()
  const [mostrarSolicitacao, setMostrarSolicitacao] = useState(false)
  const [justificativa, setJustificativa] = useState('')
  const [erroSolicitacao, setErroSolicitacao] = useState('')
  const [sucessoSolicitacao, setSucessoSolicitacao] = useState('')
  const [integridade, setIntegridade] = useState(null)
  const [verificando, setVerificando] = useState(false)

  const spreadNegativo = op.caminho === 'SAIDA'
    ? Number(op.taxa_cliente) < Number(op.spot)
    : Number(op.taxa_cliente) > Number(op.spot)

  const podeSolicitar = op.status === 'PENDENTE' || op.status === 'CONFIRMADA'

  const handleSolicitar = async () => {
    if (justificativa.trim().length < 10) {
      setErroSolicitacao('Justificativa deve ter no mínimo 10 caracteres.')
      return
    }
    setErroSolicitacao('')
    try {
      await criarSolicitacao.mutateAsync({
        operacao_id: op.id,
        justificativa,
      })
      setSucessoSolicitacao('Solicitação enviada. Aguardando aprovação do Gestor.')
      setMostrarSolicitacao(false)
      setJustificativa('')
    } catch (e) {
      setErroSolicitacao(e.response?.data?.detail || 'Erro ao solicitar edição.')
    }
  }

  const verificarIntegridade = async () => {
    setVerificando(true)
    try {
      const res = await api.get(`/operacoes/${op.id}/verificar-integridade`)
      setIntegridade(res.data)
    } catch {
      setIntegridade({ status: 'erro', mensagem: 'Erro ao verificar integridade.' })
    } finally {
      setVerificando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Boleta #{op.id}
            </h2>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_CORES[op.status]}`}>
              {op.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {podeSolicitar && (
              <button
                onClick={() => setMostrarSolicitacao(!mostrarSolicitacao)}
                className="px-3 py-1.5 text-xs font-medium text-amber-600 border border-amber-300 dark:border-amber-700 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              >
                Solicitar Edição
              </button>
            )}
            <button
              onClick={onFechar}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Solicitação de edição */}
          {mostrarSolicitacao && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-2">
                Solicitar Edição
              </h3>
              <textarea
                value={justificativa}
                onChange={(e) => {
                  setJustificativa(e.target.value)
                  setErroSolicitacao('')
                }}
                placeholder="Descreva o motivo da edição (mínimo 10 caracteres)..."
                rows={3}
                className="w-full px-3 py-2 border border-amber-300 dark:border-amber-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              />
              {erroSolicitacao && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{erroSolicitacao}</p>
              )}
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleSolicitar}
                  disabled={criarSolicitacao.isPending}
                  className="px-4 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
                >
                  {criarSolicitacao.isPending ? 'Enviando...' : 'Enviar Solicitação'}
                </button>
              </div>
            </div>
          )}

          {sucessoSolicitacao && (
            <div className="px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-400">{sucessoSolicitacao}</p>
            </div>
          )}

          {/* Dados da Operação */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
              Dados da Operação
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <Campo label="Data" valor={op.data} />
              <Campo label="Cliente" valor={op.cliente.nome} />
              <Campo label="Moeda" valor={`${op.moeda.codigo_iso} - ${op.moeda.nome}`} />
              <Campo label="Montante (ME)" valor={Number(op.montante).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} />
              <Campo label="Parceiro" valor={op.parceiro.nome} />
              <Campo label="Modalidade" valor={op.modalidade} />
              <Campo label="Caminho" valor={op.caminho === 'SAIDA' ? 'Saída (Envio)' : 'Entrada (Recebimento)'} />
              <Campo label="Indicação" valor={op.indicacao || '—'} />
            </div>
          </div>

          {/* Taxas */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
              Taxas
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <Campo label="Spot" valor={Number(op.spot).toFixed(6)} />
              <Campo label="Taxa Cliente" valor={Number(op.taxa_cliente).toFixed(6)} />
              <Campo label="PTAX D-1" valor={op.ptax ? Number(op.ptax).toFixed(6) : 'N/A'} />
              <Campo
                label="Spread"
                valor={`${spreadNegativo ? '−' : ''}${Number(op.spread).toFixed(4)}%`}
                alerta={spreadNegativo}
              />
            </div>
          </div>

          {/* Valores Calculados */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
              Valores Calculados
            </h3>

            {spreadNegativo && (
              <div className="mb-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                  ⚠ Spread negativo — operação com prejuízo para a mesa.
                </p>
              </div>
            )}

            <div className="grid grid-cols-4 gap-4">
              <Campo label="Alíquota IOF" valor={`${(Number(op.aliquota_iof) * 100).toFixed(2)}%`} />
              <Campo label="IOF Nominal" valor={formatBRL(op.iof_nominal)} />
              <Campo label="Tarifa Nominal" valor={formatBRL(op.tarifa_nominal)} />
              <Campo label="Base (Montante × Taxa)" valor={formatBRL(op.valor_base_brl)} />
              <Campo label="VET" valor={formatBRL(op.vet)} destaque />
              <Campo label="Comissão Bruta" valor={formatBRL(op.comissao_bruta)} />
              <Campo label="Comissão Líquida" valor={formatBRL(op.comissao_liquida)} />
            </div>
          </div>

          {/* Isenções e Tarifa Negociada */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
              Isenções e Tarifa
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <Campo label="Isento de IOF" valor={op.isencao_iof ? 'Sim' : 'Não'} />
              <Campo label="Isento de Tarifa" valor={op.isencao_tarifa ? 'Sim' : 'Não'} />
              <Campo label="Tarifa Negociada" valor={op.tarifa_negociada ? `${Number(op.tarifa_negociada).toFixed(2)} ${op.moeda_tarifa_negociada}` : '—'} />
            </div>
          </div>

          {/* Registro fora do horário */}
          {op.registro_fora_horario && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                Registro Fora do Horário
              </h3>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-sm text-amber-800 dark:text-amber-400">
                  {op.comentario_fora_horario || 'Sem comentário adicional.'}
                </p>
              </div>
            </div>
          )}

          {/* Integridade */}
          {op.hash_integridade && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                Integridade
              </h3>
              <p className="text-xs font-mono text-gray-400 break-all mb-3">
                HMAC: {op.hash_integridade}
              </p>
              <button
                onClick={verificarIntegridade}
                disabled={verificando}
                className="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
              >
                {verificando ? 'Verificando...' : 'Verificar Integridade'}
              </button>
              {integridade && (
                <div className={`mt-2 px-3 py-2 rounded-lg text-sm ${
                  integridade.status === 'integro'
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                    : integridade.status === 'adulterado'
                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                    : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {integridade.mensagem}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
