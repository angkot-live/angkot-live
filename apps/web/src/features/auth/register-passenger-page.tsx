import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { errorMessage } from '@/lib/api'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Logo } from '@/components/ui/logo'
import { useAuthStore } from '@/features/auth/auth-store'
import { cn } from '@/lib/cn'

const schema = z
  .object({
    name: z.string().min(3, 'Nama minimal 3 karakter'),
    email: z.string().email('Format email tidak valid'),
    phone: z
      .string()
      .min(9, 'Nomor telepon minimal 9 digit')
      .regex(/^8\d{7,12}$/, 'Gunakan format 8xxxxxxxx tanpa 0 di depan'),
    password: z
      .string()
      .min(8, 'Password minimal 8 karakter')
      .regex(/[A-Z]/, 'Harus mengandung huruf besar')
      .regex(/\d/, 'Harus mengandung angka'),
    confirmPassword: z.string(),
    terms: z.boolean().refine((value) => value, 'Anda harus menyetujui syarat & ketentuan'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Konfirmasi password tidak sama',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

const benefits = [
  'Pantau angkot realtime tanpa perlu login ulang',
  'Simpan riwayat perjalanan dan laporan',
  'Terima notifikasi status laporan',
]

function passwordStrength(password: string) {
  let score = 0
  if (password.length >= 8) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  return score
}

export function RegisterPassengerPage() {
  const registerAccount = useAuthStore((state) => state.register)
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { terms: false },
  })

  const password = watch('password') ?? ''
  const strength = passwordStrength(password)
  const strengthLabel = strength >= 4 ? 'Sangat kuat' : strength >= 3 ? 'Kuat' : strength >= 2 ? 'Cukup' : 'Lemah'

  async function onSubmit(values: FormValues) {
    try {
      const user = await registerAccount({ ...values, phone: `+62${values.phone}`, role: 'penumpang' })
      if (user) navigate('/penumpang', { replace: true })
      else { toast.success('Akun dibuat. Periksa email untuk konfirmasi sebelum login.'); navigate('/login') }
    } catch (e) { toast.error(errorMessage(e)) }
  }

  return (
    <div className="min-h-svh bg-canvas px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-lg border-[0.5px] border-line-soft bg-surface shadow-float lg:grid-cols-[460px_1fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-line-soft bg-muted p-9 lg:flex">
          <div
            className="pointer-events-none absolute -top-20 -right-16 size-64 rounded-full bg-brand-soft/30 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col gap-5">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-brand-strong text-white">
                <UserRound size={18} />
              </span>
              <div>
                <p className="text-sm font-bold text-ink-strong">Akun Penumpang</p>
                <p className="text-xs text-ink-soft">Angkot-Live</p>
              </div>
            </div>

            <div>
              <h1 className="text-h3 leading-tight font-extrabold tracking-tight text-brand-strong">
                Perjalanan kota jadi lebih pasti.
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink">
                Daftar sekali, lalu pantau seluruh armada angkot dari ponsel Anda.
              </p>
            </div>

            <div className="rounded-lg border-[0.5px] border-line-soft bg-surface p-4 shadow-card">
              <ul className="flex flex-col gap-3">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2 text-xs text-ink-strong">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-brand" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-surface p-3 text-center shadow-card">
                <p className="text-lg font-extrabold text-ink-strong">1.240+</p>
                <p className="text-xs text-ink">Angkot aktif</p>
              </div>
              <div className="rounded-lg bg-surface p-3 text-center shadow-card">
                <p className="text-lg font-extrabold text-ink-strong">32</p>
                <p className="text-xs text-ink">Trayek</p>
              </div>
            </div>
          </div>

          <div className="relative mt-6 flex items-start gap-2 rounded-md bg-surface/70 p-3 text-xs leading-relaxed text-ink backdrop-blur">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-brand" />
            Data pribadi Anda hanya dipakai untuk layanan transportasi dan tidak dijual ke pihak
            ketiga.
          </div>
        </aside>

        <section className="p-6 sm:p-9 lg:p-10">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <Logo />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/register">
                <ArrowLeft size={15} />
                Kembali
              </Link>
            </Button>
          </div>

          <div className="hidden lg:block">
            <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
              <Link to="/register">
                <ArrowLeft size={15} />
                Pilih peran lain
              </Link>
            </Button>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight text-ink-strong">
            Daftar Akun Penumpang
          </h2>
          <p className="mt-1 text-sm text-ink">
            Isi data di bawah. Butuh waktu kurang dari satu menit.
          </p>

          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Field label="Nama Lengkap" htmlFor="reg-name" required error={errors.name?.message}>
              <Input
                id="reg-name"
                placeholder="Nama sesuai identitas"
                autoComplete="name"
                icon={<UserRound size={16} />}
                invalid={Boolean(errors.name)}
                {...register('name')}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" htmlFor="reg-email" required error={errors.email?.message}>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="nama@email.com"
                  autoComplete="email"
                  icon={<Mail size={16} />}
                  invalid={Boolean(errors.email)}
                  {...register('email')}
                />
              </Field>

              <Field
                label="Nomor Telepon"
                htmlFor="reg-phone"
                required
                error={errors.phone?.message}
              >
                <div className="flex items-stretch">
                  <span className="flex h-11 items-center rounded-l-md border-r border-line bg-muted-strong px-3 text-sm font-semibold text-ink">
                    +62
                  </span>
                  <Input
                    id="reg-phone"
                    inputMode="numeric"
                    placeholder="81234567890"
                    autoComplete="tel"
                    className="rounded-l-none"
                    icon={<Phone size={16} />}
                    invalid={Boolean(errors.phone)}
                    {...register('phone')}
                  />
                </div>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Password"
                htmlFor="reg-password"
                required
                error={errors.password?.message}
              >
                <Input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 karakter"
                  autoComplete="new-password"
                  icon={<LockKeyhole size={16} />}
                  invalid={Boolean(errors.password)}
                  trailing={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                  }
                  {...register('password')}
                />
              </Field>

              <Field
                label="Konfirmasi Password"
                htmlFor="reg-confirm"
                required
                error={errors.confirmPassword?.message}
              >
                <Input
                  id="reg-confirm"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ulangi password"
                  autoComplete="new-password"
                  icon={<LockKeyhole size={16} />}
                  invalid={Boolean(errors.confirmPassword)}
                  {...register('confirmPassword')}
                />
              </Field>
            </div>

            <div className="rounded-md bg-muted p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-ink">Kekuatan kata sandi</span>
                <span
                  className={cn(
                    'font-bold',
                    strength >= 3 ? 'text-brand-strong' : strength >= 2 ? 'text-warning' : 'text-danger',
                  )}
                >
                  {password ? strengthLabel : 'Belum diisi'}
                </span>
              </div>
              <div className="mt-2 flex gap-1.5" aria-hidden>
                {Array.from({ length: 4 }).map((_, index) => (
                  <span
                    key={index}
                    className={cn(
                      'h-1.5 flex-1 rounded-full',
                      index < strength
                        ? strength >= 3
                          ? 'bg-brand'
                          : strength >= 2
                            ? 'bg-warning'
                            : 'bg-danger'
                        : 'bg-line-soft',
                    )}
                  />
                ))}
              </div>
              <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink">
                {[
                  { label: '8+ karakter', ok: password.length >= 8 },
                  { label: 'Huruf besar', ok: /[A-Z]/.test(password) },
                  { label: 'Angka', ok: /\d/.test(password) },
                ].map((rule) => (
                  <li key={rule.label} className="flex items-center gap-1">
                    <CheckCircle2
                      size={11}
                      className={rule.ok ? 'text-brand' : 'text-ink-soft/50'}
                    />
                    {rule.label}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <label className="flex items-start gap-2 text-xs leading-relaxed text-ink">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 rounded border-line accent-brand"
                  {...register('terms')}
                />
                <span>
                  Saya menyetujui{' '}
                  <Link to="/bantuan" className="font-semibold text-brand-strong underline">
                    Syarat & Ketentuan
                  </Link>{' '}
                  serta{' '}
                  <Link to="/bantuan" className="font-semibold text-brand-strong underline">
                    Kebijakan Privasi
                  </Link>{' '}
                  Angkot-Live.
                </span>
              </label>
              {errors.terms ? (
                <p className="mt-1 text-xs font-medium text-danger">{errors.terms.message}</p>
              ) : null}
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={17} className="animate-spin" /> : null}
              Daftar Akun Penumpang
              <ArrowRight size={16} />
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-ink">
            Sudah punya akun?{' '}
            <Link to="/login" className="font-semibold text-brand-strong hover:underline">
              Masuk di sini
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}
