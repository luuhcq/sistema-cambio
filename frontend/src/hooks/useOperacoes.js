import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'

export function useOperacoes() {
  return useQuery({
    queryKey: ['operacoes'],
    queryFn: () => api.get('/operacoes/').then((r) => r.data),
  })
}

export function useCriarOperacao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/operacoes/', data).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['operacoes'] }),
  })
}
