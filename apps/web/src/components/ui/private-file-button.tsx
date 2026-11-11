import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from './button'
import { post, errorMessage } from '@/lib/api'

export function PrivateFileButton({
  bucket,
  path,
  children,
}: {
  bucket: 'driver-documents' | 'report-evidence'
  path: string
  children: React.ReactNode
}) {
  const [busy, setBusy] = useState(false),
    [fallback, setFallback] = useState<string | null>(null)
  async function open() {
    // Reserve the tab during the user gesture; opening after fetch is blocked on phones.
    const preview = window.open('about:blank', '_blank')
    if (preview) preview.opener = null
    setBusy(true)
    setFallback(null)
    try {
      const { url } = await post<{ url: string }>('/documents/url', {
        bucket,
        path,
      })
      if (preview && !preview.closed) preview.location.replace(url)
      else setFallback(url)
    } catch (e) {
      preview?.close()
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => void open()}
      >
        {busy ? 'Memuat berkas…' : children}
      </Button>
      {fallback && (
        <a
          className="text-xs text-brand underline"
          href={fallback}
          target="_blank"
          rel="noopener noreferrer"
        >
          Buka berkas privat (tautan berlaku 2 menit)
        </a>
      )}
    </span>
  )
}
