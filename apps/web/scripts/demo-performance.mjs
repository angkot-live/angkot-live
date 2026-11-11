import { demoSettings, demoOrigin } from '../../../scripts/demo-settings.mjs'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { savePrivate } from '../../../scripts/demo-lib.mjs'
const settings = await demoSettings(),
  origin =
    process.env.SMOKE_ORIGIN ?? demoOrigin(settings)
const routes = await (await fetch('http://127.0.0.1:8080/api/routes')).json()
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
})
const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1365, height: 1000 },
  }),
  page = await context.newPage(),
  errors = [],
  timers = new Set()
page.on('pageerror', (e) => errors.push(e.message))
await page.routeWebSocket('**/api/ws', (ws) => {
  const snapshot = () =>
    ws.send(
      JSON.stringify({
        type: 'snapshot',
        data: {
          serverTime: Date.now(),
          vehicles: Array.from({ length: 50 }, (_, i) => {
            const r = routes[i % routes.length]
            return {
              id: `test-load-${i}`,
              plate: `CONTOH UJI ${i}`,
              driverName: 'Fixture beban browser',
              routeId: r.id,
              routeCode: r.code,
              routeName: r.name,
              position: r.polyline[0],
              status: 'jalan',
              speedKph: 20,
              heading: 0,
              lastSeenAt: Date.now(),
              driverVerified: true,
              telemetrySource: 'simulation',
              etaMinutes: null,
            }
          }),
        },
      }),
    )
  ws.onMessage((raw) => {
    if (JSON.parse(String(raw)).type === 'auth') {
      snapshot()
      const timer = setInterval(snapshot, 1000)
      timers.add(timer)
      ws.onClose(() => {
        clearInterval(timer)
        timers.delete(timer)
      })
    }
  })
})
try {
  const start = Date.now()
  await page.goto(origin + '/peta', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () =>
      document.querySelectorAll('.leaflet-marker-pane .angkot-marker').length >=
      50,
  )
  const mapReadyMs = Date.now() - start,
    count = await page.locator('.leaflet-marker-pane .angkot-marker').count()
  assert.equal(count, 50)
  assert.deepEqual(errors, [])
  const result = {
    passed: true,
    markers: count,
    mapReadyMs,
    localTargetMs: 3000,
    localTargetMet: mapReadyMs <= 3000,
    network: 'local; not a 4G device benchmark',
    data: '50 browser-only WebSocket fixtures; never sent to API or database',
    measuredAt: new Date().toISOString(),
  }
  await savePrivate('.local/sprint5-performance.json', result)
  console.log('PASS rendering 50 marker', JSON.stringify(result))
} finally {
  for (const timer of timers) clearInterval(timer)
  await browser.close()
}
