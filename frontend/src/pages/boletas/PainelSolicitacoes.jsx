import { useSolicitacoes, useAprovarSolicitacao, useRejeitarSolicitacao } from '../../hooks/useSolicitacoes'
import { useAuth } from '../../context/AuthContext'

const STATUS_CORES = {
  PENDENTE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  APROVADA: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REJEITADA: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export default function PainelSolicitacoes() {
  const { user } = useAuth()
  const { data: solicitacoes, isLoading } = useSolicitacoes()
  const aprovar = useAprovarSolicitacao()
  const rejeitar = useRejeitarSolicitacao()

  const isGestor = user?.perfil === 'Gestor'

  if (isLoading) return null

  if (!solicitacoes || solicitacoes.length === 0) return null

  const pendentes = solicitacoes.filter((s) => s.status === 'PENDENTE')
  const respondidas = solicitacoes.filter((s) => s.status !== 'PENDENTE')

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          Solicitações de Edição
        </h2>
        {pendentes.length > 0 && (
          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-xs font-medium">
            {pendentes.length} pendente{pendentes.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 font-medium">Boleta</th>
            <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 font-medium">Solicitado por</th>
            <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 font-medium">Justificativa</th>
            <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 font-medium">Data</th>
            <th className="px-4 py-3 text-center text-gray-600 dark:text-gray-400 font-medium">Status</th>
            {isGestor && <th className="px-4 py-3 text-center text-gray-600 dark:text-gray-400 font-medium">Ações</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {[...pendentes, ...respondidas].map((s) => (
            <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">#{s.operacao_id}</td>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                {s.solicitado_por.first_name || s.solicitado_por.username}
              </td>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-xs truncate">{s.justificativa}</td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                {new Date(s.criado_em).toLocaleString('pt-BR')}
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_CORES[s.status]}`}>
                  {s.status}
                </span>
              </td>
              {isGestor && (
                <td className="px-4 py-3 text-center">
                  {s.status === 'PENDENTE' && (
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => aprovar.mutateAsync(s.id)}
                        className="px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                      >
                        Aprovar
                      </button>
                      <button
                        onClick={() => rejeitar.mutateAsync(s.id)}
                        className="px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        Rejeitar
                      </button>
                    </div>
                  )}
                  {s.status !== 'PENDENTE' && s.respondido_por && (
                    <span className="text-xs text-gray-400">
                      por {s.respondido_por.first_name || s.respondido_por.username}
                    </span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
