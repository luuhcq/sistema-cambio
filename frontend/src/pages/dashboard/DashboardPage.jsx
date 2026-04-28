import { useState } from 'react'
import { useDashboard } from '../../hooks/useDashboard'
import { useAuth } from '../../context/AuthContext'
import { usePendencias } from '../../hooks/usePendencias'
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
  const { user } = useAuth()
  const isGestor = user?.perfil === 'Gestor'

  const [periodo, setPeriodo] = useState('mensal')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [dataInicioAplicada, setDataInicioAplicada] = useState('')
  const [dataFimAplicada, setDataFimAplicada] = useState('')
  const [escopo, setEscopo] = useState('minhas')

  const { data, isLoading } = useDashboard(periodo, dataInicioAplicada, dataFimAplicada, escopo)

  const { data: pendencias } = usePendencias()

  const baixarRelatorio = async (formato, tipo) => {
    try {
      const hoje = new Date()
      const params = { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1, dia: hoje.getDate() }
      const url = `/relatorios/${formato}/${tipo}?ano=${params.ano}&mes=${params.mes}&dia=${params.dia}`
      const response = await api.get(url, { responseType: 'blob' })
      const blob = new Blob([response.data])
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `fechamento_${tipo}_${hoje.toISOString().split('T')[0]}.${formato}`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch { alert('Erro ao gerar relatório.') }
  }

  if (isLoading) return <p className="text-gray-500">Carregando...</p>

  const parceiroData = data?.por_parceiro?.map((p) => ({ name: p.parceiro, receita: Number(p.receita) })) || []
  const moedaData = data?.por_moeda?.map((m) => ({ name: m.moeda, value: Number(m.volume) })) || []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          {isGestor && (
            <div className="flex gap-1">
              <button onClick={() => setEscopo('minhas')} className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${escopo === 'minhas' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'}`}>Meu</button>
              <button onClick={() => setEscopo('geral')} className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${escopo === 'geral' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'}`}>Geral</button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isGestor && (
            <div className="flex gap-1 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
              <button onClick={() => baixarRelatorio('csv', 'diario')} className="px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">CSV Diário</button>
              <button onClick={() => baixarRelatorio('csv', 'mensal')} className="px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">CSV Mensal</button>
              <button onClick={() => baixarRelatorio('pdf', 'diario')} className="px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">PDF Diário</button>
              <button onClick={() => baixarRelatorio('pdf', 'mensal')} className="px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">PDF Mensal</button>
            </div>
          )}

          <div className="flex gap-2">
            {PERIODOS.map((p) => (
              <button key={p.id} onClick={() => setPeriodo(p.id)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${periodo === p.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'}`}>{p.label}</button>
            ))}
            <button onClick={() => setPeriodo('custom')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${periodo === 'custom' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'}`}>Customizado</button>
          </div>

          {periodo === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
              <span className="text-gray-400 text-sm">a</span>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
              <button
                onClick={() => { setDataInicioAplicada(dataInicio); setDataFimAplicada(dataFim) }}
                disabled={!dataInicio || !dataFim}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Aplicar
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card titulo="Volume Operado" valor={formatBRL(data?.volume_operado || 0)} />
        <Card titulo="Receita Bruta" valor={formatBRL(data?.receita_bruta || 0)} />
        <Card titulo="Receita Líquida" valor={formatBRL(data?.receita_liquida || 0)} subtitulo="Após dedução de 5% de imposto" />
        <Card titulo="Total de Boletas" valor={data?.total_boletas || 0} />
        <Card titulo="Ticket Médio" valor={formatBRL(data?.ticket_medio || 0)} />
        <Card titulo="Spread Médio" valor={`${Number(data?.spread_medio || 0).toFixed(2).replace('.', ',')}%`} />
        <Card titulo="Receita Média" valor={formatBRL(data?.receita_media_por_operacao || 0)} />

        {/* Pendências inline */}
        {pendencias && (() => {
          const temPendencia = isGestor
            ? (pendencias.rascunhos_pendentes > 0 || pendencias.pendentes_aprovacao > 0 || pendencias.solicitacoes_edicao_pendentes > 0)
            : (pendencias.rascunhos_pendentes > 0 || pendencias.solicitacoes_respondidas > 0)

          return (
            <div className={`col-span-2 rounded-xl p-5 flex flex-col justify-center gap-2 ${
              temPendencia
                ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                : 'bg-white dark:bg-gray-900 shadow'
            }`}>
              {temPendencia ? (
                <>
                  {pendencias.rascunhos_pendentes > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded-full text-xs font-medium">{pendencias.rascunhos_pendentes}</span>
                      <span className="text-sm text-amber-800 dark:text-amber-400">Boleta(s) em rascunho aguardando submissão</span>
                    </div>
                  )}
                  {isGestor && pendencias.pendentes_aprovacao > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded-full text-xs font-medium">{pendencias.pendentes_aprovacao}</span>
                      <span className="text-sm text-amber-800 dark:text-amber-400">Boleta(s) pendente(s) de aprovação</span>
                    </div>
                  )}
                  {isGestor && pendencias.solicitacoes_edicao_pendentes > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded-full text-xs font-medium">{pendencias.solicitacoes_edicao_pendentes}</span>
                      <span className="text-sm text-amber-800 dark:text-amber-400">Solicitação(ões) de edição pendente(s)</span>
                    </div>
                  )}
                  {!isGestor && pendencias.solicitacoes_respondidas > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded-full text-xs font-medium">{pendencias.solicitacoes_respondidas}</span>
                      <span className="text-sm text-amber-800 dark:text-amber-400">Solicitação(ões) com resposta do gestor</span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm font-bold text-gray-900 dark:text-white">Sem pendências restantes.</p>
              )}
            </div>
          )
        })()}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {/* Receita por Parceiro */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-5">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Receita por Parceiro</h2>
          {parceiroData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={parceiroData} barCategoryGap="20%">
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'var(--color-text-secondary, #9ca3af)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--color-text-secondary, #9ca3af)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                />
                <Tooltip
                  formatter={(v) => [`Receita: ${formatBRL(v)}`]}
                  separator=""
                  contentStyle={{
                    backgroundColor: 'rgba(17,24,39,0.95)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  cursor={{ fill: 'rgba(244, 244, 244, 0.02)' }}
                />
                <Bar dataKey="receita" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">Sem dados no período</p>
          )}
        </div>

        {/* Volume por Moeda */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-5">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Volume por Moeda</h2>
          {moedaData.length > 0 ? (
            <div className="flex items-center justify-center gap-8">
              <div style={{ width: 200, height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={moedaData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      strokeWidth={2}
                      stroke="var(--color-background-primary, #fff)"
                    >
                      {moedaData.map((_, i) => (
                        <Cell key={i} fill={CORES[i % CORES.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => formatBRL(v)}
                      contentStyle={{
                        backgroundColor: 'rgba(17,24,39,0.95)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-3">
                {moedaData.map((m, i) => {
                  const total = moedaData.reduce((acc, cur) => acc + cur.value, 0)
                  const pct = total > 0 ? ((m.value / total) * 100).toFixed(0) : 0
                  return (
                    <div key={m.name} className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: CORES[i % CORES.length] }}
                      />
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{m.name}</span>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">Sem dados no período</p>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Ranking de Clientes</h2>
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
            {(!data?.top_clientes || data.top_clientes.length === 0) && (<tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Sem dados no período</td></tr>)}
            {data?.top_clientes?.map((c, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                <td className="px-4 py-3 text-gray-900 dark:text-white">{c.cliente}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-700 dark:text-gray-300">{formatBRL(c.volume)}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-700 dark:text-gray-300">{formatBRL(c.receita)}</td>
              </tr>
            ))}
          </tbody>
        </table>
    </div>

        {/* Ranking de Operadores (só gestor) */}
      {isGestor && escopo === 'geral' &&    (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow overflow-hidden mt-8">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Ranking de Operadores</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 font-medium">#</th>
                <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 font-medium">Operador</th>
                <th className="px-4 py-3 text-right text-gray-600 dark:text-gray-400 font-medium">Boletas</th>
                <th className="px-4 py-3 text-right text-gray-600 dark:text-gray-400 font-medium">Volume</th>
                <th className="px-4 py-3 text-right text-gray-600 dark:text-gray-400 font-medium">Receita</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {(!data?.ranking_operadores || data.ranking_operadores.length === 0) && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sem dados no período</td></tr>
              )}
              {data?.ranking_operadores?.map((o, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{o.operador}</td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{o.boletas}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-700 dark:text-gray-300">{formatBRL(o.volume)}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-700 dark:text-gray-300">{formatBRL(o.receita)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
  )
}

