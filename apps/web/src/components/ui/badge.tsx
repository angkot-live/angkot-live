import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/cn'
import type { DriverMode, ReportStatus, VehicleStatus } from '@/types'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap',
  {
    variants: {
      variant: {
        neutral: 'bg-muted text-ink',
        leaf: 'bg-leaf text-leaf-ink',
        sky: 'bg-sky text-sky-ink',
        peach: 'bg-peach text-amber-900',
        danger: 'bg-danger-bg text-danger',
        outline: 'border border-line bg-surface text-ink',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
)

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

const statusLabel: Record<VehicleStatus, string> = {
  jalan: 'Jalan',
  merayap: 'Merayap',
  ngetem: 'Ngetem',
  istirahat: 'Istirahat',
  offline: 'Offline',
}

const statusVariant: Record<VehicleStatus, BadgeProps['variant']> = {
  jalan: 'leaf',
  merayap: 'peach',
  ngetem: 'sky',
  istirahat: 'neutral',
  offline: 'neutral',
}

const statusDot: Record<VehicleStatus, string> = {
  jalan: 'bg-brand',
  merayap: 'bg-warning',
  ngetem: 'bg-info',
  istirahat: 'bg-ink-soft',
  offline: 'bg-ink-soft',
}

export function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  return (
    <Badge variant={statusVariant[status]}>
      <span className={cn('size-1.5 rounded-full', statusDot[status])} aria-hidden />
      {statusLabel[status]}
    </Badge>
  )
}

const modeLabel: Record<DriverMode, string> = {
  narik: 'Narik',
  ngetem: 'Ngetem',
  istirahat: 'Istirahat',
  offline: 'Offline',
}

export function DriverModeBadge({ mode }: { mode: DriverMode }) {
  const variant: BadgeProps['variant'] =
    mode === 'narik' ? 'leaf' : mode === 'ngetem' ? 'sky' : 'neutral'
  return <Badge variant={variant}>{modeLabel[mode]}</Badge>
}

const reportLabel: Record<ReportStatus, string> = {
  diterima: 'Diterima',
  diproses: 'Diproses',
  selesai: 'Selesai',
}

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const variant: BadgeProps['variant'] =
    status === 'selesai' ? 'leaf' : status === 'diproses' ? 'sky' : 'peach'
  return <Badge variant={variant}>{reportLabel[status]}</Badge>
}
