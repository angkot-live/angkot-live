import assert from 'node:assert/strict'
import { chromium } from '../apps/web/node_modules/playwright/index.mjs'
import {
  connection,
  client,
  password,
  jsonFile,
  savePrivate,
} from './demo-lib.mjs'

// Controlled coordinates exercise the real local stack; this is not field GPS evidence.
const c = await connection(),
  db = client(c),
  settings = await jsonFile('.local/settings.json')
const origin =
  process.env.SMOKE_ORIGIN ?? `https://${settings.host}:${settings.webPort}`
const base = process.env.DEMO_API_URL ?? 'http://127.0.0.1:8080/api'
async function login(email) {
  return db('/auth/v1/token?grant_type=password', {
    method: 'POST',
    key: c.ANON_KEY,
    body: { email, password },
  })
}
const driver = await login('pengemudi@demo.angkot.local'),
  pending = await login('app-1@demo.angkot.local'),
  rejected = await login('app-5@demo.angkot.local')
async function api(path, body, token = driver.access_token) {
  const r = await fetch(base + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  })
  return { status: r.status, value: await r.json() }
}
async function until(read, predicate, label, timeout = 10000) {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    const value = await read()
    if (predicate(value)) return value
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error(`Timeout: ${label}`)
}
const assignment = (await api('/driver/assignment')).value
assert.ok(assignment.vehicleId)
const initialDuty = (await api('/driver/duty')).value
assert.ok(
  !['narik', 'ngetem'].includes(initialDuty.mode),
  'Akhiri tugas demo sebelum tes Sprint 3',
)
const driverId = driver.user.id,
  startedAt = new Date().toISOString(),
  testSession = crypto.randomUUID()
const route = (await api(`/routes/${assignment.routeId}`)).value
const point = (route.segments?.length ? route.segments : [route.polyline])[0][0]
const beforePositions = new Set(
  (
    await db(`/rest/v1/vehicle_positions?select=id&driver_id=eq.${driverId}`)
  ).map((r) => r.id),
)
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
})
const context = await browser.newContext({ ignoreHTTPSErrors: true })
const page = await context.newPage()
let changedVerification = false,
  metrics
try {
  await page.goto(origin + '/')
  await page.evaluate(
    async ({ token }) => {
      window.s3 = {}
      window.openS3 = async (name, token) => {
        const ws = new WebSocket(
          `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/api/ws`,
        )
        const state = { ws, messages: [], snapshot: null, arrivedAt: 0 }
        window.s3[name] = state
        ws.onmessage = (e) => {
          const m = JSON.parse(e.data)
          state.messages.push(m)
          if (m.type === 'snapshot') {
            state.snapshot = m.data
            state.arrivedAt = Date.now()
          }
        }
        await new Promise((resolve, reject) => {
          ws.onopen = () => {
            ws.send(JSON.stringify({ type: 'auth', token }))
            resolve()
          }
          ws.onerror = reject
        })
      }
      await window.openS3('guest', '')
      await window.openS3('driver', token)
    },
    { token: driver.access_token },
  )
  const snapshot = (name) =>
    page.evaluate((name) => window.s3[name].snapshot, name)
  const visible = () => snapshot('guest')
  await until(visible, (x) => x !== null, 'guest auth')
  const send = async (message, name = 'driver') => {
    const id = crypto.randomUUID(),
      begin = Date.now()
    await page.evaluate(
      ({ name, message, id }) =>
        window.s3[name].ws.send(JSON.stringify({ ...message, id })),
      { name, message, id },
    )
    const response = await until(
      () =>
        page.evaluate(
          ({ name, id }) =>
            window.s3[name].messages.find((m) => m.id === id) ?? null,
          { name, id },
        ),
      Boolean,
      'event response',
    )
    return { ...response, latencyMs: Date.now() - begin }
  }
  const fix = (extra = {}) => ({
    type: 'driver:position',
    position: point,
    accuracy: 10,
    speedKph: 15,
    heading: 90,
    sampledAt: Date.now(),
    sequence: 1,
    session: testSession,
    ...extra,
  })
  assert.equal(
    (await api('/driver/duty', { mode: 'narik', session: testSession })).status,
    200,
  )
  assert.equal(
    (await visible()).vehicles.some((v) => v.id === assignment.vehicleId),
    false,
    'Duty must wait for GPS',
  )
  assert.equal(
    (await api('/driver/duty', { mode: 'narik', session: crypto.randomUUID() }))
      .status,
    400,
  )
  await assert.rejects(
    () =>
      db('/rest/v1/rpc/flow_command', {
        method: 'POST',
        body: {
          p_actor: driverId,
          p_action: 'duty',
          p_input: { mode: 'narik', session: crypto.randomUUID() },
        },
      }),
    /perangkat lain/,
  )
  for (const bad of [
    { position: null },
    { position: [null, null] },
    { accuracy: 80 },
    { sampledAt: Date.now() - 20000 },
    { sampledAt: Date.now() + 10000 },
    { position: [point[0] + 0.05, point[1]] },
  ])
    assert.equal((await send(fix(bad))).type, 'error', JSON.stringify(bad))
  assert.equal(
    (await visible()).vehicles.some((v) => v.id === assignment.vehicleId),
    false,
  )
  const sentAt = Date.now(),
    accepted = await send(fix())
  assert.equal(accepted.type, 'ack', JSON.stringify(accepted))
  const snap = await until(
    visible,
    (x) => x?.vehicles.some((v) => v.id === assignment.vehicleId),
    'live marker',
  )
  const snapshotMs = Date.now() - sentAt,
    v = snap.vehicles.find((v) => v.id === assignment.vehicleId)
  assert.equal(v.routeId, route.id)
  assert.equal(v.plate, assignment.vehicle.plate)
  assert.ok(v.driverName)
  assert.equal(v.driverId, undefined)
  assert.equal(v.stale, false)
  const stats = (await api('/stats/public', undefined, '')).value
  assert.ok(stats.activeVehicles >= 1)
  assert.ok(stats.activeByDirection[route.id] >= 1)
  assert.equal(
    (await send(fix({ sequence: 1 }))).type,
    'error',
    'Replay accepted',
  )
  for (const [name, session] of [
    ['pending', pending],
    ['rejected', rejected],
  ]) {
    assert.equal(
      (
        await api(
          '/driver/duty',
          { mode: 'narik', session: testSession },
          session.access_token,
        )
      ).status,
      400,
    )
    await page.evaluate(({ name, token }) => window.openS3(name, token), {
      name,
      token: session.access_token,
    })
    await until(() => snapshot(name), Boolean, `${name} auth`)
    assert.equal((await send(fix(), name)).type, 'error')
  }
  await page.evaluate(() => window.s3.driver.ws.close())
  await until(
    visible,
    (x) =>
      x?.vehicles.find((v) => v.id === assignment.vehicleId)?.stale === true,
    'stale at 15 seconds',
    19000,
  )
  assert.equal(
    (await api('/stats/public', undefined, '')).value.activeByDirection[
      route.id
    ] ?? 0,
    0,
  )
  await until(
    visible,
    (x) => !x?.vehicles.some((v) => v.id === assignment.vehicleId),
    'removed at 30 seconds',
    19000,
  )
  console.log(
    'PASS stale/remove: real local WebSocket, marker stale >15s and removed >30s',
  )
  await page.evaluate(
    (token) => window.openS3('driver', token),
    driver.access_token,
  )
  await until(() => snapshot('driver'), Boolean, 'driver reconnect')
  assert.equal((await send(fix({ sequence: 2 }))).type, 'ack')
  await until(
    visible,
    (x) => x?.vehicles.some((v) => v.id === assignment.vehicleId),
    'GPS recovery',
  )
  assert.equal(
    (await api('/driver/duty', { mode: 'istirahat', session: testSession }))
      .status,
    200,
  )
  await until(
    visible,
    (x) => !x?.vehicles.some((v) => v.id === assignment.vehicleId),
    'rest removes marker',
  )
  assert.equal((await send(fix({ sequence: 3 }))).type, 'error')
  assert.equal(
    (await api('/driver/duty', { mode: 'narik', session: testSession })).status,
    200,
  )
  assert.equal(
    (await send(fix({ sequence: 1 }))).type,
    'ack',
    'New duty must reset GPS sequence',
  )
  await until(
    visible,
    (x) => x?.vehicles.some((v) => v.id === assignment.vehicleId),
    'resumed duty',
  )
  changedVerification = true
  await db(`/rest/v1/driver_profiles?id=eq.${driverId}`, {
    method: 'PATCH',
    body: { verification_status: 'menunggu' },
  })
  await until(
    visible,
    (x) => !x?.vehicles.some((v) => v.id === assignment.vehicleId),
    'revocation hides marker',
  )
  const ended = await db(
    `/rest/v1/driver_duties?driver_id=eq.${driverId}&session_id=eq.${testSession}&finished_at=is.null&select=id`,
  )
  assert.equal(ended.length, 0, 'Revoked duty remained open')
  await db(`/rest/v1/driver_profiles?id=eq.${driverId}`, {
    method: 'PATCH',
    body: { verification_status: 'disetujui' },
  })
  changedVerification = false
  assert.equal(
    (await api('/driver/duty', { mode: 'offline', session: testSession }))
      .status,
    200,
  )
  metrics = {
    kind: 'automated-local-fixture',
    startedAt,
    ackMs: accepted.latencyMs,
    snapshotMs,
    targetMs: 3000,
    targetMet: snapshotMs <= 3000,
    staleMs: 15000,
    removeMs: 30000,
    physicalDeviceGPS: 'pending',
  }
  await savePrivate('.local/sprint3-metrics.json', metrics)
  console.log(
    'PASS real Auth/API/WS: duty/session ownership, missing/poor/old/off-route GPS, replay, recovery, rest/offline, approval revocation, pending/rejected, shared statistics',
  )
  console.log(JSON.stringify(metrics))
} finally {
  if (changedVerification)
    await db(`/rest/v1/driver_profiles?id=eq.${driverId}`, {
      method: 'PATCH',
      body: { verification_status: 'disetujui' },
    })
  await api('/driver/duty', { mode: 'offline', session: testSession })
  await browser.close()
  await db(
    `/rest/v1/driver_duties?driver_id=eq.${driverId}&session_id=eq.${testSession}`,
    { method: 'DELETE' },
  )
  const added = (
    await db(
      `/rest/v1/vehicle_positions?select=id&driver_id=eq.${driverId}&sampled_at=gte.${encodeURIComponent(startedAt)}`,
    )
  ).filter((r) => !beforePositions.has(r.id))
  if (added.length)
    await db(
      `/rest/v1/vehicle_positions?id=in.(${added.map((r) => r.id).join(',')})`,
      { method: 'DELETE' },
    )
}
