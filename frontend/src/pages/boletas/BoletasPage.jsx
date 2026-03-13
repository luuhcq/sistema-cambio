import { useState } from 'react'
import { useOperacoes } from '../../hooks/useOperacoes'
import NovaBoleta from './NovaBoleta'

const STATUS_CORES = {
  RASCUNHO: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  PENDENTE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  CONFIRMADA: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELADA: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export default function BoletasPage() {
  const [mostrarForm, setMostrarForm] = useState(false)
  const { data: operacoes, isLoading } = useOperacoes()

  if (isLoading) {
    return <p className="text-gray-500">Carregando...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Boletas
        </h1>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          {mostrarForm ? 'Fechar' : 'Nova Boleta'}
        </button>
      </div>

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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {operacoes?.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
