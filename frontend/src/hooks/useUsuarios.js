import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'

export function useUsuarios() {
  return useQuery({
    queryKey: ['usuarios'],
    queryFn: () => api.get('/usuarios/').then((r) => r.data),
  })
}

export function useCriarUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/usuarios/', data).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
  })
}

export function useAlternarStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.post(`/usuarios/${id}/alternar-status`).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
  })
}

export function useAlterarPerfil() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, perfil }) => api.post(`/usuarios/${id}/alterar-perfil`, { perfil }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
  })
}

export function useResetarSenha() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nova_senha }) => api.post(`/usuarios/${id}/resetar-senha`, { nova_senha }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
  })
}

export function useTrocarSenha() {
  return useMutation({
    mutationFn: (data) => api.post('/auth/trocar-senha', data).then((r) => r.data),
  })
}
