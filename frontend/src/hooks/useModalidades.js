import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

export function useModalidades() {
  return useQuery({
    queryKey: ['modalidades'],
    queryFn: () => api.get('/cadastros/modalidades').then((r) => r.data),
  })
}
