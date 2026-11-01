import {
  Bell,
  CheckCheck,
  ChevronRight,
  Inbox,
  Megaphone,
  MessageSquare,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useMessageStore } from '@/features/messages/message-store'
import { cn } from '@/lib/cn'
import type { DriverMessage } from '@/mocks/driver'

const kindMeta = {
  admin: { label: 'Admin', icon: ShieldCheck, tone: 'bg-sky text-sky-ink' },
  system: { label: 'Sistem', icon: Bell, tone: 'bg-leaf text-brand-strong' },
  report: { label: 'Laporan', icon: MessageSquare, tone: 'bg-peach text-amber-900' },
}

type Filter = 'semua' | 'belum' | DriverMessage['kind']

export function DriverInboxPage() {
  const messages = useMessageStore((state) => state.messages)
  const markRead = useMessageStore((state) => state.markRead)
  const markAllRead = useMessageStore((state) => state.markAllRead)
  const [selectedId, setSelectedId] = useState(messages[0]?.id ?? '')
  const [filter, setFilter] = useState<Filter>('semua')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return messages.filter((message) => {
      const matchesFilter =
        filter === 'semua' ||
        (filter === 'belum' ? message.unread : message.kind === filter)
      const matchesQuery =
        !term ||
        message.title.toLowerCase().includes(term) ||
        message.from.toLowerCase().includes(term) ||
        message.body.toLowerCase().includes(term)
      return matchesFilter && matchesQuery
    })
  }, [filter, messages, query])

  const selected = messages.find((message) => message.id === selectedId) ?? messages[0]
  const unread = messages.filter((message) => message.unread).length

  function openMessage(message: DriverMessage) {
    setSelectedId(message.id)
    markRead(message.id)
  }

  return (
    <div className="container-page py-6 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-eyebrow text-brand">Pesan & pengumuman</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-strong md:text-3xl">
            Inbox pengemudi
          </h1>
          <p className="mt-1 text-sm text-ink">
            Pesan dari admin, koordinator trayek, dan notifikasi sistem.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="peach">{unread} belum dibaca</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              markAllRead()
              toast.success('Semua pesan ditandai sudah dibaca')
            }}
          >
            <CheckCheck size={14} />
            Tandai semua
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[380px_1fr]">
        <Card className="h-fit overflow-hidden">
          <div className="border-b border-line-soft p-3">
            <Input
              icon={<Search size={14} />}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari pesan..."
              aria-label="Cari pesan"
              className="h-9"
            />
            <div className="mt-2 flex flex-wrap gap-1">
              {[
                { label: 'Semua', value: 'semua' },
                { label: 'Belum dibaca', value: 'belum' },
                { label: 'Admin', value: 'admin' },
                { label: 'Sistem', value: 'system' },
                { label: 'Laporan', value: 'report' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value as Filter)}
                  className={cn(
                    'rounded-md px-2 py-1.5 text-[10px] font-semibold transition',
                    filter === item.value
                      ? 'bg-brand-strong text-white'
                      : 'text-ink hover:bg-muted',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[60svh] overflow-y-auto">
            {filtered.map((message) => {
              const meta = kindMeta[message.kind]
              return (
                <button
                  key={message.id}
                  type="button"
                  onClick={() => openMessage(message)}
                  className={cn(
                    'flex w-full items-start gap-2.5 border-b border-line-soft p-3 text-left transition last:border-b-0',
                    selected?.id === message.id ? 'bg-leaf/50' : 'hover:bg-muted/40',
                  )}
                >
                  <span className={cn('mt-0.5 grid size-8 shrink-0 place-items-center rounded-md', meta.tone)}>
                    <meta.icon size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      {message.unread ? <span className="size-1.5 shrink-0 rounded-full bg-brand" /> : null}
                      <span className="truncate text-[11px] font-bold text-ink-strong">
                        {message.title}
                      </span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[9px] text-ink">{message.body}</span>
                    <span className="mt-1 flex items-center justify-between text-[8px] text-ink-soft">
                      <span>{message.from}</span>
                      <span>{message.time}</span>
                    </span>
                  </span>
                  <ChevronRight size={13} className="mt-2 shrink-0 text-ink-soft" />
                </button>
              )
            })}
            {filtered.length === 0 ? (
              <div className="p-8 text-center">
                <Inbox size={24} className="mx-auto text-ink-soft" />
                <p className="mt-2 text-xs font-semibold text-ink-strong">Tidak ada pesan</p>
                <p className="text-[10px] text-ink">Coba ubah filter atau kata kunci.</p>
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="min-h-[420px]">
          {selected ? (
            <CardContent className="p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line-soft pb-3">
                <div className="flex items-center gap-2.5">
                  <span className={cn('grid size-10 place-items-center rounded-full', kindMeta[selected.kind].tone)}>
                    {selected.kind === 'admin' ? (
                      <UserRound size={18} />
                    ) : selected.kind === 'report' ? (
                      <Megaphone size={18} />
                    ) : (
                      <Bell size={18} />
                    )}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-ink-strong">{selected.from}</p>
                    <p className="text-[10px] text-ink-soft">
                      {selected.role} · {selected.time}
                    </p>
                  </div>
                </div>
                <Badge variant={kindMeta[selected.kind].label === 'Admin' ? 'sky' : 'leaf'}>
                  {kindMeta[selected.kind].label}
                </Badge>
              </div>

              <h2 className="mt-4 text-lg font-extrabold text-ink-strong">{selected.title}</h2>
              <p className="mt-2 text-xs leading-relaxed text-ink">{selected.body}</p>

              {selected.kind === 'admin' ? (
                <div className="mt-4 rounded-md bg-peach/40 p-3 text-[10px] text-ink">
                  <p className="font-semibold text-ink-strong">Tindakan diperlukan</p>
                  <p className="mt-0.5">
                    Lengkapi dokumen sebelum tenggat. Hubungi koordinator trayek jika memerlukan
                    bantuan.
                  </p>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link to="/pengemudi/profil">
                    Lihat profil & dokumen
                    <ChevronRight size={13} />
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="soft"
                  onClick={() => toast.success('Pesan ditandai penting')}
                >
                  <CheckCheck size={13} />
                  Tandai penting
                </Button>
              </div>
            </CardContent>
          ) : (
            <div className="grid h-full min-h-[420px] place-items-center text-center">
              <div>
                <Inbox size={30} className="mx-auto text-ink-soft" />
                <p className="mt-2 text-sm font-semibold text-ink-strong">Pilih pesan</p>
                <p className="text-xs text-ink">Detail pesan akan muncul di sini.</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
