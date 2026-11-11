// Browser fixtures only: validates presentation, not backend acceptance.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { readFile, mkdir } from 'node:fs/promises'
const origin = process.env.SMOKE_ORIGIN ?? 'http://127.0.0.1:5173'
const { routes } = JSON.parse(await readFile(new URL('../src/data/angkot-routes.json', import.meta.url)))
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 900, height: 900 } })
page.setDefaultTimeout(15000)
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
let unavailable = false
await page.route('**/api/**', (r) => {
  const path = new URL(r.request().url()).pathname
  if (unavailable) return r.fulfill({ status: 503, json: { error: 'Layanan sedang tidak tersedia' } })
  return r.fulfill({ json: path === '/api/routes' ? routes : path === '/api/stats/public' ? {
    routes: routes.length, routeCodes: 3, totalVehicles: 14, activeVehicles: 2,
    verifiedDrivers: 4, reports: 2, processing: 1, resolved: 1,
  } : {} })
})
await page.routeWebSocket('**/api/ws', (ws) => {
  ws.onMessage(() => ws.send(JSON.stringify({ type: 'snapshot', data: {
    vehicles: [], request: null, trip: null, nearby: [], serverTime: Date.now(),
    duty: { mode: 'offline', session: '', vehicle: null, distanceKm: 0, prompt: null },
  } })))
})
try {
  await page.goto(origin)
  await page.getByRole('button', { name: 'Buka menu' }).click()
  await page.getByRole('navigation', { name: 'Navigasi mobile' }).getByRole('link', { name: 'Daftar Trayek' }).click()
  await page.waitForURL('**/trayek')
  assert.equal(await page.getByRole('dialog').count(), 0, 'Menu must close after navigation')
  await page.goto(origin)
  await page.getByRole('button', { name: 'Buka menu' }).click()
  await page.getByRole('navigation', { name: 'Navigasi mobile' }).getByRole('link', { name: 'Cara Kerja' }).click()
  await page.waitForFunction(() => {
    const top = document.getElementById('cara-kerja')?.getBoundingClientRect().top
    return top !== undefined && top >= 0 && top <= 110
  }, undefined, { timeout: 3000 })
  await page.getByRole('heading', { name: 'Pertanyaan yang sering muncul' }).waitFor()
  await page.getByText('Bagaimana membedakan GPS dan simulasi?', { exact: true }).click()
  assert.ok(await page.getByText(/label SIMULASI/).first().isVisible())
  await page.evaluate(async () => {
    const { useLiveStore } = await import('/src/features/tracking/live-store.ts')
    useLiveStore.setState({ connection: 'connected', vehicles: [{ id: 'fixture-sim', position: [-6.9, 107.6], telemetrySource: 'simulation', lastSeenAt: Date.now(), stale: false }] })
  })
  await page.getByText('0 GPS perangkat · 1 SIMULASI', { exact: true }).waitFor()
  assert.ok(!(await page.locator('body').innerText()).includes('terverifikasi Dishub'))
  await page.goto(origin)
  await page.getByRole('link', { name: 'Cari Trayek', exact: true }).click()
  await page.waitForURL('**/peta')
  await page.waitForFunction(() => document.activeElement?.id === 'armada-destination')
  await page.goto(origin)
  for (const width of [390, 768, 900, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}px`)
    await mkdir('/tmp/angkot-screening', { recursive: true })
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    await page.screenshot({ path: `/tmp/angkot-screening/landing-${width}.png`, fullPage: true })
  }
  unavailable = true
  await page.reload()
  await page.getByRole('button', { name: 'Muat ulang statistik' }).waitFor()
  unavailable = false
  await page.getByRole('button', { name: 'Muat ulang statistik' }).click()
  await page.getByText('14', { exact: true }).waitFor()
  assert.deepEqual(errors, [])
  console.log('PASS landing: tablet menu, close on navigation, FAQ, simulation labels, mobile/desktop overflow, error recovery')
} finally {
  await browser.close()
}
