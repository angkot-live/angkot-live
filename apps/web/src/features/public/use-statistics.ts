import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
export interface PublicStatistics {
  routes: number
  routeCodes: number
  totalVehicles: number
  activeVehicles: number
  verifiedDrivers: number
  reports: number
  received: number
  processing: number
  resolved: number
  activeByRoute: Record<string, number>
  activeByDirection: Record<string, number>
  vehicleStatuses: Record<string, number>
}
export function usePublicStatistics() {
  return useQuery({
    queryKey: ['public-stats'],
    queryFn: () => api<PublicStatistics>('/stats/public'),
    refetchInterval: 5000,
    staleTime: 3000,
  })
}
