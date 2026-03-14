import { useState } from 'react'
import { useDashboard } from '../../hooks/useDashboard'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import api from '../../api/axios'

const PERIODOS = [
  { id: 'diario', label: 'Hoje' },
  { id: 'semanal', label: 'Semana' },
  { id: 'mensal', label: 'Mês' },
  { id: 'trimestral', label: 'Trimestre' },
  { id: 'ytd', label: 'YTD' },
]

const CORES = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1']

function formatBRL(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function Card({ titulo, valor, subtitulo }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-5">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{titulo}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{valor}</p>
      {subtitulo && <p className="text-xs text-gray-400 mt-1">{subtitulo}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const [periodo, setPeriodo] = useState('mensal')
  const { data, isLoading } = useDashboard(periodo)

  const baixarRelatorio = async (formato, tipo) => {
    try {
      const hoje = new Date()
      const params = {
        ano: hoje.getFullYear(),
        mes: hoje.getMonth() + 1,
        dia: hoje.getDate(),
      }

      const url = `/relatorios/${formato}/${tipo}?ano=${params.ano}&mes=${params.mes}&dia=${params.dia}`
      const response = await api.get(url, { responseType: 'blob' })

      const blob = new Blob([response.data])
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `fechamento_${tipo}_${hoje.toISOString().split('T')[0]}.${formato}`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch {
      alert('Erro ao gerar relatório.')
    }
  }

  if (isLoading) {
    return <p className="text-gray-500">Carregando...</p>
  }

  const parceiroData = data?.por_parceiro?.map((p) => ({
    name: p.parceiro,
    receita: Number(p.receita),
  })) || []

  const moedaData = data?.por_moeda?.map((m) => ({
    name: m.moeda,
    value: Number(m.volume),
  })) || []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>

        <div className="flex items-center gap-3">
          <div className="flex gap-1 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
            <button
              onClick={() => baixarRelatorio('csv', 'diario')}
              className="px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            >
              CSV Diário
            </button>
            <button
              onClick={() => baixarRelatorio('csv', 'mensal')}
              className="px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            >
              CSV Mensal
            </button>
            <button
              onClick={() => baixarRelatorio('pdf', 'diario')}
              className="px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            >
              PDF Diário
            </button>
            <button
              onClick={() => baixarRelatorio('pdf', 'mensal')}
              className="px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            >
              PDF Mensal
            </button>
          </div>

          <div className="flex gap-2">
            {PERIODOS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodo(p.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  periodo === p.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards de indicadores */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card titulo="Volume Operado" valor={formatBRL(data?.volume_operado || 0)} />
        <Card titulo="Receita Bruta" valor={formatBRL(data?.receita_bruta || 0)} />
        <Card
          titulo="Receita Líquida"
          valor={formatBRL(data?.receita_liquida || 0)}
          subtitulo="Após dedução de 5% de imposto"
        />
        <Card titulo="Total de Boletas" valor={data?.total_boletas || 0} />
        <Card titulo="Ticket Médio" valor={formatBRL(data?.ticket_medio || 0)} />
        <Card
          titulo="Spread Médio Ponderado"
          valor={`${Number(data?.spread_medio || 0).toFixed(4)}%`}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-5">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
            Receita por Parceiro
          </h2>
          {parceiroData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={parceiroData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => formatBRL(v)} />
                <Bar dataKey="receita" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">Sem dados no período</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-5">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
            Volume por Moeda
          </h2>
          {moedaData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={moedaData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {moedaData.map((_, i) => (
                    <Cell key={i} fill={CORES[i % CORES.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatBRL(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">Sem dados no período</p>
          )}
        </div>
      </div>

      {/* Top Clientes */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Top Clientes (Curva ABC)
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 font-medium">#</th>
              <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 font-medium">Cliente</th>
              <th className="px-4 py-3 text-right text-gray-600 dark:text-gray-400 font-medium">Volume</th>
              <th className="px-4 py-3 text-right text-gray-600 dark:text-gray-400 font-medium">Receita</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {(!data?.top_clientes || data.top_clientes.length === 0) && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  Sem dados no período
                </td>
              </tr>
            )}
            {data?.top_clientes?.map((c, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                <td className="px-4 py-3 text-gray-900 dark:text-white">{c.cliente}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-700 dark:text-gray-300">
                  {formatBRL(c.volume)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-700 dark:text-gray-300">
                  {formatBRL(c.receita)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
