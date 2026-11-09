import type { LatLng } from '../../lib/geo.ts'
import type { RouteInfo, Vehicle } from '../../types/index.ts'
import type { SnapshotTransport } from './tracking-state.ts'
import {
  activeMegat, canSeeMegat, effectiveMegat, latestMegatRequests, mergeMegat, parseMegat, projectToRoute,
  MEGAT_ROUTE_RADIUS_KM, MEGAT_WAIT_MS, type MegatRequest, type MegatState,
} from './megat-engine.ts'

export function createMegatStore(
  routes: RouteInfo[], transport: SnapshotTransport, writer: string,
  now = () => Date.now(), newId = () => crypto.randomUUID(),
) {
  let state: MegatState = parseMegat(transport.read(), routes) ?? { schema: 1, requests: {} }
  const listeners = new Set<() => void>()
  const snapshot = () => {
    const sampledAt = now()
    return { state, sampledAt, requests: latestMegatRequests(Object.values(state.requests)).map((r) => effectiveMegat(r, sampledAt)) }
  }
  let current = snapshot()
  const tick = () => { current = snapshot(); listeners.forEach((listener) => listener()) }
  const receive = (value: unknown) => {
    const incoming = parseMegat(value, routes)
    if (!incoming) return
    const merged = mergeMegat(state, incoming)
    if (merged !== state) { state = merged; transport.write(state); tick() }
  }
  const disconnect = transport.listen(receive)
  const save = () => {
    transport.write(state)
    transport.publish(state)
    tick()
  }
  const change = (id: string, transform: (request: MegatRequest) => Partial<MegatRequest> | null) => {
    receive(transport.read())
    const raw = state.requests[id]
    if (!raw) return false
    const request = effectiveMegat(raw, now())
    const patch = transform(request)
    if (!patch) return false
    state = { schema: 1, requests: { ...state.requests, [id]: {
      ...request, ...patch, revision: Math.max(now(), raw.revision + 1), writer,
    } } }
    save()
    return true
  }

  return {
    getSnapshot: () => current,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    tick, close: disconnect,
    create: (input: { passengerId: string; name: string; destination: string; routeId: string; position: LatLng }) => {
      receive(transport.read())
      const route = routes.find((item) => item.id === input.routeId)
      if (!route || input.position.length !== 2 || !input.position.every(Number.isFinite) ||
          Math.abs(input.position[0]) > 90 || Math.abs(input.position[1]) > 180) throw new Error('Trayek atau lokasi penumpang tidak valid.')
      // A passenger has one active request. Keep cancellation records to prevent stale tabs resurrecting it.
      for (const r of Object.values(state.requests)) {
        if (r.passengerId === input.passengerId && activeMegat(effectiveMegat(r, now()))) {
          change(r.id, () => ({ status: 'cancelled' }))
        }
      }
      const projected = projectToRoute(input.position, route)
      const walking = projected.distanceKm > MEGAT_ROUTE_RADIUS_KM
      const createdAt = Math.max(now(), ...Object.values(state.requests)
        .filter((r) => r.passengerId === input.passengerId).map((r) => r.createdAt + 1))
      const request: MegatRequest = {
        ...input, id: newId(), pickup: projected.point, vehicleId: null,
        status: walking ? 'walking' : 'searching', createdAt,
        expiresAt: now() + (walking ? 300000 : MEGAT_WAIT_MS), revision: now(), writer,
      }
      const recent = Object.values(state.requests).sort((a, b) => b.createdAt - a.createdAt).slice(0, 99)
      state = { schema: 1, requests: { ...Object.fromEntries(recent.map((r) => [r.id, r])), [request.id]: request } }
      save()
      return request
    },
    arrive: (id: string, passengerId: string, position: LatLng) => change(id, (r) => {
      if (r.passengerId !== passengerId || r.status !== 'walking' ||
          !position || position.length !== 2 || !position.every(Number.isFinite)) return null
      const route = routes.find((item) => item.id === r.routeId)
      if (!route) return null
      const projected = projectToRoute(position, route)
      return projected.distanceKm <= MEGAT_ROUTE_RADIUS_KM
        ? { status: 'searching', position, pickup: projected.point, expiresAt: now() + MEGAT_WAIT_MS } : null
    }),
    cancel: (id: string, passengerId: string) => change(id, (r) => r.passengerId === passengerId && activeMegat(r)
      ? { status: 'cancelled', vehicleId: null } : null),
    accept: (id: string, vehicle: Vehicle, radiusKm = 2) => change(id, (r) => {
      const route = routes.find((item) => item.id === r.routeId)
      return r.status === 'searching' && route && canSeeMegat(r, vehicle, route, now(), radiusKm)
        ? { status: 'accepted', vehicleId: vehicle.id, expiresAt: now() + 300000 } : null
    }),
    board: (id: string, passengerId: string) => change(id, (r) => r.passengerId === passengerId && r.status === 'accepted'
      ? { status: 'boarded' } : null),
  }
}
