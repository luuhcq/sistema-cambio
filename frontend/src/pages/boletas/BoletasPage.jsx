import { useState } from 'react'
import {
  useOperacoes,
  useSubmeterOperacao,
  useAprovarOperacao,
  useCancelarOperacao,
  useExcluirOperacao,
} from '../../hooks/useOperacoes'
import { useAuth } from '../../context/AuthContext'
import NovaBoleta from './NovaBoleta'
import ModalJustificativa from '../../components/ModalJustificativa'

const STATUS_CORES = {
  RASCUNHO: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  PENDENTE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  CONFIRMADA: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELADA: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export default function BoletasPage() {
  const { user } = useAuth()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [modalCancelar, setModalCancelar] = useState(null)
  const [modalExcluir, setModalExcluir] = useState(null)
  const [erro, setErro] = useState('')

  const { data: operacoes, isLoading } = useOperacoes()
  const submeter = useSubmeterOperacao()
  const aprovar = useAprovarOperacao()
  const cancelar = useCancelarOperacao()
  const excluir = useExcluirOperacao()

  const handleSubmeter = async (id) => {
    try {
      setErro('')
      await submeter.mutateAsync(id)
    } catch (e) {
      setErro(e.response?.data?.detail || 'Erro ao submeter.')
    }
  }

  const handleAprovar = async (id) => {
    try {
      setErro('')
      await aprovar.mutateAsync(id)
    } catch (e) {
      setErro(e.response?.data?.detail || 'Erro ao aprovar.')
    }
  }

  const handleCancelar = async (justificativa) => {
    try {
      setErro('')
      await cancelar.mutateAsync({ id: modalCancelar, justificativa })
      setModalCancelar(null)
    } catch (e) {
      setErro(e.response?.data?.detail || 'Erro ao cancelar.')
    }
  }

  const handleExcluir = async (justificativa) => {
    try {
      setErro('')
      await excluir.mutateAsync({ id: modalExcluir, justificativa })
      setModalExcluir(null)
    } catch (e) {
      setErro(e.response?.data?.detail || 'Erro ao excluir.')
    }
  }

  const isGestor = user?.is_staff

  if (isLoading) {
    return <p className="text-gray-500">Carregando...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Boletas</h1>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          {mostrarForm ? 'Fechar' : 'Nova Boleta'}
        </button>
      </div>

      {erro && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{erro}</p>
      )}

      {mostrarForm && (
        <div className="mb-8">
          <NovaBoleta onSuccess={() => setMostrarForm(false)} />
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 font-medium">#</th>
              <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 font-medium">Data</th>
              <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 font-medium">Cliente</th>
              <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 font-medium">Moeda</th>
              <th className="px-4 py-3 text-right text-gray-600 dark:text-gray-400 font-medium">Montante</th>
              <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 font-medium">Parceiro</th>
              <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 font-medium">Caminho</th>
              <th className="px-4 py-3 text-right text-gray-600 dark:text-gray-400 font-medium">VET (BRL)</th>
              <th className="px-4 py-3 text-center text-gray-600 dark:text-gray-400 font-medium">Status</th>
              <th className="px-4 py-3 text-center text-gray-600 dark:text-gray-400 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {operacoes?.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                  Nenhuma boleta registrada.
                </td>
              </tr>
            )}
            {operacoes?.map((op) => (
              <tr key={op.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 text-gray-900 dark:text-white">{op.id}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{op.data}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{op.cliente.nome}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{op.moeda.codigo_iso}</td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                  {Number(op.montante).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{op.parceiro.nome}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{op.caminho}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                  {Number(op.vet).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_CORES[op.status]}`}>
                    {op.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {op.status === 'RASCUNHO' && (
                      <button
                        onClick={() => handleSubmeter(op.id)}
                        className="px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      >
                        Submeter
                      </button>
                    )}
                    {op.status === 'PENDENTE' && isGestor && (
                      <button
                        onClick={() => handleAprovar(op.id)}
                        className="px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                      >
                        Aprovar
                      </button>
                    )}
                    {op.status !== 'CANCELADA' && isGestor && (
                      <button
                        onClick={() => setModalCancelar(op.id)}
                        className="px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                    {isGestor && (
                      <button
                        onClick={() => setModalExcluir(op.id)}
                        className="px-2 py-1 text-xs font-medium text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalCancelar && (
        <ModalJustificativa
          titulo="Cancelar Boleta"
          onConfirmar={handleCancelar}
          onCancelar={() => setModalCancelar(null)}
        />
      )}

      {modalExcluir && (
        <ModalJustificativa
          titulo="Excluir Boleta (ação irreversível)"
          onConfirmar={handleExcluir}
          onCancelar={() => setModalExcluir(null)}
        />
      )}
    </div>
  )
}
