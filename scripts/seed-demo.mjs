import { readFile } from 'node:fs/promises'
import {
  connection,
  client,
  jsonFile,
  uuid,
  accounts,
  password,
  savePrivate,
} from './demo-lib.mjs'

const c = await connection(),
  request = client(c)
const { data } = await jsonFile('supabase/fixtures/mock-data.json')
const { routes } = await jsonFile('apps/web/src/data/angkot-routes.json')
const manifest = {
  version: 1,
  mappings: {},
  notes: [
    'Seluruh lokasi, kecepatan, ETA, statistik hardcoded diabaikan; kendaraan offline dan tanpa duty.',
    'Kode mock 08 Stasiun Hall–Dago → 09; 02 Kalapa–Cicaheum → 01A. Identitas memakai arah dataset kanonis.',
    'app-4 Riung Bandung–Cicaheum direkonsiliasi ke 16 Riung Bandung–Dago; app-5 memakai 23 Cijerah–Sederhana, tidak diberi assignment.',
    'Plat laporan tidak ditemukan pada armada mock: disimpan sebagai plat manual, vehicle_id null.',
    'Trip dibatalkan disimpan sebagai request cancelled. Trip historis tidak diberi driver/kendaraan yang tidak diketahui.',
    'Pesan operasional contoh diberi label riwayat demo; klaim tip P2 dihapus. Waktu relatif menggunakan acuan 2026-11-11.',
    'NIK contoh dinormalisasi menjadi 16 digit sintetis; dokumen seluruhnya contoh, bukan identitas nyata.',
    'driverNames berulang bukan akun driver berbeda; hanya pengemudi demo mendapat assignment approved.',
  ],
}
async function upsert(table, rows, conflict = 'id') {
  if (!rows.length) return
  await request(`/rest/v1/${table}?on_conflict=${conflict}`, {
    method: 'POST',
    body: rows,
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
  })
}
const users = []
for (let page = 1; ; page++) {
  const result = await request(
    `/auth/v1/admin/users?page=${page}&per_page=1000`,
  )
  users.push(...result.users)
  if (result.users.length < 1000) break
}
async function user(
  key,
  name,
  role,
  email = `${key}@demo.angkot.local`,
  banned = false,
) {
  let u = users.find((x) => x.email === email)
  if (!u) {
    u = await request('/auth/v1/admin/users', {
      method: 'POST',
      body: {
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          role: role === 'admin' ? 'penumpang' : role,
          demo: true,
        },
      },
    })
    users.push(u)
  }
  if (u.user_metadata?.demo !== true)
    throw new Error(`Akun ${email} bukan namespace seed; tidak diubah.`)
  // Reset demo credentials deterministically; never overwrite a non-demo account.
  await request(`/auth/v1/admin/users/${u.id}`, {
    method: 'PUT',
    body: { password, ban_duration: banned ? '876000h' : 'none' },
  })
  await request(`/rest/v1/profiles?id=eq.${u.id}`, {
    method: 'PATCH',
    body: { role, name, phone: '081200000000' },
  })
  manifest.mappings[key] = u.id
  return u.id
}
const pax = await user(
  'usr-1',
  data.adminUsers[0].name,
  'penumpang',
  accounts[0].email,
)
const driver = await user(
  'usr-2',
  data.adminUsers[1].name,
  'pengemudi',
  accounts[1].email,
)
const admin = await user(
  'usr-3',
  data.adminUsers[2].name,
  'admin',
  accounts[2].email,
)
await user('usr-4', data.adminUsers[3].name, 'penumpang')
await user('usr-5', data.adminUsers[4].name, 'pengemudi', undefined, true)

await upsert(
  'routes',
  routes.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    origin: r.origin,
    destination: r.destination,
    color: r.color,
    streets: r.streets ?? [],
    street_runs: r.streetRuns ?? [],
    fare_standard: 5000,
    fare_student: 3000,
  })),
)
for (const r of routes) {
  await request('/rest/v1/rpc/sync_route_geometry', {
    method: 'POST',
    body: {
      p_route: r.id,
      p_segments: r.segments?.length ? r.segments : [r.polyline],
      p_stops: r.endstops ?? [],
    },
  })
}
await upsert(
  'vehicles',
  data.vehicles.map((v) => ({
    id: uuid(v.id),
    plate_number: v.plate,
    route_id: v.routeId,
    model: 'Suzuki Carry (contoh demo)',
    year: 2020,
    capacity: 12,
    status: 'offline',
    stnk_expiry: '2030-12-31',
    kir_expiry: '2030-12-31',
  })),
)
for (const v of data.vehicles) manifest.mappings[v.id] = uuid(v.id)
// Main demo assignment uses the actual route of the first mock vehicle.
const mainVehicle = data.vehicles[0],
  mainRoute = routes.find((r) => r.id === mainVehicle.routeId)

// A valid one-page PDF, intentionally labelled as a synthetic example.
function pdf(label) {
  const content = `BT /F1 18 Tf 40 760 Td (CONTOH DEMO - BUKAN DOKUMEN ASLI) Tj 0 -35 Td (${label.replace(/[^a-zA-Z0-9 -]/g, '')}) Tj ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ]
  let out = '%PDF-1.4\n',
    offsets = [0]
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(out))
    out += `${i + 1} 0 obj\n${obj}\nendobj\n`
  })
  const start = Buffer.byteLength(out)
  out += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((n) => String(n).padStart(10, '0') + ' 00000 n ')
    .join(
      '\n',
    )}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`
  return Buffer.from(out)
}
const png = await readFile(
  new URL('../supabase/fixtures/vehicle-demo.png', import.meta.url),
)
async function upload(bucket, path, body, mime) {
  await request(`/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    body,
    headers: { 'Content-Type': mime, 'x-upsert': 'true' },
  })
}
async function documents(id, key, form, missingKir = false) {
  const rows = []
  for (const type of ['sim', 'ktp', 'stnk', 'kir', 'foto_kendaraan']) {
    if (missingKir && type === 'kir') continue
    const photo = type === 'foto_kendaraan',
      body = photo ? png : pdf(`${key} ${type}`),
      path = `${id}/${uuid(`${key}:${type}:object`)}`
    await upload(
      'driver-documents',
      path,
      body,
      photo ? 'image/png' : 'application/pdf',
    )
    rows.push({
      id: uuid(`${key}:${type}`),
      driver_id: id,
      document_type: type,
      file_path: path,
      file_name: `CONTOH-${type}.${photo ? 'png' : 'pdf'}`,
      file_size: body.length,
      mime_type: photo ? 'image/png' : 'application/pdf',
      expires_at:
        type === 'sim'
          ? form.simExpiry
          : type === 'stnk'
            ? form.stnkExpiry
            : type === 'kir'
              ? form.kirExpiry
              : null,
      vehicle_id:
        key === 'approved' && ['stnk', 'kir', 'foto_kendaraan'].includes(type)
          ? uuid(mainVehicle.id)
          : null,
      superseded_at: null,
    })
  }
  await upsert('driver_documents', rows)
}
const mainForm = {
  name: data.adminUsers[1].name,
  address: 'Alamat contoh demo Bandung',
  nik: '0000000000000001',
  sim: 'DEMO-SIM-001',
  simExpiry: '2030-12-31',
  stnkExpiry: '2030-12-31',
  kirExpiry: '2030-12-31',
  plate: mainVehicle.plate,
  model: 'Suzuki Carry',
  year: '2020',
  capacity: '12',
  routeId: mainRoute.id,
}
await request(`/rest/v1/driver_profiles?id=eq.${driver}`, {
  method: 'PATCH',
  body: {
    onboarding: mainForm,
    nik: mainForm.nik,
    sim_number: mainForm.sim,
    address: mainForm.address,
    sim_expires_at: mainForm.simExpiry,
    vehicle_id: uuid(mainVehicle.id),
    route_id: mainRoute.id,
    verification_status: 'disetujui',
    verified_by: admin,
    verified_at: '2026-10-20T01:30:00Z',
    submitted_at: '2026-10-19T01:30:00Z',
    is_active_duty: false,
  },
})
await documents(driver, 'approved', mainForm)
const applicantRoutes = ['4292372', '4291047', '3415464', '4634057', '4645553']
for (const [index, a] of data.driverApplicants.entries()) {
  const id = await user(a.id, a.name, 'pengemudi')
  const form = {
    name: a.name,
    address: a.address,
    nik: String(index + 2).padStart(16, '0'),
    sim: a.sim,
    simExpiry: a.simValid ? '2030-12-31' : '2025-11-11',
    stnkExpiry: '2030-12-31',
    kirExpiry: '2030-12-31',
    plate: a.plate,
    model: a.model,
    year: a.year,
    capacity: '12',
    routeId: applicantRoutes[index],
  }
  await request(`/rest/v1/driver_profiles?id=eq.${id}`, {
    method: 'PATCH',
    body: {
      onboarding: form,
      nik: form.nik,
      sim_number: form.sim,
      address: form.address,
      sim_expires_at: form.simExpiry,
      verification_status: a.status,
      submitted_at: a.registeredAt,
      rejection_reason:
        a.status === 'ditolak' ? 'SIM kedaluwarsa (contoh demo)' : null,
      is_active_duty: false,
    },
  })
  await documents(id, a.id, form, !a.kirValid)
  manifest.mappings[`${a.id}:route`] = form.routeId
}
const tripRoutes = ['4292372', '4291047', '3415464', '4634057', '4292372']
for (const [i, t] of data.trips.entries()) {
  const id = uuid(t.id),
    route = routes.find((r) => r.id === tripRoutes[i])
  manifest.mappings[t.id] = id
  if (t.status === 'dibatalkan') {
    await upsert('passenger_requests', [
      {
        id,
        passenger_id: pax,
        route_id: route.id,
        location: `SRID=4326;POINT(${route.polyline[0][1]} ${route.polyline[0][0]})`,
        status: 'cancelled',
        is_active: false,
        mode: 'mencari',
        created_at: t.date,
        expires_at: t.date,
        destination: t.to,
      },
    ])
  } else
    await upsert('passenger_trips', [
      {
        id,
        passenger_id: pax,
        route_id: route.id,
        origin_name: t.from,
        destination_name: t.to,
        started_at: t.date,
        finished_at: new Date(
          new Date(t.date).getTime() + t.durationMinutes * 60000,
        ).toISOString(),
        status: 'completed',
        distance_km: t.distanceKm,
        fare: t.fare,
      },
    ])
}
const evidencePath = `${pax}/${uuid('report-evidence')}`
await upload(
  'report-evidence',
  evidencePath,
  pdf('BUKTI LAPORAN CONTOH'),
  'application/pdf',
)
await upsert(
  'reports',
  data.reports.map((r, i) => ({
    id: uuid(r.id),
    code: r.code,
    reporter_id: pax,
    plate_number: r.plate,
    vehicle_id: null,
    category: r.category,
    subject: r.subject,
    description: r.description,
    status: r.status,
    created_at: r.createdAt,
    evidence_urls: i === 0 ? [evidencePath] : [],
  })),
)
await upsert(
  'report_updates',
  data.reports
    .filter((r) => r.response)
    .map((r) => ({
      id: uuid(`${r.id}:response`),
      report_id: uuid(r.id),
      admin_id: admin,
      status: r.status,
      notes: r.response,
      created_at: r.createdAt,
    })),
)
function timestamp(time) {
  const match = time.match(/(\d{2})[.:](\d{2})/),
    hh = match?.[1] ?? '09',
    mm = match?.[2] ?? '00'
  const day = time.startsWith('Hari ini')
    ? '11'
    : time.startsWith('Kemarin')
      ? '10'
      : (time.match(/^(\d+)/)?.[1] ?? '01')
  return `2026-${time.includes('Okt') ? '10' : '11'}-${day.padStart(2, '0')}T${hh}:${mm}:00+07:00`
}
await upsert('messages', [
  ...data.notifications.map((m) => ({
    id: uuid(m.id),
    sender_id: admin,
    recipient_id: pax,
    title: `[Riwayat demo] ${m.title}`,
    content: m.body,
    is_read: !m.unread,
    kind: m.kind === 'promo' ? 'system' : m.kind,
    created_at: timestamp(m.time),
  })),
  ...data.driverMessages.map((m) => ({
    id: uuid(m.id),
    sender_id: admin,
    recipient_id: driver,
    title: `[Riwayat demo] ${m.title}`,
    content: m.body.replace(/Pendapatan tip hari ini Rp 18\.000\. /, ''),
    is_read: !m.unread,
    kind: m.kind,
    created_at: timestamp(m.time),
  })),
])
manifest.counts = {
  routes: routes.length,
  routeCodes: new Set(routes.map((r) => r.code)).size,
  vehicles: data.vehicles.length,
  users: 10,
  applicants: data.driverApplicants.length,
  trips: 4,
  cancelledRequests: 1,
  reports: data.reports.length,
  messages: data.notifications.length + data.driverMessages.length,
}
await savePrivate('.local/seed-manifest.json', manifest)
console.log('Seed lokal selesai:', JSON.stringify(manifest.counts))
console.log(
  'Mapping dan rekonsiliasi: .local/seed-manifest.json. Password tiga akun demo: AngkotDemo123!',
)
