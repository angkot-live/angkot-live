import { Bell, BusFront, CheckCheck, FileText, Info, Megaphone } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { notifications as seedNotifications } from '@/mocks/passenger'
import { cn } from '@/lib/cn'

const kindMeta = {
  trip: { icon: BusFront, label: 'Perjalanan', variant: 'leaf' as const, to: '/penumpang/riwayat' },
  report: { icon: FileText, label: 'Laporan', variant: 'sky' as const, to: '/penumpang/laporan' },
  promo: { icon: Megaphone, label: 'Info', variant: 'peach' as const, to: '/statistik' },
  system: { icon: Info, label: 'Sistem', variant: 'neutral' as const, to: '/bantuan' },
}

export function NotificationsPage() {
  const [items, setItems] = useState(seedNotifications)
  const [onlyUnread, setOnlyUnread] = useState(false)

  const filtered = useMemo(
    () => items.filter((item) => !onlyUnread || item.unread),
    [items, onlyUnread],
  )
  const unreadCount = items.filter((item) => item.unread).length

  function markAllRead() {
    setItems((current) => current.map((item) => ({ ...item, unread: false })))
  }

  function markRead(id: string) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, unread: false } : item)),
    )
  }

  return (
    <div className="container-page py-6 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-eyebrow text-brand">Kotak masuk</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-ink-strong md:text-3xl">
            Notifikasi
            {unreadCount > 0 ? <Badge variant="leaf">{unreadCount} baru</Badge> : null}
          </h1>
          <p className="mt-1 text-sm text-ink">Update perjalanan dan laporan terbaru.</p>
        </div>
        <Button variant="outline" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
          <CheckCheck size={14} />
          Tandai semua dibaca
        </Button>
      </div>

      <div className="mt-5 flex gap-1.5">
        <button
          type="button"
          onClick={() => setOnlyUnread(false)}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-semibold transition',
            !onlyUnread ? 'bg-brand-strong text-white' : 'bg-surface text-ink hover:bg-muted',
          )}
        >
          Semua
        </button>
        <button
          type="button"
          onClick={() => setOnlyUnread(true)}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-semibold transition',
            onlyUnread ? 'bg-brand-strong text-white' : 'bg-surface text-ink hover:bg-muted',
          )}
        >
          Belum dibaca
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {filtered.map((item) => {
          const meta = kindMeta[item.kind]
          return (
            <Link key={item.id} to={meta.to} onClick={() => markRead(item.id)}>
              <Card
                className={cn(
                  'transition hover:border-brand/40',
                  item.unread && 'border-brand/25 bg-leaf/20',
                )}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-leaf text-brand-strong">
                    <meta.icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-bold text-ink-strong">{item.title}</p>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                      {item.unread ? (
                        <span className="size-1.5 rounded-full bg-brand" aria-label="Belum dibaca" />
                      ) : null}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-ink">{item.body}</p>
                    <p className="mt-1 text-[10px] text-ink-soft">{item.time}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
              <Bell size={26} className="text-ink-soft" />
              <p className="text-sm font-semibold text-ink-strong">Tidak ada notifikasi</p>
              <p className="text-xs text-ink">Semua notifikasi sudah kamu baca.</p>
              <Button size="sm" variant="outline" onClick={() => setOnlyUnread(false)}>
                Lihat semua
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
