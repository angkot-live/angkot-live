import { Compass, Home, LogIn } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'

export function NotFoundPage({ code = '404', title = 'Halaman tidak ditemukan' }: { code?: string; title?: string }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-canvas px-4 py-12">
      <Logo className="mb-10" />
      <div className="w-full max-w-md rounded-xl border border-line-soft bg-surface p-8 text-center shadow-soft">
        <span className="mx-auto grid size-14 place-items-center rounded-lg bg-leaf text-brand-strong">
          <Compass size={26} />
        </span>
        <p className="mt-4 text-5xl font-extrabold tracking-tight text-brand-strong">{code}</p>
        <h1 className="mt-1 text-xl font-bold text-ink-strong">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink">
          Alamat yang Anda buka tidak tersedia atau Anda tidak memiliki akses ke halaman ini.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link to="/">
              <Home size={16} />
              Ke Beranda
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/login">
              <LogIn size={16} />
              Masuk
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
