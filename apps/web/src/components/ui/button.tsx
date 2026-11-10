import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-brand-strong text-white shadow-soft hover:bg-brand',
        secondary: 'bg-secondary text-white shadow-soft hover:bg-secondary-strong',
        tertiary: 'bg-leaf text-leaf-ink hover:bg-brand-soft/60',
        outline: 'border border-line bg-surface text-ink-strong shadow-soft hover:bg-muted',
        ghost: 'text-ink hover:bg-muted',
        soft: 'bg-muted text-brand-strong hover:bg-muted-strong',
        danger: 'bg-danger text-white shadow-soft hover:bg-danger-ink',
        link: 'text-brand-strong underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3 text-xs',
        md: 'h-11 px-4',
        lg: 'h-12 px-6',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export { buttonVariants }
