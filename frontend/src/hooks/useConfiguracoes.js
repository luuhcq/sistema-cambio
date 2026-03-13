import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

export function useTarifas() {
  return useQuery({
    queryKey: ['tarifas'],
    queryFn: () => api.get('/configuracoes/tarifas').then((r) => r.data),
  })
}

export function useComissoes() {
  return useQuery({
    queryKey: ['comissoes'],
    queryFn: () => api.get('/configuracoes/comissoes').then((r) => r.data),
  })
}

export function useIOF() {
  return useQuery({
    queryKey: ['iof'],
    queryFn: () => api.get('/configuracoes/iof').then((r) => r.data),
  })
}
