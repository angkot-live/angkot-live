import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'

import type { LatLng } from '@/lib/geo'

import type { Itinerary } from './trip-planner'

function shortStreet(name: string) {
  return name.replace(/^Jalan\s+/i, 'Jl. ')
}

function pinIcon(label: string, color: string, prefixIcon = '') {
  return L.divIcon({
    className: 'angkot-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);pointer-events:auto;cursor:pointer">
        <span style="background:${color};color:#fff;border-radius:9999px;padding:4px 9px;font-size:var(--text-caption);font-weight:800;line-height:1;box-shadow:0 4px 12px rgba(0,0,0,.25);white-space:nowrap;border:2px solid #fff;display:inline-flex;align-items:center;gap:4px">
          ${prefixIcon ? `<span>${prefixIcon}</span>` : ''}${label}
        </span>
        <span style="width:2px;height:6px;background:${color}"></span>
        <span style="width:8px;height:8px;border-radius:9999px;background:${color};box-shadow:0 0 0 3px rgba(255,255,255,.75)"></span>
      </div>
    `,
  })
}

function FitItinerary({ points, fitKey }: { points: LatLng[]; fitKey: string }) {
  const map = useMap()
  const pointsRef = useRef(points)

  useEffect(() => {
    pointsRef.current = points
  }, [points])

  // Bingkai ulang peta hanya ketika itinerary yang dipilih berubah.
  useEffect(() => {
    if (pointsRef.current.length === 0) return
    map.fitBounds(L.latLngBounds(pointsRef.current), { padding: [32, 32], maxZoom: 16 })
  }, [fitKey, map])

  return null
}

export function ItineraryMap({
  itinerary,
  origin,
  destination,
  className,
}: {
  itinerary: Itinerary
  origin: LatLng
  destination: LatLng
  className?: string
}) {
  const walkStyle = { color: '#707971', weight: 3, dashArray: '2 7', lineCap: 'round' as const }
  const allPoints: LatLng[] = [
    origin, destination, ...itinerary.legs.flatMap((leg) => leg.path),
    ...itinerary.accessWalk.path, ...itinerary.egressWalk.path,
    ...itinerary.transfers.flatMap((transfer) => transfer.walk.path),
  ]

  return (
    <MapContainer
      center={origin}
      zoom={14}
      scrollWheelZoom={false}
      className={className}
      style={{ zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ? <a href="https://routing.openstreetmap.de/about.html">FOSSGIS / OSRM</a> ? <a href="https://www.openstreetmap.org/fixthemap">Perbaiki peta</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitItinerary points={allPoints} fitKey={itinerary.id} />

      <Polyline positions={itinerary.accessWalk.path} pathOptions={walkStyle} />
      {itinerary.transfers.map((transfer, index) => (
        <Polyline
          key={`walk-${index}`}
          positions={transfer.walk.path}
          pathOptions={walkStyle}
        />
      ))}
      <Polyline positions={itinerary.egressWalk.path} pathOptions={walkStyle} />

      {itinerary.legs.map((leg, index) => (
        <Polyline
          key={`leg-${index}`}
          positions={leg.path}
          pathOptions={{ color: leg.route.color, weight: 6, opacity: 0.9 }}
        >
          <Tooltip sticky>
            Angkot {leg.route.code} · {leg.route.name}
          </Tooltip>
        </Polyline>
      ))}

      {itinerary.legs.map((leg, index) => {
        if (index === 0) return null
        const prev = itinerary.legs[index - 1]
        const transfer = itinerary.transfers[index - 1]
        return (
          <Marker
            key={`transfer-${index}`}
            position={leg.board}
            icon={pinIcon(`Transit: ${prev.route.code} → ${leg.route.code}`, '#0284C7', '🔄')}
          >
            {transfer ? (
              <Tooltip sticky direction="top" offset={[0, -20]}>
                <div className="p-0.5 text-xs">
                  <p className="font-bold text-sky-800">Titik Transit & Ganti Angkot</p>
                  <p className="mt-0.5 text-ink">
                    Turun di <span className="font-semibold">{shortStreet(transfer.fromStreet)}</span>,
                    lalu naik <span className="font-semibold text-brand">Angkot {leg.route.code}</span> ({leg.route.name}).
                  </p>
                </div>
              </Tooltip>
            ) : null}
          </Marker>
        )
      })}
      <Marker
        position={itinerary.legs[0].board}
        icon={pinIcon(`Naik ${itinerary.legs[0].route.code}`, itinerary.legs[0].route.color, '🚏')}
      >
        <Tooltip direction="top" offset={[0, -20]}>
          <div className="p-0.5 text-xs">
            <p className="font-bold">Titik Awal Naik Angkot {itinerary.legs[0].route.code}</p>
            <p className="text-ink">Di {shortStreet(itinerary.legs[0].boardStreet)}</p>
          </div>
        </Tooltip>
      </Marker>
      <Marker position={origin} icon={pinIcon('Asal', '#1F5C3A', '📍')} />
      <Marker position={destination} icon={pinIcon('Tujuan', '#B45309', '🏁')} />
    </MapContainer>
  )
}

