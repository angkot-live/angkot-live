import { distanceKm } from '../../lib/geo.ts'
import type { LatLng } from '../../lib/geo.ts'
import type { TripPlan, TripWalk } from './trip-planner.ts'
import { tripScore } from './trip-planner.ts'

const DEFAULT_ENDPOINT = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot'
const WALK_METERS_PER_MINUTE = 4500 / 60

interface WalkingRoute {
  path: LatLng[]
  meters: number
  minutes: number
}

interface RouteResponse {
  code?: string
  routes?: { distance: number; geometry: { type: string; coordinates: number[][] } }[]
}

export function createWalkingRouter({
  endpoint = DEFAULT_ENDPOINT,
  fetcher = fetch,
  requestIntervalMs = 1050,
}: {
  endpoint?: string
  fetcher?: typeof fetch
  requestIntervalMs?: number
} = {}) {
  const cache = new Map<string, WalkingRoute>()
  let queue = Promise.resolve()
  let lastRequestAt = 0

  async function request(walk: TripWalk, signal?: AbortSignal): Promise<WalkingRoute> {
    const coordinates = [walk.from, walk.to].map(([lat, lng]) => `${lng},${lat}`).join(';')
    const cached = cache.get(coordinates)
    if (cached) return cached

    // FOSSGIS permits at most one request per second. Serialize the start times,
    // not the responses, so a slow request does not hold up all alternatives.
    const slot = queue.then(async () => {
      signal?.throwIfAborted()
      const delay = requestIntervalMs - (Date.now() - lastRequestAt)
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))
      signal?.throwIfAborted()
      lastRequestAt = Date.now()
    })
    queue = slot.catch(() => {})
    await slot

    const timeout = AbortSignal.timeout(15000)
    const response = await fetcher(
      `${endpoint}/${coordinates}?overview=full&geometries=geojson&steps=false&radiuses=100;100`,
      { signal: signal ? AbortSignal.any([signal, timeout]) : timeout },
    )
    if (!response.ok) throw new Error('Layanan jalan kaki tidak tersedia')
    const data = await response.json() as RouteResponse
    const route = data.routes?.[0]
    if (
      data.code !== 'Ok' || !route || !Number.isFinite(route.distance) || route.distance < 0 ||
      route.geometry?.type !== 'LineString' || !Array.isArray(route.geometry.coordinates) ||
      route.geometry.coordinates.length < 2 ||
      !route.geometry.coordinates.every((point) =>
        point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]) &&
        Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90,
      )
    ) throw new Error('Jalur jalan kaki tidak ditemukan')

    const result: WalkingRoute = {
      path: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      meters: Math.round(route.distance),
      minutes: Math.max(1, Math.round(route.distance / WALK_METERS_PER_MINUTE)),
    }
    // Do not accept a route that snapped to an unrelated street far away.
    if (distanceKm(walk.from, result.path[0]) > 0.1 ||
        distanceKm(walk.to, result.path[result.path.length - 1]) > 0.1) {
      throw new Error('Jalan terlalu jauh dari titik lokasi')
    }
    if (cache.size >= 200) cache.delete(cache.keys().next().value!)
    cache.set(coordinates, result)
    return result
  }

  async function routeWalk(walk: TripWalk, signal?: AbortSignal): Promise<TripWalk> {
    signal?.throwIfAborted()
    // Identical endpoints need no network request and no line on the map.
    if (walk.from[0] === walk.to[0] && walk.from[1] === walk.to[1]) {
      return { ...walk, path: [], meters: 0, minutes: 0, routing: 'routed' }
    }
    try {
      return { ...walk, ...await request(walk, signal), routing: 'routed' }
    } catch {
      signal?.throwIfAborted()
      // Keep estimates for the trip summary, but never draw a made-up straight line.
      return { ...walk, path: [], routing: 'unavailable' }
    }
  }

  async function routePlan(plan: TripPlan, signal?: AbortSignal): Promise<TripPlan> {
    const pending = new Map<string, Promise<TripWalk>>()
    const resolve = (walk: TripWalk) => {
      const key = JSON.stringify([walk.from, walk.to])
      let result = pending.get(key)
      if (!result) {
        result = routeWalk(walk, signal)
        pending.set(key, result)
      }
      return result
    }
    const [itineraries, walkOnly] = await Promise.all([
      Promise.all(plan.itineraries.map(async (itinerary) => {
        const [accessWalk, egressWalk, transfers] = await Promise.all([
          resolve(itinerary.accessWalk),
          resolve(itinerary.egressWalk),
          Promise.all(itinerary.transfers.map(async (transfer) => ({
            ...transfer, walk: await resolve(transfer.walk),
          }))),
        ])
        const walkMinutes = accessWalk.minutes + egressWalk.minutes +
          transfers.reduce((sum, transfer) => sum + transfer.walk.minutes, 0)
        const delta = walkMinutes - itinerary.walkMinutes
        return {
          ...itinerary, accessWalk, egressWalk, transfers, walkMinutes,
          totalMinutes: itinerary.totalMinutes + delta,
          score: tripScore(itinerary.totalMinutes + delta, walkMinutes, transfers.length),
        }
      })),
      plan.walkOnly ? resolve(plan.walkOnly) : null,
    ])
    return { ...plan, walkOnly, itineraries: itineraries.sort((a, b) => a.score - b.score) }
  }

  return { routeWalk, routePlan }
}

export const walkingRouter = createWalkingRouter({
  endpoint: import.meta.env?.VITE_WALK_ROUTING_URL || DEFAULT_ENDPOINT,
})

export function hasUnavailableWalks(plan: TripPlan): boolean {
  return (plan.walkOnly?.routing === 'unavailable') || plan.itineraries.some((itinerary) =>
    [itinerary.accessWalk, itinerary.egressWalk, ...itinerary.transfers.map((transfer) => transfer.walk)]
      .some((walk) => walk.routing === 'unavailable'),
  )
}
