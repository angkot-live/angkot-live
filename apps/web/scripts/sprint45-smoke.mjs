import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { chromium } from 'playwright'
import {
  connection,
  client,
  password,
  jsonFile,
  savePrivate,
} from '../../../scripts/demo-lib.mjs'
const c = await connection(),
  db = client(c),
  settings = await jsonFile('.local/settings.json')
const origin =
    process.env.SMOKE_ORIGIN ?? `https://${settings.host}:${settings.webPort}`,
  base = process.env.DEMO_API_URL ?? 'http://127.0.0.1:8080/api'
const runs = Number(process.env.DEMO_REHEARSAL_RUNS ?? 3),
  withNgetem = process.env.DEMO_NGETEM !== 'false'
const png = await readFile(
  new URL('../../../supabase/fixtures/vehicle-demo.png', import.meta.url),
)
const adminAuth = await db('/auth/v1/token?grant_type=password', {
  method: 'POST',
  key: c.ANON_KEY,
  body: { email: 'admin@demo.angkot.local', password },
})
async function api(
  path,
  { token = adminAuth.access_token, body, method = body ? 'POST' : 'GET' } = {},
) {
  const r = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  })
  const text = await r.text()
  let value
  try {
    value = JSON.parse(text)
  } catch {
    value = { error: text }
  }
  return { status: r.status, value }
}
async function until(read, predicate, label, timeout = 20000) {
  const begin = Date.now()
  while (Date.now() - begin < timeout) {
    try {
      const value = await read()
      if (predicate(value)) return value
    } catch (e) {
      if (!/Execution context|navigation/.test(String(e))) throw e
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`Timeout: ${label}`)
}
const state = (page) =>
  page.evaluate(async () => {
    const url =
      performance
        .getEntriesByType('resource')
        .map((e) => e.name)
        .filter((u) => u.includes('/src/features/tracking/live-store.ts'))
        .at(-1) ?? '/src/features/tracking/live-store.ts'
    return (await import(url)).useLiveStore.getState()
  })
async function login(page, email) {
  await page.goto(origin + '/login')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await page.waitForURL((url) => !url.pathname.endsWith('/login'))
}
const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox'],
  }),
  results = []
try {
  for (let iteration = 1; iteration <= runs; iteration++) {
    const tag = crypto.randomUUID().slice(0, 8),
      created = [],
      contexts = [],
      adminKeys = [],
        roles = {},
      errors = []
    let route,
      vehicleId,
      gpsTimer,
      point = [-6.9015, 107.6002]
    const begin = Date.now()
    try {
      for (const role of ['pengemudi', 'penumpang']) {
        const email = `s45-${tag}-${role}@demo.angkot.local`
        const user = await db('/auth/v1/admin/users', {
          method: 'POST',
          body: {
            email,
            password,
            email_confirm: true,
            user_metadata: { name: `CONTOH S45 ${role} ${tag}`, role },
          },
        })
        created.push(user.id)
        roles[role] = { id: user.id, email }
        roles[role].auth = await db('/auth/v1/token?grant_type=password', {
          method: 'POST',
          key: c.ANON_KEY,
          body: { email, password },
        })
      }
      const made = await api('/admin/routes', {
        body: {
          code: 'S45',
          name: `CONTOH Rehearsal ${tag}`,
          origin: 'Titik uji A',
          destination: 'Titik uji B',
          color: '#125738',
          isActive: true,
          fareStandard: 4500,
          fareStudent: 3000,
          segments: [
            [
              [-6.9, 107.6],
              [-6.9, 107.61],
            ],
          ],
          endstops: [
            { name: 'Titik uji A', position: [-6.9, 107.6] },
            { name: 'Titik uji B', position: [-6.9, 107.61] },
          ],
        },
      })
      assert.equal(made.status, 200, JSON.stringify(made))
      route = made.value
      for (const role of ['pengemudi', 'penumpang', 'admin']) {
        const context = await browser.newContext({
          ignoreHTTPSErrors: true,
          viewport: { width: 1365, height: 1000 },
          ...(role === 'penumpang'
            ? {
                permissions: ['geolocation'],
                geolocation: {
                  latitude: point[0],
                  longitude: point[1],
                  accuracy: 10,
                },
              }
            : {}),
        })
        contexts.push(context)
        roles[role] ??= { id: adminAuth.user.id }
        roles[role].context = context
        roles[role].page = await context.newPage()
        roles[role].page.setDefaultTimeout(25000)
        roles[role].page.on('pageerror', (e) => errors.push(e.message))
      }
      const d = roles.pengemudi.page,
        p = roles.penumpang.page,
        a = roles.admin.page
      a.on('request', (r) => {
        if (
          ['/api/admin/drivers/verify', '/api/admin/reports'].includes(
            new URL(r.url()).pathname,
          )
        ) {
          try {
            const key = r.postDataJSON()?.key
            if (key) adminKeys.push(key)
          } catch {}
        }
      })
      gpsTimer = setInterval(() => {
        void roles.penumpang.context
          .setGeolocation({
            latitude: point[0],
            longitude: point[1],
            accuracy: 10,
          })
          .catch(() => {})
      }, 3000)
      await login(d, roles.pengemudi.email)
      await d.goto(origin + '/pengemudi/daftar')
      const plate = `D ${String(Date.now()).slice(-4)} ${tag.slice(0, 2).toUpperCase()}`
      const values = {
        'Nama lengkap': `CONTOH Driver ${tag}`,
        'Nomor telepon': '081234567890',
        'NIK (16 digit)': `3273${String(Date.now()).slice(-10)}${String(iteration).padStart(2, '0')}`,
        'Nomor SIM': `SIM-${tag}`,
        'SIM berlaku sampai': '2030-12-31',
        Alamat: 'Alamat contoh pengujian',
        'Plat kendaraan': plate,
        'Model kendaraan': 'Carry',
        'Tahun kendaraan': '2020',
        Kapasitas: '12',
        'STNK berlaku sampai': '2030-12-31',
        'KIR berlaku sampai': '2030-12-31',
      }
      for (const [label, value] of Object.entries(values))
        await d.getByLabel(label, { exact: true }).fill(value)
      await d
        .getByLabel('Jurusan dan arah tugas', { exact: true })
        .selectOption(route.id)
      await d.getByRole('button', { name: 'Simpan draft', exact: true }).click()
      await d.getByText('Draft disimpan.', { exact: true }).waitFor()
      assert.equal(
        (
          await api('/driver/submissions', {
            token: roles.pengemudi.auth.access_token,
            body: {},
          })
        ).status,
        400,
        'Missing documents accepted',
      )
      async function upload(label, name) {
        const pending = d.waitForResponse(
          (r) =>
            new URL(r.url()).pathname === '/api/uploads' &&
            r.request().method() === 'POST',
        )
        pending.catch(() => {})
        await d
          .getByLabel(label, { exact: true })
          .setInputFiles({ name, mimeType: 'image/png', buffer: png })
        const response = await pending
        assert.equal(response.status(), 200, await response.text())
        await d.getByText(name, { exact: false }).first().waitFor()
      }
      for (const label of ['SIM', 'STNK', 'KIR', 'Foto kondisi kendaraan'])
        await upload(label, `CONTOH-${label.replaceAll(' ', '-')}-${tag}.png`)
      await d
        .getByRole('button', { name: 'Kirim verifikasi', exact: true })
        .click()
      await d
        .getByRole('heading', { name: 'Status verifikasi', exact: true })
        .waitFor()
      await a.goto(origin + '/login')
      await a.getByRole('button', { name: 'Admin', exact: true }).click()
      await a.waitForURL('**/admin')
      await a.goto(`${origin}/admin/pengemudi/${roles.pengemudi.id}`)
      await a
        .getByRole('heading', { name: 'Dokumen privat', exact: true })
        .waitFor()
      // A real signed URL is fetched and its bytes are readable; anon public URL is not.
      const signedResponse = a.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === '/api/documents/url' &&
          r.status() === 200,
      )
      await a
        .getByRole('button', { name: 'Lihat dokumen', exact: true })
        .first()
        .click()
      const signed = await (await signedResponse).json(),
        file = await roles.admin.context.request.get(
          new URL(signed.url, origin).href,
        )
      assert.equal(file.status(), 200)
      assert.deepEqual((await file.body()).subarray(0, 8), png.subarray(0, 8))
      if (iteration === 1) {
        await a
          .getByLabel('Alasan penolakan', { exact: true })
          .fill('CONTOH: revisi SIM agar lebih terbaca')
        await a
          .getByRole('button', {
            name: 'Tolak dan minta perbaikan',
            exact: true,
          })
          .click()
        await d.getByText('Perbaikan diperlukan', { exact: true }).waitFor()
        await d
          .getByRole('link', {
            name: 'Lengkapi atau perbaiki berkas',
            exact: true,
          })
          .click()
        await upload('SIM', `CONTOH-SIM-revisi-${tag}.png`)
        await d
          .getByRole('button', { name: 'Kirim verifikasi', exact: true })
          .click()
        await a.goto(`${origin}/admin/pengemudi/${roles.pengemudi.id}`)
        await a
          .getByText(`CONTOH-SIM-revisi-${tag}.png`, { exact: false })
          .waitFor()
        const revisions = await db(
          `/rest/v1/driver_documents?driver_id=eq.${roles.pengemudi.id}&document_type=eq.sim&select=id,superseded_at`,
        )
        assert.equal(revisions.length, 2)
        assert.equal(
          revisions.filter((r) => r.superseded_at === null).length,
          1,
        )
      }
      await a
        .getByRole('button', { name: 'Setujui pengemudi', exact: true })
        .click()
      await d
        .getByRole('link', { name: 'Mulai bertugas', exact: true })
        .waitFor()
      await d.getByRole('link', { name: 'Mulai bertugas', exact: true }).click()
      await d
        .getByLabel('Sumber posisi pengemudi', { exact: true })
        .selectOption('simulation')
      await d.getByLabel('Kecepatan simulasi', { exact: true }).fill('0')
      await d.getByRole('button', { name: 'Narik', exact: true }).click()
      await d.getByText('Simulasi aktif', { exact: false }).first().waitFor()
      const liveDuty = await until(
        () => state(d),
        (s) =>
          s.duty?.vehicle?.telemetrySource === 'simulation' &&
          !!s.duty.vehicle.lastSeenAt,
        'driver fix',
      )
      vehicleId = liveDuty.duty.vehicle.id
      console.log(
        `Rehearsal ${iteration}: onboarding${iteration === 1 ? ' / reject / revisi' : ''} / approve / narik lulus`,
      )
      await login(p, roles.penumpang.email)
      await p
        .getByLabel('Arah jurusan megat', { exact: true })
        .selectOption(route.id)
      await p.getByRole('button', { name: 'Megat Angkot', exact: true }).click()
      let walking = await until(
        () => state(p),
        (s) => s.request?.status === 'walking',
        'walking request',
      )
      assert.ok(walking.request.id)
      if (iteration === 1) {
        await p.getByRole('button', { name: 'Batalkan', exact: true }).click()
        await until(
          () => state(p),
          (s) => s.request?.status === 'cancelled',
          'cancel walking',
        )
        await p
          .getByRole('button', { name: 'Megat Angkot', exact: true })
          .click()
        walking = await until(
          () => state(p),
          (s) => s.request?.status === 'walking',
          'new walking request',
        )
      }
      const noNearby = await state(d)
      assert.equal(
        noNearby.nearby.some((r) => r.id === walking.request.id),
        false,
      )
      point = [-6.9, 107.6002]
      await roles.penumpang.context.setGeolocation({
        latitude: point[0],
        longitude: point[1],
        accuracy: 10,
      })
      let searching = await until(
        () => state(p),
        (s) => s.request?.status === 'searching',
        'GPS auto-arrival',
      )
      await until(
        () => state(d),
        (s) => s.nearby.some((r) => r.id === searching.request.id),
        'driver sees waiting passenger',
      )
      if (iteration === 1) {
        // Expire only this disposable request to exercise server expiry without waiting a minute.
        await db(`/rest/v1/passenger_requests?id=eq.${searching.request.id}`, {
          method: 'PATCH',
          body: { expires_at: new Date(Date.now() - 1000).toISOString() },
        })
        await until(
          () => state(p),
          (s) => s.request?.status === 'expired',
          'expired request',
        )
        await until(
          () => state(d),
          (s) => !s.nearby.some((r) => r.id === searching.request.id),
          'expiry removes marker',
        )
        await p
          .getByRole('button', { name: 'Megat Angkot', exact: true })
          .click()
        searching = await until(
          () => state(p),
          (s) => s.request?.status === 'searching',
          'request after expiry',
        )
        await until(
          () => state(d),
          (s) => s.nearby.some((r) => r.id === searching.request.id),
          'fresh nearby after expiry',
        )
      }
      if (iteration !== 3) {
        await d
          .getByRole('button', { name: 'Saya melihat penumpang', exact: true })
          .click()
        await until(
          () => state(p),
          (s) => s.request?.status === 'accepted',
          'driver response',
        )
      }
      const boardResults = await Promise.all([
        api('/passenger/trips', {
          token: roles.penumpang.auth.access_token,
          body: { id: searching.request.id, vehicleId, key: `board-${tag}` },
        }),
        api('/passenger/trips', {
          token: roles.penumpang.auth.access_token,
          body: { id: searching.request.id, vehicleId, key: `board-${tag}` },
        }),
      ])
      assert.equal(boardResults[0].status, 200, JSON.stringify(boardResults))
      assert.equal(boardResults[1].status, 200)
      assert.equal(boardResults[0].value.id, boardResults[1].value.id)
      const trip = boardResults[0].value
      assert.equal(trip.telemetry_source, 'simulation')
      assert.equal(trip.fare, 4500)
      await p.goto(origin + '/penumpang/perjalanan')
      await p
        .getByRole('heading', { name: 'Perjalanan aktif', exact: true })
        .waitFor()
      await p.reload()
      await p
        .getByRole('heading', { name: 'Perjalanan aktif', exact: true })
        .waitFor()
      await until(
        () => state(d),
        (s) => !s.nearby.some((r) => r.id === searching.request.id),
        'boarding removes waiting marker',
      )
      await p
        .getByRole('button', {
          name: 'Saya sudah turun — selesai',
          exact: true,
        })
        .click()
      await p
        .getByRole('heading', { name: 'Perjalanan selesai', exact: true })
        .waitFor()
      await p.getByRole('link', { name: 'Lihat riwayat', exact: true }).click()
      await p
        .getByText('Perjalanan simulasi pengujian', { exact: true })
        .waitFor()
      console.log(
        `Rehearsal ${iteration}: megat / boarding ganda / reload / selesai / riwayat lulus`,
      )
      await p.goto(origin + `/penumpang/lapor?vehicle=${vehicleId}`)
      await p
        .getByLabel('Judul singkat (opsional)', { exact: false })
        .fill(`CONTOH S45 ${tag}`)
      await p
        .getByLabel('Kronologi kejadian', { exact: true })
        .fill(
          'CONTOH PENGUJIAN: kendaraan berhenti terlalu lama di jalur jalan.',
        )
      const uploaded = p.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === '/api/uploads' && r.status() === 200,
      )
      await p
        .locator('#report-evidence')
        .setInputFiles({
          name: `CONTOH-bukti-${tag}.png`,
          mimeType: 'image/png',
          buffer: png,
        })
      await uploaded
      const reportResponse = p.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === '/api/reports' &&
          r.request().method() === 'POST' &&
          r.status() === 200,
      )
      await p
        .getByRole('button', { name: 'Kirim laporan', exact: true })
        .click()
      const report = await (await reportResponse).json()
      assert.equal(report.plate_number, plate)
      await p.goto(`${origin}/penumpang/laporan/${report.id}`)
      await a.goto(`${origin}/admin/laporan/${report.id}`)
      await a
        .getByRole('heading', { name: `CONTOH S45 ${tag}`, exact: true })
        .waitFor()
      await a
        .getByLabel('Status laporan', { exact: true })
        .selectOption('diproses')
      await a
        .getByLabel('Tanggapan', { exact: true })
        .fill(`CONTOH ${tag}: laporan sedang diperiksa`)
      await a
        .getByRole('button', { name: 'Simpan tindak lanjut', exact: true })
        .click()
      await p
        .getByText(`CONTOH ${tag}: laporan sedang diperiksa`, { exact: true })
        .first()
        .waitFor()
      await p.goto(origin + '/penumpang/notifikasi')
      await p
        .getByText(`CONTOH ${tag}: laporan sedang diperiksa`, { exact: true })
        .waitFor()
      await p
        .getByRole('button', { name: 'Tandai semua dibaca', exact: true })
        .click()
      await until(
        () =>
          db(
            `/rest/v1/messages?recipient_id=eq.${roles.penumpang.id}&is_read=eq.false&select=id`,
          ),
        (x) => x.length === 0,
        'read state persisted',
      )
      await p.goto(origin + '/penumpang/profil')
      await p.getByRole('checkbox', { name: /Status laporan/ }).uncheck()
      await p
        .getByRole('button', { name: 'Simpan preferensi', exact: true })
        .click()
      await p
        .getByText('Preferensi notifikasi tersimpan.', { exact: true })
        .waitFor()
      await p.reload()
      await p.getByRole('checkbox', { name: /Status laporan/ }).waitFor()
      assert.equal(
        await p.getByRole('checkbox', { name: /Status laporan/ }).isChecked(),
        false,
      )
      await a
        .getByLabel('Status laporan', { exact: true })
        .selectOption('selesai')
      await a
        .getByLabel('Tanggapan', { exact: true })
        .fill(`CONTOH ${tag}: laporan selesai ditindaklanjuti`)
      await a
        .getByRole('button', { name: 'Simpan tindak lanjut', exact: true })
        .click()
      await until(
        () => db(`/rest/v1/reports?id=eq.${report.id}&select=status`),
        (x) => x[0]?.status === 'selesai',
        'report completed',
      )
      assert.equal(
        (
          await db(
            `/rest/v1/messages?recipient_id=eq.${roles.penumpang.id}&kind=eq.report&select=id`,
          )
        ).length,
        1,
        'Opt-out ignored',
      )
      await p.goto(`${origin}/penumpang/laporan/${report.id}`)
      await p
        .getByText(`CONTOH ${tag}: laporan selesai ditindaklanjuti`, {
          exact: true,
        })
        .first()
        .waitFor()
      const foreign = (
        await api('/reports', { token: roles.pengemudi.auth.access_token })
      ).value
      assert.ok(
        !Array.isArray(foreign) || !foreign.some((r) => r.id === report.id),
        'Report leaked to driver',
      )
      assert.equal(
        (
          await api('/documents/url', {
            token: roles.pengemudi.auth.access_token,
            body: { bucket: 'report-evidence', path: report.evidence_urls[0] },
          })
        ).status,
        403,
      )
      console.log(
        `Rehearsal ${iteration}: walking / searching / respons / boarding ganda / reload / selesai / laporan+bukti / timeline / notifikasi+preferensi lulus`,
      )
      if (iteration === 1 && withNgetem) {
        console.log(
          'Menunggu prompt ngetem 90 detik dan deadline 15 detik pada API nyata…',
        )
        await d
          .getByRole('heading', {
            name: 'Apakah Anda sedang ngetem?',
            exact: true,
          })
          .waitFor({ timeout: 110000 })
        await until(
          () => state(d),
          (s) => s.duty.mode === 'ngetem',
          'automatic ngetem after no answer',
          20000,
        )
        assert.equal(
          (
            await db(
              `/rest/v1/driver_duties?driver_id=eq.${roles.pengemudi.id}&finished_at=is.null&select=mode`,
            )
          )[0]?.mode,
          'ngetem',
        )
        console.log(
          'PASS ngetem: prompt 90 detik, deadline 15 detik, status runtime dan DB konsisten',
        )
      }
      const summary = await api('/driver/dashboard', {
        token: roles.pengemudi.auth.access_token,
      })
      assert.equal(summary.status, 200)
      assert.equal(
        summary.value.duties,
        0,
        'Simulated shifts entered operational summary',
      )
      await d.getByRole('button', { name: 'Offline', exact: true }).click()
      await until(
        () => state(p),
        (s) => !s.vehicles.some((v) => v.id === vehicleId),
        'offline cleanup',
      )
      assert.deepEqual(errors, [])
      results.push({
        iteration,
        passed: true,
        durationMs: Date.now() - begin,
        ngetem:
          iteration === 1 && withNgetem ? 'real 90s+15s' : 'covered separately',
        tripFare: trip.fare,
        telemetry: 'simulation; browser passenger GPS controlled fixture',
        pageErrors: errors,
      })
      await p.screenshot({
        path: new URL(
          `../../../.local/screenshots/sprint45-rehearsal-${iteration}.png`,
          import.meta.url,
        ).pathname,
        fullPage: true,
      })
    } finally {
      clearInterval(gpsTimer)
      for (const context of contexts) await context.close()
      const driverId = roles.pengemudi?.id,
        paxId = roles.penumpang?.id
      if (driverId)
        await db('/rest/v1/rpc/end_tracking', {
          method: 'POST',
          body: {
            p_actor: driverId,
            p_session: null,
            p_distance: 0,
            p_reason: 'test_cleanup',
          },
        })
      for (const userId of created)
        for (const bucket of ['driver-documents', 'report-evidence']) {
          const files = await db(`/storage/v1/object/list/${bucket}`, {
            method: 'POST',
            body: { prefix: userId, limit: 1000 },
          })
          if (files.length)
            await db(`/storage/v1/object/${bucket}`, {
              method: 'DELETE',
              body: { prefixes: files.map((f) => `${userId}/${f.name}`) },
            })
        }
      if (paxId) {
        await db(`/rest/v1/messages?recipient_id=eq.${paxId}`, {
          method: 'DELETE',
        })
        const reports = await db(
          `/rest/v1/reports?reporter_id=eq.${paxId}&select=id`,
        )
        for (const rep of reports)
          await db(`/rest/v1/report_updates?report_id=eq.${rep.id}`, {
            method: 'DELETE',
          })
        await db(`/rest/v1/reports?reporter_id=eq.${paxId}`, {
          method: 'DELETE',
        })
        await db(`/rest/v1/passenger_trips?passenger_id=eq.${paxId}`, {
          method: 'DELETE',
        })
        await db(`/rest/v1/passenger_requests?passenger_id=eq.${paxId}`, {
          method: 'DELETE',
        })
      }
      if (driverId) {
        if (!vehicleId)
          vehicleId = (
            await db(
              `/rest/v1/driver_profiles?id=eq.${driverId}&select=vehicle_id`,
            )
          )[0]?.vehicle_id
        await db(`/rest/v1/messages?recipient_id=eq.${driverId}`, {
          method: 'DELETE',
        })
        await db(`/rest/v1/vehicle_positions?driver_id=eq.${driverId}`, {
          method: 'DELETE',
        })
        await db(`/rest/v1/driver_duties?driver_id=eq.${driverId}`, {
          method: 'DELETE',
        })
      }
      for (const userId of created) {
        await db(`/rest/v1/flow_idempotency?actor_id=eq.${userId}`, {
          method: 'DELETE',
        })
        await db(`/auth/v1/admin/users/${userId}`, { method: 'DELETE' })
      }
      if (adminKeys.length)
        await db(
          `/rest/v1/flow_idempotency?actor_id=eq.${adminAuth.user.id}&key=in.(${adminKeys.join(',')})`,
          { method: 'DELETE' },
        )
      if (vehicleId)
        await db(`/rest/v1/vehicles?id=eq.${vehicleId}`, { method: 'DELETE' })
      if (route) {
        const latest = await api(`/admin/routes/${route.id}`)
        const removed = await api(`/admin/routes/${route.id}`, {
          method: 'DELETE',
          body: { updatedAt: latest.value.updatedAt },
        })
        assert.equal(removed.status, 200, JSON.stringify(removed))
      }
    }
  }
  await savePrivate('.local/sprint45-rehearsal.json', {
    passed: results.length === runs,
    runs: results,
    physicalDevices:
      'pending; two Android available; this suite uses real local services and controlled browser GPS',
  })
  console.log(
    `PASS Sprint 4–5: ${results.length} rehearsal lengkap berurutan; fixture dibersihkan; Supabase Auth/API/Storage/WS nyata`,
  )
} finally {
  await browser.close()
}
