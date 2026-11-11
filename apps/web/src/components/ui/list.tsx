import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

export function List({ className, ...props }: HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      className={cn(
        'divide-y-[0.5px] divide-line overflow-hidden rounded-lg border-[0.5px] border-line bg-surface',
        className,
      )}
      {...props}
    />
  )
}

export function ListItem({ className, ...props }: HTMLAttributes<HTMLLIElement>) {
  return <li className={cn('flex items-center gap-3 px-4 py-3', className)} {...props} />
}

export function ListItemIcon({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-md bg-muted text-brand-strong',
        className,
      )}
      {...props}
    />
  )
}

export function ListItemText({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-w-0 flex-1', className)} {...props} />
}

export function ListItemTitle({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('truncate text-sm font-semibold text-ink-strong', className)} {...props} />
}

export function ListItemDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('truncate text-xs text-ink-soft', className)} {...props} />
}
