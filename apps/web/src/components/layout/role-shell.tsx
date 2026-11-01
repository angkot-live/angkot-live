import { Bell, LogOut } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'

import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { useAuthStore } from '@/features/auth/auth-store'
import { cn } from '@/lib/cn'
import type { NavItem } from '@/lib/navigation'

interface RoleShellProps {
  nav: NavItem[]
  home: string
}

export function RoleShell({ nav, home }: RoleShellProps) {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-svh flex-col bg-canvas">
      <header className="sticky top-0 z-40 border-b border-line-soft/70 bg-surface/90 backdrop-blur-xl">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Logo to={home} compact />
            <nav className="hidden items-center gap-1 md:flex" aria-label="Navigasi area">
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition',
                      isActive
                        ? 'bg-muted text-brand-strong'
                        : 'text-ink hover:bg-muted hover:text-ink-strong',
                    )
                  }
                >
                  <item.icon size={16} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="soft" size="icon" aria-label="Notifikasi" asChild>
              <Link to={user?.role === 'pengemudi' ? '/pengemudi/inbox' : '/penumpang/notifikasi'}>
                <Bell size={18} />
              </Link>
            </Button>
            {user ? (
              <div className="flex items-center gap-2">
                <Avatar name={user.name} size="sm" />
                <div className="hidden flex-col leading-tight sm:flex">
                  <span className="text-xs font-semibold text-ink-strong">{user.name}</span>
                  <span className="text-[11px] text-ink-soft">{user.role}</span>
                </div>
              </div>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Keluar"
              className="hidden sm:inline-flex"
              onClick={handleLogout}
            >
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-line-soft bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
        aria-label="Navigasi bawah"
      >
        {nav.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition',
                isActive ? 'text-brand-strong' : 'text-ink-soft',
              )
            }
          >
            <item.icon size={19} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
