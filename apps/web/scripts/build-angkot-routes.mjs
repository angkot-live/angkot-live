import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const docsDir = join(scriptDir, '../../../docs/jalur_angkot/output_geojson')
const outputFile = join(scriptDir, '../src/data/angkot-routes.json')

const SAME_POINT_TOLERANCE = 1e-6

const palette = [
  '#1F5C3A',
  '#325F99',
  '#B45309',
  '#7C3AED',
  '#BE185D',
  '#0E7490',
  '#4D7C0F',
  '#9A3412',
  '#1D4ED8',
  '#A21CAF',
  '#047857',
  '#B91C1C',
]

function samePoint(a, b) {
  return (
    Math.abs(a[0] - b[0]) <= SAME_POINT_TOLERANCE &&
    Math.abs(a[1] - b[1]) <= SAME_POINT_TOLERANCE
  )
}

function colorFor(code) {
  let hash = 0
  for (const char of code) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return palette[hash % palette.length]
}

function toLatLng(coordinate) {
  return [Number(coordinate[1].toFixed(6)), Number(coordinate[0].toFixed(6))]
}

function streetNameOf(properties = {}) {
  return properties.name ?? properties.alt_name ?? properties.ref ?? ''
}

function buildChains(features, anchor) {
  const lineFeatures = features
    .filter((feature) => feature.geometry?.type === 'LineString')
    .filter((feature) => feature.geometry.coordinates.length > 1)
  const segments = lineFeatures.map((feature) => feature.geometry.coordinates)
  const segmentNames = lineFeatures.map((feature) => streetNameOf(feature.properties))

  const used = new Array(segments.length).fill(false)
  const chains = []

  function findNext(point) {
    for (let index = 0; index < segments.length; index += 1) {
      if (used[index]) continue
      const segment = segments[index]
      if (samePoint(segment[0], point)) return { index, reversed: false }
      if (samePoint(segment[segment.length - 1], point)) return { index, reversed: true }
    }
    return null
  }

  function findStart(anchorPoint) {
    if (anchorPoint) {
      for (let index = 0; index < segments.length; index += 1) {
        if (used[index]) continue
        const segment = segments[index]
        if (samePoint(segment[0], anchorPoint)) return { index, reversed: false }
        if (samePoint(segment[segment.length - 1], anchorPoint)) return { index, reversed: true }
      }
    }
    const index = used.findIndex((value) => !value)
    return index === -1 ? null : { index, reversed: false }
  }

  let isFirstChain = true
  while (used.some((value) => !value)) {
    const start = findStart(isFirstChain ? anchor : null)
    if (!start) break
    isFirstChain = false

    const chain = []
    // Run-length encoded street names: [startPointIndex, streetName]
    const streetRuns = []
    let current = start
    while (current) {
      used[current.index] = true
      const coordinates = current.reversed
        ? [...segments[current.index]].reverse()
        : segments[current.index]
      const name = segmentNames[current.index]
      const runStart = Math.max(chain.length - 1, 0)

      for (const coordinate of coordinates) {
        const previous = chain[chain.length - 1]
        if (!previous || !samePoint(previous, coordinate)) chain.push(coordinate)
      }

      const lastRun = streetRuns[streetRuns.length - 1]
      if (name && (!lastRun || lastRun[1] !== name)) streetRuns.push([runStart, name])

      const endpoint = chain[chain.length - 1]
      current = findNext(endpoint)
    }

    if (chain.length > 1) chains.push({ points: chain, streetRuns })
  }

  chains.sort((a, b) => b.points.length - a.points.length)
  return chains.map((chain) => ({
    points: chain.points.map(toLatLng),
    streetRuns: chain.streetRuns,
  }))
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function main() {
  const index = await readJson(join(docsDir, 'index_jalur.json'))
  const routes = []

  for (const entry of index.daftar_jalur) {
    const ways = await readJson(join(docsDir, 'ways', entry.nama_file))
    const endstops = entry.endstops_gmaps ?? []
    const anchor = endstops[0] ? [endstops[0].lng, endstops[0].lat] : null
    const chains = buildChains(ways.features, anchor)
    if (chains.length === 0) continue

    const polyline = chains[0].points
    routes.push({
      id: String(entry.kode_jalur),
      code: entry.nomor_trayek,
      name: entry.nama_rute,
      origin: endstops[0]?.name ?? entry.nama_rute.split('→')[0]?.trim() ?? entry.nama_rute,
      destination:
        endstops[endstops.length - 1]?.name ??
        entry.nama_rute.split('→')[1]?.trim() ??
        entry.nama_rute,
      color: colorFor(entry.nomor_trayek),
      polyline,
      segments: chains.length > 1 ? chains.map((chain) => chain.points) : null,
      // Street runs per chain, aligned with `segments ?? [polyline]`
      streetRuns: chains.map((chain) => chain.streetRuns),
      endstops: endstops.map((stop) => ({
        id: String(stop.id),
        name: stop.name,
        position: [stop.lat, stop.lng],
      })),
      streets: entry.jalan_dilalui ?? [],
      bounds: entry.bounds_gmaps ?? null,
    })
  }

  routes.sort((a, b) => a.code.localeCompare(b.code, 'id', { numeric: true }))

  await mkdir(dirname(outputFile), { recursive: true })
  await writeFile(
    outputFile,
    `${JSON.stringify({ total: routes.length, routes }, null, 0)}\n`,
    'utf8',
  )

  const pointCount = routes.reduce((total, route) => total + route.polyline.length, 0)
  console.log(`Generated ${routes.length} routes (${pointCount} points) -> ${outputFile}`)
}

await main()
