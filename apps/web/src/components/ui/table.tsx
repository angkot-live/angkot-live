import type { ComponentProps } from 'react'

import { cn } from '@/lib/cn'

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-line-soft bg-surface">
      <table className={cn('w-full border-collapse text-left text-sm', className)} {...props} />
    </div>
  )
}

export function TableHead({ className, ...props }: ComponentProps<'thead'>) {
  return <thead className={cn('bg-muted/60 text-xs text-ink', className)} {...props} />
}

export function TableBody({ className, ...props }: ComponentProps<'tbody'>) {
  return <tbody className={cn('divide-y divide-line-soft', className)} {...props} />
}

export function TableRow({ className, ...props }: ComponentProps<'tr'>) {
  return <tr className={cn('transition hover:bg-muted/30', className)} {...props} />
}

export function TableHeaderCell({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      className={cn('px-4 py-3 text-xs font-semibold whitespace-nowrap', className)}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: ComponentProps<'td'>) {
  return <td className={cn('px-4 py-3.5 align-middle', className)} {...props} />
}
