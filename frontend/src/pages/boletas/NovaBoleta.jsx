import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMoedas } from '../../hooks/useMoedas'
import { useParceiros } from '../../hooks/useParceiros'
import { usePtax } from '../../hooks/usePtax'
import { useCriarOperacao } from '../../hooks/useOperacoes'
import api from '../../api/axios'

export default function NovaBoleta({ onSuccess }) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm()
  const { data: moedas } = useMoedas()
  const { data: parceiros } = useParceiros()
  const { data: ptaxData } = usePtax()
  const criarOperacao = useCriarOperacao()

  const [clienteBusca, setClienteBusca] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState(null)
  const [clientesResultado, setClientesResultado] = useState([])
  const [erro, setErro] = useState('')

  const moedaSelecionada = watch('moeda_id')
  const moedaObj = moedas?.find((m) => m.id === Number(moedaSelecionada))

  // Auto-preenche PTAX quando moeda requer
  useEffect(() => {
    if (moedaObj?.requer_ptax && ptaxData?.ptax) {
      setValue('ptax', ptaxData.ptax)
    } else if (moedaObj && !moedaObj.requer_ptax) {
      setValue('ptax', '')
    }
  }, [moedaObj, ptaxData, setValue])

  // Busca clientes
  useEffect(() => {
    if (clienteBusca.length >= 3) {
      api.get('/cadastros/clientes', { params: { q: clienteBusca } })
        .then((r) => setClientesResultado(r.data))
        .catch(() => setClientesResultado([]))
    } else {
      setClientesResultado([])
    }
  }, [clienteBusca])

  const onSubmit = async (data) => {
    if (!clienteSelecionado) {
      setErro('Selecione um cliente.')
      return
    }

    setErro('')

    const payload = {
      ...data,
      cliente_id: clienteSelecionado.id,
      moeda_id: Number(data.moeda_id),
      parceiro_id: Number(data.parceiro_id),
      montante: data.montante,
      spot: data.spot,
      taxa_cliente: data.taxa_cliente,
      ptax: data.ptax || null,
      tarifa_negociada: data.tarifa_negociada || null,
      moeda_tarifa_negociada: data.moeda_tarifa_negociada || null,
      indicacao: data.indicacao || null,
    }

    try {
      await criarOperacao.mutateAsync(payload)
      onSuccess()
    } catch (e) {
      setErro(e.response?.data?.detail || 'Erro ao criar boleta.')
    }
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent'
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Nova Boleta
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Linha 1: Data, Cliente, Moeda */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Data</label>
            <input type="date" {...register('data', { required: true })} className={inputClass} />
          </div>

          <div className="relative">
            <label className={labelClass}>Cliente (CPF/CNPJ ou Nome)</label>
            <input
              type="text"
              value={clienteBusca}
              onChange={(e) => {
                setClienteBusca(e.target.value)
                setClienteSelecionado(null)
              }}
              placeholder="Digite 3+ caracteres..."
              className={inputClass}
            />
            {clienteSelecionado && (
              <p className="text-xs text-green-600 mt-1">
                {clienteSelecionado.nome} ({clienteSelecionado.cpf_cnpj})
              </p>
            )}
            {clientesResultado.length > 0 && !clienteSelecionado && (
              <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-40 overflow-auto">
                {clientesResultado.map((c) => (
                  <li
                    key={c.id}
                    onClick={() => {
                      setClienteSelecionado(c)
                      setClienteBusca(c.nome)
                      setClientesResultado([])
                    }}
                    className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-700 dark:text-gray-300"
                  >
                    {c.cpf_cnpj} - {c.nome}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className={labelClass}>Moeda</label>
            <select {...register('moeda_id', { required: true })} className={inputClass}>
              <option value="">Selecione...</option>
              {moedas?.map((m) => (
                <option key={m.id} value={m.id}>{m.codigo_iso} - {m.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Linha 2: Montante, Parceiro, Modalidade */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Montante (ME)</label>
            <input type="number" step="0.01" {...register('montante', { required: true })} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Parceiro</label>
            <select {...register('parceiro_id', { required: true })} className={inputClass}>
              <option value="">Selecione...</option>
              {parceiros?.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Modalidade</label>
            <input type="text" {...register('modalidade', { required: true })} placeholder="Ex: Disponibilidade" className={inputClass} />
          </div>
        </div>

        {/* Linha 3: Caminho, Spot, Taxa Cliente */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Caminho</label>
            <select {...register('caminho', { required: true })} className={inputClass}>
              <option value="">Selecione...</option>
              <option value="SAIDA">Saída (Envio)</option>
              <option value="ENTRADA">Entrada (Recebimento)</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Spot</label>
            <input type="number" step="0.000001" {...register('spot', { required: true })} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Taxa Cliente</label>
            <input type="number" step="0.000001" {...register('taxa_cliente', { required: true })} className={inputClass} />
          </div>
        </div>

        {/* Linha 4: PTAX, Isenções */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>
              PTAX D-1
              {moedaObj?.requer_ptax === false && (
                <span className="text-xs text-gray-400 ml-1">(N/A para USD)</span>
              )}
            </label>
            <input
              type="number"
              step="0.000001"
              {...register('ptax')}
              disabled={moedaObj?.requer_ptax === false}
              className={`${inputClass} ${moedaObj?.requer_ptax === false ? 'opacity-50' : ''}`}
            />
          </div>

          <div className="flex items-end gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" {...register('isencao_iof')} className="rounded" />
              Isento de IOF
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" {...register('isencao_tarifa')} className="rounded" />
              Isento de Tarifa
            </label>
          </div>

          <div>
            <label className={labelClass}>Indicação (Finder)</label>
            <input type="text" {...register('indicacao')} className={inputClass} />
          </div>
        </div>

        {/* Linha 5: Tarifa Negociada */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Tarifa Negociada (opcional)</label>
            <input type="number" step="0.01" {...register('tarifa_negociada')} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Moeda da Tarifa Negociada</label>
            <select {...register('moeda_tarifa_negociada')} className={inputClass}>
              <option value="">N/A</option>
              <option value="BRL">BRL</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        {erro && (
          <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={criarOperacao.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {criarOperacao.isPending ? 'Salvando...' : 'Salvar Rascunho'}
          </button>
        </div>
      </form>
    </div>
  )
}
