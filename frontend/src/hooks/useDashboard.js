import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

export function useDashboard(periodo = 'mensal') {
  return useQuery({
    queryKey: ['dashboard', periodo],
    queryFn: () => api.get('/dashboard/indicadores', { params: { periodo } }).then((r) => r.data),
  })
}
