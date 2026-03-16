import { useState } from 'react'
import { useUsuarios, useCriarUsuario, useAlternarStatus, useAlterarPerfil, useResetarSenha } from '../../hooks/useUsuarios'

const PERFIL_CORES = {
  Gestor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Operador: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'Sem perfil': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

export default function UsuariosPage() {
  const { data: usuarios, isLoading } = useUsuarios()
  const criarUsuario = useCriarUsuario()
  const alternarStatus = useAlternarStatus()
  const alterarPerfil = useAlterarPerfil()
  const resetarSenha = useResetarSenha()

  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({ username: '', email: '', first_name: '', last_name: '', senha: '', perfil: 'Operador' })
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [modalSenha, setModalSenha] = useState(null)
  const [novaSenha, setNovaSenha] = useState('')

  const handleCriar = async (e) => {
    e.preventDefault()
    setErro('')
    setSucesso('')
    try {
      const res = await criarUsuario.mutateAsync(form)
      setSucesso(res.detail)
      setForm({ username: '', email: '', first_name: '', last_name: '', senha: '', perfil: 'Operador' })
      setMostrarForm(false)
    } catch (err) {
      setErro(err.response?.data?.detail || 'Erro ao criar usuário.')
    }
  }

  const handleAlternarStatus = async (id) => {
    try {
      setErro('')
      const res = await alternarStatus.mutateAsync(id)
      setSucesso(res.detail)
    } catch (err) {
      setErro(err.response?.data?.detail || 'Erro ao alterar status.')
    }
  }

  const handleAlterarPerfil = async (id, perfil) => {
    try {
      setErro('')
      const res = await alterarPerfil.mutateAsync({ id, perfil })
      setSucesso(res.detail)
    } catch (err) {
      setErro(err.response?.data?.detail || 'Erro ao alterar perfil.')
    }
  }

  const handleResetarSenha = async () => {
    if (novaSenha.length < 6) {
      setErro('Senha deve ter no mínimo 6 caracteres.')
      return
    }
    try {
      setErro('')
      const res = await resetarSenha.mutateAsync({ id: modalSenha, nova_senha: novaSenha })
      setSucesso(res.detail)
      setModalSenha(null)
      setNovaSenha('')
    } catch (err) {
      setErro(err.response?.data?.detail || 'Erro ao resetar senha.')
    }
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent'

  if (isLoading) return <p className="text-gray-500">Carregando...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestão de Usuários</h1>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          {mostrarForm ? 'Fechar' : 'Novo Usuário'}
        </button>
      </div>

      {erro && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{erro}</p>}
      {sucesso && <p className="mb-4 text-sm text-green-600 dark:text-green-400">{sucesso}</p>}

      {mostrarForm && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Novo Usuário</h2>
          <form onSubmit={handleCriar} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
                <input type="text" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sobrenome</label>
                <input type="text" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value, username: e.target.value })} required className={inputClass} placeholder="usuario@controllcapital.com.br" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha temporária</label>
                <input type="text" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} required minLength={6} className={inputClass} placeholder="Mínimo 6 caracteres" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Perfil</label>
                <select value={form.perfil} onChange={(e) => setForm({ ...form, perfil: e.target.value })} className={inputClass}>
                  <option value="Operador">Operador</option>
                  <option value="Gestor">Gestor</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={criarUsuario.isPending} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {criarUsuario.isPending ? 'Criando...' : 'Criar Usuário'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 font-medium">Nome</th>
              <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 font-medium">Email / Username</th>
              <th className="px-4 py-3 text-center text-gray-600 dark:text-gray-400 font-medium">Perfil</th>
              <th className="px-4 py-3 text-center text-gray-600 dark:text-gray-400 font-medium">Status</th>
              <th className="px-4 py-3 text-center text-gray-600 dark:text-gray-400 font-medium">Senha</th>
              <th className="px-4 py-3 text-center text-gray-600 dark:text-gray-400 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {usuarios?.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                  {u.first_name} {u.last_name}
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{u.email || u.username}</td>
                <td className="px-4 py-3 text-center">
                  <select
                    value={u.perfil}
                    onChange={(e) => handleAlterarPerfil(u.id, e.target.value)}
                    className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="Operador">Operador</option>
                    <option value="Gestor">Gestor</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {u.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {u.deve_trocar_senha && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                      Temporária
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleAlternarStatus(u.id)}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${u.is_active ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                    >
                      {u.is_active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      onClick={() => { setModalSenha(u.id); setNovaSenha('') }}
                      className="px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    >
                      Resetar Senha
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Resetar Senha */}
      {modalSenha && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Resetar Senha</h3>
            <input
              type="text"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Nova senha temporária (mín. 6 caracteres)"
              className={inputClass}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setModalSenha(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">Cancelar</button>
              <button
                onClick={handleResetarSenha}
                disabled={resetarSenha.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {resetarSenha.isPending ? 'Resetando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
