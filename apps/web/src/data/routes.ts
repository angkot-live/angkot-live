import angkotRoutes from '@/data/angkot-routes.json'
import type { RouteInfo } from '@/types'

export const routes: RouteInfo[] = angkotRoutes.routes.map((route) => ({
  ...route,
  polyline: route.polyline as [number, number][],
  segments: (route.segments as [number, number][][] | null) ?? undefined,
  streetRuns: route.streetRuns as [number, string][][],
  endstops: route.endstops.map((stop) => ({
    ...stop,
    position: stop.position as [number, number],
  })),
}))
