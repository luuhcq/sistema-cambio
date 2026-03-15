import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

export function useDashboard(periodo = 'mensal', dataInicio = null, dataFim = null, escopo = 'minhas') {
  return useQuery({
    queryKey: ['dashboard', periodo, dataInicio, dataFim, escopo],
    queryFn: () => {
      const params = { periodo, escopo }
      if (periodo === 'custom' && dataInicio && dataFim) {
        params.data_inicio = dataInicio
        params.data_fim = dataFim
      }
      return api.get('/dashboard/indicadores', { params }).then((r) => r.data)
    },
  })
}
