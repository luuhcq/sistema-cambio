import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'

export function useClientes(q = '') {
  return useQuery({
    queryKey: ['clientes', q],
    queryFn: () => api.get('/cadastros/clientes', { params: { q } }).then((r) => r.data),
    enabled: q.length >= 3,
  })
}

export function useListarClientes() {
  return useQuery({
    queryKey: ['clientes', 'todos'],
    queryFn: () => api.get('/cadastros/clientes').then((r) => r.data),
  })
}

export function useCriarCliente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/cadastros/clientes', data).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clientes'] }),
  })
}
