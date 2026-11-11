// Run while demo:fleet is active. Only a disposable passenger and its own trip
// are written; driver sessions and demo passengers are never modified here.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { chromium } from '../apps/web/node_modules/playwright/index.mjs'
import { connection, client, jsonFile, savePrivate } from './demo-lib.mjs'
import { loopbackURL, distance } from './fleet-simulator.mjs'

const c = await connection(), db = client(c)
const settings = await jsonFile('.local/settings.json')
const base = loopbackURL(process.env.DEMO_API_URL ?? `http://127.0.0.1:${settings.apiPort}/api`).href.replace(/\/$/, '')
const origin = `${settings.https ? 'https' : 'http'}://${settings.host}:${settings.webPort}`
const manifest = await jsonFile('.local/fleet-manifest.json')
const actors = new Set(manifest.actors.map((a) => a.id))
const profiles = await db('/rest/v1/driver_profiles?select=id,vehicle_id')
const ids = new Set(profiles.filter((p) => actors.has(p.id)).map((p) => p.vehicle_id))
async function api(path, body, token) {
  const response = await fetch(base + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000),
  })
  const value = await response.json()
  assert.equal(response.status, 200, `${path}: ${JSON.stringify(value)}`)
  return value
}
async function until(read, predicate, label, timeout = 15000) {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    const value = await read()
    if (predicate(value)) return value
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error('Timeout: ' + label)
}
const first = await api('/vehicles')
assert.ok(ids.size >= 2, 'Jalankan demo:fleet terlebih dahulu')
assert.equal(first.filter((v) => ids.has(v.id)).length, ids.size)
assert.ok(first.filter((v) => ids.has(v.id)).every((v) => v.telemetrySource === 'simulation'))
const moving = await until(() => api('/vehicles'), (rows) =>
  rows.filter((v) => {
    const before = first.find((p) => p.id === v.id)
    return ids.has(v.id) && before && distance(before.position, v.position) > 0.001
  }).length === ids.size, 'seluruh armada bergerak')
const stats = await api('/stats/public')
assert.ok(stats.simulatedVehicles >= ids.size)

let browser, passenger
const pageErrors = []
try {
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const pages = []
  for (const viewport of [{ width: 1280, height: 900 }, { width: 393, height: 851 }]) {
    const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport })
    const page = await context.newPage()
    const observed = { page, vehicles: [] }
    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('websocket', (ws) => ws.on('framereceived', ({ payload }) => {
      const message = JSON.parse(String(payload))
      if (message.type === 'snapshot') observed.vehicles = message.data.vehicles
    }))
    await page.goto(origin + '/peta')
    pages.push(observed)
  }
  for (const page of pages) {
    await until(async () => page.vehicles, (rows) => rows.filter((v) => ids.has(v.id)).length === ids.size, 'browser menerima seluruh armada')
    await page.page.getByText('SIMULASI', { exact: false }).first().waitFor()
  }
  assert.deepEqual(
    pages[0].vehicles.filter((v) => ids.has(v.id)).map((v) => v.id).sort(),
    pages[1].vehicles.filter((v) => ids.has(v.id)).map((v) => v.id).sort(),
  )
  await pages[1].page.screenshot({ path: '.local/fleet-mobile.png', fullPage: true })

  const secret = randomUUID() + randomUUID(), email = `fleet-test-${randomUUID()}@demo.angkot.local`
  passenger = await db('/auth/v1/admin/users', { method: 'POST', body: {
    email, password: secret, email_confirm: true,
    user_metadata: { name: 'Penumpang uji armada', role: 'penumpang', fleet_test: true },
  } })
  const auth = await db('/auth/v1/token?grant_type=password', {
    method: 'POST', key: c.ANON_KEY, body: { email, password: secret },
  })
  const vehicle = (await api('/vehicles')).find((v) => ids.has(v.id) && v.plate !== 'D 1000 AB')
  assert.ok(vehicle, 'Memerlukan satu pengemudi sementara')
  const request = await api('/passenger/requests', {
    routeId: vehicle.routeId, position: vehicle.position, accuracy: 5,
    sampledAt: Date.now(), destination: 'Terminal pengujian armada', key: randomUUID(),
  }, auth.access_token)
  assert.equal(request.status, 'searching')
  const board = { id: request.id, vehicleId: vehicle.id, key: randomUUID() }
  const [trip, retry] = await Promise.all([
    api('/passenger/trips', board, auth.access_token),
    api('/passenger/trips', board, auth.access_token),
  ])
  assert.equal(trip.id, retry.id)
  assert.equal(trip.telemetry_source, 'simulation')
  const route = await api(`/routes/${vehicle.routeId}`)
  assert.equal(trip.fare, route.fareStandard)
  const completed = await api('/passenger/trips/complete', { id: trip.id, key: randomUUID() }, auth.access_token)
  assert.equal(completed.status, 'completed')
  const history = await api('/passenger/trips', undefined, auth.access_token)
  assert.equal(history.filter((t) => t.id === trip.id).length, 1)
  assert.equal(history[0].telemetry_source, 'simulation')
  assert.deepEqual(pageErrors, [])
  const result = {
    passed: true, vehicles: ids.size, moving: moving.filter((v) => ids.has(v.id)).length,
    browsers: 2, boarding: 'real API, duplicate submit creates one trip', fare: trip.fare,
    tripProvenance: trip.telemetry_source, pageErrors,
    physicalDevices: 'not tested; desktop and mobile browser viewports only',
  }
  await savePrivate('.local/fleet-validation.json', result)
  console.log(JSON.stringify(result, null, 2))
} finally {
  await browser?.close()
  if (passenger) {
    for (const [table, key] of [['passenger_trips', 'passenger_id'], ['passenger_requests', 'passenger_id'], ['flow_idempotency', 'actor_id']])
      await db(`/rest/v1/${table}?${key}=eq.${passenger.id}`, { method: 'DELETE' })
    await db(`/auth/v1/admin/users/${passenger.id}`, { method: 'DELETE' })
  }
}
