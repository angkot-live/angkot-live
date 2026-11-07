import type { LatLng } from '@/lib/geo'
import type { RouteInfo } from '@/types'

/**
 * Perencana perjalanan angkot berbasis geometri trayek.
 *
 * Setiap trayek (per arah) diperlakukan sebagai rantai titik berurutan. Penumpang bisa
 * naik/turun di titik mana pun sepanjang trayek (angkot berhenti di mana saja), lalu
 * transit dengan berjalan kaki ke trayek lain yang lewat berdekatan.
 */

// ---- Parameter model -------------------------------------------------------

/** Kecepatan jalan kaki rata-rata (km/jam). */
const WALK_KMH = 4.5
/** Jarak jalan sesungguhnya ≈ jarak garis lurus × faktor ini. */
const WALK_DETOUR = 1.3
/** Kecepatan rata-rata angkot termasuk berhenti menaikkan penumpang (km/jam). */
const ANGKOT_KMH = 15
/** Jarak jalan kaki maksimum dari asal ke trayek / dari trayek ke tujuan (garis lurus). */
const MAX_ACCESS_KM = 0.8
/** Jarak jalan kaki maksimum saat transit antar trayek (garis lurus). */
const MAX_TRANSFER_KM = 0.3
/** Rata-rata menunggu angkot datang. */
const BOARD_WAIT_MIN = 5
/** Rata-rata menunggu angkot berikutnya saat transit. */
const TRANSFER_WAIT_MIN = 5
/** Penalti kenyamanan per transit (hanya untuk pemeringkatan). */
const TRANSFER_PENALTY_MIN = 6
/** Jarak naik minimum agar satu ruas angkot dianggap bermakna. */
const MIN_RIDE_KM = 0.4
/** Di bawah jarak ini, cukup jalan kaki. */
const WALK_ONLY_KM = 0.7

const GRID_CELL_DEG = 0.004 // ≈ 440 m, lebih besar dari MAX_TRANSFER_KM

const walkMinutes = (km: number) => ((km * WALK_DETOUR) / WALK_KMH) * 60
const rideMinutes = (km: number) => (km / ANGKOT_KMH) * 60
const RIDE_RATE = 60 / ANGKOT_KMH // menit per km

// ---- Tipe hasil ------------------------------------------------------------

export interface TripLeg {
  route: RouteInfo
  /** Titik naik dan turun. */
  board: LatLng
  alight: LatLng
  boardStreet: string
  alightStreet: string
  /** Potongan polyline yang dilalui angkot. */
  path: LatLng[]
  rideKm: number
  rideMinutes: number
  /** Jarak (km, sepanjang trayek) dari awal trayek ke titik naik — untuk estimasi kedatangan. */
  boardOffsetKm: number
  chainPoints: LatLng[]
  boardIndex: number
}

export interface TripWalk {
  from: LatLng
  to: LatLng
  /** Perkiraan jarak jalan kaki (meter, sudah termasuk faktor belokan). */
  meters: number
  minutes: number
}

export interface TripTransfer {
  /** Titik turun dari angkot sebelumnya. */
  at: LatLng
  fromStreet: string
  toStreet: string
  walk: TripWalk
}

export interface Itinerary {
  id: string
  kind: 'langsung' | 'transit'
  legs: TripLeg[]
  transfers: TripTransfer[]
  accessWalk: TripWalk
  egressWalk: TripWalk
  totalMinutes: number
  walkMinutes: number
  rideKm: number
  score: number
}

export interface TripPlan {
  itineraries: Itinerary[]
  straightKm: number
  /** Asal dan tujuan cukup dekat untuk berjalan kaki. */
  walkOnly: TripWalk | null
  /** Tidak ada trayek dalam jangkauan jalan kaki dari asal / tujuan. */
  noRouteNearOrigin: boolean
  noRouteNearDestination: boolean
}

// ---- Struktur internal -----------------------------------------------------

interface Chain {
  id: number
  route: RouteInfo
  points: LatLng[]
  /** Jarak kumulatif (km) sepanjang rantai. */
  cum: Float64Array
  runs: [number, string][]
}

interface Network {
  chains: Chain[]
  grid: Map<string, number[]>
}

const POINT_STRIDE = 1 << 16

function fastKm(a: LatLng, b: LatLng) {
  const kx = 111.32 * Math.cos(((a[0] + b[0]) / 2) * (Math.PI / 180))
  const dx = (b[1] - a[1]) * kx
  const dy = (b[0] - a[0]) * 110.57
  return Math.sqrt(dx * dx + dy * dy)
}

function cellKey(lat: number, lng: number) {
  return `${Math.floor(lat / GRID_CELL_DEG)}:${Math.floor(lng / GRID_CELL_DEG)}`
}

const networkCache = new WeakMap<RouteInfo[], Network>()

function buildNetwork(routes: RouteInfo[]): Network {
  const cached = networkCache.get(routes)
  if (cached) return cached

  const chains: Chain[] = []
  const grid = new Map<string, number[]>()

  for (const route of routes) {
    const lines = route.segments ?? [route.polyline]
    lines.forEach((points, lineIndex) => {
      if (points.length < 2) return
      const cum = new Float64Array(points.length)
      for (let i = 1; i < points.length; i += 1) {
        cum[i] = cum[i - 1] + fastKm(points[i - 1], points[i])
      }
      const chain: Chain = {
        id: chains.length,
        route,
        points,
        cum,
        runs: route.streetRuns?.[lineIndex] ?? [],
      }
      chains.push(chain)

      points.forEach(([lat, lng], index) => {
        const key = cellKey(lat, lng)
        const bucket = grid.get(key)
        const encoded = chain.id * POINT_STRIDE + index
        if (bucket) bucket.push(encoded)
        else grid.set(key, [encoded])
      })
    })
  }

  const network = { chains, grid }
  networkCache.set(routes, network)
  return network
}

function forEachNearby(
  network: Network,
  point: LatLng,
  radiusKm: number,
  visit: (chain: Chain, index: number, km: number) => void,
  accept?: (chain: Chain) => boolean,
) {
  const row = Math.floor(point[0] / GRID_CELL_DEG)
  const col = Math.floor(point[1] / GRID_CELL_DEG)
  const span = Math.ceil(radiusKm / (GRID_CELL_DEG * 110))
  for (let dr = -span; dr <= span; dr += 1) {
    for (let dc = -span; dc <= span; dc += 1) {
      const bucket = network.grid.get(`${row + dr}:${col + dc}`)
      if (!bucket) continue
      for (const encoded of bucket) {
        const chain = network.chains[Math.floor(encoded / POINT_STRIDE)]
        if (accept && !accept(chain)) continue
        const index = encoded % POINT_STRIDE
        const km = fastKm(point, chain.points[index])
        if (km <= radiusKm) visit(chain, index, km)
      }
    }
  }
}

function streetFromRuns(runs: [number, string][], index: number, route: RouteInfo) {
  let low = 0
  let high = runs.length - 1
  let found = -1
  while (low <= high) {
    const mid = (low + high) >> 1
    if (runs[mid][0] <= index) {
      found = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  if (found >= 0) return runs[found][1]
  return runs[0]?.[1] ?? route.streets?.[0] ?? 'jalan trayek'
}

function makeWalk(from: LatLng, to: LatLng, km = fastKm(from, to)): TripWalk {
  return {
    from,
    to,
    meters: Math.round((km * WALK_DETOUR * 1000) / 10) * 10,
    minutes: Math.max(1, Math.round(walkMinutes(km))),
  }
}

// ---- Label maju (dari asal) & mundur (ke tujuan) ----------------------------

/** Label "tiba di titik k pada rantai" beserta titik naiknya. */
interface ForwardLabel {
  cost: Float64Array
  boardIndex: Int32Array
}

/** Label "dari titik m pada rantai sampai tujuan" beserta titik turunnya. */
interface BackwardLabel {
  cost: Float64Array
  alightIndex: Int32Array
}

/**
 * Menghitung biaya tiba di setiap titik rantai, diberikan biaya "siap naik" pada titik-titik tertentu.
 * cost[k] = min_{i ≤ k} (entry[i] + (cum[k] − cum[i]) × RIDE_RATE)
 */
function propagateForward(chain: Chain, entries: Map<number, number>): ForwardLabel {
  const n = chain.points.length
  const cost = new Float64Array(n).fill(Infinity)
  const boardIndex = new Int32Array(n).fill(-1)
  let best = Infinity
  let bestIndex = -1
  for (let k = 0; k < n; k += 1) {
    const entry = entries.get(k)
    if (entry !== undefined) {
      const value = entry - chain.cum[k] * RIDE_RATE
      if (value < best) {
        best = value
        bestIndex = k
      }
    }
    if (bestIndex >= 0) {
      cost[k] = best + chain.cum[k] * RIDE_RATE
      boardIndex[k] = bestIndex
    }
  }
  return { cost, boardIndex }
}

/** cost[m] = min_{j ≥ m} ((cum[j] − cum[m]) × RIDE_RATE + exit[j]) */
function propagateBackward(chain: Chain, exits: Map<number, number>): BackwardLabel {
  const n = chain.points.length
  const cost = new Float64Array(n).fill(Infinity)
  const alightIndex = new Int32Array(n).fill(-1)
  let best = Infinity
  let bestIndex = -1
  for (let m = n - 1; m >= 0; m -= 1) {
    const exit = exits.get(m)
    if (exit !== undefined) {
      const value = exit + chain.cum[m] * RIDE_RATE
      if (value < best) {
        best = value
        bestIndex = m
      }
    }
    if (bestIndex >= 0) {
      cost[m] = best - chain.cum[m] * RIDE_RATE
      alightIndex[m] = bestIndex
    }
  }
  return { cost, alightIndex }
}

function collectAccess(network: Network, point: LatLng) {
  const byChain = new Map<number, Map<number, number>>()
  forEachNearby(network, point, MAX_ACCESS_KM, (chain, index, km) => {
    let entries = byChain.get(chain.id)
    if (!entries) {
      entries = new Map()
      byChain.set(chain.id, entries)
    }
    entries.set(index, walkMinutes(km))
  })
  return byChain
}

// ---- Pembentukan itinerary --------------------------------------------------

interface LegSpec {
  chain: Chain
  boardIndex: number
  alightIndex: number
}

function buildLeg({ chain, boardIndex, alightIndex }: LegSpec): TripLeg {
  const rideKm = chain.cum[alightIndex] - chain.cum[boardIndex]
  return {
    route: chain.route,
    board: chain.points[boardIndex],
    alight: chain.points[alightIndex],
    boardStreet: streetFromRuns(chain.runs, boardIndex, chain.route),
    alightStreet: streetFromRuns(chain.runs, alightIndex, chain.route),
    path: chain.points.slice(boardIndex, alightIndex + 1),
    rideKm,
    rideMinutes: Math.max(1, Math.round(rideMinutes(rideKm))),
    boardOffsetKm: chain.cum[boardIndex],
    chainPoints: chain.points,
    boardIndex,
  }
}

function buildItinerary(origin: LatLng, destination: LatLng, specs: LegSpec[]): Itinerary {
  const legs = specs.map(buildLeg)
  const accessWalk = makeWalk(origin, legs[0].board)
  const egressWalk = makeWalk(legs[legs.length - 1].alight, destination)
  const transfers: TripTransfer[] = legs.slice(1).map((leg, index) => {
    const previous = legs[index]
    return {
      at: previous.alight,
      fromStreet: previous.alightStreet,
      toStreet: leg.boardStreet,
      walk: makeWalk(previous.alight, leg.board),
    }
  })

  const walkTotal =
    accessWalk.minutes +
    egressWalk.minutes +
    transfers.reduce((total, transfer) => total + transfer.walk.minutes, 0)
  const rideTotal = legs.reduce((total, leg) => total + rideMinutes(leg.rideKm), 0)
  const totalMinutes = Math.round(
    walkTotal + rideTotal + BOARD_WAIT_MIN + transfers.length * TRANSFER_WAIT_MIN,
  )

  return {
    id: specs.map((spec) => `${spec.chain.id}:${spec.boardIndex}-${spec.alightIndex}`).join('|'),
    kind: transfers.length === 0 ? 'langsung' : 'transit',
    legs,
    transfers,
    accessWalk,
    egressWalk,
    totalMinutes,
    walkMinutes: walkTotal,
    rideKm: legs.reduce((total, leg) => total + leg.rideKm, 0),
    score: totalMinutes + transfers.length * TRANSFER_PENALTY_MIN,
  }
}

function rideKmOf(chain: Chain, from: number, to: number) {
  return chain.cum[to] - chain.cum[from]
}

// ---- API utama --------------------------------------------------------------

export function planTrip(
  routes: RouteInfo[],
  origin: LatLng,
  destination: LatLng,
  options: { maxResults?: number } = {},
): TripPlan {
  const maxResults = options.maxResults ?? 6
  const network = buildNetwork(routes)
  const straightKm = fastKm(origin, destination)

  const access = collectAccess(network, origin)
  const egress = collectAccess(network, destination)

  const forward = new Map<number, ForwardLabel>()
  for (const [chainId, entries] of access) {
    const withWait = new Map<number, number>()
    for (const [index, minutes] of entries) withWait.set(index, minutes + BOARD_WAIT_MIN)
    forward.set(chainId, propagateForward(network.chains[chainId], withWait))
  }

  const backward = new Map<number, BackwardLabel>()
  for (const [chainId, exits] of egress) {
    backward.set(chainId, propagateBackward(network.chains[chainId], exits))
  }

  const candidates: { score: number; specs: LegSpec[] }[] = []

  // 1) Rute langsung
  for (const [chainId, label] of forward) {
    const exits = egress.get(chainId)
    if (!exits) continue
    const chain = network.chains[chainId]
    let best: { score: number; board: number; alight: number } | null = null
    for (const [index, walk] of exits) {
      const board = label.boardIndex[index]
      if (board < 0 || rideKmOf(chain, board, index) < MIN_RIDE_KM) continue
      const score = label.cost[index] + walk
      if (!best || score < best.score) best = { score, board, alight: index }
    }
    if (best) {
      candidates.push({
        score: best.score,
        specs: [{ chain, boardIndex: best.board, alightIndex: best.alight }],
      })
    }
  }

  // 2) Satu kali transit: rantai A (dari asal) → rantai B (ke tujuan)
  const bestPair = new Map<string, { score: number; specs: LegSpec[] }>()
  for (const [chainAId, labelA] of forward) {
    const chainA = network.chains[chainAId]
    for (let k = 0; k < chainA.points.length; k += 1) {
      const arrive = labelA.cost[k]
      if (!Number.isFinite(arrive)) continue
      const boardA = labelA.boardIndex[k]
      if (rideKmOf(chainA, boardA, k) < MIN_RIDE_KM) continue

      forEachNearby(
        network,
        chainA.points[k],
        MAX_TRANSFER_KM,
        (chainB, m, km) => {
          const labelB = backward.get(chainB.id)!
          const rest = labelB.cost[m]
          if (!Number.isFinite(rest)) return
          const alightB = labelB.alightIndex[m]
          if (rideKmOf(chainB, m, alightB) < MIN_RIDE_KM) return

          const score =
            arrive + walkMinutes(km) + TRANSFER_WAIT_MIN + rest + TRANSFER_PENALTY_MIN
          const key = `${chainA.route.code}>${chainB.route.code}`
          const current = bestPair.get(key)
          if (!current || score < current.score) {
            bestPair.set(key, {
              score,
              specs: [
                { chain: chainA, boardIndex: boardA, alightIndex: k },
                { chain: chainB, boardIndex: m, alightIndex: alightB },
              ],
            })
          }
        },
        (chainB) => chainB.route.code !== chainA.route.code && backward.has(chainB.id),
      )
    }
  }
  // Opsi transit yang memakai trayek yang sudah bisa langsung ke tujuan hanya dipertahankan
  // bila memang lebih baik dari rute langsung tersebut.
  const directScoreByCode = new Map<string, number>()
  for (const candidate of candidates) {
    const code = candidate.specs[0].chain.route.code
    directScoreByCode.set(code, Math.min(directScoreByCode.get(code) ?? Infinity, candidate.score))
  }
  for (const candidate of bestPair.values()) {
    const redundant = candidate.specs.some((spec) => {
      const directScore = directScoreByCode.get(spec.chain.route.code)
      return directScore !== undefined && candidate.score >= directScore
    })
    if (!redundant) candidates.push(candidate)
  }

  // 3) Dua kali transit — hanya bila opsi yang lebih sederhana tidak memadai
  if (candidates.length < 2) {
    candidates.push(...planTwoTransfers(network, forward, backward))
  }

  // Pemeringkatan & deduplikasi berdasarkan urutan kode trayek
  candidates.sort((a, b) => a.score - b.score)
  const seen = new Set<string>()
  const itineraries: Itinerary[] = []
  const bestScore = candidates[0]?.score ?? 0
  for (const candidate of candidates) {
    const key = candidate.specs.map((spec) => spec.chain.route.code).join('>')
    if (seen.has(key)) continue
    // Buang opsi yang jauh lebih lambat dari opsi terbaik
    if (candidate.score > bestScore * 1.8 + 15) continue
    seen.add(key)
    itineraries.push(buildItinerary(origin, destination, candidate.specs))
    if (itineraries.length >= maxResults) break
  }
  itineraries.sort((a, b) => a.score - b.score)

  return {
    itineraries,
    straightKm,
    walkOnly: straightKm <= WALK_ONLY_KM ? makeWalk(origin, destination, straightKm) : null,
    noRouteNearOrigin: access.size === 0,
    noRouteNearDestination: egress.size === 0,
  }
}

function planTwoTransfers(
  network: Network,
  forward: Map<number, ForwardLabel>,
  backward: Map<number, BackwardLabel>,
) {
  // Biaya "siap naik" di rantai tengah M, berasal dari transit dari rantai pertama A.
  const middleEntries = new Map<
    number,
    Map<number, number>
  >()
  const middleParents = new Map<string, { chainA: Chain; boardA: number; alightA: number }>()

  for (const [chainAId, labelA] of forward) {
    const chainA = network.chains[chainAId]
    for (let k = 0; k < chainA.points.length; k += 1) {
      const arrive = labelA.cost[k]
      if (!Number.isFinite(arrive)) continue
      const boardA = labelA.boardIndex[k]
      if (rideKmOf(chainA, boardA, k) < MIN_RIDE_KM) continue

      forEachNearby(
        network,
        chainA.points[k],
        MAX_TRANSFER_KM,
        (chainM, q, km) => {
          const entry = arrive + walkMinutes(km) + TRANSFER_WAIT_MIN + TRANSFER_PENALTY_MIN
          let entries = middleEntries.get(chainM.id)
          if (!entries) {
            entries = new Map()
            middleEntries.set(chainM.id, entries)
          }
          const current = entries.get(q)
          if (current === undefined || entry < current) {
            entries.set(q, entry)
            middleParents.set(`${chainM.id}:${q}`, { chainA, boardA, alightA: k })
          }
        },
        (chainM) => chainM.route.code !== chainA.route.code,
      )
    }
  }

  const bestTriple = new Map<string, { score: number; specs: LegSpec[] }>()
  for (const [chainMId, entries] of middleEntries) {
    const chainM = network.chains[chainMId]
    const labelM = propagateForward(chainM, entries)
    for (let k = 0; k < chainM.points.length; k += 1) {
      const arrive = labelM.cost[k]
      if (!Number.isFinite(arrive)) continue
      const boardM = labelM.boardIndex[k]
      if (rideKmOf(chainM, boardM, k) < MIN_RIDE_KM) continue
      const parent = middleParents.get(`${chainMId}:${boardM}`)
      if (!parent) continue

      forEachNearby(
        network,
        chainM.points[k],
        MAX_TRANSFER_KM,
        (chainB, m, km) => {
          if (chainB.route.code === parent.chainA.route.code) return
          const labelB = backward.get(chainB.id)!
          const rest = labelB.cost[m]
          if (!Number.isFinite(rest)) return
          const alightB = labelB.alightIndex[m]
          if (rideKmOf(chainB, m, alightB) < MIN_RIDE_KM) return

          const score =
            arrive + walkMinutes(km) + TRANSFER_WAIT_MIN + TRANSFER_PENALTY_MIN + rest
          const key = `${parent.chainA.route.code}>${chainM.route.code}>${chainB.route.code}`
          const current = bestTriple.get(key)
          if (!current || score < current.score) {
            bestTriple.set(key, {
              score,
              specs: [
                { chain: parent.chainA, boardIndex: parent.boardA, alightIndex: parent.alightA },
                { chain: chainM, boardIndex: boardM, alightIndex: k },
                { chain: chainB, boardIndex: m, alightIndex: alightB },
              ],
            })
          }
        },
        (chainB) => chainB.route.code !== chainM.route.code && backward.has(chainB.id),
      )
    }
  }

  return [...bestTriple.values()]
}

/** Estimasi menit hingga angkot terdekat (sebelum titik naik) tiba. */
export function estimateNextArrival(
  leg: TripLeg,
  vehiclePositions: LatLng[],
): number | null {
  let bestMinutes: number | null = null
  for (const position of vehiclePositions) {
    let nearestIndex = -1
    let nearestKm = Infinity
    for (let i = 0; i <= leg.boardIndex; i += 1) {
      const km = fastKm(position, leg.chainPoints[i])
      if (km < nearestKm) {
        nearestKm = km
        nearestIndex = i
      }
    }
    if (nearestIndex < 0 || nearestKm > 0.15) continue
    let alongKm = 0
    for (let i = nearestIndex + 1; i <= leg.boardIndex; i += 1) {
      alongKm += fastKm(leg.chainPoints[i - 1], leg.chainPoints[i])
    }
    const minutes = Math.max(1, Math.round(rideMinutes(alongKm)))
    if (bestMinutes === null || minutes < bestMinutes) bestMinutes = minutes
  }
  return bestMinutes
}
