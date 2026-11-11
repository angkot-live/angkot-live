import { useMemo } from 'react'
import { useAuthStore } from '@/features/auth/auth-store'
import { api, post } from '@/lib/api'
import { fixPayload } from '@/hooks/use-gps'
import { getCurrentLocation } from '@/lib/geolocation'
import {
  toMegat,
  useLiveStore,
  type ServerRequest,
  type ServerTrip,
} from './live-store'

export const megatStore = {
  create: async (input: {
    routeId: string
    destination: string
    destinationPoint?: [number, number]
  }) => {
    const actor = useAuthStore.getState().user?.id
    const fix = await getCurrentLocation()
    if (!actor || actor !== useAuthStore.getState().user?.id) throw new Error('Sesi akun telah berubah')
    const r = await post<ServerRequest>('/passenger/requests', {
      ...input,
      ...fixPayload(fix),
      key: crypto.randomUUID(),
    })
    if (actor !== useAuthStore.getState().user?.id)
      throw new Error('Sesi akun telah berubah')
    useLiveStore.setState({ request: r })
    return toMegat(r)
  },
  cancel: async (id: string, _passengerId?: string) => {
    const actor = useAuthStore.getState().user?.id
    const r = await post<ServerRequest>('/passenger/requests/cancel', {
      id,
      key: `cancel-${id}`,
    })
    if (actor !== useAuthStore.getState().user?.id)
      throw new Error('Sesi akun telah berubah')
    useLiveStore.setState({ request: r })
    return true
  },
  board: async (id: string, vehicleId: string) => {
    const actor = useAuthStore.getState().user?.id
    const trip = await post<ServerTrip>('/passenger/trips', {
      id,
      vehicleId,
      key: `board-${id}`,
    })
    if (actor !== useAuthStore.getState().user?.id)
      throw new Error('Sesi akun telah berubah')
    useLiveStore.setState({ trip, request: null })
    return trip
  },
  refresh: async () => {
    const request = await api<ServerRequest | null>(
      '/passenger/requests/current',
    )
    useLiveStore.setState({ request })
  },
}
export function useMegat() {
  const request = useLiveStore((s) => s.request)
  const sampledAt = useLiveStore((s) => s.serverTime)
  return useMemo(
    () => ({ requests: request ? [toMegat(request)] : [], sampledAt }),
    [request, sampledAt],
  )
}
