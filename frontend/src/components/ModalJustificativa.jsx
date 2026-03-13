import { useState } from 'react'

export default function ModalJustificativa({ titulo, onConfirmar, onCancelar }) {
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')

  const handleConfirmar = () => {
    if (texto.trim().length < 10) {
      setErro('Justificativa deve ter no mínimo 10 caracteres.')
      return
    }
    onConfirmar(texto)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{titulo}</h3>

        <textarea
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            setErro('')
          }}
          placeholder="Informe o motivo (mínimo 10 caracteres)..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />

        {erro && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{erro}</p>}

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onCancelar}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Voltar
          </button>
          <button
            onClick={handleConfirmar}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
