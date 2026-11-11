import { create } from 'zustand'
import type { Vehicle, DriverMode } from '@/types'
import type { MegatRequest } from './megat-engine'
import type { LatLng } from '@/lib/geo'
import { API_URL } from '@/lib/api'
import { supabase } from '@/lib/supabase'

export interface ServerRequest {
  id: string
  passenger_id: string
  route_id: string
  name: string
  destination: string
  position: LatLng
  pickup: LatLng
  status: MegatRequest['status']
  matched_vehicle_id: string | null
  created_at: string
  expires_at: string
  last_seen_at: string
  revision: number
}
export interface ServerTrip {
  telemetry_source?:'gps'|'simulation'
  id: string
  request_id: string
  vehicle_id: string
  route_id: string
  origin_name: string
  destination_name: string
  destination_point?: LatLng | null
  status: 'active' | 'completed'
  started_at: string
  finished_at: string | null
  distance_km: number
  start_offset_km: number
  chain_index: number
  fare: number
}
export interface Duty {
  mode: DriverMode
  session: string
  vehicle: Vehicle | null
  prompt: { id: string; deadline: number } | null
  distanceKm: number
}
interface LiveState {
  connection: 'connecting' | 'connected' | 'disconnected'
  error: string | null
  vehicles: Vehicle[]
  request: ServerRequest | null
  nearby: ServerRequest[]
  trip: ServerTrip | null
  duty: Duty
  serverTime: number
  deviceGpsError: string | null
  gpsError: string | null
  gpsFix: {
    telemetrySource?: 'gps' | 'simulation'
    position: LatLng
    accuracy: number
    sampledAt: number
  } | null
  lastSentAt: number | null
  lastAckAt: number | null
  lastAckSampleAt: number | null
  ackLatencyMs: number | null
  wakeLock: 'inactive' | 'active' | 'unavailable' | 'released'
}
const emptyDuty: Duty = {
  mode: 'offline',
  session: '',
  vehicle: null,
  prompt: null,
  distanceKm: 0,
}
const initial: LiveState = {
  connection: 'disconnected',
  error: null,
  vehicles: [],
  request: null,
  nearby: [],
  trip: null,
  duty: emptyDuty,
  serverTime: Date.now(),
  deviceGpsError: null,
  gpsError: null,
  gpsFix: null,
  lastSentAt: null,
  lastAckAt: null,
  lastAckSampleAt: null,
  ackLatencyMs: null,
  wakeLock: 'inactive',
}
export const useLiveStore = create<LiveState>(() => initial)
export function toMegat(r: ServerRequest): MegatRequest {
  return {
    id: r.id,
    passengerId: r.passenger_id,
    routeId: r.route_id,
    name: r.name,
    destination: r.destination,
    position: r.position,
    pickup: r.pickup,
    status: r.status,
    vehicleId: r.matched_vehicle_id,
    createdAt: Date.parse(r.created_at),
    expiresAt: Date.parse(r.expires_at),
    revision: r.revision,
    writer: 'server',
  }
}
let socket: WebSocket | undefined
const pending = new Map<
  string,
  { sentAt: number; gps: boolean; sampledAt: number }
>()
export function sendLive(message: Record<string, unknown>) {
  if (
    socket?.readyState !== WebSocket.OPEN ||
    useLiveStore.getState().connection !== 'connected'
  )
    return false
  const id = crypto.randomUUID(),
    sentAt = Date.now()
  const gps =
    message.type === 'driver:position' || message.type === 'passenger:position'
  for (const [key, value] of pending)
    if (sentAt - value.sentAt > 15000) pending.delete(key)
  pending.set(id, { sentAt, gps, sampledAt: Number(message.sampledAt ?? 0) })
  try {
    socket.send(JSON.stringify({ ...message, id }))
    if (gps) useLiveStore.setState({ lastSentAt: sentAt })
    return true
  } catch {
    pending.delete(id)
    return false
  }
}
export function connectLive() {
  let stopped = false,
    owned: WebSocket | undefined,
    retry: ReturnType<typeof setTimeout> | undefined,
    attempts = 0,
    lastSnapshot = Date.now(),
    clockOffset = 0
  useLiveStore.setState({ ...initial, connection: 'connecting' })
  const clearTransport = () =>
    useLiveStore.setState({
      connection: 'disconnected',
      vehicles: [],
      nearby: [],
    })
  const connect = async () => {
    clearTimeout(retry)
    const { data } = await supabase.auth.getSession()
    if (stopped) return
    owned?.close()
    clearTransport()
    useLiveStore.setState({ connection: 'connecting' })
    const url = new URL(`${API_URL}/ws`, window.location.href)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(url)
    owned = socket = ws
    lastSnapshot = Date.now()
    const current = () => !stopped && owned === ws && socket === ws
    ws.onopen = () => {
      if (current())
        ws.send(
          JSON.stringify({
            type: 'auth',
            token: data.session?.access_token ?? '',
          }),
        )
    }
    ws.onmessage = (event) => {
      if (!current()) return
      let message: {
        type: string
        id?: string
        error?: string
        data?: Partial<LiveState>
      }
      try {
        message = JSON.parse(event.data)
      } catch {
        return
      }
      if (message.type === 'snapshot' && message.data) {
        attempts = 0
        const first = useLiveStore.getState().connection !== 'connected'
        lastSnapshot = Date.now()
        clockOffset = (message.data.serverTime ?? lastSnapshot) - lastSnapshot
        useLiveStore.setState({
          ...message.data,
          connection: 'connected',
          ...(first ? { error: null } : {}),
        })
      } else if (message.type === 'ack' || message.type === 'error') {
        const sent = message.id ? pending.get(message.id) : undefined
        if (message.id) pending.delete(message.id)
        if (sent?.gps) {
          if (message.type === 'ack')
            useLiveStore.setState({
              gpsError: null,
              lastAckAt: Date.now(),
              lastAckSampleAt: sent.sampledAt,
              ackLatencyMs: Date.now() - sent.sentAt,
            })
          else
            useLiveStore.setState({
              gpsError: message.error ?? 'GPS ditolak server',
            })
        } else if (message.type === 'error')
          useLiveStore.setState({ error: message.error ?? 'Koneksi gagal' })
      } else if (message.type === 'auth:error') {
        useLiveStore.setState({ error: message.error ?? 'Sesi berakhir' })
        ws.close()
      }
    }
    ws.onclose = () => {
      if (!current()) return
      pending.clear()
      clearTransport()
      retry = setTimeout(
        () => {
          void connect()
        },
        Math.min(15000, 1000 * 2 ** attempts++) + Math.random() * 500,
      )
    }
    ws.onerror = () => {
      if (!current()) return
      useLiveStore.setState({
        error: 'Layanan realtime belum dapat dihubungi.',
      })
      ws.close()
    }
  }
  const reconnect = () => {
    if (stopped) return
    clearTimeout(retry)
    // Detach old callbacks before replacing the transport.
    if (socket === owned) socket = undefined
    owned?.close()
    owned = undefined
    clearTransport()
    retry = setTimeout(() => {
      void connect()
    }, 0)
  }
  // A half-open connection may never fire onclose; snapshots are the heartbeat.
  const watchdog = setInterval(() => {
    if (Date.now() - lastSnapshot > 8000 && owned) reconnect()
    const now = Date.now() + clockOffset
    const state = useLiveStore.getState()
    useLiveStore.setState({
      serverTime: now,
      vehicles: state.vehicles
        .filter((v) => !!v.lastSeenAt && now - v.lastSeenAt <= 30000)
        .map((v) => ({ ...v, stale: now - (v.lastSeenAt ?? 0) > 15000 })),
    })
  }, 1000)
  const offline = () => {
    owned?.close()
    clearTransport()
  }
  const visible = () => {
    if (
      document.visibilityState === 'visible' &&
      useLiveStore.getState().connection !== 'connected'
    )
      reconnect()
  }
  window.addEventListener('online', reconnect)
  window.addEventListener('offline', offline)
  document.addEventListener('visibilitychange', visible)
  const { data: listener } = supabase.auth.onAuthStateChange((event) => {
    // Do not await another Supabase call inside its auth notification callback.
    if (event === 'TOKEN_REFRESHED') reconnect()
    if (event === 'SIGNED_OUT') {
      useLiveStore.setState({ ...initial })
      reconnect()
    }
  })
  void connect()
  return () => {
    stopped = true
    listener.subscription.unsubscribe()
    clearTimeout(retry)
    clearInterval(watchdog)
    window.removeEventListener('online', reconnect)
    window.removeEventListener('offline', offline)
    document.removeEventListener('visibilitychange', visible)
    if (socket === owned) socket = undefined
    owned?.close()
    pending.clear()
    useLiveStore.setState({ ...initial })
  }
}
// A tab owns one duty session; other tabs cannot silently publish its GPS.
export const dutySession = crypto.randomUUID()
