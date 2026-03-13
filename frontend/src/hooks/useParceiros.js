import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

export function useParceiros() {
  return useQuery({
    queryKey: ['parceiros'],
    queryFn: () => api.get('/cadastros/parceiros').then((r) => r.data),
  })
}
