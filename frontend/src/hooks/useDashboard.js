import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

export function useDashboard(periodo = 'mensal', dataInicio = null, dataFim = null, escopo = 'minhas') {
  const validDate = (d) => !!d && d.length === 10 && parseInt(d.split('-')[0]) >= 2000
  const enabled = periodo !== 'custom' || !!(validDate(dataInicio) && validDate(dataFim))

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
    enabled,
  })
}
