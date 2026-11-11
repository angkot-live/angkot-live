import { demoSettings, demoOrigin } from '../../../scripts/demo-settings.mjs'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import {
  client,
  connection,
  savePrivate,
  password,
} from '../../../scripts/demo-lib.mjs'
const c = await connection(),
  db = client(c),
  settings = await demoSettings()
const origin =
  process.env.SMOKE_ORIGIN ?? demoOrigin(settings)
const auth = await db('/auth/v1/token?grant_type=password', {
  method: 'POST',
  key: c.ANON_KEY,
  body: { email: 'pengemudi@demo.angkot.local', password },
})
const base = 'http://127.0.0.1:8080/api'
const assignment = await (
  await fetch(base + '/driver/assignment', {
    headers: { Authorization: `Bearer ${auth.access_token}` },
  })
).json()
const dutyBefore = await (
  await fetch(base + '/driver/duty', {
    headers: { Authorization: `Bearer ${auth.access_token}` },
  })
).json()
assert.ok(
  !['narik', 'ngetem'].includes(dutyBefore.mode),
  'Akhiri tugas sebelum tes browser Sprint 3',
)
const route = await (await fetch(base + `/routes/${assignment.routeId}`)).json()
const line = (route.segments?.length ? route.segments : [route.polyline])[0]
const point = line[0],
  pickup = line[Math.min(10, line.length - 1)]
const start = new Date().toISOString(),
  beforePositions = new Set(
    (
      await db(
        `/rest/v1/vehicle_positions?driver_id=eq.${auth.user.id}&select=id`,
      )
    ).map((x) => x.id),
  )
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
})
const options = {
  ignoreHTTPSErrors: true,
  viewport: { width: 1365, height: 1000 },
  permissions: ['geolocation'],
}
const driverContext = await browser.newContext({
  ...options,
  geolocation: { latitude: point[0], longitude: point[1], accuracy: 10 },
})
const paxContext = await browser.newContext({
  ...options,
  geolocation: { latitude: pickup[0], longitude: pickup[1], accuracy: 10 },
})
const guestContext = await browser.newContext({
  ...options,
  geolocation: { latitude: pickup[0], longitude: pickup[1], accuracy: 10 },
})
const driver = await driverContext.newPage(),
  pax = await paxContext.newPage(),
  guest = await guestContext.newPage(),
  errors = []
let dropSnapshots = false,
  testSession
let driverAccuracy = 10
// Chromium's override holds one sample until explicitly updated. Refresh only
// the test fixture to exercise the same 3-second sampling contract as a device.
const gpsTimer = setInterval(() => {
  void driverContext
    .setGeolocation({
      latitude: point[0],
      longitude: point[1],
      accuracy: driverAccuracy,
    })
    .catch(() => {})
  void guestContext
    .setGeolocation({ latitude: pickup[0], longitude: pickup[1], accuracy: 10 })
    .catch(() => {})
  void paxContext
    .setGeolocation({ latitude: pickup[0], longitude: pickup[1], accuracy: 10 })
    .catch(() => {})
}, 3000)

for (const page of [driver, pax, guest]) {
  page.setDefaultTimeout(20000)
  page.on('pageerror', (e) => errors.push(e.message))
  // Deliberately fail external optional paths; Auth/API/WebSocket remain real.
  await page.route('https://routing.openstreetmap.de/**', (r) => r.abort())
  await page.route('https://photon.komoot.io/**', (r) => r.abort())
}
await driver.routeWebSocket('**/api/ws', (ws) => {
  const server = ws.connectToServer()
  server.onMessage((message) => {
    if (!dropSnapshots) ws.send(message)
  })
  ws.onMessage((message) => server.send(message))
})
async function state(page) {
  return page.evaluate(async () => {
    const { useLiveStore } = await import(
      performance
        .getEntriesByType('resource')
        .map((e) => e.name)
        .filter((u) => u.includes('/src/features/tracking/live-store.ts'))
        .at(-1) ?? '/src/features/tracking/live-store.ts'
    )
    return useLiveStore.getState()
  })
}
async function waitState(page, predicate, label, timeout = 18000) {
  const begin = Date.now()
  while (Date.now() - begin < timeout) {
    const s = await state(page)
    if (predicate(s)) return s
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error(`Timeout: ${label}; ${JSON.stringify(await state(page))}`)
}
try {
  await guest.goto(origin+'/peta?from=zzqxzyvtest8173&to=yyqxzyvtest9173')
  await guest.getByText(/tidak ditemukan/).first().waitFor()
  await driver.goto(origin + '/login')
  await driver.getByRole('button', { name: 'Pengemudi', exact: true }).click()
  await driver.waitForURL('**/pengemudi')
  await waitState(
    driver,
    (s) => s.connection === 'connected',
    'driver connected',
  )
  testSession = await driver.evaluate(async () => {
    const { dutySession } = await import(
      performance
        .getEntriesByType('resource')
        .map((e) => e.name)
        .filter((u) => u.includes('/src/features/tracking/live-store.ts'))
        .at(-1) ?? '/src/features/tracking/live-store.ts'
    )
    return dutySession
  })
  await pax.goto(origin + '/login')
  await pax.getByRole('button', { name: 'Penumpang', exact: true }).click()
  await pax.waitForURL('**/penumpang')
  await guest.goto(`${origin}/peta?route=${route.id}`)
  await waitState(guest, (s) => s.connection === 'connected', 'guest connected')
  await driver.getByRole('button', { name: 'Narik', exact: true }).click()
  await driver.getByText('GPS aktif', { exact: false }).first().waitFor()
  await waitState(driver, (s) => !!s.lastAckAt, 'GPS acknowledged')
  await waitState(
    pax,
    (s) => s.vehicles.some((v) => v.id === assignment.vehicleId),
    'passenger sees vehicle',
  )
  await waitState(
    guest,
    (s) => s.vehicles.some((v) => v.id === assignment.vehicleId),
    'guest sees vehicle',
  )
  const vehicleButton = guest
    .getByRole('button')
    .filter({ hasText: assignment.vehicle.plate })
    .first()
  await vehicleButton.waitFor()
  assert.match(
    await vehicleButton.textContent(),
    /ETA belum tersedia/,
    'No location permission request means no actual pickup ETA',
  )
  await vehicleButton.click()
  await guest.getByText('Pengemudi', { exact: true }).waitFor()
  await guest.getByText(assignment.vehicle.plate, { exact: true }).waitFor()
  await guest.getByText('ETA ke titik naik Anda', { exact: true }).waitFor()
  await guest
    .getByRole('button', { name: 'Pusatkan ke lokasi saya', exact: true })
    .click()
  await guest.getByText('Kembali ke daftar', { exact: true }).click()
  await guest
    .getByRole('button', { name: 'Ganti radius, saat ini Semua', exact: true })
    .click()
  await guest
    .getByRole('button', { name: 'Ganti radius, saat ini 100 m', exact: true })
    .waitFor()
  // A manually chosen origin must not create a user GPS marker or radius centre.
  const query = new URLSearchParams({
    from: 'Asal manual',
    fl: pickup.join(','),
    to: 'Tujuan manual',
    tl: line.at(-1).join(','),
  })
  await guest.goto(`${origin}/peta?${query}`)
  await guest.getByText('Disarankan', { exact: true }).first().waitFor()
  await guest
    .getByRole('button', { name: 'Tutup hasil rute', exact: true })
    .click()
  assert.equal(
    await guest
      .locator('.leaflet-marker-pane')
      .getByText('Lokasi Anda', { exact: true })
      .count(),
    0,
    'Custom origin became a GPS marker',
  )
  // The device gives poor fixes; the server error must survive intervening snapshots.
  driverAccuracy = 100
  await driverContext.setGeolocation({
    latitude: point[0],
    longitude: point[1],
    accuracy: 100,
  })
  await waitState(driver, (s) => !!s.deviceGpsError, 'poor accuracy shown')
  await driver.evaluate(async (point) => {
    const { sendLive, dutySession } = await import(
      performance
        .getEntriesByType('resource')
        .map((e) => e.name)
        .filter((u) => u.includes('/src/features/tracking/live-store.ts'))
        .at(-1) ?? '/src/features/tracking/live-store.ts'
    )
    sendLive({
      type: 'driver:position',
      position: point,
      accuracy: 100,
      speedKph: 0,
      heading: 0,
      sampledAt: Date.now(),
      sequence: 999999,
      session: dutySession,
    })
  }, point)
  await waitState(driver, (s) => !!s.gpsError, 'server rejection shown')
  await new Promise((r) => setTimeout(r, 1800))
  assert.ok(
    (await state(driver)).gpsError,
    'Snapshot cleared an unacknowledged GPS failure',
  )
  driverAccuracy = 10
  await driverContext.setGeolocation({
    latitude: point[0],
    longitude: point[1],
    accuracy: 10,
  })
  await waitState(
    driver,
    (s) => s.gpsError === null && s.deviceGpsError === null,
    'valid acknowledged GPS clears error',
  )
  const beforeRefresh = (await state(driver)).lastAckAt
  await driver.evaluate(async () => {
    const { supabase } = await import(
      performance
        .getEntriesByType('resource')
        .map((e) => e.name)
        .filter((u) => u.includes('/src/lib/supabase.ts'))
        .at(-1) ?? '/src/lib/supabase.ts'
    )
    const { error } = await supabase.auth.refreshSession()
    if (error) throw error
  })
  await waitState(
    driver,
    (s) =>
      s.connection === 'connected' &&
      s.duty.session === testSession &&
      s.lastAckAt > beforeRefresh,
    'JWT refresh reconnects without ending duty',
  )
  // Hold the server frames while the network socket remains open: watchdog must fire.
  dropSnapshots = true
  await waitState(
    driver,
    (s) => s.connection !== 'connected',
    'half-open watchdog',
    12000,
  )
  dropSnapshots = false
  await waitState(
    driver,
    (s) => s.connection === 'connected' && s.duty.mode === 'narik',
    'watchdog reconnect',
  )
  await driver
    .getByRole('link', { name: /Dashboard/i })
    .first()
    .click()
  await driver.getByText('GPS aktif', { exact: false }).first().waitFor()
  await driver
    .getByRole('link', { name: 'Peta Kerja', exact: true })
    .first()
    .click()
  await driver.getByRole('button', { name: 'Istirahat', exact: true }).click()
  await waitState(
    pax,
    (s) => !s.vehicles.some((v) => v.id === assignment.vehicleId),
    'rest removes passenger marker',
  )
  await driver
    .getByText('GPS tidak dibagikan', { exact: false })
    .first()
    .waitFor()
  await driver.getByRole('button', { name: 'Narik', exact: true }).click()
  await waitState(
    driver,
    (s) => s.duty.mode === 'narik' && !!s.duty.vehicle?.lastSeenAt,
    'resume fresh GPS',
  )
  await driver.getByRole('button', { name: 'Offline', exact: true }).click()
  await waitState(
    guest,
    (s) => !s.vehicles.some((v) => v.id === assignment.vehicleId),
    'offline removes public marker',
  )
  // The user-requested simulator must work with device location permission removed.
  const dashboardBefore = await (
    await fetch(base + '/driver/dashboard', {
      headers: { Authorization: `Bearer ${auth.access_token}` },
    })
  ).json()
  await driverContext.clearPermissions()
  await driver
    .getByLabel('Sumber posisi pengemudi', { exact: true })
    .selectOption('simulation')
  await driver.getByRole('button', { name: 'Narik', exact: true }).click()
  await driver.getByText('Simulasi aktif', { exact: false }).first().waitFor()
  const simulated = await waitState(
    pax,
    (s) =>
      s.vehicles.some(
        (v) =>
          v.id === assignment.vehicleId && v.telemetrySource === 'simulation',
      ),
    'simulation visible to passenger',
  )
  const first = simulated.vehicles.find(
    (v) => v.id === assignment.vehicleId,
  ).position
  await waitState(
    pax,
    (s) =>
      s.vehicles.some(
        (v) =>
          v.id === assignment.vehicleId &&
          v.telemetrySource === 'simulation' &&
          (v.position[0] !== first[0] || v.position[1] !== first[1]),
      ),
    'simulator advances along route',
  )
  await guest
    .locator('.leaflet-marker-pane')
    .getByText(/SIMULASI/)
    .first()
    .waitFor()
  await driver
    .getByRole('button', {
      name: 'Jeda simulasi (uji GPS terputus)',
      exact: true,
    })
    .click()
  await waitState(
    pax,
    (s) => s.vehicles.some((v) => v.id === assignment.vehicleId && v.stale),
    'paused simulation becomes stale',
    19000,
  )
  await driver
    .getByRole('button', { name: 'Lanjutkan simulasi', exact: true })
    .click()
  await waitState(
    pax,
    (s) => s.vehicles.some((v) => v.id === assignment.vehicleId && !v.stale),
    'simulation resumes',
  )
  const stored = await db(
    `/rest/v1/vehicle_positions?driver_id=eq.${auth.user.id}&telemetry_source=eq.simulation&sampled_at=gte.${encodeURIComponent(start)}&select=id`,
  )
  assert.ok(stored.length > 0, 'Simulation provenance missing in DB')
  await driver.getByRole('button', { name: 'Offline', exact: true }).click()
  const dashboardAfter = await (
    await fetch(base + '/driver/dashboard', {
      headers: { Authorization: `Bearer ${auth.access_token}` },
    })
  ).json()
  assert.deepEqual(
    dashboardAfter,
    dashboardBefore,
    'Simulator inflated operational driver summary',
  )
  assert.deepEqual(errors, [])
  await driver.screenshot({
    path: new URL(
      '../../../.local/screenshots/sprint3-driver.png',
      import.meta.url,
    ).pathname,
    fullPage: true,
  })
  await savePrivate('.local/sprint3-browser.json', {
    kind: 'automated-browser-geolocation-fixture',
    passed: true,
    checks: [
      'three independent contexts',
      'real Auth/API/WSS',
      'GPS ack and persistent error',
      'direction/radius/detail',
      'canonical direct search, external walking failure',
      'manual origin does not become GPS',
      'token refresh',
      'half-open watchdog',
      'shared dashboard status',
      'rest/offline',
      'local simulator without GPS permission, motion, pause/stale/resume, provenance and summary isolation',
    ],
    physicalGPS: 'pending',
  })
  console.log(
    'PASS Sprint 3 browser: real driver/passenger/guest, GPS acknowledgment/error, filters/detail, direct search fallback, custom-origin isolation, JWT refresh, watchdog reconnect, dashboard, rest/offline; simulator without GPS permission, movement/pause/stale/resume and DB provenance; no page errors',
  )
} catch (error) {
  console.error(
    'BROWSER DIAGNOSTIC',
    JSON.stringify({
      state: await state(driver).catch(()=>({unavailable:'navigation'})),
      body: (await driver.locator('body').innerText().catch(()=>'' )).slice(0, 5000),
      errors,
    }),
  )
  throw error
} finally {
  clearInterval(gpsTimer)
  if (testSession) {
    await fetch(base + '/driver/duty', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mode: 'offline', session: testSession }),
    })
    await db(
      `/rest/v1/driver_duties?driver_id=eq.${auth.user.id}&session_id=eq.${testSession}`,
      { method: 'DELETE' },
    )
  }
  await browser.close()
  const added = (
    await db(
      `/rest/v1/vehicle_positions?driver_id=eq.${auth.user.id}&sampled_at=gte.${encodeURIComponent(start)}&select=id`,
    )
  ).filter((r) => !beforePositions.has(r.id))
  if (added.length)
    await db(
      `/rest/v1/vehicle_positions?id=in.(${added.map((r) => r.id).join(',')})`,
      { method: 'DELETE' },
    )
}
