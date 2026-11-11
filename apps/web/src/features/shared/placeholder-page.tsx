import { ArrowLeft, Construction } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { List, ListItem } from '@/components/ui/list'

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
      <div className="mx-auto flex max-w-2xl flex-col items-center rounded-lg border-[0.5px] border-line-soft bg-surface p-8 text-center shadow-card md:p-12">
        <span className="grid size-14 place-items-center rounded-lg bg-leaf text-brand-strong">
          <Icon size={26} />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink-strong">{title}</h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-ink">{description}</p>

        {items?.length ? (
          <List className="mt-5 w-full max-w-sm text-left">
            {items.map((item) => (
              <ListItem key={item} className="text-xs text-ink">
                {item}
              </ListItem>
            ))}
          </List>
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
