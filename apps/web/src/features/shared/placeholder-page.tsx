import { ArrowLeft, Construction } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface PlaceholderPageProps {
  title: string
  description: string
  icon?: LucideIcon
  backTo?: string
  backLabel?: string
  items?: string[]
}

export function PlaceholderPage({
  title,
  description,
  icon: Icon = Construction,
  backTo = '/',
  backLabel = 'Kembali',
  items,
}: PlaceholderPageProps) {
  return (
    <div className="container-page py-10">
      <div className="mx-auto flex max-w-2xl flex-col items-center rounded-xl border border-line-soft bg-surface p-8 text-center shadow-soft md:p-12">
        <span className="grid size-14 place-items-center rounded-lg bg-leaf text-brand-strong">
          <Icon size={26} />
        </span>
        <Badge variant="peach" className="mt-4">
          Sedang dislicing
        </Badge>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink-strong">{title}</h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-ink">{description}</p>

        {items?.length ? (
          <ul className="mt-5 w-full max-w-sm divide-y divide-line-soft rounded-lg border border-line-soft text-left">
            {items.map((item) => (
              <li key={item} className="px-4 py-2.5 text-xs text-ink">
                {item}
              </li>
            ))}
          </ul>
        ) : null}

        <Button variant="outline" className="mt-6" asChild>
          <Link to={backTo}>
            <ArrowLeft size={15} />
            {backLabel}
          </Link>
        </Button>
      </div>
    </div>
  )
}
