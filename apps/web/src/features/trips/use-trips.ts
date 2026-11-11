import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/auth-store'
import { api } from '@/lib/api'
import { useRoutes } from '@/features/routes/use-routes'
import type { Trip } from '@/types/trip'
import type { ServerTrip } from '@/features/tracking/live-store'
export function useTrips() {
  const { routes } = useRoutes(true)
  const user = useAuthStore((s) => s.user)
  const query = useQuery({
    queryKey: ['trips', user?.id],
    queryFn: () => api<ServerTrip[]>('/passenger/trips'),
    enabled: user?.role === 'penumpang',
    refetchInterval: 10000,
  })
  const trips: Trip[] = (query.data ?? [])
    .filter((t) => t.status === 'completed')
    .map((t) => {
      const route = routes.find((r) => r.id === t.route_id)
      return {
        id: t.id,
        vehicleId: t.vehicle_id,
        telemetrySource: t.telemetry_source,
        code: `TRP-${t.id.slice(0, 8).toUpperCase()}`,
        date: t.started_at,
        routeCode: route?.code ?? '',
        routeName: route?.name ?? 'Trayek',
        from: t.origin_name,
        to: t.destination_name,
        durationMinutes: Math.max(
          0,
          Math.round(
            (Date.parse(t.finished_at ?? t.started_at) -
              Date.parse(t.started_at)) /
              60000,
          ),
        ),
        distanceKm: t.distance_km,
        fare: t.fare,
        status: 'selesai',
      }
    })
  return { ...query, trips }
}
