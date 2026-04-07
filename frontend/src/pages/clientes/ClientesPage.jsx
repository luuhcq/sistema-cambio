import { useState, useMemo } from 'react'
import { useListarClientes, useCriarCliente } from '../../hooks/useClientes'
import { useClienteMetricas } from '../../hooks/useClienteMetricas'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

function formatarCpf(cpf) {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

function formatarCnpj(cnpj) {
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

function formatarDoc(cpf_cnpj, tipo) {
  return tipo === 'PF' ? formatarCpf(cpf_cnpj) : formatarCnpj(cpf_cnpj)
}

function SortIcon({ ativo, direcao }) {
  return (
    <span className="inline-flex flex-col ml-1 leading-none">
      <span className={`text-[10px] ${ativo && direcao === 'asc' ? 'text-blue-600' : 'text-gray-300 dark:text-gray-600'}`}>▲</span>
      <span className={`text-[10px] ${ativo && direcao === 'desc' ? 'text-blue-600' : 'text-gray-300 dark:text-gray-600'}`}>▼</span>
    </span>
  )
}

const CAMPO_LABELS = {
  total_operacoes: 'Total de Operações',
  volume_total_brl: 'Volume Total (BRL)',
  taxa_media_ponderada: 'Taxa Média Ponderada',
  ticket_medio: 'Ticket Médio (BRL)',
  moedas_operadas: 'Moedas Operadas',
  primeira_operacao: 'Primeira Operação',
  ultima_operacao: 'Última Operação',
  spread_medio: 'Spread Médio (%)',
  comissao_total_liquida: 'Comissão Total Líquida (BRL)',
  por_parceiro: 'Por Parceiro',
}

function formatarMetrica(campo, valor) {
  if (valor === null || valor === undefined) return '—'
  if (campo === 'total_operacoes') return valor.toLocaleString('pt-BR')
  if (campo === 'volume_total_brl' || campo === 'ticket_medio' || campo === 'comissao_total_liquida') {
    return `R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  if (campo === 'taxa_media_ponderada') return String(valor)
  if (campo === 'spread_medio') return `${valor}%`
  if (campo === 'primeira_operacao' || campo === 'ultima_operacao') {
    const [y, m, d] = valor.split('-')
    return `${d}/${m}/${y}`
  }
  return valor
}

function ModalRelatorio({ cliente, dataInicio, dataFim, onFechar }) {
  const todosCampos = Object.keys(CAMPO_LABELS)
  const [camposSelecionados, setCamposSelecionados] = useState(todosCampos)
  const [formato, setFormato] = useState('pdf')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  const toggleCampo = (campo) => {
    setCamposSelecionados((prev) =>
      prev.includes(campo) ? prev.filter((c) => c !== campo) : [...prev, campo]
    )
  }

  const handleGerar = async () => {
    if (camposSelecionados.length === 0) {
      setErro('Selecione ao menos um campo.')
      return
    }
    setCarregando(true)
    setErro('')
    try {
      const params = { formato, campos: camposSelecionados.join(',') }
      if (dataInicio) params.data_inicio = dataInicio
      if (dataFim) params.data_fim = dataFim

      const response = await api.get(`/cadastros/clientes/${cliente.id}/relatorio`, {
        params,
        responseType: 'blob',
      })

      const url = URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `metricas_${cliente.cpf_cnpj}.${formato}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      setErro('Erro ao gerar relatório.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Exportar Relatório</h3>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-bold">×</button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Selecione os campos a incluir no relatório de{' '}
          <span className="font-medium text-gray-700 dark:text-gray-300">{cliente.nome}</span>.
        </p>

        <div className="space-y-2 mb-5 max-h-56 overflow-y-auto">
          {todosCampos.map((campo) => (
            <label key={campo} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={camposSelecionados.includes(campo)}
                onChange={() => toggleCampo(campo)}
                className="accent-blue-600"
              />
              {CAMPO_LABELS[campo]}
            </label>
          ))}
        </div>

        <div className="flex gap-3 mb-5">
          {['pdf', 'csv'].map((f) => (
            <button
              key={f}
              onClick={() => setFormato(f)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                formato === f
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>

        {erro && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{erro}</p>}

        <button
          onClick={handleGerar}
          disabled={carregando}
          className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {carregando ? 'Gerando...' : 'Gerar Relatório'}
        </button>
      </div>
    </div>
  )
}

function LinhaMetrica({ label, valor }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white">{valor}</span>
    </div>
  )
}

function ModalPerfilCliente({ cliente, onFechar, isGestor }) {
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [mostrarRelatorio, setMostrarRelatorio] = useState(false)

  const { data: metricas, isLoading } = useClienteMetricas(
    cliente.id,
    dataInicio || undefined,
    dataFim || undefined,
  )

  const inputClass =
    'px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-900 flex items-start justify-between p-6 pb-4 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{cliente.nome}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {formatarDoc(cliente.cpf_cnpj, cliente.tipo)}
                <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${
                  cliente.tipo === 'PF'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                }`}>
                  {cliente.tipo}
                </span>
              </p>
            </div>
            <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-bold mt-1">×</button>
          </div>

          <div className="p-6 space-y-5">
            {/* Filtro de período */}
            <div className="flex gap-3 items-center">
              <label className="text-sm text-gray-500 dark:text-gray-400 shrink-0">Período:</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className={inputClass}
              />
              <span className="text-gray-400 text-sm">até</span>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Métricas */}
            {isLoading ? (
              <p className="text-sm text-gray-400">Carregando métricas...</p>
            ) : metricas ? (
              <>
                {/* Métricas públicas */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Visão Geral</h3>
                  <LinhaMetrica label="Total de Operações" valor={formatarMetrica('total_operacoes', metricas.total_operacoes)} />
                  <LinhaMetrica label="Volume Total (BRL)" valor={formatarMetrica('volume_total_brl', metricas.volume_total_brl)} />
                  <LinhaMetrica label="Ticket Médio (BRL)" valor={formatarMetrica('ticket_medio', metricas.ticket_medio)} />
                  <LinhaMetrica label="Taxa Média Ponderada" valor={formatarMetrica('taxa_media_ponderada', metricas.taxa_media_ponderada)} />
                  <LinhaMetrica label="Primeira Operação" valor={formatarMetrica('primeira_operacao', metricas.primeira_operacao)} />
                  <LinhaMetrica label="Última Operação" valor={formatarMetrica('ultima_operacao', metricas.ultima_operacao)} />
                </div>

                {/* Moedas operadas */}
                {metricas.moedas_operadas.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Moedas Operadas</h3>
                    {metricas.moedas_operadas.map((m) => (
                      <LinhaMetrica
                        key={m.moeda}
                        label={m.moeda}
                        valor={`${m.total_operacoes} op. · R$ ${Number(m.volume_brl).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                      />
                    ))}
                  </div>
                )}

                {/* Métricas internas — apenas Gestor */}
                {isGestor && (
                  <>
                    <div>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Métricas Internas</h3>
                      <LinhaMetrica label="Spread Médio (%)" valor={formatarMetrica('spread_medio', metricas.spread_medio)} />
                      <LinhaMetrica label="Comissão Total Líquida" valor={formatarMetrica('comissao_total_liquida', metricas.comissao_total_liquida)} />
                    </div>

                    {metricas.por_parceiro.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Por Parceiro</h3>
                        {metricas.por_parceiro.map((p) => (
                          <LinhaMetrica
                            key={p.parceiro}
                            label={p.parceiro}
                            valor={`${p.total_operacoes} op. · R$ ${Number(p.volume_brl).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            ) : null}

            {/* Botão exportar */}
            {isGestor && (
              <div className="pt-1">
                <button
                  onClick={() => setMostrarRelatorio(true)}
                  className="w-full py-2 border border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  Exportar Relatório
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {mostrarRelatorio && (
        <ModalRelatorio
          cliente={cliente}
          dataInicio={dataInicio || undefined}
          dataFim={dataFim || undefined}
          onFechar={() => setMostrarRelatorio(false)}
        />
      )}
    </>
  )
}

export default function ClientesPage() {
  const { data: clientes, isLoading } = useListarClientes()
  const criarCliente = useCriarCliente()
  const { user } = useAuth()
  const isGestor = user?.perfil === 'Gestor'

  const [mostrarForm, setMostrarForm] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState('TODOS')
  const [busca, setBusca] = useState('')
  const [sortField, setSortField] = useState('nome')
  const [sortDir, setSortDir] = useState('asc')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState(null)

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const clientesFiltrados = useMemo(() => {
    if (!clientes) return []

    let resultado = clientes

    if (filtroTipo !== 'TODOS') {
      resultado = resultado.filter((c) => c.tipo === filtroTipo)
    }

    if (busca.trim()) {
      resultado = resultado.filter((c) =>
        c.nome.toLowerCase().includes(busca.toLowerCase()) ||
        c.cpf_cnpj.includes(busca.replace(/\D/g, ''))
      )
    }

    resultado = [...resultado].sort((a, b) => {
      const valA = a[sortField]?.toLowerCase?.() || a[sortField]
      const valB = b[sortField]?.toLowerCase?.() || b[sortField]
      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return resultado
  }, [clientes, filtroTipo, busca, sortField, sortDir])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')
    setSucesso('')

    try {
      await criarCliente.mutateAsync({ cpf_cnpj: cpfCnpj, nome })
      setSucesso('Cliente cadastrado com sucesso.')
      setCpfCnpj('')
      setNome('')
      setMostrarForm(false)
    } catch (e) {
      const detail = e.response?.data?.detail || 'Erro ao cadastrar cliente.'
      setErro(detail)
    }
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent'
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
  const thSortClass = 'px-4 py-3 text-left text-gray-600 dark:text-gray-400 font-medium cursor-pointer select-none hover:text-gray-900 dark:hover:text-gray-200 transition-colors'

  const botaoFiltro = (tipo, label) => (
    <button
      onClick={() => setFiltroTipo(tipo)}
      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        filtroTipo === tipo
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  )

  if (isLoading) {
    return <p className="text-gray-500">Carregando...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clientes</h1>
        <button
          onClick={() => {
            setMostrarForm(!mostrarForm)
            setErro('')
            setSucesso('')
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          {mostrarForm ? 'Fechar' : 'Novo Cliente'}
        </button>
      </div>

      {sucesso && (
        <p className="mb-4 text-sm text-green-600 dark:text-green-400">{sucesso}</p>
      )}

      {mostrarForm && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Novo Cliente
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>CPF ou CNPJ (só números)</label>
                <input
                  type="text"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(e.target.value.replace(/\D/g, ''))}
                  maxLength={14}
                  placeholder="Ex: 11144477735"
                  className={inputClass}
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  {cpfCnpj.length <= 11 ? 'CPF (Pessoa Física)' : 'CNPJ (Pessoa Jurídica)'}
                </p>
              </div>

              <div>
                <label className={labelClass}>
                  {cpfCnpj.length <= 11 ? 'Nome Completo' : 'Razão Social'}
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder={cpfCnpj.length <= 11 ? 'Nome completo' : 'Razão social'}
                  className={inputClass}
                  required
                />
              </div>
            </div>

            {erro && (
              <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={criarCliente.isPending}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {criarCliente.isPending ? 'Salvando...' : 'Cadastrar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {botaoFiltro('TODOS', 'Todos')}
          {botaoFiltro('PF', 'Pessoa Física')}
          {botaoFiltro('PJ', 'Pessoa Jurídica')}
        </div>

        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou documento..."
          className="w-72 px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className={thSortClass} onClick={() => handleSort('cpf_cnpj')}>
                {filtroTipo === 'PJ' ? 'CNPJ' : filtroTipo === 'PF' ? 'CPF' : 'CPF/CNPJ'}
                <SortIcon ativo={sortField === 'cpf_cnpj'} direcao={sortDir} />
              </th>
              <th className={thSortClass} onClick={() => handleSort('nome')}>
                {filtroTipo === 'PJ' ? 'Razão Social' : filtroTipo === 'PF' ? 'Nome' : 'Nome / Razão Social'}
                <SortIcon ativo={sortField === 'nome'} direcao={sortDir} />
              </th>
              <th className="px-4 py-3 text-center text-gray-600 dark:text-gray-400 font-medium">Tipo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {clientesFiltrados.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
            {clientesFiltrados.map((c) => (
              <tr
                key={c.id}
                onClick={() => setClienteSelecionado(c)}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
              >
                <td className="px-4 py-3 text-gray-900 dark:text-white font-mono">
                  {c.tipo === 'PF' ? formatarCpf(c.cpf_cnpj) : formatarCnpj(c.cpf_cnpj)}
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{c.nome}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    c.tipo === 'PF'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                  }`}>
                    {c.tipo}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {clienteSelecionado && (
        <ModalPerfilCliente
          cliente={clienteSelecionado}
          onFechar={() => setClienteSelecionado(null)}
          isGestor={isGestor}
        />
      )}
    </div>
  )
}
