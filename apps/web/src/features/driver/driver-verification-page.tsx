import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Logo } from '@/components/ui/logo'
import { useAuthStore } from '@/features/auth/auth-store'
import { api, errorMessage } from '@/lib/api'
import type { Onboarding } from './driver-onboarding-page'
export function DriverVerificationPage() {
  const client = useQueryClient()
  const user = useAuthStore((s) => s.user),
    initialized = useAuthStore((s) => s.initialized),
    refresh = useAuthStore((s) => s.refreshUser)
  const query = useQuery({
    queryKey: ['verification', user?.id],
    enabled: user?.role === 'pengemudi',
    queryFn: async () => {
      const data = await api<Onboarding>('/driver/verification')
      client.setQueryData(['onboarding', user?.id], data)
      if (data.status !== user?.driverVerification) await refresh()
      return data
    },
    refetchInterval: 5000,
  })
  if (!initialized) return <p className="p-8">Memulihkan sesi…</p>
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'pengemudi') return <Navigate to="/" replace />
  const data = query.data
  return (
    <div className="container-page max-w-3xl py-8">
      <Logo />
      <h1 className="mt-6 text-2xl font-extrabold">Status verifikasi</h1>
      <Card className="mt-5">
        <CardContent className="space-y-4 p-5">
          {query.isPending ? (
            <p>Memuat status…</p>
          ) : query.error ? (
            <p role="alert">{errorMessage(query.error)}</p>
          ) : (
            <>
              <p role="status" className="text-lg font-bold">
                {data?.status === 'disetujui'
                  ? 'Akun disetujui'
                  : data?.status === 'ditolak'
                    ? 'Perbaikan diperlukan'
                    : data?.submittedAt
                      ? 'Menunggu pemeriksaan admin'
                      : 'Lengkapi pendaftaran'}
              </p>
              {data?.reason && <p>{data.reason}</p>}
              <ul className="space-y-1 text-sm">
                {data?.documents.map((d) => (
                  <li key={d.id}>
                    {d.type.toUpperCase()} · {d.name}
                  </li>
                ))}
              </ul>
              {data?.status === 'disetujui' ? (
                <Button asChild>
                  <Link to="/pengemudi">Mulai bertugas</Link>
                </Button>
              ) : data?.status === 'ditolak' || !data?.submittedAt ? (
                <Button asChild>
                  <Link to="/pengemudi/daftar">
                    Lengkapi atau perbaiki berkas
                  </Link>
                </Button>
              ) : (
                <p className="text-sm text-ink">
                  Status akan diperbarui setelah admin memeriksa berkas Anda.
                </p>
              )}
            </>
          )}
          <Button
            variant="outline"
            onClick={() => {
              void useAuthStore.getState().logout()
            }}
          >
            Keluar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
