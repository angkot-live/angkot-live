import { demoSettings, demoOrigin } from '../../../scripts/demo-settings.mjs'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'
const settings = await demoSettings()
const origin = process.env.SMOKE_ORIGIN ?? demoOrigin(settings)
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
})
const adminContext = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1365, height: 1000 },
})
const publicContext = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1280, height: 900 },
})
const driverContext = await browser.newContext({ ignoreHTTPSErrors: true })
const admin = await adminContext.newPage(),
  visitor = await publicContext.newPage(),
  driver = await driverContext.newPage(),
  errors = [], httpErrors = []
for (const page of [admin, visitor, driver]) {
  page.setDefaultTimeout(25000)
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('response',r=>{if(new URL(r.url()).pathname.startsWith('/api/')&&r.status()>=400)httpErrors.push({status:r.status(),path:new URL(r.url()).pathname})})
}
let routeId
async function mutate(method) {
  const pending = admin.waitForResponse(
    (r) =>
      new URL(r.url()).pathname.startsWith('/api/admin/routes') &&
      r.request().method() === method,
  )
  await admin
    .getByRole('button', { name: 'Simpan perubahan', exact: true })
    .click()
  const response = await pending,
    result = await response.json()
  assert.equal(response.status(), 200, JSON.stringify(result))
  return result
}
async function point(x, y) {
  await admin.locator('.leaflet-container').click({ position: { x, y } })
}
try {
  await visitor.goto(origin + '/trayek')
  await visitor.getByRole('heading', { name: 'Daftar trayek angkot' }).waitFor()
  await admin.goto(origin + '/login')
  await admin.getByRole('button', { name: 'Admin', exact: true }).click()
  await admin.waitForURL('**/admin')
  await admin.getByText('Total angkot', { exact: true }).waitFor()
  await admin.goto(origin + '/admin/trayek')
  await admin.getByRole('link', { name: 'Tambah trayek', exact: true }).click()
  await admin.getByLabel('Kode', { exact: true }).fill('S2WEB')
  await admin
    .getByLabel('Nama trayek', { exact: true })
    .fill('Demo browser Sprint 2')
  await admin.getByLabel('Titik awal', { exact: true }).fill('Halte browser A')
  await admin.getByLabel('Titik akhir', { exact: true }).fill('Halte browser B')
  await admin.getByLabel('Mode edit peta').selectOption('point')
  await point(160, 160)
  await point(280, 170)
  await admin
    .getByRole('button', { name: 'Tambah segmen', exact: true })
    .click()
  await point(380, 270)
  await point(480, 280)
  await admin.getByLabel('Mode edit peta').selectOption('stop')
  await point(150, 210)
  await point(290, 220)
  await admin
    .getByLabel('Nama halte 1', { exact: true })
    .fill('Halte browser A')
  await admin
    .getByLabel('Nama halte 2', { exact: true })
    .fill('Halte browser B')
  const created = await mutate('POST')
  routeId = created.id
  assert.equal(created.segments.length, 2)
  assert.equal(created.endstops.length, 2)
  await admin.waitForURL(`**/admin/trayek/${routeId}`)
  // This page stays mounted: another context must see the new route without reloading.
  await visitor
    .getByRole('heading', { name: 'Demo browser Sprint 2', exact: true })
    .waitFor()
  const order = []
  visitor.on('response', (r) => {
    const p = new URL(r.url()).pathname
    if (p === '/api/routes') order.push('catalog')
    if (p === '/api/search/route') order.push('search')
  })
  const directResponse = visitor.waitForResponse(
    (r) => new URL(r.url()).pathname === '/api/search/route',
  )
  const from = created.segments[0][0],
    to = created.segments[0].at(-1)
  const params = new URLSearchParams({
    from: 'Asal uji',
    fl: from.join(','),
    to: 'Tujuan uji',
    tl: to.join(','),
  })
  await visitor.goto(`${origin}/peta?${params}`)
  const direct = await (await directResponse).json()
  assert.ok(direct.some((p) => p.route.id === routeId))
  assert.ok(
    order.indexOf('catalog') >= 0 &&
      order.indexOf('catalog') < order.indexOf('search'),
    'Auto-search must wait for DB catalog',
  )
  await visitor.goto(`${origin}/trayek/${routeId}`)
  await visitor.getByText('Halte browser A', { exact: true }).waitFor()
  const publicLines = visitor.locator(
    '.leaflet-overlay-pane path.leaflet-interactive',
  )
  assert.equal(await publicLines.count(), 2)
  const beforePath = await publicLines.first().getAttribute('d')
  await driver.goto(origin + '/login')
  await driver
    .getByLabel('Email', { exact: true })
    .fill('app-5@demo.angkot.local')
  await driver.getByLabel('Password', { exact: true }).fill('AngkotDemo123!')
  await driver.getByRole('button', { name: 'Masuk', exact: true }).click()
  await driver.waitForURL('**/pengemudi/verifikasi')
  await driver.goto(origin + '/pengemudi/daftar')
  await driver
    .getByLabel('Jurusan dan arah tugas', { exact: true })
    .selectOption(routeId)
  await admin.getByLabel('Mode edit peta').selectOption('point')
  const vertex = admin.getByTitle('Titik jalur 1', { exact: true })
  await vertex.scrollIntoViewIfNeeded()
  const box = await vertex.boundingBox()
  assert.ok(box)
  await admin.mouse.move(box.x + 12, box.y + 12)
  await admin.mouse.down()
  await admin.mouse.move(box.x + 42, box.y - 8, { steps: 8 })
  await admin.mouse.up()
  await admin
    .getByLabel('Nama trayek', { exact: true })
    .fill('Demo browser diperbarui')
  await admin
    .getByRole('button', { name: 'Turunkan halte 1', exact: true })
    .click()
  await admin
    .getByLabel('Nama halte 1', { exact: true })
    .fill('Halte urutan baru')
  await admin
    .getByRole('button', { name: 'Hapus halte 2', exact: true })
    .click()
  const updated = await mutate('PATCH')
  assert.notDeepEqual(updated.segments[0], created.segments[0])
  assert.equal(updated.endstops.length, 1)
  assert.equal(updated.endstops[0].id, created.endstops[1].id)
  await visitor
    .getByRole('heading', { name: 'Demo browser diperbarui', exact: true })
    .waitFor()
  await visitor.getByText('Halte urutan baru', { exact: true }).waitFor()
  assert.notEqual(await publicLines.first().getAttribute('d'), beforePath)
  await driver
    .getByRole('option', {
      name: 'S2WEB · Demo browser diperbarui',
      exact: true,
    })
    .waitFor({ state: 'attached' })
  await admin.reload()
  await admin.getByLabel('Nama trayek', { exact: true }).waitFor()
  assert.equal(
    await admin.getByLabel('Nama trayek', { exact: true }).inputValue(),
    'Demo browser diperbarui',
  )
  assert.equal(
    await admin.getByLabel('Nama halte 1', { exact: true }).inputValue(),
    'Halte urutan baru',
  )
  await admin
    .getByLabel('Status operasional', { exact: true })
    .selectOption('nonaktif')
  await mutate('PATCH')
  await visitor
    .getByRole('heading', { name: 'Trayek tidak ditemukan', exact: true })
    .waitFor()
  await driver
    .locator(`option[value="${routeId}"]`)
    .waitFor({ state: 'detached' })
  await admin.goto(origin + '/admin/trayek')
  await admin
    .getByRole('textbox', { name: 'Cari trayek', exact: true })
    .fill('Demo browser diperbarui')
  await admin.getByRole('button', { name: 'Hapus', exact: true }).click()
  const deletion = admin.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === `/api/admin/routes/${routeId}` &&
      r.request().method() === 'DELETE',
  )
  await admin
    .getByRole('button', { name: 'Hapus permanen', exact: true })
    .click()
  assert.equal((await deletion).status(), 200)
  routeId = null
  await visitor.goto(origin + '/statistik')
  await visitor.getByText('Armada terdaftar', { exact: true }).waitFor()
  await visitor
    .getByText('Belum ada kendaraan dengan GPS aktif.', { exact: true })
    .waitFor()
  await admin.goto(origin + '/admin')
  await admin.getByText('Pak Supriatna', { exact: true }).waitFor()
  await admin
    .getByText('LPR-1051 · Tarif tidak sesuai', { exact: true })
    .waitFor()
  assert.deepEqual(errors, [])
  await mkdir(new URL('../../../.local/screenshots/', import.meta.url), {
    recursive: true,
  })
  await admin.screenshot({
    path: new URL(
      '../../../.local/screenshots/sprint2-dashboard.png',
      import.meta.url,
    ).pathname,
    fullPage: true,
  })
  console.log(
    'PASS Sprint 2 browser: CRUD jalur multi-chain/halte di peta, reorder/delete, persist reload, konteks publik diperbarui tanpa reload, archive/delete dan dashboard nyata.',
  )
} catch(error) {
 console.error('Sprint 2 diagnostic',JSON.stringify({url:driver.url(),body:(await driver.locator('body').innerText()).slice(0,2500),httpErrors}))
 throw error
} finally {
  if (routeId) {
    await admin
      .evaluate(async (id) => {
        const { api } = await import('/src/lib/api.ts')
        const r = await api(`/routes/${id}`)
        await api(`/admin/routes/${id}`, {
          method: 'DELETE',
          body: JSON.stringify({ updatedAt: r.updatedAt }),
        })
      }, routeId)
      .catch(() => {})
  }
  await browser.close()
}
