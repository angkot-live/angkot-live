import { Link } from 'react-router-dom'
import { useMessages } from '@/features/messages/use-messages'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { errorMessage } from '@/lib/api'
export function NotificationsPage() {
  const { messages, error, isPending, markRead } = useMessages()
  return (
    <div className="container-page space-y-4 py-8">
      <div className="flex flex-wrap justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Notifikasi</h1>
        <Button
          variant="outline"
          disabled={!messages.some((m) => !m.is_read)}
          onClick={() => {
            void markRead().catch((e) => toast.error(errorMessage(e)))
          }}
        >
          Tandai semua dibaca
        </Button>
      </div>
      {error && <p role="alert">{errorMessage(error)}</p>}
      {isPending && <p>Memuat notifikasi…</p>}
      {!isPending && !error && messages.length === 0 && (
        <p className="text-sm text-ink">Belum ada notifikasi.</p>
      )}
      {messages.map((m) => (
        <Card key={m.id} className={m.is_read ? '' : 'border-brand/40'}>
          <CardContent className="space-y-2 p-4">
            <h2 className="font-bold">{m.title}</h2>
            <p className="text-sm">{m.content}</p>
            {m.related_report_id && (
              <Link
                className="text-sm text-brand underline"
                to={`/penumpang/laporan/${m.related_report_id}`}
              >
                Lihat laporan
              </Link>
            )}
            <p className="text-xs text-ink">
              {new Date(m.created_at).toLocaleString('id-ID')}
            </p>
            {!m.is_read && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void markRead(m.id).catch((e) => toast.error(errorMessage(e)))
                }}
              >
                Tandai dibaca
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
