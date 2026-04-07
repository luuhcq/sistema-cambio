import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

export function useClienteMetricas(clienteId, dataInicio, dataFim) {
  return useQuery({
    queryKey: ['cliente-metricas', clienteId, dataInicio, dataFim],
    queryFn: () => {
      const params = {}
      if (dataInicio) params.data_inicio = dataInicio
      if (dataFim) params.data_fim = dataFim
      return api.get(`/cadastros/clientes/${clienteId}/metricas`, { params }).then((r) => r.data)
    },
    enabled: !!clienteId,
  })
}
