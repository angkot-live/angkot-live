import { ChevronDown } from 'lucide-react'
import type { SelectHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

export function Select({ className, invalid, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        aria-invalid={invalid || undefined}
        className={cn(
          'h-11 w-full appearance-none rounded-md border border-transparent bg-muted px-3.5 pr-10 text-sm text-ink-strong outline-none transition focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/15',
          invalid && 'border-danger bg-danger-bg/40',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-soft"
      />
    </div>
  )
}
