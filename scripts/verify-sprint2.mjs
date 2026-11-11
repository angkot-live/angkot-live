import assert from 'node:assert/strict'
import { connection, client, accounts, password } from './demo-lib.mjs'
const c = await connection(),
  db = client(c),
  base = process.env.DEMO_API_URL ?? 'http://127.0.0.1:8080/api'
const sessions = {}
for (const a of accounts) {
  const x = await db('/auth/v1/token?grant_type=password', {
    method: 'POST',
    key: c.ANON_KEY,
    body: { email: a.email, password },
  })
  sessions[a.role] = x.access_token
}
async function api(
  path,
  body,
  token = sessions.admin,
  method = body ? 'POST' : 'GET',
) {
  const r = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  let value
  const text = await r.text()
  try {
    value = JSON.parse(text)
  } catch {
    value = text
  }
  return { status: r.status, value }
}
const original = (await api('/routes')).value
assert.equal(original.length, 82)
assert.equal(new Set(original.map((r) => r.code)).size, 37)
assert.equal(
  (await api('/admin/dashboard', undefined, sessions.penumpang)).status,
  403,
)
assert.equal((await api('/admin/routes', {}, sessions.penumpang)).status, 403)
let current
try {
  const draft = {
    code: original[0].code,
    name: 'Trayek integrasi Sprint 2',
    origin: 'Titik uji A',
    destination: 'Titik uji B',
    color: '#125738',
    isActive: true,
    fareStandard: 5000,
    fareStudent: 3000,
    segments: [
      [
        [-6.9, 107.6],
        [-6.9, 107.62],
      ],
      [
        [-6.85, 107.7],
        [-6.85, 107.72],
      ],
    ],
    endstops: [
      {
        id: crypto.randomUUID(),
        name: 'Halte uji A',
        position: [-6.9, 107.6],
        isTerminal: true,
      },
      {
        id: crypto.randomUUID(),
        name: 'Halte uji B',
        position: [-6.9, 107.62],
        isTerminal: true,
      },
    ],
  }
  const created = await api('/admin/routes', draft)
  assert.equal(created.status, 200, JSON.stringify(created.value))
  current = created.value
  assert.equal(current.segments.length, 2)
  assert.ok(current.lengthKm > 4 && current.lengthKm < 5)
  assert.ok((await api('/routes')).value.some((r) => r.id === current.id))
  assert.ok(
    (await api('/search/route?from=-6.9,107.6&to=-6.9,107.62')).value.some(
      (p) => p.route.id === current.id,
    ),
  )
  const previous = current
  const saved = await api(
    `/admin/routes/${current.id}`,
    {
      ...current,
      name: 'Trayek tersimpan lintas browser',
      endstops: [
        current.endstops[1],
        { ...current.endstops[0], name: 'Halte diubah' },
      ],
    },
    sessions.admin,
    'PATCH',
  )
  assert.equal(saved.status, 200, JSON.stringify(saved.value))
  current = saved.value
  assert.equal(current.endstops[0].id, previous.endstops[1].id)
  assert.equal((await api(`/routes/${current.id}`)).value.name, current.name)
  const stale = await api(
    `/admin/routes/${current.id}`,
    { ...previous, name: 'Overwrite versi lama' },
    sessions.admin,
    'PATCH',
  )
  assert.equal(stale.status, 409)
  const invalid = await api(
    `/admin/routes/${current.id}`,
    {
      ...current,
      segments: [
        [
          [95, 107],
          [96, 108],
        ],
      ],
    },
    sessions.admin,
    'PATCH',
  )
  assert.equal(invalid.status, 400)
  assert.equal(
    (await api(`/routes/${current.id}`)).value.updatedAt,
    current.updatedAt,
  )
  const off = await api(
    `/admin/routes/${current.id}`,
    { ...current, isActive: false },
    sessions.admin,
    'PATCH',
  )
  assert.equal(off.status, 200)
  current = off.value
  assert.ok(!(await api('/routes')).value.some((r) => r.id === current.id))
  assert.ok(
    !(await api('/search/route?from=-6.9,107.6&to=-6.9,107.62')).value.some(
      (p) => p.route.id === current.id,
    ),
  )
  const baseline = original.find((r) => r.registeredVehicles > 0)
  const protectedDelete = await api(
    `/admin/routes/${baseline.id}`,
    { updatedAt: baseline.updatedAt },
    sessions.admin,
    'DELETE',
  )
  assert.equal(protectedDelete.status, 409)
  assert.ok((await api(`/routes/${baseline.id}`)).value.id)
  const stats = (await api('/stats/public')).value,
    admin = (await api('/admin/dashboard')).value
  assert.equal(stats.totalVehicles, 14)
  assert.equal(stats.activeVehicles, 0)
  assert.equal(stats.routeCodes, 37)
  assert.equal(admin.pendingDrivers, 4)
  assert.equal(admin.reports, 7)
  assert.equal(admin.queue.length, 4)
  assert.equal(
    stats.reports,
    stats.received + stats.processing + stats.resolved,
  )
  const anon = await fetch(c.API_URL + '/rest/v1/rpc/admin_route_command', {
    method: 'POST',
    headers: {
      apikey: c.ANON_KEY,
      Authorization: `Bearer ${c.ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_actor: crypto.randomUUID(),
      p_action: 'delete',
      p_id: current.id,
    }),
  })
  assert.ok(anon.status >= 400)
  console.log(
    'PASS Sprint 2 API: kanonis DB, CRUD atomik, stop ID/reorder, konflik versi, geometri multi-chain, active/search, FK history, RBAC dan agregat nyata.',
  )
} finally {
  if (current) {
    const latest = (await api(`/routes/${current.id}`)).value
    const removed = await api(
      `/admin/routes/${current.id}`,
      { updatedAt: latest.updatedAt },
      sessions.admin,
      'DELETE',
    )
    assert.equal(removed.status, 200, JSON.stringify(removed.value))
  }
}
assert.equal((await api('/routes')).value.length, original.length)
