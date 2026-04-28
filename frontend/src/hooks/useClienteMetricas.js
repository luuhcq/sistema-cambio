import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

export function useClienteMetricas(clienteId, dataInicio, dataFim, moeda, parceiro) {
  return useQuery({
    queryKey: ['cliente-metricas', clienteId, dataInicio, dataFim, moeda, parceiro],
    queryFn: () => {
      const params = {}
      if (dataInicio) params.data_inicio = dataInicio
      if (dataFim) params.data_fim = dataFim
      if (moeda) params.moeda = moeda
      if (parceiro) params.parceiro = parceiro
      return api.get(`/cadastros/clientes/${clienteId}/metricas`, { params }).then((r) => r.data)
    },
    enabled: !!clienteId,
  })
}
