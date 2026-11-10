import { BusFront } from 'lucide-react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/cn'

interface LogoProps {
  to?: string
  className?: string
  compact?: boolean
  tone?: 'dark' | 'light'
}

export function Logo({ to = '/', className, compact = false, tone = 'dark' }: LogoProps) {
  return (
    <Link
      to={to}
      className={cn('inline-flex items-center gap-2.5', className)}
      aria-label="Angkot-Live"
    >
      <span
        className={cn(
          'grid place-items-center rounded-lg bg-brand-strong text-white shadow-soft',
          compact ? 'size-8' : 'size-9',
        )}
      >
        <BusFront size={compact ? 17 : 19} strokeWidth={2.2} />
      </span>
      <span
        className={cn(
          'text-[17px] font-extrabold tracking-tight',
          tone === 'light' ? 'text-white' : 'text-ink-strong',
        )}
      >
        Angkot<span className="text-brand">-Live</span>
      </span>
    </Link>
  )
}
