import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { RouteInfo } from '@/types'
import { setPlaceRoutes } from '@/features/routing/geocode'

const empty: RouteInfo[] = []
export function useRoutes(includeInactive = false) {
  const query = useQuery({
    queryKey: ['route-catalog', includeInactive],
    queryFn: () =>
      api<RouteInfo[]>(
        `/routes${includeInactive ? '?includeInactive=true' : ''}`,
      ),
    staleTime: 3000,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  })
  const routes = query.data ?? empty
  useEffect(() => {
    setPlaceRoutes(routes.filter((r) => r.isActive !== false))
  }, [routes])
  return { ...query, routes }
}
