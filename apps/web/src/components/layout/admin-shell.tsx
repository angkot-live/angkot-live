import { LogOut, Menu } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useAuthStore } from '@/features/auth/auth-store'
import { cn } from '@/lib/cn'
import { adminNav, adminSecondaryNav, type NavItem } from '@/lib/navigation'

function SidebarNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Navigasi admin">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition',
              isActive
                ? 'bg-brand text-white shadow-soft'
                : 'text-ink hover:bg-muted hover:text-ink-strong',
            )
          }
        >
          <item.icon size={17} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

function SidebarContent() {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Logo to="/admin" className="px-2" />
      <div className="flex flex-col gap-6">
        <SidebarNav items={adminNav} />
        <div className="flex flex-col gap-2">
          <p className="px-3 text-xs font-bold tracking-wider text-ink-soft uppercase">
            Publik
          </p>
          <SidebarNav items={adminSecondaryNav} />
        </div>
      </div>
      <div className="mt-auto rounded-lg bg-leaf p-3">
        <p className="text-xs font-semibold text-brand-strong">Mode Demo</p>
        <p className="mt-1 text-xs leading-relaxed text-ink">
          Lokasi armada berasal dari pengemudi. Posisi simulator lokal diberi label SIMULASI.
        </p>
      </div>
    </div>
  )
}

export function AdminShell() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-svh bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-line-soft bg-surface shadow-card lg:block">
        <SidebarContent />
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-line-soft bg-surface/90 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 md:px-8">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Buka menu">
                  <Menu size={20} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Menu admin</SheetTitle>
                </SheetHeader>
                <SidebarContent />
              </SheetContent>
            </Sheet>

            <div className="ml-auto flex items-center gap-2">
              {user ? (
                <div className="flex items-center gap-2 rounded-md py-1 pr-2 pl-1">
                  <Avatar name={user.name} size="sm" />
                  <div className="hidden flex-col leading-tight sm:flex">
                    <span className="text-xs font-semibold text-ink-strong">{user.name}</span>
                    <span className="text-xs text-ink-soft">Administrator</span>
                  </div>
                </div>
              ) : null}
              <Button variant="ghost" size="icon" aria-label="Keluar" onClick={handleLogout}>
                <LogOut size={16} />
              </Button>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
