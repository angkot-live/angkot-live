import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { animatedVehicles } from '../src/features/tracking/animated-vehicles.ts'
import { distanceKm } from '../src/lib/geo.ts'

const epoch = Date.UTC(2026, 0, 1)
const route = { id: 'a', code: '13', name: 'Test', polyline: [[0, 0], [0, 0.01], [0.01, 0.01]] }

test('each direction gets one or two distinct vehicles including routes absent from old mock data', async () => {
  const { routes } = JSON.parse(await readFile(new URL('../src/data/angkot-routes.json', import.meta.url)))
  const vehicles = animatedVehicles(routes, epoch)
  for (const route of routes) {
    const count = vehicles.filter((vehicle) => vehicle.routeId === route.id).length
    assert.ok(count === 1 || count === 2, `${route.id} has ${count} vehicles`)
  }
  assert.equal(new Set(vehicles.map((v) => v.id)).size, vehicles.length)
  assert.equal(new Set(vehicles.map((v) => v.plate)).size, vehicles.length)
  assert.ok(vehicles.every((v) => v.isExample && v.driverVerified))
})

test('position advances along the polyline at the advertised speed', () => {
  const a = animatedVehicles([route], epoch)[0]
  const b = animatedVehicles([route], epoch + 1000)[0]
  assert.equal(a.position[0], 0)
  assert.equal(b.position[0], 0)
  assert.ok(b.position[1] > a.position[1])
  assert.ok(Math.abs(distanceKm(a.position, b.position) - a.speedKph / 3600) < 0.00001)
})

test('independent tabs and reloads derive the same positions from the same clock', () => {
  assert.deepEqual(animatedVehicles([route], epoch + 6000), animatedVehicles([route], epoch + 6000))
  assert.equal(animatedVehicles([route], epoch + 6000)[0].lastSeenAt, epoch + 6000)
})

test('terminal pause is stationary and disconnected route geometry is not joined', () => {
  const short = { ...route, polyline: [[0, 0], [0, 0.0001]] }
  const parked = animatedVehicles([short], epoch)[0]
  assert.equal(parked.status, 'ngetem')
  assert.equal(parked.speedKph, 0)
  assert.deepEqual(parked.position, short.polyline.at(-1))
  const multipart = { ...route, segments: [route.polyline, [[10, 10], [10, 11]]] }
  assert.ok(animatedVehicles([multipart], epoch)[0].position[0] < 1)
})
