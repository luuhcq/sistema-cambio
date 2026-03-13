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

export function useSubmeterOperacao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.post(`/operacoes/${id}/submeter`).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['operacoes'] }),
  })
}

export function useAprovarOperacao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.post(`/operacoes/${id}/aprovar`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operacoes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useCancelarOperacao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, justificativa }) =>
      api.post(`/operacoes/${id}/cancelar`, { justificativa }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['operacoes'] }),
  })
}

export function useExcluirOperacao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, justificativa }) =>
      api.delete(`/operacoes/${id}`, { data: { justificativa } }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['operacoes'] }),
  })
}
