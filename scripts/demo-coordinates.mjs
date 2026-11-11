// Coordinates from canonical geometry, never publishes or overrides GPS.
import { readFile } from 'node:fs/promises'
const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))
const { data } = await read('../supabase/fixtures/mock-data.json')
const { routes } = await read('../apps/web/src/data/angkot-routes.json')
const vehicle = data.vehicles[0]
const route = routes.find((r) => r.id === vehicle.routeId)
if (!route) throw new Error('Trayek kendaraan demo utama tidak ditemukan.')
const point = (route.segments?.length ? route.segments[0] : route.polyline)[0]
console.log(`Kendaraan seed: ${vehicle.plate}\nJurusan: ${route.code} · ${route.name}\nRoute ID: ${route.id}\nSegmen: 0\nTitik mulai simulasi: 0%\nLatitude: ${point[0]}\nLongitude: ${point[1]}\nAkurasi browser: 10 m\nAtur Sensors hanya pada browser penumpang lokal; ini bukan GPS fisik. Gunakan kecepatan simulasi 0 km/jam untuk boarding yang deterministik.`)
