import { LogOut, Menu, ShieldCheck } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'

import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { homeForRole, useAuthStore } from '@/features/auth/auth-store'
import { cn } from '@/lib/cn'
import { publicNav } from '@/lib/navigation'

const roleLabel = {
  penumpang: 'Penumpang',
  pengemudi: 'Pengemudi',
  admin: 'Admin',
}

function PublicHeader() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line-soft/60 bg-canvas/90 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between gap-6 md:h-20">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigasi utama">
          {publicNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-brand text-white shadow-soft'
                    : 'text-ink hover:bg-muted hover:text-ink-strong',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Link
                to={homeForRole(user.role)}
                className="flex items-center gap-2 rounded-md py-1 pr-2 pl-1 transition hover:bg-muted"
              >
                <Avatar name={user.name} size="sm" />
                <span className="flex flex-col leading-tight">
                  <span className="text-xs font-semibold text-ink-strong">{user.name}</span>
                  <span className="text-[11px] text-ink-soft">{roleLabel[user.role]}</span>
                </span>
              </Link>
              <Button variant="ghost" size="icon" aria-label="Keluar" onClick={handleLogout}>
                <LogOut size={16} />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" asChild>
                <Link to="/login">Masuk</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Daftar</Link>
              </Button>
            </>
          )}
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Buka menu">
              <Menu size={20} />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="gap-6 p-0">
            <SheetHeader className="border-b border-line-soft pb-4">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4" aria-label="Navigasi mobile">
              {publicNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-md px-3 py-2.5 text-sm font-medium',
                      isActive ? 'bg-brand text-white' : 'text-ink hover:bg-muted',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-2 border-t border-line-soft p-4">
              {user ? (
                <>
                  <Button variant="outline" asChild>
                    <Link to={homeForRole(user.role)}>Buka dashboard</Link>
                  </Button>
                  <Button variant="ghost" onClick={handleLogout}>
                    Keluar
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" asChild>
                    <Link to="/login">Masuk</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/register">Daftar</Link>
                  </Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}

const footerColumns = [
  {
    title: 'Layanan',
    links: [
      { label: 'Peta Live', to: '/peta' },
      { label: 'Cari Rute', to: '/rute' },
      { label: 'Daftar Trayek', to: '/trayek' },
      { label: 'Statistik', to: '/statistik' },
    ],
  },
  {
    title: 'Mitra',
    links: [
      { label: 'Daftar Pengemudi', to: '/register' },
      { label: 'Verifikasi Pengemudi', to: '/pengemudi/verifikasi' },
      { label: 'Portal Admin', to: '/admin' },
    ],
  },
  {
    title: 'Bantuan',
    links: [
      { label: 'Pusat Bantuan', to: '/bantuan' },
      { label: 'Laporkan Masalah', to: '/penumpang/lapor' },
      { label: 'Kebijakan Privasi', to: '/bantuan' },
    ],
  },
]

function PublicFooter() {
  return (
    <footer className="border-t border-line-soft bg-surface shadow-footer">
      <div className="container-page py-10">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col gap-3 lg:col-span-2">
            <Logo />
            <p className="max-w-sm text-sm leading-relaxed text-ink">
              Platform pelacakan angkot realtime dan transparansi layanan transportasi publik untuk
              warga kota.
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs font-medium text-brand-strong">
              <ShieldCheck size={14} />
              Data armada terverifikasi Dishub
            </div>
          </div>
          {footerColumns.map((column) => (
            <div key={column.title} className="flex flex-col gap-3">
              <h4 className="text-xs font-bold tracking-wider text-ink-strong uppercase">
                {column.title}
              </h4>
              <ul className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-ink transition hover:text-brand-strong"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-3 border-t border-line-soft pt-5 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Angkot-Live. Bagian dari layanan transportasi publik kota.</p>
          <div className="flex items-center gap-4">
            <Link to="/bantuan" className="hover:text-ink-strong">
              Syarat & Ketentuan
            </Link>
            <Link to="/bantuan" className="hover:text-ink-strong">
              Kebijakan Privasi
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export function PublicShell() {
  return (
    <div className="flex min-h-svh flex-col bg-canvas">
      <PublicHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}
