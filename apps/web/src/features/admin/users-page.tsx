import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Download,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { adminUsers } from '@/mocks/admin'
import { cn } from '@/lib/cn'
import type { AdminUser } from '@/mocks/admin'

const roleMeta = {
  Penumpang: { variant: 'sky' as const, icon: UserRound },
  Pengemudi: { variant: 'leaf' as const, icon: Users },
  Admin: { variant: 'peach' as const, icon: ShieldCheck },
}

export function UsersPage() {
  const [users, setUsers] = useState(adminUsers)
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<'semua' | AdminUser['role']>('semua')
  const [target, setTarget] = useState<AdminUser | null>(null)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return users.filter((user) => {
      const matchesRole = role === 'semua' || user.role === role
      const matchesQuery =
        !term ||
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term)
      return matchesRole && matchesQuery
    })
  }, [query, role, users])

  function toggleSuspend(user: AdminUser) {
    const nextStatus = user.status === 'aktif' ? 'ditangguhkan' : 'aktif'
    setUsers((current) =>
      current.map((item) => (item.id === user.id ? { ...item, status: nextStatus } : item)),
    )
    setTarget(null)
    toast.success(
      nextStatus === 'ditangguhkan' ? 'Akun ditangguhkan' : 'Akun diaktifkan kembali',
      { description: user.name },
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-eyebrow text-brand">Administrasi akun</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-strong md:text-3xl">
            Manajemen pengguna
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink">
            Kelola akun penumpang, pengemudi, dan administrator. Tinjau aktivitas dan tangguhkan
            akun yang melanggar ketentuan.
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download size={14} />
          Ekspor pengguna
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: 'Total akun', value: '8.412', note: '+124 bulan ini', icon: Users, tone: 'bg-leaf text-brand-strong' },
          { label: 'Penumpang', value: '7.986', note: '94,9% pengguna', icon: UserRound, tone: 'bg-sky text-sky-ink' },
          { label: 'Pengemudi', value: '408', note: '124 aktif', icon: CheckCircle2, tone: 'bg-brand text-white' },
          { label: 'Ditangguhkan', value: '18', note: 'Perlu peninjauan', icon: Ban, tone: 'bg-danger-bg text-danger' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold text-ink">{stat.label}</p>
                <span className={cn('grid size-8 place-items-center rounded-md', stat.tone)}>
                  <stat.icon size={15} />
                </span>
              </div>
              <p className="mt-2 text-2xl leading-none font-extrabold text-ink-strong">{stat.value}</p>
              <p className="mt-1 text-xs text-ink-soft">{stat.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-line-soft pb-3">
            {[
              { label: 'Semua peran', value: 'semua' },
              { label: 'Penumpang', value: 'Penumpang' },
              { label: 'Pengemudi', value: 'Pengemudi' },
              { label: 'Admin', value: 'Admin' },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setRole(item.value as typeof role)}
                className={cn(
                  'rounded-md px-3 py-2 text-xs font-semibold transition',
                  role === item.value ? 'bg-brand-strong text-white' : 'text-ink hover:bg-muted',
                )}
              >
                {item.label}
              </button>
            ))}
            <div className="ml-auto">
              <Input
                icon={<Search size={14} />}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama atau email"
                aria-label="Cari pengguna"
                className="h-9 md:w-64"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-1.5">
            {filtered.map((user) => {
              const meta = roleMeta[user.role]
              return (
                <div
                  key={user.id}
                  className="grid gap-2 rounded-md border-[0.5px] border-line-soft p-3 transition hover:border-brand/40 hover:bg-muted/30 lg:grid-cols-[1fr_180px_140px_130px_100px] lg:items-center"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar name={user.name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-ink-strong">{user.name}</p>
                      <p className="truncate text-xs text-ink">{user.email}</p>
                    </div>
                  </div>
                  <div>
                    <Badge variant={meta.variant}>
                      <meta.icon size={10} />
                      {user.role}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-ink-soft">Terdaftar</p>
                    <p className="text-xs font-semibold text-ink-strong">{user.joinedAt}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-soft">Terakhir aktif</p>
                    <p className="text-xs font-semibold text-ink-strong">{user.lastActive}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={user.status === 'aktif' ? 'leaf' : 'danger'}>
                      {user.status === 'aktif' ? 'Aktif' : 'Ditangguhkan'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn('size-8', user.status === 'aktif' ? 'text-danger' : 'text-brand')}
                      aria-label={user.status === 'aktif' ? 'Tangguhkan akun' : 'Aktifkan akun'}
                      onClick={() => setTarget(user)}
                    >
                      {user.status === 'aktif' ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                    </Button>
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-xs text-ink">Tidak ada pengguna yang cocok.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(target)} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span
                className={cn(
                  'grid size-9 place-items-center rounded-md',
                  target?.status === 'aktif' ? 'bg-danger-bg text-danger' : 'bg-leaf text-brand-strong',
                )}
              >
                {target?.status === 'aktif' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
              </span>
              {target?.status === 'aktif' ? 'Tangguhkan akun?' : 'Aktifkan kembali akun?'}
            </DialogTitle>
            <DialogDescription>
              {target?.status === 'aktif'
                ? `Akun ${target?.name} tidak akan dapat masuk hingga ditinjau kembali.`
                : `Akun ${target?.name} akan dapat kembali menggunakan layanan Angkot-Live.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Batal
            </Button>
            <Button
              variant={target?.status === 'aktif' ? 'danger' : 'primary'}
              onClick={() => target && toggleSuspend(target)}
            >
              {target?.status === 'aktif' ? 'Tangguhkan akun' : 'Aktifkan akun'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
