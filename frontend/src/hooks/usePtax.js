import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

export function usePtax() {
  return useQuery({
    queryKey: ['ptax'],
    queryFn: () => api.get('/ptax/cotacao').then((r) => r.data),
    staleTime: 1000 * 60 * 60, // 1 hora
  })
}
