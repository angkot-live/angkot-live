import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border-[0.5px] border-dashed border-line bg-muted/40 px-6 py-12 text-center',
        className,
      )}
    >
      {icon ? (
        <span className="grid size-12 place-items-center rounded-lg bg-leaf text-brand-strong">
          {icon}
        </span>
      ) : null}
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-bold text-ink-strong">{title}</h3>
        {description ? <p className="max-w-sm text-sm text-ink">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function ErrorState({
  title = 'Terjadi kesalahan',
  description = 'Data gagal dimuat. Coba muat ulang halaman.',
  action,
}: {
  title?: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border-[0.5px] border-danger/20 bg-danger-bg/40 px-6 py-10 text-center">
      <h3 className="text-base font-bold text-danger">{title}</h3>
      <p className="max-w-sm text-sm text-ink">{description}</p>
      {action}
    </div>
  )
}
