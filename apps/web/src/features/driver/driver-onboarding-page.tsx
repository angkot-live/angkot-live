import {
  ArrowLeft,
  ArrowRight,
  BusFront,
  Check,
  CheckCircle2,
  FileText,
  IdCard,
  ImagePlus,
  Info,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Route,
  ShieldCheck,
  Truck,
  Upload,
  UserRound,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Logo } from '@/components/ui/logo'
import { routes } from '@/mocks/data'
import { cn } from '@/lib/cn'

const steps = [
  { id: 1, label: 'Akun Mitra' },
  { id: 2, label: 'Data Pribadi' },
  { id: 3, label: 'Data Kendaraan' },
  { id: 4, label: 'Pilih Jurusan' },
  { id: 5, label: 'Review & Setor' },
]

const stepMeta: Record<number, { eyebrow: string; title: string; description: string }> = {
  1: {
    eyebrow: 'Tahap 1 dari 5',
    title: 'Buat akun mitra pengemudi',
    description: 'Gunakan email dan nomor telepon aktif untuk menerima update verifikasi.',
  },
  2: {
    eyebrow: 'Tahap 2 dari 5',
    title: 'Lengkapi data pribadi',
    description: 'Data harus sesuai KTP dan SIM B1 Umum yang masih berlaku.',
  },
  3: {
    eyebrow: 'Tahap 3 dari 5',
    title: 'Data kendaraan & dokumen',
    description: 'Masukkan spesifikasi armada dan unggah dokumen legalitas kendaraan.',
  },
  4: {
    eyebrow: 'Tahap 4 dari 5',
    title: 'Pilih jurusan trayek',
    description: 'Pilih satu koridor resmi Dinas Perhubungan yang akan kamu layani.',
  },
  5: {
    eyebrow: 'Tahap 5 dari 5',
    title: 'Review & kirim pendaftaran',
    description: 'Periksa kembali seluruh data sebelum dikirim ke petugas verifikasi.',
  },
}

interface FormState {
  email: string
  phone: string
  password: string
  confirm: string
  name: string
  nik: string
  sim: string
  simExpiry: string
  address: string
  plate: string
  model: string
  year: string
  capacity: string
  stnk: string
  kir: string
  photo: string
}

const initialForm: FormState = {
  email: '',
  phone: '',
  password: '',
  confirm: '',
  name: '',
  nik: '',
  sim: '',
  simExpiry: '',
  address: '',
  plate: 'D 1234 AB',
  model: 'Suzuki Carry 1.5 Futura',
  year: '2019',
  capacity: '11',
  stnk: 'STNK_D1234AB.jpg',
  kir: '',
  photo: '',
}

export function DriverOnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>(initialForm)
  const [routeId, setRouteId] = useState(routes[0]?.id ?? '')
  const [terms, setTerms] = useState(false)

  const selectedRoute = routes.find((route) => route.id === routeId)

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function validateStep() {
    if (step === 1) {
      if (!/^\S+@\S+\.\S+$/.test(form.email)) {
        toast.error('Format email tidak valid.')
        return false
      }
      if (form.phone.replace(/\D/g, '').length < 9) {
        toast.error('Nomor telepon minimal 9 digit.')
        return false
      }
      if (form.password.length < 8) {
        toast.error('Password minimal 8 karakter.')
        return false
      }
      if (form.password !== form.confirm) {
        toast.error('Konfirmasi password tidak sama.')
        return false
      }
    }
    if (step === 2) {
      if (!form.name.trim() || form.nik.length < 16 || !form.sim.trim() || !form.simExpiry) {
        toast.error('Lengkapi nama, NIK 16 digit, SIM, dan masa berlaku SIM.')
        return false
      }
    }
    if (step === 3) {
      if (!form.plate.trim() || !form.model.trim() || !form.year || !form.capacity) {
        toast.error('Lengkapi spesifikasi kendaraan.')
        return false
      }
      if (!form.stnk) {
        toast.error('Unggah STNK kendaraan terlebih dahulu.')
        return false
      }
    }
    if (step === 5 && !terms) {
      toast.error('Setujui pernyataan kebenaran data untuk melanjutkan.')
      return false
    }
    return true
  }

  function handleNext() {
    if (!validateStep()) return
    if (step < 5) {
      setStep((current) => current + 1)
      return
    }
    toast.success('Pendaftaran mitra terkirim', {
      description: 'Berkas kamu masuk antrean verifikasi Dishub & Koperasi.',
    })
    navigate('/pengemudi/verifikasi')
  }

  return (
    <div className="min-h-svh bg-canvas">
      <header className="border-b border-line-soft bg-surface/90 backdrop-blur-xl">
        <div className="container-page flex h-16 items-center justify-between gap-3">
          <Logo />
          <div className="flex items-center gap-2">
            <Badge variant="leaf" className="hidden sm:inline-flex">
              Pendaftaran mitra
            </Badge>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Sudah punya akun? Masuk</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container-page py-6 md:py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-eyebrow text-brand">Kemitraan angkot-live</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-strong md:text-3xl">
              Pendaftaran mitra pengemudi
            </h1>
            <p className="mt-1 text-sm text-ink">
              Lengkapi berkas armada dan pilih trayek koridor resmi Dinas Perhubungan.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-line-soft bg-surface px-3 py-2 shadow-soft">
            <ShieldCheck size={16} className="text-brand" />
            <div>
              <p className="text-[10px] text-ink-soft">Status akun pemohon</p>
              <p className="text-[11px] font-semibold text-ink-strong">
                Terverifikasi Dukcapil
              </p>
            </div>
          </div>
        </div>

        <Card className="mt-4 overflow-hidden">
          <div className="flex gap-2 overflow-x-auto p-3 md:p-4">
            {steps.map((item) => {
              const done = item.id < step
              const active = item.id === step
              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex min-w-fit flex-1 items-center gap-2 rounded-md px-3 py-2.5',
                    active && 'bg-muted',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-7 shrink-0 place-items-center rounded-full border-2 text-[11px] font-bold',
                      done && 'border-brand bg-brand text-white',
                      active && 'border-brand bg-brand text-white',
                      !done && !active && 'border-line bg-surface text-ink-soft',
                    )}
                  >
                    {done ? <Check size={13} /> : item.id}
                  </span>
                  <div className="leading-tight">
                    <p className="text-[9px] font-semibold tracking-wide text-ink-soft uppercase">
                      Tahap {item.id}
                    </p>
                    <p
                      className={cn(
                        'text-[11px] font-bold whitespace-nowrap',
                        active || done ? 'text-ink-strong' : 'text-ink-soft',
                      )}
                    >
                      {item.label}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
          <Card>
            <CardContent className="p-4 md:p-6">
              <p className="text-[10px] font-bold tracking-wide text-brand uppercase">
                {stepMeta[step]?.eyebrow}
              </p>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-ink-strong">
                {stepMeta[step]?.title}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-ink">
                {stepMeta[step]?.description}
              </p>

              <div className="mt-5">
                {step === 1 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Email aktif" htmlFor="onboarding-email" className="sm:col-span-2">
                      <Input
                        id="onboarding-email"
                        type="email"
                        value={form.email}
                        onChange={(event) => update('email', event.target.value)}
                        icon={<Mail size={15} />}
                        placeholder="nama@email.com"
                      />
                    </Field>
                    <Field label="Nomor telepon" htmlFor="onboarding-phone">
                      <Input
                        id="onboarding-phone"
                        value={form.phone}
                        onChange={(event) => update('phone', event.target.value)}
                        icon={<Phone size={15} />}
                        placeholder="08xxxxxxxxxx"
                      />
                    </Field>
                    <Field label="Password" htmlFor="onboarding-password">
                      <Input
                        id="onboarding-password"
                        type="password"
                        value={form.password}
                        onChange={(event) => update('password', event.target.value)}
                        icon={<LockKeyhole size={15} />}
                        placeholder="Minimal 8 karakter"
                      />
                    </Field>
                    <Field
                      label="Konfirmasi password"
                      htmlFor="onboarding-confirm"
                      className="sm:col-span-2"
                    >
                      <Input
                        id="onboarding-confirm"
                        type="password"
                        value={form.confirm}
                        onChange={(event) => update('confirm', event.target.value)}
                        icon={<LockKeyhole size={15} />}
                        placeholder="Ulangi password"
                      />
                    </Field>
                  </div>
                ) : null}

                {step === 2 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nama sesuai KTP" htmlFor="onboarding-name">
                      <Input
                        id="onboarding-name"
                        value={form.name}
                        onChange={(event) => update('name', event.target.value)}
                        icon={<UserRound size={15} />}
                        placeholder="Nama lengkap"
                      />
                    </Field>
                    <Field label="NIK" htmlFor="onboarding-nik">
                      <Input
                        id="onboarding-nik"
                        value={form.nik}
                        onChange={(event) => update('nik', event.target.value.replace(/\D/g, ''))}
                        icon={<IdCard size={15} />}
                        placeholder="16 digit NIK"
                        maxLength={16}
                      />
                    </Field>
                    <Field label="Nomor SIM B1 Umum" htmlFor="onboarding-sim">
                      <Input
                        id="onboarding-sim"
                        value={form.sim}
                        onChange={(event) => update('sim', event.target.value)}
                        icon={<IdCard size={15} />}
                        placeholder="Nomor SIM"
                      />
                    </Field>
                    <Field label="Masa berlaku SIM" htmlFor="onboarding-sim-expiry">
                      <Input
                        id="onboarding-sim-expiry"
                        type="date"
                        value={form.simExpiry}
                        onChange={(event) => update('simExpiry', event.target.value)}
                      />
                    </Field>
                    <Field label="Alamat domisili" htmlFor="onboarding-address" className="sm:col-span-2">
                      <Textarea
                        id="onboarding-address"
                        value={form.address}
                        onChange={(event) => update('address', event.target.value)}
                        placeholder="Alamat lengkap sesuai KTP"
                      />
                    </Field>
                  </div>
                ) : null}

                {step === 3 ? (
                  <div className="grid gap-5 lg:grid-cols-2">
                    <div className="flex flex-col gap-4">
                      <Field label="Nomor registrasi kendaraan" htmlFor="onboarding-plate">
                        <Input
                          id="onboarding-plate"
                          value={form.plate}
                          onChange={(event) => update('plate', event.target.value)}
                          icon={<Truck size={15} />}
                          placeholder="D 1234 AB"
                        />
                      </Field>
                      <Field label="Merek & model karoseri" htmlFor="onboarding-model">
                        <Input
                          id="onboarding-model"
                          value={form.model}
                          onChange={(event) => update('model', event.target.value)}
                          icon={<BusFront size={15} />}
                        />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Tahun pembuatan" htmlFor="onboarding-year">
                          <Input
                            id="onboarding-year"
                            value={form.year}
                            onChange={(event) =>
                              update('year', event.target.value.replace(/\D/g, ''))
                            }
                            maxLength={4}
                          />
                        </Field>
                        <Field label="Daya angkut" htmlFor="onboarding-capacity">
                          <Input
                            id="onboarding-capacity"
                            value={form.capacity}
                            onChange={(event) =>
                              update('capacity', event.target.value.replace(/\D/g, ''))
                            }
                            placeholder="11 penumpang"
                          />
                        </Field>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <p className="text-xs font-bold text-ink-strong">Dokumen & foto kendaraan</p>
                      {[
                        {
                          key: 'stnk' as const,
                          label: 'STNK kendaraan',
                          hint: 'JPG, PNG, atau PDF maks. 5 MB',
                          icon: FileText,
                        },
                        {
                          key: 'kir' as const,
                          label: 'Kartu uji KIR Dishub',
                          hint: 'Masa berlaku minimal 3 bulan',
                          icon: ShieldCheck,
                        },
                        {
                          key: 'photo' as const,
                          label: 'Foto fisik mobil',
                          hint: 'Tampak depan 45° & samping, plat terlihat',
                          icon: ImagePlus,
                        },
                      ].map((document) => (
                        <div key={document.key}>
                          <input
                            id={`doc-${document.key}`}
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={(event) => {
                              const name = event.target.files?.[0]?.name
                              if (name) update(document.key, name)
                            }}
                          />
                          <label
                            htmlFor={`doc-${document.key}`}
                            className={cn(
                              'flex cursor-pointer items-center gap-3 rounded-md border border-dashed p-3 transition',
                              form[document.key]
                                ? 'border-brand/40 bg-leaf/40'
                                : 'border-line bg-muted/50 hover:border-brand/40',
                            )}
                          >
                            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-surface text-brand-strong">
                              <document.icon size={16} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-semibold text-ink-strong">
                                {form[document.key] || document.label}
                              </span>
                              <span className="block text-[10px] text-ink">
                                {form[document.key] ? 'Terunggah · klik untuk ganti' : document.hint}
                              </span>
                            </span>
                            {form[document.key] ? (
                              <CheckCircle2 size={16} className="shrink-0 text-brand" />
                            ) : (
                              <Upload size={15} className="shrink-0 text-ink-soft" />
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {step === 4 ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {routes.map((route) => (
                      <button
                        key={route.id}
                        type="button"
                        onClick={() => setRouteId(route.id)}
                        className={cn(
                          'flex items-start gap-3 rounded-md border p-3 text-left transition',
                          routeId === route.id
                            ? 'border-brand bg-leaf/50'
                            : 'border-line-soft bg-surface hover:border-brand/40',
                        )}
                      >
                        <span
                          className="grid size-9 shrink-0 place-items-center rounded-md text-[11px] font-extrabold text-white"
                          style={{ backgroundColor: route.color }}
                        >
                          {route.code}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-bold text-ink-strong">
                            {route.name}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-ink">
                            {route.origin} → {route.destination}
                          </span>
                        </span>
                        {routeId === route.id ? (
                          <CheckCircle2 size={16} className="ml-auto shrink-0 text-brand" />
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}

                {step === 5 ? (
                  <div className="flex flex-col gap-3">
                    {[
                      {
                        title: 'Akun mitra',
                        icon: Mail,
                        rows: [
                          ['Email', form.email || '-'],
                          ['Telepon', form.phone || '-'],
                        ],
                      },
                      {
                        title: 'Data pribadi',
                        icon: UserRound,
                        rows: [
                          ['Nama', form.name || '-'],
                          ['NIK', form.nik || '-'],
                          ['SIM', form.sim ? `${form.sim} · ${form.simExpiry}` : '-'],
                        ],
                      },
                      {
                        title: 'Kendaraan',
                        icon: BusFront,
                        rows: [
                          ['Plat', form.plate],
                          ['Model', form.model],
                          ['Tahun / kapasitas', `${form.year} · ${form.capacity} penumpang`],
                        ],
                      },
                      {
                        title: 'Trayek',
                        icon: Route,
                        rows: [
                          ['Jurusan', selectedRoute?.name ?? '-'],
                          ['Koridor', `${selectedRoute?.origin} → ${selectedRoute?.destination}`],
                        ],
                      },
                    ].map((section) => (
                      <div key={section.title} className="rounded-md border border-line-soft p-3">
                        <div className="flex items-center gap-2 text-brand-strong">
                          <section.icon size={14} />
                          <p className="text-xs font-bold">{section.title}</p>
                        </div>
                        <dl className="mt-2 grid gap-1 text-[11px] sm:grid-cols-2">
                          {section.rows.map(([label, value]) => (
                            <div key={label} className="flex gap-1">
                              <dt className="text-ink-soft">{label}:</dt>
                              <dd className="font-semibold text-ink-strong">{value}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ))}

                    <label className="flex cursor-pointer items-start gap-2 rounded-md bg-muted p-3 text-[11px] leading-relaxed text-ink">
                      <input
                        type="checkbox"
                        checked={terms}
                        onChange={(event) => setTerms(event.target.checked)}
                        className="mt-0.5 size-4 accent-[#004425]"
                      />
                      Saya menyatakan seluruh data dan dokumen benar, serta menyetujui syarat
                      kemitraan dan kebijakan privasi Angkot-Live.
                    </label>
                  </div>
                ) : null}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (step === 1) navigate('/register')
                    else setStep((current) => current - 1)
                  }}
                >
                  <ArrowLeft size={15} />
                  {step === 1 ? 'Kembali' : 'Sebelumnya'}
                </Button>
                <Button type="button" onClick={handleNext}>
                  {step === 5 ? 'Kirim pendaftaran' : 'Simpan & lanjut'}
                  <ArrowRight size={15} />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <Card className="bg-leaf">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center gap-2 text-brand-strong">
                  <Info size={15} />
                  <p className="text-sm font-bold">Tips pengisian</p>
                </div>
                <ul className="mt-2 flex flex-col gap-1.5 text-[11px] leading-relaxed text-brand-strong/80">
                  <li>· Pastikan NIK dan SIM terbaca jelas.</li>
                  <li>· Foto kendaraan menunjukkan plat nomor.</li>
                  <li>· KIR masih berlaku minimal 3 bulan.</li>
                  <li>· Data disimpan otomatis di perangkat.</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center gap-2 text-ink-strong">
                  <MapPin size={15} className="text-brand" />
                  <p className="text-sm font-bold">Koridor resmi</p>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-ink">
                  Hanya trayek yang terdaftar di Dinas Perhubungan Kota Bandung yang bisa dipilih.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {routes.map((route) => (
                    <Badge key={route.id} variant="neutral">
                      {route.code}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <p className="px-1 text-[10px] leading-relaxed text-ink-soft">
              Dengan mendaftar, kamu menyetujui verifikasi dokumen oleh Dishub dan Koperasi
              Angkutan Bandung.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
