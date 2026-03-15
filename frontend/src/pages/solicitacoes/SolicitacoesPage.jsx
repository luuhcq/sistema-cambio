import { useState, useMemo } from 'react'
import { useSolicitacoes, useAprovarSolicitacao, useRejeitarSolicitacao } from '../../hooks/useSolicitacoes'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'

const STATUS_CORES = {
  PENDENTE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  APROVADA: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REJEITADA: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

const STATUS_OPTIONS = ['TODOS', 'PENDENTE', 'APROVADA', 'REJEITADA']

const LABELS_CAMPOS = {
  data: 'Data', cliente_id: 'Cliente', moeda_id: 'Moeda', montante: 'Montante',
  parceiro_id: 'Parceiro', modalidade: 'Modalidade', caminho: 'Caminho',
  spot: 'Spot', taxa_cliente: 'Taxa Cliente', ptax: 'PTAX',
  isencao_iof: 'Isento IOF', isencao_tarifa: 'Isento Tarifa',
  tarifa_negociada: 'Tarifa Negociada', moeda_tarifa_negociada: 'Moeda Tarifa Neg.',
  indicacao: 'Indicação',
}

const LABELS_CALC = {
  aliquota_iof: 'Alíquota IOF', iof_nominal: 'IOF Nominal',
  tarifa_nominal: 'Tarifa Nominal', valor_base_brl: 'Base (Montante × Taxa)',
  vet: 'VET', spread: 'Spread', comissao_bruta: 'Comissão Bruta',
  comissao_liquida: 'Comissão Líquida',
}

function formatValor(campo, valor) {
  if (valor === null || valor === undefined) return '—'
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não'
  if (campo === 'caminho') return valor === 'SAIDA' ? 'Saída' : 'Entrada'
  return String(valor)
}

function formatCalc(campo, valor) {
  if (valor === null || valor === undefined) return '—'
  const num = Number(valor)
  if (campo === 'aliquota_iof') return `${(num * 100).toFixed(2).replace('.', ',')}%`
  if (campo === 'spread') return `${num.toFixed(4).replace('.', ',')}%`
  if (['iof_nominal', 'tarifa_nominal', 'valor_base_brl', 'vet', 'comissao_bruta', 'comissao_liquida'].includes(campo)) {
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }
  return String(valor)
}

function formatData(dataStr) {
  if (!dataStr) return ''
  const d = new Date(dataStr)
  return d.toLocaleString('pt-BR')
}

function DiffView({ originais, propostos }) {
  const campos = Object.keys(propostos)
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <div className="font-medium text-gray-500 dark:text-gray-400">Campo</div>
      <div className="font-medium text-gray-500 dark:text-gray-400">Antes</div>
      <div className="font-medium text-gray-500 dark:text-gray-400">Depois</div>
      {campos.map((campo) => {
        const label = LABELS_CAMPOS[campo] || campo
        const antes = formatValor(campo, originais[campo])
        const depois = formatValor(campo, propostos[campo])
        const mudou = antes !== depois
        return (
          <div key={campo} className="contents">
            <div className="py-1 text-gray-700 dark:text-gray-300">{label}</div>
            <div className={`py-1 ${mudou ? 'line-through text-red-400' : 'text-gray-500'}`}>{antes}</div>
            <div className={`py-1 ${mudou ? 'bg-amber-100 dark:bg-amber-900/30 px-2 rounded font-medium text-amber-800 dark:text-amber-400' : 'text-gray-500'}`}>{depois}</div>
          </div>
        )
      })}
    </div>
  )
}

function PreviewComparativo({ simAntes, simDepois }) {
  if (!simAntes || !simDepois) return null
  const campos = Object.keys(LABELS_CALC)
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <div className="font-medium text-gray-500 dark:text-gray-400">Indicador</div>
      <div className="font-medium text-gray-500 dark:text-gray-400">Antes</div>
      <div className="font-medium text-gray-500 dark:text-gray-400">Depois</div>
      {campos.map((campo) => {
        const antes = formatCalc(campo, simAntes[campo])
        const depois = formatCalc(campo, simDepois[campo])
        const mudou = antes !== depois
        return (
          <div key={campo} className="contents">
            <div className="py-1 text-gray-700 dark:text-gray-300">{LABELS_CALC[campo]}</div>
            <div className={`py-1 font-mono ${mudou ? 'text-red-400' : 'text-gray-500'}`}>{antes}</div>
            <div className={`py-1 font-mono ${mudou ? 'bg-amber-100 dark:bg-amber-900/30 px-2 rounded font-medium text-amber-800 dark:text-amber-400' : 'text-gray-500'}`}>{depois}</div>
          </div>
        )
      })}
    </div>
  )
}

function ModalDiff({ solicitacao, onFechar }) {
  const { user } = useAuth()
  const aprovar = useAprovarSolicitacao()
  const rejeitar = useRejeitarSolicitacao()
  const [comentarioRejeicao, setComentarioRejeicao] = useState('')
  const [mostrarRejeicao, setMostrarRejeicao] = useState(false)
  const [erro, setErro] = useState('')
  const [simAntes, setSimAntes] = useState(null)
  const [simDepois, setSimDepois] = useState(null)
  const [carregandoSim, setCarregandoSim] = useState(true)

  const isGestor = user?.perfil === 'Gestor'
  const isPendente = solicitacao.status === 'PENDENTE'

  useState(() => {
    const simular = async () => {
      setCarregandoSim(true)
      try {
        const orig = solicitacao.dados_originais
        const prop = { ...orig, ...solicitacao.dados_propostos }

        const montarPayload = (d) => ({
          cliente_id: d.cliente_id, moeda_id: d.moeda_id, montante: d.montante,
          parceiro_id: d.parceiro_id, modalidade: d.modalidade, caminho: d.caminho,
          spot: d.spot, taxa_cliente: d.taxa_cliente, ptax: d.ptax || null,
          isencao_iof: d.isencao_iof || false, isencao_tarifa: d.isencao_tarifa || false,
          tarifa_negociada: d.tarifa_negociada || null,
          moeda_tarifa_negociada: d.moeda_tarifa_negociada || null,
        })

        const [resAntes, resDepois] = await Promise.all([
          api.post('/operacoes/simular', montarPayload(orig)),
          api.post('/operacoes/simular', montarPayload(prop)),
        ])
        setSimAntes(resAntes.data)
        setSimDepois(resDepois.data)
      } catch { /* silencia */ } finally {
        setCarregandoSim(false)
      }
    }
    simular()
  })

  const handleAprovar = async (acao) => {
    try {
      setErro('')
      await aprovar.mutateAsync({ id: solicitacao.id, acao })
      onFechar()
    } catch (e) {
      setErro(e.response?.data?.detail || 'Erro ao aprovar.')
    }
  }

  const handleRejeitar = async () => {
    if (comentarioRejeicao.trim().length < 5) {
      setErro('Comentário deve ter no mínimo 5 caracteres.')
      return
    }
    try {
      setErro('')
      await rejeitar.mutateAsync({ id: solicitacao.id, comentario: comentarioRejeicao })
      onFechar()
    } catch (e) {
      setErro(e.response?.data?.detail || 'Erro ao rejeitar.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Solicitação de Edição — Boleta #{solicitacao.operacao_id}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Por {solicitacao.solicitado_por.first_name || solicitacao.solicitado_por.username} • {formatData(solicitacao.criado_em)}
            </p>
          </div>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Justificativa</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{solicitacao.justificativa}</p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Alterações Propostas</h4>
            <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <DiffView originais={solicitacao.dados_originais} propostos={solicitacao.dados_propostos} />
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Impacto nos Cálculos</h4>
            <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              {carregandoSim ? (
                <p className="text-sm text-gray-400 py-2">Calculando impacto...</p>
              ) : simAntes && simDepois ? (
                <PreviewComparativo simAntes={simAntes} simDepois={simDepois} />
              ) : (
                <p className="text-sm text-gray-400 py-2">Não foi possível calcular o impacto.</p>
              )}
            </div>
          </div>

          {simDepois?.spread_negativo && (
            <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                ⚠ Os novos valores resultam em spread negativo — prejuízo para a mesa.
              </p>
            </div>
          )}

          {solicitacao.comentario_gestor && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-xs font-medium text-red-500 mb-1">Comentário do Gestor</p>
              <p className="text-sm text-red-700 dark:text-red-400">{solicitacao.comentario_gestor}</p>
            </div>
          )}

          {mostrarRejeicao && isPendente && (
            <textarea
              value={comentarioRejeicao}
              onChange={(e) => setComentarioRejeicao(e.target.value)}
              placeholder="Motivo da rejeição (mínimo 5 caracteres)..."
              rows={2}
              className="w-full px-3 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none"
            />
          )}

          {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}

          {isGestor && isPendente && (
            <div className="flex justify-end gap-2 pt-2">
              {!mostrarRejeicao ? (
                <>
                  <button onClick={() => setMostrarRejeicao(true)} className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Rejeitar</button>
                  <button onClick={() => handleAprovar('manter_pendente')} disabled={aprovar.isPending} className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50">Aprovar (Manter Pendente)</button>
                  <button onClick={() => handleAprovar('confirmar')} disabled={aprovar.isPending} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">Aprovar e Confirmar</button>
                </>
              ) : (
                <>
                  <button onClick={() => setMostrarRejeicao(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">Voltar</button>
                  <button onClick={handleRejeitar} disabled={rejeitar.isPending} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">Confirmar Rejeição</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SolicitacoesPage() {
  const { data: solicitacoes, isLoading } = useSolicitacoes()
  const [filtroStatus, setFiltroStatus] = useState('PENDENTE')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [diffAberto, setDiffAberto] = useState(null)

  const filtradas = useMemo(() => {
    if (!solicitacoes) return []
    return solicitacoes.filter((s) => {
      if (filtroStatus !== 'TODOS' && s.status !== filtroStatus) return false
      if (filtroDataInicio) {
        const dataSol = s.criado_em.split('T')[0]
        if (dataSol < filtroDataInicio) return false
      }
      if (filtroDataFim) {
        const dataSol = s.criado_em.split('T')[0]
        if (dataSol > filtroDataFim) return false
      }
      return true
    })
  }, [solicitacoes, filtroStatus, filtroDataInicio, filtroDataFim])

  const selectClass = 'px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent'

  if (isLoading) return <p className="text-gray-500">Carregando...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Solicitações de Edição</h1>
        <span className="text-sm text-gray-400">
          {filtradas.filter((s) => s.status === 'PENDENTE').length} pendente(s)
        </span>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setFiltroStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filtroStatus === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                {s === 'TODOS' ? 'Todas' : s}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

          <input type="date" value={filtroDataInicio} onChange={(e) => setFiltroDataInicio(e.target.value)} className={selectClass} />
          <span className="text-gray-400 text-sm">a</span>
          <input type="date" value={filtroDataFim} onChange={(e) => setFiltroDataFim(e.target.value)} className={selectClass} />

          <span className="ml-auto text-xs text-gray-400">
            {filtradas.length} solicitação(ões)
          </span>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 font-medium">Boleta</th>
              <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 font-medium">Solicitado por</th>
              <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 font-medium">Justificativa</th>
              <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 font-medium">Campos</th>
              <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-400 font-medium">Data</th>
              <th className="px-4 py-3 text-center text-gray-600 dark:text-gray-400 font-medium">Status</th>
              <th className="px-4 py-3 text-center text-gray-600 dark:text-gray-400 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Nenhuma solicitação encontrada.
                </td>
              </tr>
            )}
            {filtradas.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">#{s.operacao_id}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                  {s.solicitado_por.first_name || s.solicitado_por.username}
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-xs truncate">{s.justificativa}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                  {Object.keys(s.dados_propostos).length} campo{Object.keys(s.dados_propostos).length > 1 ? 's' : ''}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                  {formatData(s.criado_em)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_CORES[s.status]}`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => setDiffAberto(s)}
                    className="px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                  >
                    Ver Diff
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {diffAberto && (
        <ModalDiff solicitacao={diffAberto} onFechar={() => setDiffAberto(null)} />
      )}
    </div>
  )
}
