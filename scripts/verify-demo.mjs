import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { connection, client, accounts, password, root } from './demo-lib.mjs'

const c = await connection(),
  db = client(c)
const apiURL = process.env.DEMO_API_URL ?? 'http://127.0.0.1:8080/api'
async function api(path, { token, body, method = body ? 'POST' : 'GET' } = {}) {
  const r = await fetch(apiURL + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await r.text()
  let value
  try {
    value = JSON.parse(text)
  } catch {
    value = text
  }
  return { status: r.status, value }
}
async function count(table) {
  const r = await fetch(c.API_URL + `/rest/v1/${table}?select=*`, {
    method: 'HEAD',
    headers: {
      apikey: c.SERVICE_ROLE_KEY,
      Authorization: `Bearer ${c.SERVICE_ROLE_KEY}`,
      Prefer: 'count=exact',
    },
  })
  assert.equal(r.status, 200, table)
  return Number(r.headers.get('content-range').split('/')[1])
}
const tables = [
  'profiles',
  'driver_profiles',
  'routes',
  'route_segments',
  'route_stops',
  'vehicles',
  'driver_documents',
  'passenger_trips',
  'passenger_requests',
  'reports',
  'report_updates',
  'messages',
]
const before = Object.fromEntries(
  await Promise.all(tables.map(async (t) => [t, await count(t)])),
)
const seed = spawnSync(process.execPath, ['scripts/seed-demo.mjs'], {
  cwd: root,
  encoding: 'utf8',
})
assert.equal(seed.status, 0, seed.stderr)
const after = Object.fromEntries(
  await Promise.all(tables.map(async (t) => [t, await count(t)])),
)
assert.deepEqual(after, before, 'Seed ulang tidak boleh menambah baris')
assert.equal(after.routes, 82)
assert.equal(after.profiles, 10)
assert.equal(after.vehicles, 14)
assert.equal(after.passenger_trips, 4)
assert.equal(after.messages, 11)
assert.equal(await count('live_locations'), 0)
assert.deepEqual(await db('/rest/v1/driver_duties?finished_at=is.null'), [])
assert.deepEqual(await db('/rest/v1/vehicles?status=neq.offline'), [])
const sessions = {}
for (const account of accounts) {
  const login = await api('/auth/login', {
    body: { email: account.email, password },
  })
  assert.equal(login.status, 200, `Login ${account.role}`)
  assert.ok(login.value.access_token && login.value.refresh_token)
  const token = login.value.access_token
  const me = await api('/me', { token })
  assert.equal(me.value.role, account.role)
  const refresh = await api('/auth/refresh', {
    body: { refresh_token: login.value.refresh_token },
  })
  assert.equal(refresh.status, 200)
  assert.ok(refresh.value.access_token)
  sessions[account.role] = refresh.value.access_token
}
const assignment = await api('/driver/assignment', {
  token: sessions.pengemudi,
})
assert.equal(assignment.value.status, 'disetujui')
assert.ok(assignment.value.vehicleId && assignment.value.routeId)
assert.ok(assignment.value.documents.every((d) => d.type && d.name))
const duty = await api('/driver/duty', { token: sessions.pengemudi })
assert.equal(duty.value.mode, 'offline')
const offline = await api('/driver/duty', {
  token: sessions.pengemudi,
  body: { mode: 'offline', session: 'verify-logout-session' },
})
assert.equal(
  offline.status,
  200,
  'Logout/offline must persist without an open duty',
)
const trips = await api('/passenger/trips', { token: sessions.penumpang })
assert.equal(trips.value.length, 4)
const reports = await api('/reports', { token: sessions.penumpang })
assert.equal(reports.value.length, 7)
const applicants = await api('/admin/drivers', { token: sessions.admin })
assert.ok(applicants.value.some((d) => d.verification_status === 'menunggu'))
assert.ok(applicants.value.some((d) => d.verification_status === 'ditolak'))
const file = applicants.value
  .flatMap((d) => d.documents)
  .find((d) => d.document_type === 'sim')
const signed = await api('/documents/url', {
  token: sessions.admin,
  body: { bucket: 'driver-documents', path: file.file_path },
})
assert.equal(signed.status, 200)
assert.ok(signed.value.url.startsWith('/supabase/storage/v1/'))
const fileResponse = await fetch(
  c.API_URL + signed.value.url.replace(/^\/supabase/, ''),
)
assert.equal(fileResponse.status, 200)
assert.ok((await fileResponse.text()).startsWith('%PDF'))
assert.equal(
  (
    await api('/documents/url', {
      token: sessions.penumpang,
      body: { bucket: 'driver-documents', path: file.file_path },
    })
  ).status,
  403,
)
assert.equal(
  (await api('/admin/drivers', { token: sessions.penumpang })).status,
  400,
)
const anonymous = await fetch(
  c.API_URL + `/storage/v1/object/driver-documents/${file.file_path}`,
  { headers: { apikey: c.ANON_KEY } },
)
assert.ok(anonymous.status >= 400)
for (const path of [
  '/rest/v1/profiles',
  '/rest/v1/driver_documents',
  '/rest/v1/rpc/reset_runtime_state',
]) {
  const r = await fetch(c.API_URL + path, {
    method: path.includes('/rpc/') ? 'POST' : 'GET',
    headers: {
      apikey: c.ANON_KEY,
      Authorization: `Bearer ${c.ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    ...(path.includes('/rpc/') ? { body: '{}' } : {}),
  })
  assert.ok(r.status >= 400, `Anon ditolak ${path}`)
}
const demo = await api('/demo/config')
assert.equal(demo.status, 200)
assert.equal(demo.value.accounts.length, 3)
assert.ok(!JSON.stringify(demo.value).includes(c.SERVICE_ROLE_KEY))
const pending = await db('/auth/v1/token?grant_type=password', {
  method: 'POST',
  key: c.ANON_KEY,
  body: { email: 'app-1@demo.angkot.local', password },
})
const pendingDuty = await api('/driver/duty', {
  token: pending.access_token,
  body: { mode: 'narik', session: 'pending-demo-session' },
})
assert.equal(pendingDuty.status, 400)
assert.match(pendingDuty.value.error, /belum disetujui/)
await assert.rejects(
  db('/auth/v1/token?grant_type=password', {
    method: 'POST',
    key: c.ANON_KEY,
    body: { email: accounts[0].email, password: 'wrong-password' },
  }),
)
await assert.rejects(
  db('/auth/v1/token?grant_type=password', {
    method: 'POST',
    key: c.ANON_KEY,
    body: { email: 'usr-5@demo.angkot.local', password },
  }),
)
const browserEnv = await import('node:fs/promises').then((fs) =>
  fs.readFile(root + 'apps/web/.env.local', 'utf8'),
)
assert.ok(!browserEnv.includes(c.SERVICE_ROLE_KEY))
assert.equal((await api('/vehicles')).value.length, 0)
console.log(
  'PASS: seed idempotent, 3 role login/refresh/me, assignment offline, trip/laporan, dokumen privat, anon/RBAC, tanpa service key browser.',
)
console.log(JSON.stringify(after))
