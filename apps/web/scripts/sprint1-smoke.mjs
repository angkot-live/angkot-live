// Real local Auth/API/Storage; no request interception or simulated GPS.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { readFile, mkdir } from 'node:fs/promises'
const settings = JSON.parse(
  await readFile(
    new URL('../../../.local/settings.json', import.meta.url),
    'utf8',
  ),
)
const origin =
  process.env.SMOKE_ORIGIN ?? `https://${settings.host}:${settings.webPort}`
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
})
// Trust is tested separately using curl --cacert. A real phone must install the local CA.
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1280, height: 900 },
})
const page = await context.newPage(),
  errors = [],
  forbidden = [],
  sockets = []
page.setDefaultTimeout(20000)
page.on('pageerror', (e) => errors.push(e.message))
page.on('response', (r) => {
  if (new URL(r.url()).pathname.startsWith('/api/') && r.status() >= 400)
    forbidden.push(`${r.status()} ${new URL(r.url()).pathname}`)
})
page.on('websocket', (ws) =>
  ws.on('framereceived', ({ payload }) => {
    try {
      const m = JSON.parse(String(payload))
      if (m.type === 'snapshot') sockets.push(m)
    } catch {}
  }),
)
async function logout() {
  await page.getByRole('button', { name: 'Keluar', exact: true }).click()
  await page.waitForURL('**/login')
}
try {
  await page.goto(origin + '/login')
  assert.equal(await page.evaluate(() => window.isSecureContext), true)
  const privatePath = new URL(
    '../../../.local/connection.json',
    import.meta.url,
  ).pathname
  const privateFile = await context.request.get(`${origin}/@fs${privatePath}`)
  assert.ok(
    privateFile.status() >= 400,
    'Vite must not expose local service credentials',
  )
  for (const [label, role] of [
    ['Penumpang', 'penumpang'],
    ['Pengemudi', 'pengemudi'],
    ['Admin', 'admin'],
  ]) {
    await page.getByRole('button', { name: label, exact: true }).click()
    await page.waitForURL(`**/${role}`)
    await page.reload()
    await page.waitForURL(`**/${role}`)
    await page.getByRole('button', { name: 'Keluar', exact: true }).waitFor()
    const me = await page.evaluate(async () => {
      const { supabase } = await import('/src/lib/supabase.ts')
      const { data } = await supabase.auth.getSession()
      return fetch('/api/me', {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      }).then((r) => r.json())
    })
    assert.equal(me.role, role)
    if (role === 'penumpang') {
      await page.goto(origin + '/penumpang/riwayat')
      await page
        .getByRole('heading', { name: 'Riwayat perjalanan', exact: true })
        .waitFor()
      await page
        .getByText('Stasiun Hall → Simpang Dago', { exact: true })
        .first()
        .waitFor()
      await page.goto(origin + '/penumpang/laporan')
      await page.getByText('Pengemudi ugal-ugalan', { exact: true }).waitFor()
    }
    if (role === 'pengemudi') {
      await page.goto(origin + '/pengemudi/profil')
      await page
        .getByRole('heading', { name: 'Profil dan kendaraan' })
        .waitFor()
      await page
        .getByRole('heading', { name: 'Kendaraan: D 1000 AB' })
        .waitFor()
      await page.getByText('SIM · CONTOH-sim.pdf', { exact: true }).waitFor()
    }
    if (role === 'admin') {
      await page.goto(origin + '/admin/pengemudi')
      await page.getByText('Pak Supriatna', { exact: true }).waitFor()
      const manifest = JSON.parse(
        await readFile(
          new URL('../../../.local/seed-manifest.json', import.meta.url),
          'utf8',
        ),
      )
      await page.goto(`${origin}/admin/pengemudi/${manifest.mappings['app-1']}`)
      await page
        .getByRole('heading', { name: 'Dokumen privat', exact: true })
        .waitFor()
      const signedResponse = page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === '/api/documents/url' &&
          r.status() === 200,
      )
      await page
        .getByRole('button', { name: 'Lihat dokumen', exact: true })
        .first()
        .click()
      const signed = await (await signedResponse).json()
      const actualFile = await context.request.get(
        new URL(signed.url, origin).href,
      )
      assert.equal(actualFile.status(), 200)
      assert.ok(
        (await actualFile.body()).subarray(0, 4).equals(Buffer.from('%PDF')),
      )
    }
    await logout()
  }
  assert.ok(sockets.length > 0, 'Real WSS snapshot required')
  assert.ok(
    sockets.every((m) => m.data.vehicles.length === 0),
    'Seed must not create live vehicles',
  )
  assert.deepEqual(errors, [])
  assert.deepEqual(forbidden, [])
  await mkdir(new URL('../../../.local/screenshots/', import.meta.url), {
    recursive: true,
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({
    path: new URL(
      '../../../.local/screenshots/quick-login.png',
      import.meta.url,
    ).pathname,
    fullPage: true,
  })
  console.log(
    `PASS browser HTTPS ${origin}: quick login 3 role, reload session, logout/account switch, profile/trips/reports, WSS; no fake GPS.`,
  )
} finally {
  await browser.close()
}
