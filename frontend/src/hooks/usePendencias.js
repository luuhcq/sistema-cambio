import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

export function usePendencias() {
  return useQuery({
    queryKey: ['pendencias'],
    queryFn: () => api.get('/dashboard/pendencias').then((r) => r.data),
  })
}
