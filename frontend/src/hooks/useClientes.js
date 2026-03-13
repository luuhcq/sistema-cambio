import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

export function useClientes(q = '') {
  return useQuery({
    queryKey: ['clientes', q],
    queryFn: () => api.get('/cadastros/clientes', { params: { q } }).then((r) => r.data),
    enabled: q.length >= 3,
  })
}
