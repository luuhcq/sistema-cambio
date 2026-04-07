import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useMoedas } from '../../hooks/useMoedas'
import { useParceiros } from '../../hooks/useParceiros'
import { useModalidades } from '../../hooks/useModalidades'
import { usePtax } from '../../hooks/usePtax'
import { useCriarSolicitacao } from '../../hooks/useSolicitacoes'
import api from '../../api/axios'

export default function FormEdicaoBoleta({ operacao, onSuccess, onCancelar }) {
  const op = operacao
  const { register, handleSubmit, watch, setValue } = useForm()
  const watchData = watch('data')
  const watchMoeda = watch('moeda_id')
  const { data: moedas } = useMoedas()
  const { data: parceiros } = useParceiros()
  const { data: modalidades } = useModalidades()
  const { data: ptaxData } = usePtax(watchData)
  const criarSolicitacao = useCriarSolicitacao()
  const userInteractedRef = useRef(false)

  const [clienteBusca, setClienteBusca] = useState(op.cliente.nome)
  const [clienteSelecionado, setClienteSelecionado] = useState(op.cliente)
  const [clientesResultado, setClientesResultado] = useState([])
  const [justificativa, setJustificativa] = useState('')
  const [erro, setErro] = useState('')

  // Preenche com dados atuais
  useEffect(() => {
    setValue('data', op.data)
    setValue('moeda_id', String(op.moeda.id))
    setValue('montante', op.montante)
    setValue('parceiro_id', String(op.parceiro.id))
    setValue('modalidade', op.modalidade)
    setValue('caminho', op.caminho)
    setValue('spot', op.spot)
    setValue('taxa_cliente', op.taxa_cliente)
    setValue('ptax', op.ptax || '')
    setValue('isencao_iof', op.isencao_iof)
    setValue('isencao_tarifa', op.isencao_tarifa)
    setValue('tarifa_negociada', op.tarifa_negociada || '')
    setValue('moeda_tarifa_negociada', op.moeda_tarifa_negociada || '')
    setValue('indicacao', op.indicacao || '')
    // Libera auto-fill após a população inicial
    userInteractedRef.current = false
  }, [op, setValue])

  const moedaObj = moedas?.find((m) => m.id === Number(watchMoeda))

  // Auto-preenche PTAX apenas em mudanças explícitas de moeda ou data pelo usuário
  useEffect(() => {
    if (!userInteractedRef.current) return
    if (!moedaObj || moedaObj.requer_ptax === false) {
      setValue('ptax', '')
      return
    }
    if (!watchData || watchData.length !== 10) return
    if (ptaxData?.ptax) {
      setValue('ptax', ptaxData.ptax)
    }
  }, [watchMoeda, watchData, ptaxData, moedaObj, setValue])

  // Busca clientes
  useEffect(() => {
    if (clienteBusca.length >= 3 && !clienteSelecionado) {
      api.get('/cadastros/clientes', { params: { q: clienteBusca } })
        .then((r) => setClientesResultado(r.data))
        .catch(() => setClientesResultado([]))
    } else {
      setClientesResultado([])
    }
  }, [clienteBusca, clienteSelecionado])

  const onSubmit = async (data) => {
    if (!clienteSelecionado) {
      setErro('Selecione um cliente.')
      return
    }
    if (justificativa.trim().length < 10) {
      setErro('Justificativa deve ter no mínimo 10 caracteres.')
      return
    }

    setErro('')

    const dados_propostos = {
      data: data.data,
      cliente_id: clienteSelecionado.id,
      moeda_id: Number(data.moeda_id),
      montante: data.montante,
      parceiro_id: Number(data.parceiro_id),
      modalidade: data.modalidade,
      caminho: data.caminho,
      spot: data.spot,
      taxa_cliente: data.taxa_cliente,
      ptax: data.ptax || null,
      isencao_iof: data.isencao_iof || false,
      isencao_tarifa: data.isencao_tarifa || false,
      tarifa_negociada: data.tarifa_negociada || null,
      moeda_tarifa_negociada: data.moeda_tarifa_negociada || null,
      indicacao: data.indicacao || null,
    }

    try {
      await criarSolicitacao.mutateAsync({
        operacao_id: op.id,
        justificativa,
        dados_propostos,
      })
      onSuccess()
    } catch (e) {
      setErro(e.response?.data?.detail || 'Erro ao enviar solicitação.')
    }
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent'
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-5">
      <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-4">
        Propor Alterações — Boleta #{op.id}
      </h3>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Data</label>
            <input
              type="date"
              {...register('data')}
              onChange={(e) => { register('data').onChange(e); userInteractedRef.current = true }}
              className={inputClass}
            />
          </div>

          <div className="relative">
            <label className={labelClass}>Cliente</label>
            <input
              type="text"
              value={clienteBusca}
              onChange={(e) => {
                setClienteBusca(e.target.value)
                setClienteSelecionado(null)
              }}
              className={inputClass}
            />
            {clienteSelecionado && (
              <p className="text-xs text-green-600 mt-1">{clienteSelecionado.nome}</p>
            )}
            {clientesResultado.length > 0 && !clienteSelecionado && (
              <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-32 overflow-auto">
                {clientesResultado.map((c) => (
                  <li
                    key={c.id}
                    onClick={() => {
                      setClienteSelecionado(c)
                      setClienteBusca(c.nome)
                      setClientesResultado([])
                    }}
                    className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm"
                  >
                    {c.cpf_cnpj} - {c.nome}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className={labelClass}>Moeda</label>
            <select
              {...register('moeda_id')}
              onChange={(e) => { register('moeda_id').onChange(e); userInteractedRef.current = true }}
              className={inputClass}
            >
              {(() => {
                if (!moedas) return null
                const PRIORITARIAS = ['USD', 'EUR', 'GBP', 'CHF']
                const topo = PRIORITARIAS.map((iso) => moedas.find((m) => m.codigo_iso === iso)).filter(Boolean)
                const resto = moedas.filter((m) => !PRIORITARIAS.includes(m.codigo_iso))
                return (
                  <>
                    {topo.map((m) => (
                      <option key={m.id} value={m.id}>{m.codigo_iso} - {m.nome}</option>
                    ))}
                    {resto.length > 0 && (
                      <option disabled>───────────────</option>
                    )}
                    {resto.map((m) => (
                      <option key={m.id} value={m.id}>{m.codigo_iso} - {m.nome}</option>
                    ))}
                  </>
                )
              })()}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Montante (ME)</label>
            <input type="number" step="0.01" min="0.01" {...register('montante')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Parceiro</label>
            <select {...register('parceiro_id')} className={inputClass}>
              {parceiros?.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Modalidade</label>
            <select {...register('modalidade')} className={inputClass}>
              {modalidades?.map((m) => (
                <option key={m.nome} value={m.nome}>{m.nome}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Caminho</label>
            <select {...register('caminho')} className={inputClass}>
              <option value="SAIDA">Saída (Envio)</option>
              <option value="ENTRADA">Entrada (Recebimento)</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Spot</label>
            <input type="number" step="0.000001" min="0.000001" {...register('spot')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Taxa Cliente</label>
            <input type="number" step="0.000001" min="0.000001" {...register('taxa_cliente')} className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>PTAX D-1</label>
            <input
              type="number"
              step="0.000001"
              min="0.000001"
              {...register('ptax')}
              disabled={moedaObj?.requer_ptax === false}
              className={`${inputClass} ${moedaObj?.requer_ptax === false ? 'opacity-50' : ''}`}
            />
          </div>
          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" {...register('isencao_iof')} className="rounded" />
              Isento IOF
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" {...register('isencao_tarifa')} className="rounded" />
              Isento Tarifa
            </label>
          </div>
          <div>
            <label className={labelClass}>Indicação</label>
            <input type="text" {...register('indicacao')} className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Tarifa Negociada</label>
            <input type="number" step="0.01" min="0" {...register('tarifa_negociada')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Moeda Tarifa Neg.</label>
            <select {...register('moeda_tarifa_negociada')} className={inputClass}>
              <option value="">N/A</option>
              <option value="BRL">BRL</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        {/* Justificativa */}
        <div>
          <label className={labelClass}>Justificativa da alteração (mínimo 10 caracteres)</label>
          <textarea
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            rows={2}
            placeholder="Descreva o motivo da edição..."
            className={`${inputClass} resize-none`}
          />
        </div>

        {erro && (
          <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancelar}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={criarSolicitacao.isPending}
            className="px-5 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {criarSolicitacao.isPending ? 'Enviando...' : 'Enviar Solicitação'}
          </button>
        </div>
      </form>
    </div>
  )
}
