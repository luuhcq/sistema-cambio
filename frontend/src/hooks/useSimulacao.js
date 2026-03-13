import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

export function useSimulacao(payload) {
  const camposPreenchidos =
    payload?.cliente_id &&
    payload?.moeda_id &&
    payload?.parceiro_id &&
    payload?.montante &&
    payload?.modalidade &&
    payload?.caminho &&
    payload?.spot &&
    payload?.taxa_cliente

  return useQuery({
    queryKey: ['simulacao', payload],
    queryFn: () => api.post('/operacoes/simular', payload).then((r) => r.data),
    enabled: !!camposPreenchidos,
    staleTime: 0,
  })
}
