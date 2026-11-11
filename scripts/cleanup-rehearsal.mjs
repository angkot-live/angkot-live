import { connection, client } from './demo-lib.mjs'
const db = client(await connection())
const { users } = await db('/auth/v1/admin/users?page=1&per_page=1000')
const fixtures = users.filter((u) =>
  /^s45-[a-f0-9]{8}-(pengemudi|penumpang)@demo\.angkot\.local$/.test(
    u.email ?? '',
  ),
)
for (const u of fixtures) {
  if (u.user_metadata?.role === 'pengemudi')
    await db('/rest/v1/rpc/end_tracking', {
      method: 'POST',
      body: {
        p_actor: u.id,
        p_session: null,
        p_distance: 0,
        p_reason: 'test_cleanup',
      },
    })
  for (const bucket of ['driver-documents', 'report-evidence']) {
    const files = await db(`/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      body: { prefix: u.id, limit: 1000 },
    })
    if (files.length)
      await db(`/storage/v1/object/${bucket}`, {
        method: 'DELETE',
        body: { prefixes: files.map((f) => `${u.id}/${f.name}`) },
      })
  }
  const reports = await db(`/rest/v1/reports?reporter_id=eq.${u.id}&select=id`)
  await db(`/rest/v1/messages?recipient_id=eq.${u.id}`, { method: 'DELETE' })
  for (const r of reports)
    await db(`/rest/v1/report_updates?report_id=eq.${r.id}`, {
      method: 'DELETE',
    })
  await db(`/rest/v1/reports?reporter_id=eq.${u.id}`, { method: 'DELETE' })
  for (const [table, column] of [
    ['passenger_trips', 'passenger_id'],
    ['passenger_requests', 'passenger_id'],
    ['vehicle_positions', 'driver_id'],
    ['driver_duties', 'driver_id'],
    ['flow_idempotency', 'actor_id'],
  ])
    await db(`/rest/v1/${table}?${column}=eq.${u.id}`, { method: 'DELETE' })
  await db(`/auth/v1/admin/users/${u.id}`, { method: 'DELETE' })
}
const routes = await db('/rest/v1/routes?code=eq.S45&select=id,name')
for (const r of routes.filter((r) => r.name.startsWith('CONTOH Rehearsal '))) {
  await db(`/rest/v1/vehicles?route_id=eq.${r.id}`, { method: 'DELETE' })
  await db(`/rest/v1/routes?id=eq.${r.id}`, { method: 'DELETE' })
}
console.log(
  `Cleanup namespace rehearsal: ${fixtures.length} akun sementara; akun demo utama tidak diubah`,
)
