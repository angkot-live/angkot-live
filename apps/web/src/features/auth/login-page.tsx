import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { AuthLayout } from './auth-layout'
import { homeForRole, useAuthStore } from './auth-store'
import { api, errorMessage } from '@/lib/api'

type DemoConfig = {
  accounts: { role: string; email: string }[]
  password: string
}

export function LoginPage() {
  const [demo, setDemo] = useState<DemoConfig | null>(null)
  useEffect(() => {
    if (import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true')
      void api<DemoConfig>('/demo/config')
        .then(setDemo)
        .catch(() => {})
  }, [])
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false)
  const login = useAuthStore((s) => s.login),
    authError = useAuthStore((s) => s.error)
  const navigate = useNavigate(),
    location = useLocation()
  async function quickLogin(demoEmail: string) {
    if (!demo || busy) return
    setBusy(true)
    try {
      const auth = useAuthStore.getState()
      if (auth.user) await auth.logout()
      const user = await login(demoEmail, demo.password)
      navigate(homeForRole(user.role), { replace: true })
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      const user = await login(email, password)
      const from = location.state?.from as
        { pathname?: string; search?: string } | undefined
      const home = homeForRole(user.role)
      const next = from?.pathname
      navigate(
        next && (next === home || next.startsWith(`${home}/`))
          ? `${next}${from?.search ?? ''}`
          : home,
        { replace: true },
      )
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <AuthLayout>
      <h1 className="text-2xl font-extrabold text-ink-strong">
        Selamat datang kembali
      </h1>
      <p className="mt-2 text-sm text-ink">
        Masuk menggunakan akun Angkot-Live Anda.
      </p>
      {authError && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {authError}
        </p>
      )}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Email">
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <Link className="block text-sm text-brand" to="/lupa-password">
          Lupa password?
        </Link>
        <Button disabled={busy} className="w-full">
          {busy ? 'Memeriksa akun…' : 'Masuk'}
        </Button>
      </form>
      {demo && (
        <div className="mt-6 space-y-2 rounded-xl border border-line p-4">
          <p className="text-sm font-semibold">Masuk cepat demo lokal</p>
          <div className="flex flex-wrap gap-2">
            {demo.accounts.map((account) => (
              <Button
                key={account.role}
                type="button"
                disabled={busy}
                onClick={() => void quickLogin(account.email)}
              >
                {account.role === 'admin'
                  ? 'Admin'
                  : account.role === 'pengemudi'
                    ? 'Pengemudi'
                    : 'Penumpang'}
              </Button>
            ))}
          </div>
        </div>
      )}
      <p className="mt-5 text-sm text-ink">
        Belum punya akun?{' '}
        <Link className="font-semibold text-brand" to="/register">
          Daftar
        </Link>
      </p>
    </AuthLayout>
  )
}
