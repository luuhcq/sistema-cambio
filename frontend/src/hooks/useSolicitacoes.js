import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'

export function useSolicitacoes() {
  return useQuery({
    queryKey: ['solicitacoes'],
    queryFn: () => api.get('/solicitacoes/').then((r) => r.data),
  })
}

export function useCriarSolicitacao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/solicitacoes/', data).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['solicitacoes'] }),
  })
}

export function useAprovarSolicitacao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, acao }) => api.post(`/solicitacoes/${id}/aprovar`, { acao }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes'] })
      queryClient.invalidateQueries({ queryKey: ['operacoes'] })
    },
  })
}

export function useRejeitarSolicitacao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, comentario }) => api.post(`/solicitacoes/${id}/rejeitar`, { comentario }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['solicitacoes'] }),
  })
}
