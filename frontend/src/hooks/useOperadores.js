import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

export function useOperadores() {
  return useQuery({
    queryKey: ['operadores'],
    queryFn: () => api.get('/cadastros/operadores').then((r) => r.data),
  })
}
