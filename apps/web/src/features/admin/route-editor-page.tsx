import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMapEvents,
} from 'react-leaflet'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useRoutes } from '@/features/routes/use-routes'
import { RouteLoadState } from '@/features/routes/route-load-state'
import { api, errorMessage } from '@/lib/api'
import type { RouteInfo, RouteEndstop } from '@/types'

type Point = [number, number]
const newRoute: RouteInfo = {
  id: '',
  code: '',
  name: '',
  origin: '',
  destination: '',
  color: '#1F5C3A',
  polyline: [],
  segments: [[]],
  endstops: [],
  isActive: true,
  fareStandard: 5000,
  fareStudent: 3000,
}
function icon(label: string, color: string) {
  return L.divIcon({
    className: 'angkot-marker',
    html: `<div style="background:${color};color:white;border:2px solid white;border-radius:50%;width:24px;height:24px;text-align:center;font-size:12px">${label}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}
function MapClick({ onPoint }: { onPoint: (point: Point) => void }) {
  useMapEvents({ click: (e) => onPoint([e.latlng.lat, e.latlng.lng]) })
  return null
}
export function RouteEditorPage() {
  const { id } = useParams(),
    { routes, isPending, error } = useRoutes(true)
  if (!id || id === 'baru') return <RouteForm key="new" initial={newRoute} />
  const route = routes.find((r) => r.id === id)
  if (isPending || error)
    return <RouteLoadState pending={isPending} error={error} />
  return route ? (
    <RouteForm key={id} initial={route} />
  ) : (
    <p role="alert">Trayek tidak ditemukan.</p>
  )
}
function RouteForm({ initial }: { initial: RouteInfo }) {
  const [draft, setDraft] = useState<RouteInfo>(() => structuredClone(initial)),
    [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<'view' | 'point' | 'stop'>('view'),
    [chain, setChain] = useState(0)
  const client = useQueryClient(),
    navigate = useNavigate()
  const segments = draft.segments ?? [draft.polyline],
    stops = draft.endstops ?? [],
    allPoints = segments.flat()
  const set = (values: Partial<RouteInfo>) =>
    setDraft((d) => ({ ...d, ...values }))
  function setLine(line: Point[]) {
    set({
      segments: segments.map((s, i) => (i === chain ? line : s)),
      streetRuns: [],
      streets: [],
    })
  }
  function setStop(index: number, values: Partial<RouteEndstop>) {
    set({
      endstops: stops.map((s, i) => (i === index ? { ...s, ...values } : s)),
    })
  }
  function reorder(index: number, delta: number) {
    const list = [...stops]
    ;[list[index], list[index + delta]] = [list[index + delta], list[index]]
    set({ endstops: list })
  }
  function addPoint(point: Point) {
    if (mode === 'point') setLine([...(segments[chain] ?? []), point])
    if (mode === 'stop')
      set({
        endstops: [
          ...stops,
          {
            id: crypto.randomUUID(),
            name: `Halte ${stops.length + 1}`,
            position: point,
            isTerminal: false,
          },
        ],
      })
  }
  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const result = await api<RouteInfo>(
        draft.id ? `/admin/routes/${draft.id}` : '/admin/routes',
        {
          method: draft.id ? 'PATCH' : 'POST',
          body: JSON.stringify({ ...draft, segments }),
        },
      )
      setDraft(result)
      await client.invalidateQueries({ queryKey: ['route-catalog'] })
      await client.invalidateQueries({ queryKey: ['public-stats'] })
      await client.invalidateQueries({ queryKey: ['admin-dashboard'] })
      toast.success('Trayek tersimpan.')
      if (!draft.id) navigate(`/admin/trayek/${result.id}`, { replace: true })
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={save} className="space-y-5">
      <Link to="/admin/trayek" className="text-sm text-brand">
        ← Kembali ke daftar trayek
      </Link>
      <div className="flex flex-wrap justify-between gap-3">
        <h1 className="text-2xl font-extrabold">
          {draft.id ? `Editor trayek ${draft.code}` : 'Tambah trayek'}
        </h1>
        <Button disabled={busy}>
          {busy ? 'Menyimpan…' : 'Simpan perubahan'}
        </Button>
      </div>
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ['code', 'Kode'],
              ['name', 'Nama trayek'],
              ['origin', 'Titik awal'],
              ['destination', 'Titik akhir'],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <Input
                required
                value={draft[key]}
                onChange={(e) => set({ [key]: e.target.value })}
              />
            </Field>
          ))}
          <Field label="Warna jalur">
            <Input
              type="color"
              value={draft.color}
              onChange={(e) => set({ color: e.target.value })}
            />
          </Field>
          <Field label="Status operasional">
            <select
              value={draft.isActive ? 'aktif' : 'nonaktif'}
              onChange={(e) => set({ isActive: e.target.value === 'aktif' })}
              className="h-11 rounded-md border border-line px-3"
            >
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif</option>
            </select>
          </Field>
          <Field label="Tarif umum">
            <Input
              type="number"
              required
              min="0"
              value={draft.fareStandard ?? 5000}
              onChange={(e) => set({ fareStandard: Number(e.target.value) })}
            />
          </Field>
          <Field label="Tarif pelajar">
            <Input
              type="number"
              required
              min="0"
              value={draft.fareStudent ?? 3000}
              onChange={(e) => set({ fareStudent: Number(e.target.value) })}
            />
          </Field>
          <p className="text-sm">
            {segments.length} segmen · {stops.length} halte ·{' '}
            {draft.registeredVehicles ?? 0} armada terdaftar
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="font-bold">Jalur dan halte</h2>
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Mode edit peta"
              className="rounded-md border border-line p-2"
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
            >
              <option value="view">Lihat peta</option>
              <option value="point">Edit titik jalur</option>
              <option value="stop">Tambah halte pada peta</option>
            </select>
            <select
              aria-label="Segmen jalur"
              className="rounded-md border border-line p-2"
              value={chain}
              onChange={(e) => setChain(Number(e.target.value))}
            >
              {segments.map((s, i) => (
                <option key={i} value={i}>
                  Segmen {i + 1} · {s.length} titik
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                set({
                  segments: [...segments, []],
                  streetRuns: [],
                  streets: [],
                })
                setChain(segments.length)
                setMode('point')
              }}
            >
              Tambah segmen
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!segments[chain]?.length}
              onClick={() => setLine(segments[chain].slice(0, -1))}
            >
              Hapus titik terakhir
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={segments.length === 1}
              onClick={() => {
                set({
                  segments: segments.filter((_, i) => i !== chain),
                  streetRuns: [],
                  streets: [],
                })
                setChain(0)
              }}
            >
              Hapus segmen
            </Button>
          </div>
          <p className="text-sm">
            Mode edit jalur: klik peta untuk menambah titik, seret penanda untuk
            memindahkan, klik kanan penanda untuk menghapus. Setiap segmen
            mengikuti arah urutan titik dan tidak disambung ke segmen lain. Mode
            halte menambah penanda yang dapat diseret.
          </p>
          <div className="h-[440px]">
            <MapContainer
              bounds={allPoints.length > 1 ? allPoints : undefined}
              center={allPoints.length < 2 ? [-6.9147, 107.6098] : undefined}
              zoom={allPoints.length < 2 ? 13 : undefined}
              className="h-full w-full"
              boundsOptions={{ padding: [20, 20] }}
            >
              <TileLayer
                attribution="© OpenStreetMap"
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClick onPoint={addPoint} />
              {segments
                .filter((s) => s.length > 1)
                .map((s, i) => (
                  <Polyline
                    key={i}
                    positions={s}
                    pathOptions={{ color: draft.color, weight: 5 }}
                  />
                ))}
              {mode === 'point' &&
                (segments[chain] ?? []).map((p, i) => (
                  <Marker
                    key={`point-${chain}-${i}`}
                    position={p}
                    title={`Titik jalur ${i + 1}`}
                    draggable
                    icon={icon(String(i + 1), '#58635c')}
                    eventHandlers={{
                      dragend: (e) => {
                        const p = e.target.getLatLng()
                        setLine(
                          segments[chain].map((v, n) =>
                            n === i ? [p.lat, p.lng] : v,
                          ),
                        )
                      },
                      contextmenu: () =>
                        setLine(segments[chain].filter((_, n) => n !== i)),
                    }}
                  />
                ))}
              {stops.map((s, i) => (
                <Marker
                  key={s.id}
                  position={s.position}
                  title={s.name}
                  draggable
                  icon={icon(String(i + 1), '#1F5C3A')}
                  eventHandlers={{
                    dragend: (e) => {
                      const p = e.target.getLatLng()
                      setStop(i, { position: [p.lat, p.lng] })
                    },
                  }}
                />
              ))}
            </MapContainer>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="font-bold">Urutan halte</h2>
          {stops.length === 0 && (
            <p className="text-sm">Pilih mode tambah halte lalu klik peta.</p>
          )}
          {stops.map((stop, index) => (
            <div
              key={stop.id}
              className="grid items-end gap-2 rounded-md border border-line-soft p-3 sm:grid-cols-6"
            >
              <Field label={`Nama halte ${index + 1}`}>
                <Input
                  required
                  value={stop.name}
                  onChange={(e) => setStop(index, { name: e.target.value })}
                />
              </Field>
              <Field label={`Latitude halte ${index + 1}`}>
                <Input
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  required
                  value={stop.position[0]}
                  onChange={(e) =>
                    setStop(index, {
                      position: [Number(e.target.value), stop.position[1]],
                    })
                  }
                />
              </Field>
              <Field label={`Longitude halte ${index + 1}`}>
                <Input
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  required
                  value={stop.position[1]}
                  onChange={(e) =>
                    setStop(index, {
                      position: [stop.position[0], Number(e.target.value)],
                    })
                  }
                />
              </Field>
              <label className="text-sm">
                <input
                  type="checkbox"
                  checked={!!stop.isTerminal}
                  onChange={(e) =>
                    setStop(index, { isTerminal: e.target.checked })
                  }
                />{' '}
                Terminal
              </label>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  disabled={index === 0}
                  aria-label={`Naikkan halte ${index + 1}`}
                  onClick={() => reorder(index, -1)}
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={index === stops.length - 1}
                  aria-label={`Turunkan halte ${index + 1}`}
                  onClick={() => reorder(index, 1)}
                >
                  ↓
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  set({ endstops: stops.filter((_, i) => i !== index) })
                }
              >
                Hapus halte {index + 1}
              </Button>
            </div>
          ))}
          <p className="text-sm">
            Perubahan disimpan bersama jalur. Menonaktifkan trayek atau mengubah
            geometri mengakhiri tugas driver dan request menunggu pada arah ini.
            Geometri tidak dapat diubah selama ada trip aktif.
          </p>
        </CardContent>
      </Card>
    </form>
  )
}
