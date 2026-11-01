import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/cn'

export const Sheet = DialogPrimitive.Root
export const SheetTrigger = DialogPrimitive.Trigger
export const SheetClose = DialogPrimitive.Close

export function SheetContent({
  className,
  children,
  side = 'right',
  showClose = true,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  side?: 'right' | 'left' | 'bottom'
  showClose?: boolean
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink-strong/40 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-50 flex flex-col border-line-soft bg-surface shadow-float focus:outline-none',
          side === 'right' && 'inset-y-0 right-0 w-full max-w-sm border-l',
          side === 'left' && 'inset-y-0 left-0 w-full max-w-sm border-r',
          side === 'bottom' && 'inset-x-0 bottom-0 max-h-[85svh] rounded-t-2xl border-t',
          className,
        )}
        {...props}
      >
        {showClose ? (
          <DialogPrimitive.Close
            aria-label="Tutup"
            className="absolute top-4 right-4 z-10 grid size-8 place-items-center rounded-md text-ink-soft transition hover:bg-muted hover:text-ink-strong"
          >
            <X size={16} />
          </DialogPrimitive.Close>
        ) : null}
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function SheetHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1 p-6 pb-3 pr-12', className)} {...props} />
}

export function SheetTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-lg font-bold text-ink-strong', className)}
      {...props}
    />
  )
}

export function SheetDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description className={cn('text-sm text-ink', className)} {...props} />
  )
}
