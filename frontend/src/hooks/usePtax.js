import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

export function usePtax(dataBoleta) {
  return useQuery({
    queryKey: ['ptax', dataBoleta],
    queryFn: () => {
      const params = {}
      if (dataBoleta) params.data_boleta = dataBoleta
      return api.get('/ptax/cotacao', { params }).then((r) => r.data)
    },
    enabled: typeof dataBoleta === 'string' && dataBoleta.length === 10,
    staleTime: 1000 * 60 * 60, // 1 hora
  })
}
