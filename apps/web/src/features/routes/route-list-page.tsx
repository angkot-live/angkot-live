import { ArrowRight, MapPin, Route, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useRoutes } from '@/features/routes/use-routes'

export function RouteListPage() {
  const {routes, error: routesError, isPending: routesPending} = useRoutes()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return routes
    return routes.filter(
      (route) =>
        route.name.toLowerCase().includes(term) ||
        route.code.toLowerCase().includes(term) ||
        route.origin.toLowerCase().includes(term) ||
        route.destination.toLowerCase().includes(term),
    )
  }, [query, routes])

  return (
    <div className="container-page py-8 md:py-10">
{routesPending && <p role="status">Memuat trayek…</p>}
{routesError && <p role="alert">{routesError.message}</p>}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-strong md:text-4xl">
            Daftar trayek angkot
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink">
            Jelajahi jurusan yang aktif, lihat halte yang dilewati, dan temukan angkot terdekat
            dari rute favoritmu.
          </p>
        </div>
      </div>

      <Card className="mt-6">
        <CardContent className="p-3 md:p-4">
          <Input
            icon={<Search size={16} />}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari kode, nama jurusan, atau tujuan"
            aria-label="Cari trayek"
          />
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((route) => {
          return (
            <Card key={route.id} className="group transition hover:border-brand/40">
              <CardContent className="flex h-full flex-col p-4 md:p-5">
                <span
                  className="grid size-11 shrink-0 place-items-center rounded-md text-sm font-extrabold text-white"
                  style={{ backgroundColor: route.color }}
                >
                  {route.code}
                </span>

                <h2 className="mt-3 text-sm font-bold text-ink-strong">{route.name}</h2>
                <div className="mt-2 flex flex-col gap-1 text-xs text-ink">
                  <span className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-brand" />
                    {route.origin}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-line" />
                    {route.destination}
                  </span>
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 border-t border-line-soft pt-3">
                  <Button size="sm" variant="soft" asChild>
                    <Link to={`/trayek/${route.id}`}>
                      Lihat detail
                      <ArrowRight size={14} />
                    </Link>
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <Link to={`/peta?route=${route.id}`}>
                      <MapPin size={14} />
                      Lihat trayek
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-2 text-center">
          <Route size={28} className="text-ink-soft" />
          <p className="text-sm font-semibold text-ink-strong">Trayek tidak ditemukan</p>
          <p className="text-xs text-ink">Coba kata kunci lain seperti “Dago” atau “08”.</p>
          <Button variant="outline" size="sm" onClick={() => setQuery('')}>
            Reset pencarian
          </Button>
        </div>
      ) : null}
    </div>
  )
}
