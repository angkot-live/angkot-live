import type { TripPlan } from './trip-planner'
import { hasUnavailableWalks } from './walking-router'

export function WalkingRouteNotice({ plan }: { plan: TripPlan }) {
  if (!plan.itineraries.length && !plan.walkOnly) return null
  return (
    <div className="space-y-1 text-xs text-ink-soft">
      {hasUnavailableWalks(plan) ? (
        <p role="status" className="text-danger">
          Sebagian jalur jalan kaki belum tersedia. Garisnya tidak ditampilkan; jarak dan waktu
          perjalanan masih perkiraan. Coba cari rute lagi saat koneksi tersedia.
        </p>
      ) : null}
      <p>Jalur jalan kaki mengikuti jalan terdekat dari titik lokasi.</p>
      <p>
        Rute: <a href="https://routing.openstreetmap.de/about.html" target="_blank" rel="noreferrer" className="underline">FOSSGIS / OSRM</a>
        {' · © OpenStreetMap · '}
        <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer" className="underline">Perbaiki peta</a>
      </p>
    </div>
  )
}
