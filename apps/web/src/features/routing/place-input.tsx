import { Loader2, MapPin, Navigation2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useId, useRef, useState } from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/cn'

import { searchLocalPlaces, searchPlaces, type Place } from './geocode'

interface PlaceInputProps {
  id: string
  value: string
  onValueChange: (value: string) => void
  onSelect: (place: Place) => void
  icon?: ReactNode
  trailing?: ReactNode
  placeholder?: string
  invalid?: boolean
  /** Dipanggil saat Enter ditekan tanpa memilih saran. */
  onSubmit?: () => void
}

/** Kolom pencarian tempat dengan saran otomatis (pola ARIA combobox). */
export function PlaceInput({
  id,
  value,
  onValueChange,
  onSelect,
  icon,
  trailing,
  placeholder,
  invalid,
  onSubmit,
}: PlaceInputProps) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<Place[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const blurTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!typed) return
    const term = value.trim()
    if (!term) return

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const results = await searchPlaces(term, controller.signal)
        setSuggestions(results)
        setActiveIndex(-1)
      } catch {
        // permintaan dibatalkan karena pengguna masih mengetik
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 280)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [value, typed])

  useEffect(() => () => window.clearTimeout(blurTimer.current), [])

  function choose(place: Place) {
    onSelect(place)
    setTyped(false)
    setOpen(false)
    setSuggestions([])
    setActiveIndex(-1)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (event.key === 'ArrowDown' && suggestions.length > 0) setOpen(true)
      if (event.key === 'Enter' && onSubmit && value.trim()) {
        event.preventDefault()
        setOpen(false)
        onSubmit()
      }
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1))
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      choose(suggestions[activeIndex])
    } else if (event.key === 'Enter' && onSubmit && value.trim()) {
      event.preventDefault()
      setOpen(false)
      onSubmit()
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  const expanded = open && typed && value.trim().length > 0 && (suggestions.length > 0 || !loading)

  return (
    <div className="relative">
      <Input
        id={id}
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        autoComplete="off"
        value={value}
        invalid={invalid}
        onChange={(event) => {
          const next = event.target.value
          onValueChange(next)
          setTyped(true)
          setOpen(true)
          if (!next.trim()) {
            setSuggestions([])
            setLoading(false)
          } else {
            setSuggestions(searchLocalPlaces(next))
          }
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => setOpen(false), 120)
        }}
        onKeyDown={handleKeyDown}
        icon={icon}
        trailing={
          loading ? <Loader2 size={16} className="mr-2 animate-spin text-ink-soft" /> : trailing
        }
        placeholder={placeholder}
      />

      {expanded ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full right-0 left-0 z-[1100] mt-1.5 max-h-80 overflow-y-auto rounded-md border-[0.5px] border-line-soft bg-surface p-1 shadow-lg"
        >
          {suggestions.length === 0 ? (
            <li className="px-3 py-2.5 text-xs text-ink-soft">
              Tempat tidak ditemukan. Coba nama jalan, kelurahan, atau tempat terkenal.
            </li>
          ) : (
            suggestions.map((place, index) => (
              <li
                key={place.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={cn(
                  'flex cursor-pointer items-start gap-2.5 rounded-md px-3 py-2',
                  index === activeIndex ? 'bg-muted' : 'hover:bg-muted',
                )}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(place)}
              >
                <span className="mt-0.5 text-brand">
                  {place.source === 'lokal' ? <Navigation2 size={14} /> : <MapPin size={14} />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink-strong">
                    {place.name}
                  </span>
                  <span className="block truncate text-xs text-ink">{place.detail}</span>
                </span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}
