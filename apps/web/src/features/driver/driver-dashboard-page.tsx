import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DriverModeBadge } from '@/components/ui/badge'
import { useAuthStore } from '@/features/auth/auth-store'
import { DriverTrackingStatus } from '@/features/tracking/driver-tracking-status'
import { useLiveStore } from '@/features/tracking/live-store'
import { api, errorMessage } from '@/lib/api'
import type { Onboarding } from './driver-onboarding-page'
export function DriverDashboardPage() {
  const user = useAuthStore((s) => s.user),
    duty = useLiveStore((s) => s.duty)
  const assignment = useQuery({
    queryKey: ['assignment', user?.id],
    queryFn: () => api<Onboarding>('/driver/assignment'),
    refetchInterval: 5000,
  })
  const stats = useQuery({
    queryKey: ['driver-dashboard', user?.id],
    queryFn: () =>
      api<{ distanceKm: number; duties: number }>('/driver/dashboard'),
    refetchInterval: 10000,
  })
  return (
    <div className="container-page space-y-5 py-8">
      <h1 className="text-2xl font-extrabold">Halo, {user?.name}</h1>
      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="font-bold">
            Kendaraan {assignment.data?.vehicle?.plate ?? '—'}
          </h2>
          <DriverModeBadge mode={duty.mode} />
          <DriverTrackingStatus />
          <Button asChild>
            <Link to="/pengemudi">Buka peta kerja dan atur status</Link>
          </Button>
        </CardContent>
      </Card>
      {(stats.error || assignment.error) && (
        <p role="alert">{errorMessage(stats.error ?? assignment.error)}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-ink">Jarak tugas tercatat</p>
            <p className="mt-2 text-2xl font-bold">
              {stats.data?.distanceKm.toFixed(2) ?? '—'} km
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-ink">Sesi tugas</p>
            <p className="mt-2 text-2xl font-bold">
              {stats.data?.duties ?? '—'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
