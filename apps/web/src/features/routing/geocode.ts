import { distanceKm, type LatLng } from '@/lib/geo'
import { coordinateLabel, parseCoordinatePair } from '@/lib/coordinates'
import { routes } from '@/mocks/data'

/**
 * Pencarian tempat (geocoding) untuk wilayah Bandung Raya.
 *
 * Menggabungkan daftar tempat lokal (landmark populer & terminal/ujung trayek)
 * dengan Photon (geocoder OpenStreetMap) agar pencarian instan dan tetap berfungsi offline.
 */

export interface Place {
  id: string
  name: string
  detail: string
  position: LatLng
  source: 'lokal' | 'osm' | 'gps' | 'custom'
}

export interface LandmarkDefinition {
  name: string
  detail: string
  position: LatLng
  aliases?: string[]
}

const PHOTON_URL = 'https://photon.komoot.io'
/** minLon, minLat, maxLon, maxLat — Bandung Raya */
const BANDUNG_BBOX = '107.45,-7.08,107.85,-6.75'
const BANDUNG_CENTER: LatLng = [-6.9147, 107.6098]

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Tempat populer tambahan di Bandung yang sering dicari. */
export const landmarkDefinitions: LandmarkDefinition[] = [
  {
    name: 'Sarijadi',
    detail: 'Sarijadi, Kec. Sukasari, Kota Bandung',
    position: [-6.8713, 107.5804],
    aliases: ['sarijadi', 'sukasari', 'perumahan sarijadi', 'setiabudi sarijadi'],
  },
  {
    name: "Mall d'Botanica Bandung",
    detail: "Mall d'Botanica (d/h BTC Pasteur), Jl. Dr. Djunjunan, Sukajadi, Kota Bandung",
    position: [-6.8925, 107.585],
    aliases: [
      'botanica',
      'botanica bandung',
      'mall botanica',
      'btc',
      'btc pasteur',
      'bandung trade center',
      'dbotanica',
      'mall dbotanica',
    ],
  },
  {
    name: 'Stasiun Bandung (Stasiun Hall)',
    detail: 'Jl. Kebon Kawung No. 43, Pasir Kaliki, Kota Bandung',
    position: [-6.9147, 107.602],
    aliases: ['stasiun bandung', 'stasiun hall', 'kebon kawung'],
  },
  {
    name: 'Simpang Dago',
    detail: 'Jl. Ir. H. Djuanda, Coblong, Kota Bandung',
    position: [-6.8851, 107.6136],
    aliases: ['simpang dago', 'dago', 'juanda'],
  },
  {
    name: 'Alun-Alun Bandung',
    detail: 'Jl. Asia Afrika, Regol, Kota Bandung',
    position: [-6.9218, 107.6071],
    aliases: ['alun alun', 'alun-alun bandung', 'asia afrika', 'masjid raya bandung'],
  },
  {
    name: 'Gedung Sate',
    detail: 'Jl. Diponegoro No. 22, Citarum, Kota Bandung',
    position: [-6.9025, 107.6188],
    aliases: ['gedung sate', 'diponegoro', 'gasibu'],
  },
  {
    name: 'Institut Teknologi Bandung (ITB)',
    detail: 'Jl. Ganesa No. 10, Coblong, Kota Bandung',
    position: [-6.8915, 107.6107],
    aliases: ['itb', 'ganesa', 'institut teknologi bandung'],
  },
  {
    name: 'Paris Van Java (PVJ)',
    detail: 'Jl. Sukajadi No. 131-139, Cipedes, Sukajadi, Kota Bandung',
    position: [-6.8893, 107.5961],
    aliases: ['pvj', 'paris van java', 'sukajadi'],
  },
  {
    name: 'Bandung Indah Plaza (BIP)',
    detail: 'Jl. Merdeka No. 56, Babakan Ciamis, Kota Bandung',
    position: [-6.9086, 107.6105],
    aliases: ['bip', 'bandung indah plaza', 'merdeka'],
  },
  {
    name: 'Trans Studio Mall (TSM)',
    detail: 'Jl. Gatot Subroto No. 289, Batununggal, Kota Bandung',
    position: [-6.9254, 107.6366],
    aliases: ['tsm', 'trans studio mall', 'gatot subroto'],
  },
  {
    name: 'Terminal Ledeng',
    detail: 'Jl. Dr. Setiabudi, Cidadap, Kota Bandung',
    position: [-6.8576, 107.5954],
    aliases: ['terminal ledeng', 'ledeng', 'setiabudi'],
  },
  {
    name: 'Terminal Cicaheum',
    detail: 'Jl. Jend. A. Yani, Kiaracondong, Kota Bandung',
    position: [-6.9027, 107.6575],
    aliases: ['terminal cicaheum', 'cicaheum', 'ahmad yani'],
  },
  {
    name: 'Terminal Leuwipanjang',
    detail: 'Jl. Soekarno-Hatta No. 205, Bojongloa Kidul, Kota Bandung',
    position: [-6.9458, 107.5942],
    aliases: ['terminal leuwipanjang', 'leuwipanjang', 'soekarno hatta'],
  },
  {
    name: 'Ciroyom',
    detail: 'Pasar Ciroyom, Andir, Kota Bandung',
    position: [-6.9137, 107.5888],
    aliases: ['ciroyom', 'pasar ciroyom', 'terminal ciroyom', 'stasiun ciroyom'],
  },
  {
    name: 'Cihampelas Walk (Ciwalk)',
    detail: 'Jl. Cihampelas No. 160, Cipaganti, Coblong, Kota Bandung',
    position: [-6.8938, 107.6052],
    aliases: ['ciwalk', 'cihampelas walk', 'cihampelas'],
  },
]

export const landmarkPlaces: Place[] = landmarkDefinitions.map((place, index) => ({
  id: `landmark-${index}`,
  name: place.name,
  detail: place.detail,
  position: place.position,
  source: 'lokal',
}))

let localPlacesCache: Place[] | null = null

function localPlaces(): Place[] {
  if (localPlacesCache) return localPlacesCache
  const byName = new Map<string, Place>()
  for (const place of landmarkPlaces) byName.set(normalize(place.name), place)
  for (const route of routes) {
    for (const stop of route.endstops ?? []) {
      const key = normalize(stop.name)
      if (byName.has(key)) continue
      byName.set(key, {
        id: `stop-${stop.id}`,
        name: stop.name,
        detail: `Ujung trayek ${route.code} (${route.name})`,
        position: stop.position,
        source: 'lokal',
      })
    }
  }
  localPlacesCache = [...byName.values()]
  return localPlacesCache
}

export function searchLocalPlaces(query: string, limit = 5): Place[] {
  const coordinatePlace = placeFromCoordinateQuery(query)
  if (coordinatePlace) return [coordinatePlace]
  const cleanTerm = query.trim().replace(/^(ke|di|dari)\s+/i, '')
  const term = normalize(cleanTerm || query)
  if (!term) return []
  const words = term.split(' ')

  // 1. Cek daftar landmark populer dengan pencocokan nama, detail, dan alias
  const landmarkMatches = landmarkDefinitions
    .map((item, index) => {
      const aliasHaystack = normalize(
        `${item.name} ${item.detail} ${(item.aliases ?? []).join(' ')}`,
      )
      const matchesAll = words.every((word) => aliasHaystack.includes(word))
      if (!matchesAll) return null
      const startsName = normalize(item.name).startsWith(term)
      const exactName = normalize(item.name).includes(term)
      const rank = startsName ? 0 : exactName ? 1 : 2
      return { place: landmarkPlaces[index], rank }
    })
    .filter((item): item is { place: Place; rank: number } => item !== null)

  // 2. Cek ujung trayek / terminal lokal
  const stopMatches = localPlaces()
    .map((place) => {
      const haystack = normalize(`${place.name} ${place.detail}`)
      if (!words.every((word) => haystack.includes(word))) return null
      const rank = normalize(place.name).startsWith(term) ? 1 : 2
      return { place, rank }
    })
    .filter((item): item is { place: Place; rank: number } => item !== null)

  const all = [...landmarkMatches, ...stopMatches]
  const seen = new Set<string>()
  const deduped: Place[] = []
  all
    .sort((a, b) => a.rank - b.rank || a.place.name.length - b.place.name.length)
    .forEach((entry) => {
      if (seen.has(entry.place.name)) return
      seen.add(entry.place.name)
      deduped.push(entry.place)
    })

  return deduped.slice(0, limit)
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: {
    osm_id?: number
    osm_type?: string
    osm_key?: string
    osm_value?: string
    name?: string
    street?: string
    housenumber?: string
    district?: string
    locality?: string
    city?: string
    county?: string
  }
}

function featureToPlace(feature: PhotonFeature): Place | null {
  const p = feature.properties
  const name = p.name ?? (p.street ? `${p.street}${p.housenumber ? ` ${p.housenumber}` : ''}` : null)
  if (!name) return null
  const detailParts = [p.name ? p.street : null, p.district ?? p.locality, p.city ?? p.county]
  const detail = [...new Set(detailParts.filter((part): part is string => Boolean(part)))].join(
    ', ',
  )
  const [lng, lat] = feature.geometry.coordinates
  return {
    id: `osm-${p.osm_type ?? ''}${p.osm_id ?? `${lat},${lng}`}`,
    name,
    detail: detail || 'Bandung',
    position: [lat, lng],
    source: 'osm',
  }
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const coordinatePlace = placeFromCoordinateQuery(query)
  if (coordinatePlace) return [coordinatePlace]
  const cleanTerm = query.trim().replace(/^(ke|di|dari)\s+/i, '')
  const local = searchLocalPlaces(cleanTerm || query, 4)
  const term = cleanTerm || query.trim()
  if (term.length < 3) return local

  try {
    const params = new URLSearchParams({
      q: term,
      limit: '6',
      lat: String(BANDUNG_CENTER[0]),
      lon: String(BANDUNG_CENTER[1]),
      bbox: BANDUNG_BBOX,
    })
    const response = await fetch(`${PHOTON_URL}/api/?${params}`, { signal })
    if (!response.ok) return local
    const data = (await response.json()) as { features?: PhotonFeature[] }
    const remote = (data.features ?? [])
      .map(featureToPlace)
      .filter((place): place is Place => place !== null)

    const merged: Place[] = []
    const seen = new Set<string>()
    // Beri prioritas tempat lokal jika cocok kuat, lalu lengkapi hasil OSM
    for (const place of [...local, ...remote]) {
      const key = `${normalize(place.name)}@${place.position[0].toFixed(3)},${place.position[1].toFixed(3)}`
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(place)
    }
    return merged.slice(0, 7)
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error
    return local
  }
}

/** Ubah teks bebas menjadi satu tempat (hasil teratas). */
export async function resolvePlace(query: string, signal?: AbortSignal) {
  const coordinatePlace = placeFromCoordinateQuery(query)
  if (coordinatePlace) return coordinatePlace
  const results = await searchPlaces(query, signal)
  return results[0] ?? null
}

const reverseCache = new Map<string, Promise<string | null>>()

/** Cari nama patokan lokal dalam radius tertentu (misal 450 m). */
function findNearbyLocalLandmark(position: LatLng, maxRadiusKm = 0.45): string | null {
  let closest: { name: string; dist: number } | null = null
  for (const place of landmarkPlaces) {
    const d = distanceKm(position, place.position)
    if (d <= maxRadiusKm && (!closest || d < closest.dist)) {
      closest = { name: place.name, dist: d }
    }
  }
  return closest ? closest.name : null
}

/** Cari nama patokan (POI) terdekat dari sebuah titik, untuk memperjelas lokasi transit. */
export function reverseLandmark(position: LatLng): Promise<string | null> {
  const localMatch = findNearbyLocalLandmark(position)
  if (localMatch) return Promise.resolve(localMatch)

  const key = `${position[0].toFixed(4)},${position[1].toFixed(4)}`
  const cached = reverseCache.get(key)
  if (cached) return cached

  const request = (async () => {
    try {
      const params = new URLSearchParams({
        lat: String(position[0]),
        lon: String(position[1]),
        radius: '0.15',
        limit: '5',
      })
      const response = await fetch(`${PHOTON_URL}/reverse?${params}`)
      if (!response.ok) return null
      const data = (await response.json()) as { features?: PhotonFeature[] }
      const landmark = (data.features ?? []).find((feature) => {
        const p = feature.properties
        return p.name && p.osm_key !== 'highway' && p.osm_key !== 'place' && p.osm_key !== 'boundary'
      })
      return landmark?.properties.name ?? null
    } catch {
      return null
    }
  })()
  reverseCache.set(key, request)
  return request
}

export function placeFromCoordinates(name: string, position: LatLng, detail = ''): Place {
  return {
    id: `coord-${position[0].toFixed(5)},${position[1].toFixed(5)}`,
    name,
    detail,
    position,
    source: 'gps',
  }
}

function placeFromCoordinateQuery(query: string): Place | null {
  const position = parseCoordinatePair(query)
  return position ? { ...placeFromCoordinates(coordinateLabel(position), position), source: 'custom' } : null
}
