import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

export function useMoedas() {
  return useQuery({
    queryKey: ['moedas'],
    queryFn: () => api.get('/cadastros/moedas').then((r) => r.data),
  })
}
