import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { AuthLayout } from '@/features/auth/auth-layout'
import { homeForRole, useAuthStore } from '@/features/auth/auth-store'
import { cn } from '@/lib/cn'
import type { Role } from '@/types'

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email atau nomor telepon wajib diisi')
    .refine(
      (value) => /^\S+@\S+\.\S+$/.test(value) || /^(\+62|62|0)8\d{7,12}$/.test(value),
      'Format email atau nomor telepon tidak valid',
    ),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  remember: z.boolean().optional(),
})

type LoginValues = z.infer<typeof loginSchema>

const roles: { value: Role; label: string; icon: typeof UserRound }[] = [
  { value: 'penumpang', label: 'Penumpang', icon: UserRound },
  { value: 'pengemudi', label: 'Pengemudi', icon: ShieldCheck },
  { value: 'admin', label: 'Admin', icon: LockKeyhole },
]

export function LoginPage() {
  const login = useAuthStore((state) => state.login)
  const navigate = useNavigate()
  const location = useLocation()
  const [role, setRole] = useState<Role>('penumpang')
  const [showPassword, setShowPassword] = useState(false)
  const [pendingDriver, setPendingDriver] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: 'demo@angkot-live.id', password: 'angkot123', remember: true },
  })

  function onSubmit(values: LoginValues) {
    const user = login(
      role,
      values.email,
      undefined,
      role === 'pengemudi' && pendingDriver ? 'menunggu' : undefined,
    )
    const home = homeForRole(user.role)
    const requested = location.state?.from as { pathname?: string; search?: string } | undefined
    const pathname = requested?.pathname
    navigate(pathname && (pathname === home || pathname.startsWith(`${home}/`))
      ? `${pathname}${requested?.search ?? ''}` : home)
  }

  return (
    <AuthLayout>
      <div className="flex flex-col gap-1">
        <Badge variant="leaf" className="mb-1 w-fit">
          Masuk akun
        </Badge>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-strong">
          Selamat datang kembali
        </h1>
        <p className="text-sm text-ink">
          Masuk untuk memantau angkot, mengatur perjalanan, dan mengelola layanan.
        </p>
      </div>

      <div className="mt-6">
        <p className="mb-2 text-xs font-semibold text-ink-strong">Masuk sebagai</p>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Pilih peran">
          {roles.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setRole(item.value)}
              aria-pressed={role === item.value}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-md border px-2 py-2.5 text-xs font-semibold transition',
                role === item.value
                  ? 'border-brand bg-leaf text-brand-strong'
                  : 'border-line bg-surface text-ink hover:bg-muted',
              )}
            >
              <item.icon size={17} />
              {item.label}
            </button>
          ))}
        </div>
        {role === 'pengemudi' ? (
          <label className="mt-3 flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-[11px] text-ink">
            <input
              type="checkbox"
              checked={pendingDriver}
              onChange={(event) => setPendingDriver(event.target.checked)}
              className="size-4 rounded border-line accent-brand"
            />
            Simulasikan akun pengemudi yang belum terverifikasi
          </label>
        ) : null}
      </div>

      <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field label="Email atau Nomor Telepon" htmlFor="login-email" error={errors.email?.message}>
          <Input
            id="login-email"
            type="text"
            inputMode="email"
            autoComplete="username"
            placeholder="nama@email.com atau 0812..."
            icon={<Mail size={16} />}
            invalid={Boolean(errors.email)}
            {...register('email')}
          />
        </Field>

        <Field label="Password" htmlFor="login-password" error={errors.password?.message}>
          <Input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Masukkan password"
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

        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-ink">
            <input
              type="checkbox"
              className="size-4 rounded border-line accent-brand"
              {...register('remember')}
            />
            Ingat saya
          </label>
          <Link
            to="/lupa-password"
            className="text-xs font-semibold text-brand-strong hover:underline"
          >
            Lupa password?
          </Link>
        </div>

        <Button type="submit" size="lg" className="mt-1 w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 size={17} className="animate-spin" /> : null}
          Masuk ke Dashboard
        </Button>
      </form>

      <div className="mt-4 rounded-md bg-muted px-3 py-2.5 text-[11px] leading-relaxed text-ink">
        <span className="font-semibold text-ink-strong">Mode demo:</span> gunakan salah satu peran
        di atas. Password bebas minimal 6 karakter.
      </div>

      <div className="mt-5 border-t border-line-soft pt-4 text-center">
        <p className="text-xs text-ink">
          Belum punya akun?{' '}
          <Link to="/register" className="font-semibold text-brand-strong hover:underline">
            Daftar sekarang
          </Link>
        </p>
      </div>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-ink-soft">
        <ShieldCheck size={13} className="text-brand" />
        Data Anda dilindungi dan digunakan hanya untuk layanan transportasi.
      </p>
    </AuthLayout>
  )
}
