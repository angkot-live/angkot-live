import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { AuthLayout } from '@/features/auth/auth-layout'
import { cn } from '@/lib/cn'

type Step = 'email' | 'otp' | 'password'

const steps: { id: Step; label: string }[] = [
  { id: 'email', label: 'Email' },
  { id: 'otp', label: 'Kode OTP' },
  { id: 'password', label: 'Password Baru' },
]

function Stepper({ current }: { current: Step }) {
  const currentIndex = steps.findIndex((step) => step.id === current)
  return (
    <ol className="flex items-start justify-between">
      {steps.map((step, index) => {
        const done = index < currentIndex
        const active = index === currentIndex
        return (
          <li key={step.id} className="relative flex flex-1 flex-col items-center gap-1.5">
            {index < steps.length - 1 ? (
              <span
                className={cn(
                  'absolute top-3.5 left-1/2 h-0.5 w-full',
                  index < currentIndex ? 'bg-brand' : 'bg-line',
                )}
              />
            ) : null}
            <span
              className={cn(
                'relative z-10 grid size-7 place-items-center rounded-full border-2 text-[11px] font-bold',
                done && 'border-brand bg-brand text-white',
                active && 'border-brand bg-brand text-white',
                !done && !active && 'border-line bg-surface text-ink-soft',
              )}
            >
              {done ? <Check size={13} /> : index + 1}
            </span>
            <span
              className={cn(
                'text-[11px] font-semibold',
                active || done ? 'text-ink-strong' : 'text-ink-soft',
              )}
            >
              {step.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('demo@angkot-live.id')
  const [emailError, setEmailError] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpError, setOtpError] = useState('')
  const [seconds, setSeconds] = useState(43)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const inputs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    if (step !== 'otp' || seconds <= 0) return
    const timer = window.setInterval(() => setSeconds((value) => value - 1), 1000)
    return () => window.clearInterval(timer)
  }, [step, seconds])

  function handleEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email) && !/^(\+62|62|0)8\d{7,12}$/.test(email)) {
      setEmailError('Masukkan email atau nomor telepon yang valid.')
      return
    }
    setEmailError('')
    setStep('otp')
    setSeconds(43)
    toast.success('Kode OTP dikirim', { description: `Cek ${email} atau SMS masuk.` })
  }

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    setOtp((current) => current.map((item, position) => (position === index ? digit : item)))
    setOtpError('')
    if (digit && index < 5) inputs.current[index + 1]?.focus()
  }

  function handleOtpKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  function handleOtpPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!digits) return
    event.preventDefault()
    setOtp(Array.from({ length: 6 }, (_, index) => digits[index] ?? ''))
    inputs.current[Math.min(digits.length, 5)]?.focus()
  }

  function handleOtpSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (otp.some((digit) => !digit)) {
      setOtpError('Lengkapi 6 digit kode OTP.')
      return
    }
    setOtpError('')
    setStep('password')
  }

  function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      setPasswordError('Minimal 8 karakter, mengandung huruf besar dan angka.')
      return
    }
    if (password !== confirm) {
      setPasswordError('Konfirmasi password tidak sama.')
      return
    }
    setPasswordError('')
    toast.success('Password berhasil diubah', {
      description: 'Silakan masuk dengan password baru.',
    })
    navigate('/login')
  }

  return (
    <AuthLayout>
      <div className="flex flex-col gap-1">
        <p className="text-eyebrow text-brand">Pemulihan akun</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-strong">
          {step === 'email' && 'Lupa password?'}
          {step === 'otp' && 'Masukkan kode verifikasi'}
          {step === 'password' && 'Buat password baru'}
        </h1>
        <p className="text-sm text-ink">
          {step === 'email' && 'Masukkan email atau nomor telepon terdaftar untuk menerima kode.'}
          {step === 'otp' &&
            `Kami mengirim 6 digit kode OTP ke ${email || 'kontak terdaftar'}.`}
          {step === 'password' && 'Gunakan password kuat yang belum pernah dipakai sebelumnya.'}
        </p>
      </div>

      <div className="mt-6">
        <Stepper current={step} />
      </div>

      {step === 'email' ? (
        <form onSubmit={handleEmailSubmit} className="mt-6 flex flex-col gap-4">
          <Field label="Email atau Nomor Telepon" htmlFor="reset-email" error={emailError}>
            <Input
              id="reset-email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setEmailError('')
              }}
              icon={<Mail size={16} />}
              placeholder="nama@email.com atau 0812..."
              invalid={Boolean(emailError)}
              autoComplete="username"
            />
          </Field>
          <Button type="submit" size="lg" className="w-full">
            Kirim kode OTP
            <ArrowRight size={16} />
          </Button>
          <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-[11px] leading-relaxed text-ink">
            <MessageSquare size={14} className="mt-0.5 shrink-0 text-brand" />
            Kode dikirim ke email dan nomor telepon yang terdaftar. Pastikan kontak aktif.
          </div>
        </form>
      ) : null}

      {step === 'otp' ? (
        <form onSubmit={handleOtpSubmit} className="mt-6 flex flex-col gap-4">
          <div className="flex justify-center gap-2" aria-label="Kode OTP 6 digit">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputs.current[index] = element
                }}
                value={digit}
                onChange={(event) => handleOtpChange(index, event.target.value)}
                onKeyDown={(event) => handleOtpKeyDown(index, event)}
                onPaste={handleOtpPaste}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                aria-label={`Digit ${index + 1}`}
                className={cn(
                  'size-12 rounded-md border bg-muted text-center text-lg font-bold text-ink-strong outline-none transition focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/15',
                  otpError ? 'border-danger' : 'border-transparent',
                )}
              />
            ))}
          </div>
          {otpError ? (
            <p className="text-center text-xs font-medium text-danger">{otpError}</p>
          ) : null}

          <div className="flex items-center justify-center gap-1.5 text-xs text-ink">
            <ShieldCheck size={13} className="text-brand" />
            {seconds > 0 ? (
              <span>
                Kirim ulang kode dalam{' '}
                <span className="font-semibold text-ink-strong">
                  00:{seconds.toString().padStart(2, '0')}
                </span>
              </span>
            ) : (
              <button
                type="button"
                className="font-semibold text-brand-strong hover:underline"
                onClick={() => {
                  setSeconds(43)
                  toast.success('Kode OTP baru dikirim')
                }}
              >
                Kirim ulang kode
              </button>
            )}
          </div>

          <Button type="submit" size="lg" className="w-full">
            Verifikasi
            <ArrowRight size={16} />
          </Button>

          <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-[11px] leading-relaxed text-ink">
            <MessageSquare size={14} className="mt-0.5 shrink-0 text-brand" />
            Masalah menerima SMS/email? Pastikan kontak terdaftar aktif atau gunakan bantuan
            operator posko.
          </div>
        </form>
      ) : null}

      {step === 'password' ? (
        <form onSubmit={handlePasswordSubmit} className="mt-6 flex flex-col gap-4">
          <Field label="Password baru" htmlFor="reset-password">
            <Input
              id="reset-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setPasswordError('')
              }}
              icon={<LockKeyhole size={16} />}
              placeholder="Minimal 8 karakter"
              autoComplete="new-password"
              trailing={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              }
            />
          </Field>

          <Field label="Konfirmasi password" htmlFor="reset-confirm" error={passwordError}>
            <Input
              id="reset-confirm"
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={(event) => {
                setConfirm(event.target.value)
                setPasswordError('')
              }}
              icon={<KeyRound size={16} />}
              placeholder="Ulangi password baru"
              autoComplete="new-password"
              invalid={Boolean(passwordError)}
            />
          </Field>

          <ul className="flex flex-col gap-1.5 text-[11px] text-ink">
            {[
              { label: 'Minimal 8 karakter', valid: password.length >= 8 },
              { label: 'Mengandung huruf besar', valid: /[A-Z]/.test(password) },
              { label: 'Mengandung angka', valid: /\d/.test(password) },
            ].map((rule) => (
              <li key={rule.label} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'grid size-4 place-items-center rounded-full',
                    rule.valid ? 'bg-leaf text-brand-strong' : 'bg-muted text-ink-soft',
                  )}
                >
                  <CheckCircle2 size={11} />
                </span>
                {rule.label}
              </li>
            ))}
          </ul>

          <Button type="submit" size="lg" className="w-full">
            Simpan password baru
            <ArrowRight size={16} />
          </Button>
        </form>
      ) : null}

      <div className="mt-5 flex justify-center">
        <button
          type="button"
          onClick={() => {
            if (step === 'email') {
              navigate('/login')
            } else {
              setStep(step === 'password' ? 'otp' : 'email')
            }
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink hover:text-brand-strong"
        >
          <ArrowLeft size={14} />
          {step === 'email' ? 'Kembali ke halaman masuk' : 'Kembali ke langkah sebelumnya'}
        </button>
      </div>

      <p className="mt-6 text-center text-[11px] text-ink-soft">
        Butuh bantuan?{' '}
        <Link to="/bantuan" className="font-semibold text-brand-strong hover:underline">
          Pusat bantuan
        </Link>
      </p>
    </AuthLayout>
  )
}
