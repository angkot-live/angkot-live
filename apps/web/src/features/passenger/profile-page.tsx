import { Bell, KeyRound, LogOut, Save, ShieldCheck, Smartphone, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { useAuthStore } from '@/features/auth/auth-store'

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span>
        <span className="block text-xs font-semibold text-ink-strong">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-ink">{description}</span>
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span className="h-5 w-9 rounded-full bg-line transition peer-checked:bg-brand" />
        <span className="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition peer-checked:translate-x-4" />
      </span>
    </label>
  )
}

export function PassengerProfilePage() {
  const user = useAuthStore((state) => state.user)
  const updateProfile = useAuthStore((state) => state.updateProfile)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [tripNotif, setTripNotif] = useState(true)
  const [reportNotif, setReportNotif] = useState(true)
  const [promoNotif, setPromoNotif] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !email.trim()) {
      toast.error('Nama dan email wajib diisi.')
      return
    }
    updateProfile({ name: name.trim(), email: email.trim(), phone: phone.trim() })
    toast.success('Profil diperbarui', { description: 'Perubahan data berhasil disimpan.' })
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function handlePasswordChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!currentPassword) {
      toast.error('Masukkan password saat ini.')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password baru minimal 8 karakter.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi password tidak cocok.')
      return
    }
    setPasswordOpen(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    toast.success('Password berhasil diubah', {
      description: 'Gunakan password baru pada sesi masuk berikutnya.',
    })
  }

  return (
    <div className="container-page py-6 md:py-10">
      <div className="max-w-3xl">
        <p className="text-eyebrow text-brand">Akun</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-strong md:text-3xl">
          Profil penumpang
        </h1>
        <p className="mt-1 text-sm text-ink">Kelola data pribadi, keamanan, dan notifikasi.</p>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center gap-3">
                <Avatar name={name || 'Penumpang'} size="lg" />
                <div>
                  <p className="text-sm font-bold text-ink-strong">{name || 'Penumpang'}</p>
                  <p className="text-xs text-ink">{email || 'Belum ada email'}</p>
                  <Badge variant="leaf" className="mt-1">
                    Akun terverifikasi
                  </Badge>
                </div>
              </div>

              <form onSubmit={handleSave} className="mt-5 flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="profile-name" className="text-xs font-semibold text-ink-strong">
                      Nama lengkap
                    </label>
                    <Input
                      id="profile-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      icon={<UserRound size={15} />}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="profile-phone" className="text-xs font-semibold text-ink-strong">
                      Nomor telepon
                    </label>
                    <Input
                      id="profile-phone"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      icon={<Smartphone size={15} />}
                      placeholder="08xx xxxx xxxx"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="profile-email" className="text-xs font-semibold text-ink-strong">
                    Email
                  </label>
                  <Input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                  <p className="text-[10px] text-ink-soft">
                    Email dipakai untuk masuk dan menerima tanggapan laporan.
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" size="sm">
                    <Save size={14} />
                    Simpan perubahan
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-brand" />
                <h2 className="text-sm font-bold text-ink-strong">Preferensi notifikasi</h2>
              </div>
              <div className="mt-2 divide-y divide-line-soft">
                <ToggleRow
                  title="Perjalanan"
                  description="Angkot mendekat, perjalanan dimulai, dan ETA turun."
                  checked={tripNotif}
                  onChange={setTripNotif}
                />
                <ToggleRow
                  title="Status laporan"
                  description="Update saat laporan diproses atau selesai."
                  checked={reportNotif}
                  onChange={setReportNotif}
                />
                <ToggleRow
                  title="Info dan promo"
                  description="Kabar layanan baru dan program Dishub."
                  checked={promoNotif}
                  onChange={setPromoNotif}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 md:p-5">
              <div>
                <h2 className="text-sm font-bold text-ink-strong">Keamanan akun</h2>
                <p className="text-xs text-ink">Ganti password secara berkala.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setPasswordOpen(true)}>
                <KeyRound size={14} />
                Ubah password
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="bg-leaf">
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center gap-2 text-brand-strong">
                <ShieldCheck size={16} />
                <p className="text-sm font-bold">Privasi terjaga</p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-brand-strong/75">
                Data lokasi hanya dipakai selama perjalanan aktif dan tidak dibagikan ke pengemudi.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-5">
              <h2 className="text-sm font-bold text-ink-strong">Sesi akun</h2>
              <p className="mt-1 text-xs text-ink">Keluar dari perangkat ini.</p>
              <Button variant="danger" size="sm" className="mt-3 w-full" onClick={handleLogout}>
                <LogOut size={14} />
                Keluar akun
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah password</DialogTitle>
            <DialogDescription>
              Gunakan minimal 8 karakter dan kombinasikan huruf serta angka.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordChange} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="current-password" className="text-xs font-semibold text-ink-strong">
                Password saat ini
              </label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-password" className="text-xs font-semibold text-ink-strong">
                Password baru
              </label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm-password" className="text-xs font-semibold text-ink-strong">
                Ulangi password baru
              </label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPasswordOpen(false)}>
                Batal
              </Button>
              <Button type="submit">Simpan password</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
