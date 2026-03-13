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
  const spreadNegativo = op.caminho === 'SAIDA'
    ? Number(op.taxa_cliente) < Number(op.spot)
    : Number(op.taxa_cliente) > Number(op.spot)

  const spreadComSinal = op.caminho === 'SAIDA'
    ? ((Number(op.taxa_cliente) - Number(op.spot)) / Number(op.spot)) * 100
    : -((Number(op.taxa_cliente) - Number(op.spot)) / Number(op.spot)) * 100

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
          <button
            onClick={onFechar}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
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

          {/* Integridade */}
          {op.hash_integridade && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                Integridade
              </h3>
              <p className="text-xs font-mono text-gray-400 break-all">
                HMAC: {op.hash_integridade}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
