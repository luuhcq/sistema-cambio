import { useState, useMemo } from 'react'
import { useListarClientes, useCriarCliente } from '../../hooks/useClientes'

function formatarCpf(cpf) {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

function formatarCnpj(cnpj) {
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

function SortIcon({ ativo, direcao }) {
  return (
    <span className="inline-flex flex-col ml-1 leading-none">
      <span className={`text-[10px] ${ativo && direcao === 'asc' ? 'text-blue-600' : 'text-gray-300 dark:text-gray-600'}`}>▲</span>
      <span className={`text-[10px] ${ativo && direcao === 'desc' ? 'text-blue-600' : 'text-gray-300 dark:text-gray-600'}`}>▼</span>
    </span>
  )
}

export default function ClientesPage() {
  const { data: clientes, isLoading } = useListarClientes()
  const criarCliente = useCriarCliente()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState('TODOS')
  const [busca, setBusca] = useState('')
  const [sortField, setSortField] = useState('nome')
  const [sortDir, setSortDir] = useState('asc')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

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

    // Filtro por tipo
    if (filtroTipo !== 'TODOS') {
      resultado = resultado.filter((c) => c.tipo === filtroTipo)
    }

    // Busca por nome ou documento
    if (busca.trim()) {
      const termo = busca.toLowerCase().replace(/\D/g, '') || busca.toLowerCase()
      resultado = resultado.filter((c) =>
        c.nome.toLowerCase().includes(busca.toLowerCase()) ||
        c.cpf_cnpj.includes(busca.replace(/\D/g, ''))
      )
    }

    // Ordenação
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
              <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
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
    </div>
  )
}
