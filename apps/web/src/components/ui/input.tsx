import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { Children, cloneElement, isValidElement, useId } from 'react'

import { cn } from '@/lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode
  trailing?: ReactNode
  invalid?: boolean
}

export function Input({ className, icon, trailing, invalid, ...props }: InputProps) {
  return (
    <div className="relative">
      {icon ? (
        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-soft">
          {icon}
        </span>
      ) : null}
      <input
        aria-invalid={invalid || undefined}
        className={cn(
          'h-11 w-full rounded-input border-[0.5px] border-line bg-surface px-3.5 text-sm text-ink-strong outline-none transition placeholder:text-[#94a3b8] focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-60',
          icon && 'pl-10',
          trailing && 'pr-11',
          invalid && 'border-danger bg-danger-bg/40 focus:border-danger focus:ring-danger/15',
          className,
        )}
        {...props}
      />
      {trailing ? (
        <span className="absolute top-1/2 right-2 -translate-y-1/2">{trailing}</span>
      ) : null}
    </div>
  )
}

export interface FieldProps {
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
  className?: string
  htmlFor?: string
}

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
  htmlFor,
}: FieldProps) {
  const fallbackId = useId()
  const fields = Children.toArray(children)
  const first = fields.find((child) => isValidElement<{ id?: string }>(child))
  const id = htmlFor ?? (isValidElement<{ id?: string }>(first) ? first.props.id : undefined) ?? fallbackId
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink-strong">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      {fields.map((child) => child === first && isValidElement<{ id?: string }>(child) ? cloneElement(child, { id }) : child)}
      {error ? (
        <p className="text-xs font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-soft">{hint}</p>
      ) : null}
    </div>
  )
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-28 w-full resize-y rounded-input border-[0.5px] border-line bg-surface px-3.5 py-3 text-sm text-ink-strong outline-none transition placeholder:text-[#94a3b8] focus:border-brand focus:ring-2 focus:ring-brand/15',
        className,
      )}
      {...props}
    />
  )
}
