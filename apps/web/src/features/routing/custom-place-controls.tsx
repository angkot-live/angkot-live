import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { coordinateLabel, parseCoordinates } from '@/lib/coordinates'
import type { LatLng } from '@/lib/geo'
import type { Place } from './geocode'

export function CustomPlaceControls({
  field, place, picking, onPick, onSelect,
}: {
  field: 'from' | 'to'
  place: Place | null
  picking: boolean
  onPick: () => void
  onSelect: (position: LatLng) => void
}) {
  const label = field === 'from' ? 'asal' : 'tujuan'
  const [editing, setEditing] = useState(false)
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [error, setError] = useState('')
  function apply() {
    const position = parseCoordinates(latitude, longitude)
    if (!position) {
      setError('Isi latitude −90 sampai 90 dan longitude −180 sampai 180. Gunakan titik untuk desimal.')
      return
    }
    onSelect(position)
    setError('')
    setEditing(false)
  }
  return (
    <div className="space-y-1.5" role="group" aria-label={`Titik ${label} custom`}>
      <div className="flex flex-wrap gap-1.5">
        <Button type="button" size="sm" variant={picking ? 'soft' : 'outline'} aria-pressed={picking} onClick={onPick}>
          {picking ? 'Batalkan pilih titik' : `Pilih ${label} di peta`}
        </Button>
        <Button type="button" size="sm" variant="outline" aria-expanded={editing} onClick={() => {
          if (!editing) {
            setLatitude(place ? String(place.position[0]) : '')
            setLongitude(place ? String(place.position[1]) : '')
            setError('')
          }
          setEditing(!editing)
        }}>Input koordinat {label}</Button>
      </div>
      {place ? <p className="text-xs text-ink-soft">Koordinat {label}: {coordinateLabel(place.position)}</p> : null}
      {editing ? (
        <div className="space-y-2 rounded-md border-[0.5px] border-line-soft bg-muted/50 p-2.5" onKeyDown={(event) => {
          if (event.key === 'Enter') { event.preventDefault(); apply() }
        }}>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-xs font-semibold">
              <span>Latitude {label}</span>
              <Input inputMode="decimal" value={latitude} onChange={(event) => setLatitude(event.target.value)} placeholder="-6.871300" invalid={Boolean(error)} />
            </label>
            <label className="space-y-1 text-xs font-semibold">
              <span>Longitude {label}</span>
              <Input inputMode="decimal" value={longitude} onChange={(event) => setLongitude(event.target.value)} placeholder="107.580400" invalid={Boolean(error)} />
            </label>
          </div>
          {error ? <p role="alert" className="text-xs text-danger">{error}</p> : null}
          <Button type="button" size="sm" onClick={apply}>Gunakan titik {label}</Button>
        </div>
      ) : null}
    </div>
  )
}
