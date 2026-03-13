import { useState } from 'react'
import { useTarifas, useComissoes, useIOF } from '../../hooks/useConfiguracoes'

const TABS = [
  { id: 'iof', label: 'IOF' },
  { id: 'tarifas', label: 'Tarifas' },
  { id: 'comissoes', label: 'Comissões' },
]

function TabelaIOF() {
  const { data: configs, isLoading } = useIOF()

  if (isLoading) return <p className="text-gray-500 py-4">Carregando...</p>

  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 dark:bg-gray-800">
        <tr>
          <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 font-medium">Modalidade</th>
          <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 font-medium">Caminho</th>
          <th className="px-4 py-3 text-right text-gray-600 dark:text-gray-400 font-medium">Alíquota</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
        {configs?.map((c) => (
          <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
            <td className="px-4 py-3 text-gray-900 dark:text-white">{c.modalidade}</td>
            <td className="px-4 py-3">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                c.caminho === 'SAIDA'
                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                  : 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
              }`}>
                {c.caminho}
              </span>
            </td>
            <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-white">
              {(Number(c.aliquota) * 100).toFixed(2)}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TabelaTarifas() {
  const { data: configs, isLoading } = useTarifas()

  if (isLoading) return <p className="text-gray-500 py-4">Carregando...</p>

  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 dark:bg-gray-800">
        <tr>
          <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 font-medium">Parceiro</th>
          <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 font-medium">Tipo Pessoa</th>
          <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 font-medium">Caminho</th>
          <th className="px-4 py-3 text-right text-gray-600 dark:text-gray-400 font-medium">Valor</th>
          <th className="px-4 py-3 text-center text-gray-600 dark:text-gray-400 font-medium">Moeda</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
        {configs?.map((c) => (
          <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
            <td className="px-4 py-3 text-gray-900 dark:text-white">{c.parceiro.nome}</td>
            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{c.tipo_pessoa}</td>
            <td className="px-4 py-3">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                c.caminho === 'SAIDA'
                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                  : c.caminho === 'ENTRADA'
                  ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
              }`}>
                {c.caminho}
              </span>
            </td>
            <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-white">
              {Number(c.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </td>
            <td className="px-4 py-3 text-center">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                c.moeda_tarifa === 'USD'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              }`}>
                {c.moeda_tarifa}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TabelaComissoes() {
  const { data: configs, isLoading } = useComissoes()

  if (isLoading) return <p className="text-gray-500 py-4">Carregando...</p>

  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 dark:bg-gray-800">
        <tr>
          <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 font-medium">Parceiro</th>
          <th className="px-4 py-3 text-right text-gray-600 dark:text-gray-400 font-medium">Fator</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
        {configs?.map((c) => (
          <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
            <td className="px-4 py-3 text-gray-900 dark:text-white">{c.parceiro.nome}</td>
            <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-white">
              {Number(c.fator).toFixed(2)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function ConfiguracoesPage() {
  const [tab, setTab] = useState('iof')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurações</h1>
        <p className="text-sm text-gray-400">Edição via painel administrativo</p>
      </div>

      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow overflow-hidden">
        {tab === 'iof' && <TabelaIOF />}
        {tab === 'tarifas' && <TabelaTarifas />}
        {tab === 'comissoes' && <TabelaComissoes />}
      </div>
    </div>
  )
}
