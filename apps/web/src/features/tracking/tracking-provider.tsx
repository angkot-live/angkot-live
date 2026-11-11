import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useReportStore } from '@/features/reports/report-store'
import { useVerificationStore } from '@/features/admin/verification-store'
import { useAuthStore, initializeAuth } from '@/features/auth/auth-store'
import { connectLive, dutySession, sendLive, useLiveStore } from './live-store'
import { useRoutes } from '@/features/routes/use-routes'
import { simulationFrame } from './simulator'
import { useSimulatorStore } from './simulator-store'
import { fixPayload, useGps } from '@/hooks/use-gps'

export function TrackingProvider() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const initialized = useAuthStore((s) => s.initialized)
  const duty = useLiveStore((s) => s.duty)
  const request = useLiveStore((s) => s.request)
  const trip = useLiveStore((s) => s.trip)
  const driverActive =
    user?.role === 'pengemudi' &&
    ['narik', 'ngetem'].includes(duty.mode) &&
    duty.session === dutySession
  const paxActive =
    user?.role === 'penumpang' &&
    (trip != null ||
      (request != null &&
        ['walking', 'searching', 'accepted'].includes(request.status)))
  const simulated =
    driverActive && duty.vehicle?.telemetrySource === 'simulation'
  const { routes } = useRoutes()
  const simSettings = useSimulatorStore()
  const simulationRoute = routes.find((r) => r.id === duty.vehicle?.routeId)
  const simulation = useRef<{ offset: number; at: number } | null>(null)
  const { position, error } = useGps((driverActive && !simulated) || paxActive)
  const sequence = useRef(0)
  const previousUser = useRef<string | null>(null)
  const latest = useRef(position)
  useEffect(() => {
    latest.current = position
    useLiveStore.setState({
      gpsFix: position
        ? {
            position: [position.coords.latitude, position.coords.longitude],
            accuracy: position.coords.accuracy,
            sampledAt: position.timestamp,
          }
        : null,
    })
  }, [position])
  useEffect(() => {
    initializeAuth()
  }, [])
  useEffect(() => {
    const previous = previousUser.current
    if (previous && previous !== user?.id)
      useSimulatorStore.setState({ source: 'gps', paused: false, ended: false })
    if (previous && previous !== user?.id)
      queryClient.removeQueries({
        predicate: (q) => q.queryKey.includes(previous),
      })
    previousUser.current = user?.id ?? null
    useReportStore.getState().clear()
    useVerificationStore.getState().clear()
    if (!user?.id) return
    const role = user.role
    const load = () => {
      if (role === 'penumpang' || role === 'admin')
        void useReportStore.getState().load()
      if (role === 'admin') void useVerificationStore.getState().load()
    }
    load()
    const timer = setInterval(load, 5000)
    return () => {
      clearInterval(timer)
      useReportStore.getState().clear()
      useVerificationStore.getState().clear()
    }
  }, [user?.id, user?.role, queryClient])
  useEffect(() => {
    if (initialized) return connectLive()
  }, [initialized, user?.id])
  useEffect(() => {
    useLiveStore.setState({ deviceGpsError: error })
    if (error) toast.error(error, { id: 'tracking-gps', duration: 10000 })
  }, [error])
  useEffect(() => {
    if ((!driverActive && !paxActive) || simulated) return
    let sentAt = 0
    const publish = () => {
      const fix = latest.current
      if (
        !fix ||
        fix.timestamp <= sentAt ||
        Date.now() - fix.timestamp > 15000 ||
        fix.coords.accuracy > 50
      )
        return
      const sent = sendLive({
        type: driverActive ? 'driver:position' : 'passenger:position',
        ...fixPayload(fix),
        sequence: ++sequence.current,
        session: dutySession,
      })
      if (sent) sentAt = fix.timestamp
    }
    publish()
    const timer = setInterval(publish, 3000)
    return () => clearInterval(timer)
  }, [driverActive, paxActive, request?.id, simulated])
  useEffect(() => {
    if (!simulated || !simulationRoute) {
      simulation.current = null
      useSimulatorStore.setState({ ended: false })
      return
    }
    const line = (
      simulationRoute.segments?.length
        ? simulationRoute.segments
        : [simulationRoute.polyline]
    )[simSettings.chain]
    if (!line || line.length < 2) return
    const isNew = !simulation.current
    if (!simulation.current) {
      const initial = simulationFrame(line, 0, 0, 0)
      simulation.current = {
        offset: (initial.totalKm * simSettings.startPercent) / 100,
        at: Date.now(),
      }
    }
    simulation.current.at = Date.now()
    const publish = () => {
      const current = simulation.current
      if (!current) return
      const now = Date.now(),
        elapsed = now - current.at
      current.at = now
      if (simSettings.paused) return
      const frame = simulationFrame(
        line,
        current.offset,
        simSettings.speedKph,
        elapsed,
      )
      current.offset = frame.offsetKm
      useSimulatorStore.setState({ ended: frame.ended })
      useLiveStore.setState({
        gpsFix: {
          telemetrySource: 'simulation',
          position: frame.position,
          accuracy: 10,
          sampledAt: now,
        },
      })
      sendLive({
        type: 'driver:position',
        telemetrySource: 'simulation',
        position: frame.position,
        accuracy: 10,
        speedKph: frame.speedKph,
        heading: frame.heading,
        sampledAt: now,
        sequence: ++sequence.current,
        session: dutySession,
      })
    }
    if (isNew) publish()
    const timer = setInterval(publish, 3000)
    return () => clearInterval(timer)
  }, [
    simulated,
    simulationRoute,
    simSettings.chain,
    simSettings.startPercent,
    simSettings.speedKph,
    simSettings.paused,
  ])
  useEffect(() => {
    if (!driverActive) {
      useLiveStore.setState({ wakeLock: 'inactive' })
      return
    }
    if (!('wakeLock' in navigator)) {
      useLiveStore.setState({ wakeLock: 'unavailable' })
      return
    }
    let stopped = false,
      pending = false,
      lock: WakeLockSentinel | undefined,
      retry: ReturnType<typeof setTimeout> | undefined
    const acquire = async () => {
      if (
        document.visibilityState !== 'visible' ||
        stopped ||
        pending ||
        (lock && !lock.released)
      )
        return
      pending = true
      try {
        const next = await navigator.wakeLock.request('screen')
        if (stopped) await next.release()
        else {
          lock = next
          useLiveStore.setState({ wakeLock: 'active' })
          next.addEventListener(
            'release',
            () => {
              if (stopped) return
              useLiveStore.setState({ wakeLock: 'released' })
              clearTimeout(retry)
              retry = setTimeout(() => {
                void acquire()
              }, 2000)
            },
            { once: true },
          )
        }
      } catch {
        if (!stopped) useLiveStore.setState({ wakeLock: 'unavailable' })
      } finally {
        pending = false
      }
    }
    void acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      stopped = true
      clearTimeout(retry)
      document.removeEventListener('visibilitychange', acquire)
      void lock?.release()
      useLiveStore.setState({ wakeLock: 'inactive' })
    }
  }, [driverActive])
  return null
}
