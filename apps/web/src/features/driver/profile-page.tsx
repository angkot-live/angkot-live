import {
  BadgeCheck,
  Bell,
  BusFront,
  CalendarClock,
  CheckCircle2,
  FileCheck2,
  LogOut,
  Mail,
  MessageSquare,
  Phone,
  Save,
  ShieldCheck,
  Star,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/features/auth/auth-store'

const documents = [
  { label: 'KTP Elektronik', detail: 'NIK 3273••••••••0001', expiry: 'Seumur hidup', valid: true },
  { label: 'SIM B1 Umum', detail: '3271-1180-88231', expiry: '02 Feb 2028', valid: true },
  { label: 'STNK Kendaraan', detail: 'D 1037 AB', expiry: '18 Agu 2027', valid: true },
  { label: 'Buku Uji KIR', detail: 'Uji berkala', expiry: '14 Des 2027', valid: true },
]

export function DriverProfilePage() {
  const user = useAuthStore((state) => state.user)
  const updateProfile = useAuthStore((state) => state.updateProfile)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '081234567891')
  const [notifications, setNotifications] = useState({ trip: true, admin: true, report: false })

  function handleSave() {
    updateProfile({ name, email, phone })
    toast.success('Profil diperbarui', { description: 'Perubahan data diri berhasil disimpan.' })
  }

  return (
    <div className="container-page py-6 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-eyebrow text-brand">Akun pengemudi</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-strong md:text-3xl">
            Profil & kendaraan
          </h1>
          <p className="mt-1 text-sm text-ink">
            Kelola data diri, kendaraan, dan dokumen operasionalmu.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/pengemudi/inbox">
              <MessageSquare size={14} />
              Buka inbox
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            <LogOut size={14} />
            Keluar
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="flex flex-col gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar name={user?.name ?? 'Pengemudi'} size="lg" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-extrabold text-ink-strong">{user?.name}</p>
                    <BadgeCheck size={15} className="text-brand" />
                  </div>
                  <p className="text-[10px] text-ink">Pengemudi mitra · Trayek 08</p>
                  <Badge variant="leaf" className="mt-1">
                    Terverifikasi
                  </Badge>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Rit', value: '1.284' },
                  { label: 'Rating', value: '4,9' },
                  { label: 'Tip', value: 'Rp 218rb' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-md bg-muted p-2 text-center">
                    <p className="text-sm font-extrabold text-ink-strong">{stat.value}</p>
                    <p className="text-[9px] text-ink-soft">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-col gap-2 text-[10px]">
                <p className="flex items-center gap-1.5 text-ink">
                  <Mail size={12} className="text-brand" />
                  {user?.email}
                </p>
                <p className="flex items-center gap-1.5 text-ink">
                  <Phone size={12} className="text-brand" />
                  {user?.phone ?? '081234567891'}
                </p>
                <p className="flex items-center gap-1.5 text-ink">
                  <ShieldCheck size={12} className="text-brand" />
                  Koperasi Kobanter Baru
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink-strong">
                  <BusFront size={15} className="text-brand" />
                  Kendaraan
                </h2>
                <Badge variant="leaf">Layak jalan</Badge>
              </div>
              <div className="mt-2 flex h-24 items-center justify-center rounded-md bg-gradient-to-br from-leaf via-muted to-sky">
                <div className="text-center">
                  <BusFront size={30} className="mx-auto text-brand-strong/70" />
                  <p className="mt-1 text-xs font-extrabold text-brand-strong">D 1037 AB</p>
                </div>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <dt className="text-ink-soft">Model</dt>
                  <dd className="font-semibold text-ink-strong">Suzuki Carry 2021</dd>
                </div>
                <div>
                  <dt className="text-ink-soft">Kapasitas</dt>
                  <dd className="font-semibold text-ink-strong">12 penumpang</dd>
                </div>
                <div>
                  <dt className="text-ink-soft">Warna</dt>
                  <dd className="font-semibold text-ink-strong">Hijau Kuning Gading</dd>
                </div>
                <div>
                  <dt className="text-ink-soft">Trayek</dt>
                  <dd className="font-semibold text-ink-strong">08 · Stasiun Hall — Dago</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h2 className="text-sm font-bold text-ink-strong">Ringkasan performa</h2>
              <div className="mt-2 flex flex-col gap-2">
                {[
                  { label: 'Ketepatan jadwal', value: 96, icon: CalendarClock },
                  { label: 'Kepuasan penumpang', value: 98, icon: Star },
                  { label: 'Pendapatan tip', value: 72, icon: Wallet },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-[10px] text-ink">
                      <span className="flex items-center gap-1">
                        <item.icon size={11} className="text-brand" />
                        {item.label}
                      </span>
                      <span className="font-bold text-ink-strong">{item.value}%</span>
                    </div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${item.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3">
          <Card>
            <CardContent className="p-4">
              <h2 className="text-sm font-bold text-ink-strong">Data diri</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="driver-name" className="text-[10px] font-semibold text-ink">
                    Nama lengkap
                  </label>
                  <Input id="driver-name" value={name} onChange={(event) => setName(event.target.value)} className="mt-1" />
                </div>
                <div>
                  <label htmlFor="driver-phone" className="text-[10px] font-semibold text-ink">
                    Nomor handphone
                  </label>
                  <Input id="driver-phone" value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="driver-email" className="text-[10px] font-semibold text-ink">
                    Email
                  </label>
                  <Input id="driver-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1" />
                </div>
              </div>
              <Button size="sm" className="mt-3" onClick={handleSave}>
                <Save size={14} />
                Simpan perubahan
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink-strong">
                  <FileCheck2 size={15} className="text-brand" />
                  Dokumen & masa berlaku
                </h2>
                <Badge variant="leaf">Semua valid</Badge>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {documents.map((doc) => (
                  <div key={doc.label} className="flex items-start gap-2 rounded-md border border-line-soft p-3">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-brand" />
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold text-ink-strong">{doc.label}</p>
                      <p className="text-[9px] text-ink">{doc.detail}</p>
                      <p className="mt-0.5 text-[9px] font-semibold text-brand-strong">
                        Berlaku s/d {doc.expiry}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-md bg-leaf/50 p-2.5 text-[10px] text-ink">
                <ShieldCheck size={13} className="text-brand" />
                Dokumen terverifikasi Dishub Kota Bandung. Unggah ulang jika masa berlaku berakhir.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink-strong">
                <Bell size={15} className="text-brand" />
                Preferensi notifikasi
              </h2>
              <div className="mt-2 flex flex-col gap-2">
                {[
                  { key: 'trip' as const, label: 'Pemberitahuan perjalanan & penumpang' },
                  { key: 'admin' as const, label: 'Pesan dari admin dan koordinator' },
                  { key: 'report' as const, label: 'Pembaruan laporan penumpang' },
                ].map((item) => (
                  <label key={item.key} className="flex cursor-pointer items-center justify-between gap-2 rounded-md border border-line-soft p-2.5">
                    <span className="text-[10px] font-medium text-ink-strong">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={notifications[item.key]}
                      onChange={(event) =>
                        setNotifications((current) => ({ ...current, [item.key]: event.target.checked }))
                      }
                      className="size-4 accent-[#004425]"
                    />
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
