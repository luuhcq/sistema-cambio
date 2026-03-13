function formatBRL(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function Linha({ label, valor, destaque, alerta }) {
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`text-sm font-mono font-medium ${
        alerta
          ? 'text-red-600 dark:text-red-400'
          : destaque
          ? 'text-gray-900 dark:text-white text-base'
          : 'text-gray-700 dark:text-gray-300'
      }`}>
        {valor}
      </span>
    </div>
  )
}

export default function PreviewCalculo({ data, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5">
        <p className="text-sm text-gray-400">Calculando...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5">
        <p className="text-sm text-gray-400">Preencha os campos para ver o preview dos cálculos.</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
        Preview dos Cálculos
      </h3>

      {data.spread_negativo && (
        <div className="mb-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400 font-medium">
            ⚠ Spread negativo — a boleta ficará PENDENTE para aprovação do Gestor.
          </p>
        </div>
      )}

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        <Linha label="Alíquota IOF" valor={`${(Number(data.aliquota_iof) * 100).toFixed(2)}%`} />
        <Linha label="IOF Nominal" valor={formatBRL(data.iof_nominal)} />
        <Linha label="Tarifa Nominal" valor={formatBRL(data.tarifa_nominal)} />
        <Linha label="Base (Montante × Taxa)" valor={formatBRL(data.valor_base_brl)} />
        <Linha label="VET" valor={formatBRL(data.vet)} destaque />
        <Linha
          label="Spread"
          valor={`${Number(data.spread_com_sinal) >= 0 ? '' : '−'}${Number(data.spread).toFixed(4)}%`}
          alerta={data.spread_negativo}
        />
        <Linha label="Comissão Bruta" valor={formatBRL(data.comissao_bruta)} />
        <Linha label="Comissão Líquida" valor={formatBRL(data.comissao_liquida)} />
      </div>
    </div>
  )
}
