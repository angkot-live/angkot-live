import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { AuthLayout } from './auth-layout'
import { post, errorMessage } from '@/lib/api'
import { supabase } from '@/lib/supabase'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState(''),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await post('/auth/recover', { email })
      setSent(true)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold">Pulihkan password</h1>
      <p className="mt-2 text-sm text-ink">
        Kami akan mengirim tautan pemulihan ke email akun Anda.
      </p>
      {sent ? (
        <p role="status" className="mt-5 text-sm">
          Jika email terdaftar, tautan pemulihan telah dikirim. Periksa inbox
          dan folder spam.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4">
          <Field label="Email">
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Button disabled={busy}>Kirim tautan pemulihan</Button>
        </form>
      )}
      <Link to="/login" className="mt-5 block text-sm text-brand">
        Kembali ke login
      </Link>
    </AuthLayout>
  )
}
export function ResetPasswordPage() {
  const [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [busy, setBusy] = useState(false),
    navigate = useNavigate()
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('Konfirmasi password tidak sama.')
      return
    }
    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success('Password diperbarui.')
      navigate('/login', { replace: true })
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold">Password baru</h1>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <Field label="Password baru">
          <Input
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label="Konfirmasi password">
          <Input
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
        <Button disabled={busy}>Simpan password</Button>
      </form>
    </AuthLayout>
  )
}
