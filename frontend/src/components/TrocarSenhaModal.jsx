import { useState } from 'react'
import { useTrocarSenha } from '../hooks/useUsuarios'

export default function TrocarSenhaModal() {
  const trocarSenha = useTrocarSenha()
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')

    if (novaSenha.length < 6) {
      setErro('Nova senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (novaSenha !== confirmar) {
      setErro('As senhas não coincidem.')
      return
    }

    try {
      await trocarSenha.mutateAsync({ senha_atual: senhaAtual, nova_senha: novaSenha })
      window.location.reload()
    } catch (err) {
      setErro(err.response?.data?.detail || 'Erro ao trocar senha.')
    }
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent'

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-sm">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Troca de Senha Obrigatória</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Sua senha é temporária. Defina uma nova senha para continuar.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha atual (temporária)</label>
            <input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nova senha</label>
            <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required minLength={6} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirmar nova senha</label>
            <input type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required className={inputClass} />
          </div>

          {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}

          <button
            type="submit"
            disabled={trocarSenha.isPending}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {trocarSenha.isPending ? 'Salvando...' : 'Definir Nova Senha'}
          </button>
        </form>
      </div>
    </div>
  )
}
