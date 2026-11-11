// Demo interaktif TANPA Docker/Supabase.
// Dua jendela (penumpang + pengemudi) memakai fixture lokal: API dan WebSocket ditiru
// di dalam skrip ini. Setiap halaman diberi label DEMO FIXTURE supaya tidak pernah
// diklaim sebagai backend nyata. Tidak ada perubahan pada kode aplikasi.
//
// Jalankan: npm run demo:offline   (tambahkan DEMO_HEADLESS=1 untuk tanpa jendela)
import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const webRoot = fileURLToPath(new URL('..', import.meta.url))
const smoke = process.env.DEMO_SMOKE === '1'
const headless = smoke || process.env.DEMO_HEADLESS === '1'
const password = 'AngkotDemo123!'
const { routes } = JSON.parse(
  await readFile(new URL('../src/data/angkot-routes.json', import.meta.url), 'utf8'),
)
const route = routes.find((r) => r.id === '3415464') ?? routes[0]
const start = route.polyline[0]

const users = {
  passenger: {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Siti Penumpang',
    email: 'penumpang@demo.angkot.local',
    phone: '081234567890',
    role: 'penumpang',
  },
  driver: {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Asep Pengemudi',
    email: 'pengemudi@demo.angkot.local',
    phone: '081234567891',
    role: 'pengemudi',
    driverVerification: 'disetujui',
  },
}

// state hanya hidup di proses ini; restart skrip = mulai dari nol.
const state = { request: null, trip: null, trips: [], mode: 'offline', session: '' }
let driverFix = null

const vehicle = () => ({
  id: '44444444-4444-4444-8444-444444444444',
  plate: 'D 1000 AB',
  routeId: route.id,
  routeCode: route.code,
  routeName: route.name,
  driverName: users.driver.name,
  position: driverFix?.position ?? start,
  status: 'jalan',
  speedKph: driverFix?.speedKph ?? 0,
  heading: driverFix?.heading ?? 0,
  lastSeenAt: Date.now(),
  driverVerified: true,
  chain: 0,
  offsetKm: 0.1,
  etaMinutes: null,
  telemetrySource: 'simulation',
})

function duty() {
  const active = ['narik', 'ngetem'].includes(state.mode)
  return {
    mode: state.mode,
    session: state.session,
    vehicle: active ? vehicle() : null,
    distanceKm: 0,
    prompt: null,
  }
}

function snapshot(role) {
  const active = ['narik', 'ngetem'].includes(state.mode)
  // Fixture menjaga Megat tetap aktif agar presentasi tidak kehabisan waktu;
  // backend nyata memakai expiry 60 detik dari server.
  if (state.request && ['searching', 'accepted'].includes(state.request.status))
    state.request = {
      ...state.request,
      expires_at: new Date(Date.now() + 60000).toISOString(),
    }
  const nearby =
    role === 'driver' &&
    active &&
    state.request &&
    ['searching', 'accepted'].includes(state.request.status)
      ? [state.request]
      : []
  return {
    type: 'snapshot',
    data: {
      vehicles: active ? [vehicle()] : [],
      request: role === 'passenger' ? state.request : null,
      trip:
        role === 'passenger' && state.trip?.status === 'active'
          ? state.trip
          : null,
      nearby,
      duty: duty(),
      serverTime: Date.now(),
    },
  }
}

function token(user) {
  const enc = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  return [
    enc({ alg: 'HS256', typ: 'JWT' }),
    enc({ sub: user.id, exp: now + 3600, iat: now, role: 'authenticated' }),
    enc('fixture-signature'),
  ].join('.')
}

function authUser(user) {
  return {
    id: user.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: user.email,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    created_at: new Date().toISOString(),
  }
}

function hint(text) {
  console.log(`\n[demo] ${text}`)
}

async function freePort(from) {
  const probe = (port) =>
    new Promise((resolve, reject) => {
      const server = createServer()
      server.once('error', () => resolve(false))
      server.once('listening', () => server.close(() => resolve(true)))
      server.listen(port, '127.0.0.1')
      setTimeout(() => reject(new Error('Port probe timeout')), 5000).unref()
    })
  for (let port = from; port < from + 20; port++)
    if (await probe(port)) return port
  throw new Error(`Tidak ada port kosong pada rentang ${from}-${from + 19}`)
}

async function startVite(port) {
  const child = spawn(
    process.execPath,
    [
      join(webRoot, 'node_modules/vite/bin/vite.js'),
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--strictPort',
    ],
    {
      cwd: webRoot,
      env: {
        ...process.env,
        VITE_SUPABASE_URL: 'http://127.0.0.1:9001',
        VITE_SUPABASE_ANON_KEY: 'test-anon',
        VITE_API_URL: '/api',
      },
      stdio: ['ignore', 'inherit', 'inherit'],
    },
  )
  const base = `http://127.0.0.1:${port}`
  const deadline = Date.now() + 90000
  while (Date.now() < deadline) {
    if (child.exitCode !== null)
      throw new Error('Vite berhenti sebelum siap. Periksa pesan di atas.')
    try {
      const response = await fetch(base)
      if (response.ok) return { child, base }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  child.kill('SIGTERM')
  throw new Error('Vite tidak siap dalam 90 detik.')
}

async function prepare(browser, role, viewport) {
  const user = users[role]
  const context = await browser.newContext({
    viewport,
    permissions: ['geolocation'],
    geolocation: { latitude: start[0], longitude: start[1], accuracy: 10 },
  })
  await context.addInitScript((label) => {
    const add = () => {
      if (document.getElementById('demo-fixture-badge')) return
      const badge = document.createElement('div')
      badge.id = 'demo-fixture-badge'
      badge.textContent = `${label} · DEMO FIXTURE — data simulasi, bukan backend nyata`
      Object.assign(badge.style, {
        position: 'fixed',
        left: '50%',
        bottom: '6px',
        transform: 'translateX(-50%)',
        zIndex: '2147483647',
        background: '#b45309',
        color: '#fff',
        padding: '5px 10px',
        borderRadius: '8px',
        font: '600 11px system-ui, sans-serif',
        boxShadow: '0 2px 8px rgba(0,0,0,.35)',
        pointerEvents: 'none',
        textAlign: 'center',
        maxWidth: '94vw',
      })
      document.body.appendChild(badge)
    }
    if (document.readyState === 'loading')
      document.addEventListener('DOMContentLoaded', add, { once: true })
    else add()
  }, role === 'driver' ? 'PENGEMUDI' : 'PENUMPANG')

  const page = await context.newPage()
  page.setDefaultTimeout(20000)
  page.on('pageerror', (error) =>
    console.error(`[${role} pageerror]`, error.message),
  )

  // Supabase Auth ditiru: setSession hanya perlu JWT berformat base64url valid.
  await page.route('http://127.0.0.1:9001/**', async (r) => {
    if (r.request().method() === 'OPTIONS') {
      await r.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
        },
      })
      return
    }
    await r.fulfill({
      json: authUser(user),
      headers: { 'access-control-allow-origin': '*' },
    })
  })

  await page.route('**/api/**', async (r) => {
    const path = new URL(r.request().url()).pathname
    const method = r.request().method()
    let body = {}
    try {
      body = JSON.parse(r.request().postData() ?? '{}')
    } catch {}
    let result = {}
    if (path === '/api/auth/login') {
      result = {
        access_token: token(user),
        refresh_token: `fixture-${role}-refresh`,
        expires_in: 3600,
        token_type: 'bearer',
        user: authUser(user),
      }
    } else if (path === '/api/me') result = user
    else if (path === '/api/demo/config')
      result = {
        accounts: Object.values(users).map((u) => ({
          role: u.role,
          email: u.email,
        })),
        password,
      }
    else if (path === '/api/routes')
      result = routes.map((item) => ({ ...item, isActive: true }))
    else if (path === '/api/stats/public')
      result = {
        routes: routes.length,
        routeCodes: new Set(routes.map((item) => item.code)).size,
        totalVehicles: 14,
        activeVehicles: 1,
        gpsVehicles: 0,
        simulatedVehicles: 1,
        verifiedDrivers: 4,
        reports: 2,
        processing: 1,
        resolved: 1,
      }
    else if (path === '/api/tracking/config') result = { simulationEnabled: true }
    else if (
      path === '/api/driver/assignment' ||
      path === '/api/driver/onboarding' ||
      path === '/api/driver/verification'
    )
      result = {
        id: users.driver.id,
        status: 'disetujui',
        form: {},
        routeId: route.id,
        vehicleId: vehicle().id,
        vehicle: {
          id: vehicle().id,
          plate: vehicle().plate,
          capacity: 12,
        },
        documents: [],
      }
    else if (path === '/api/driver/duty') {
      state.mode = body.mode
      state.session = body.session ?? state.session
      result = duty()
      if (body.mode === 'narik')
        hint(
          'Pengemudi Narik. Berikutnya: jendela PENUMPANG → tekan "Megat Angkot".',
        )
      if (body.mode === 'offline')
        hint('Pengemudi Offline. Demo selesai — tekan Ctrl+C untuk menutup.')
    } else if (path === '/api/driver/requests/respond') {
      if (state.request)
        state.request = {
          ...state.request,
          status: 'accepted',
          matched_vehicle_id: vehicle().id,
          revision: (state.request.revision ?? 0) + 1,
        }
      result = { ok: true }
      hint(
        'Respons terkirim. Berikutnya: PENUMPANG → tombol "Saya naik D 1000 AB".',
      )
    } else if (path === '/api/passenger/requests' && method === 'POST') {
      state.request = {
        id: '55555555-5555-4555-8555-555555555555',
        passenger_id: users.passenger.id,
        route_id: body.routeId ?? route.id,
        name: users.passenger.name,
        destination: body.destination || 'Cicaheum',
        position: body.position ?? start,
        pickup: body.position ?? start,
        status: 'searching',
        matched_vehicle_id: null,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60000).toISOString(),
        last_seen_at: new Date().toISOString(),
        revision: 1,
      }
      result = state.request
      hint(
        'Megat aktif. Berikutnya: jendela PENGEMUDI → "Saya melihat penumpang".',
      )
    } else if (path === '/api/passenger/requests/cancel') {
      state.request = null
      result = { ok: true }
      hint('Megat dibatalkan. Tekan "Megat Angkot" lagi untuk mengulang.')
    } else if (path === '/api/passenger/requests/current')
      result = state.request
    else if (path === '/api/passenger/trips' && method === 'POST') {
      state.trip = {
        id: '66666666-6666-4666-8666-666666666666',
        request_id: state.request?.id ?? null,
        vehicle_id: vehicle().id,
        route_id: route.id,
        origin_name: 'Titik naik',
        destination_name: 'Cicaheum',
        started_at: new Date().toISOString(),
        finished_at: null,
        distance_km: 0,
        start_offset_km: 0.1,
        chain_index: 0,
        fare: 5000,
        status: 'active',
        telemetry_source: 'simulation',
      }
      state.request = null
      result = state.trip
      hint(
        'Perjalanan aktif. Reload halaman penumpang untuk membuktikan pemulihan, lalu "Saya sudah turun — selesai".',
      )
    } else if (path === '/api/passenger/trips/complete') {
      state.trip = {
        ...state.trip,
        status: 'completed',
        finished_at: new Date().toISOString(),
        distance_km: 1.2,
        fare: 5000,
      }
      state.trips.push(state.trip)
      result = state.trip
      hint(
        'Perjalanan selesai. Buka Riwayat, lalu PENGEMUDI → tekan "Offline".',
      )
    } else if (path === '/api/passenger/trips' && method === 'GET')
      result = state.trips
    else if (path === '/api/search/route') result = [{ route }]
    else if (path === '/api/reports' && method === 'GET') result = []
    else if (path === '/api/messages') result = []
    else if (path === '/api/preferences')
      result = { report_updates: true }
    else if (path === '/api/driver/dashboard')
      result = { distanceKm: 0, duties: 0 }
    else if (path === '/api/driver/submissions') result = []
    else if (path === '/api/admin/drivers') result = []
    await r.fulfill({ json: result })
  })

  await page.routeWebSocket('**/api/ws', (ws) => {
    let interval
    const send = () => {
      try {
        ws.send(JSON.stringify(snapshot(role)))
      } catch {}
    }
    ws.onMessage((raw) => {
      let data
      try {
        data = JSON.parse(String(raw))
      } catch {
        return
      }
      if (data.type === 'auth') {
        send()
        interval = setInterval(send, 500)
      } else if (data.type === 'driver:position') {
        driverFix = {
          position: data.position,
          heading: data.heading,
          speedKph: data.speedKph,
        }
        ws.send(JSON.stringify({ type: 'ack', id: data.id }))
      } else if (data.type === 'passenger:position') {
        ws.send(JSON.stringify({ type: 'ack', id: data.id }))
      }
    })
    ws.onClose(() => clearInterval(interval))
  })

  return page
}

async function login(page, base, role) {
  const user = users[role]
  const home = role === 'driver' ? 'pengemudi' : 'penumpang'
  await page.goto(`${base}/login`)
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await page.waitForURL(`**/${home}`)
}

async function setRange(locator, value) {
  await locator.evaluate((element, next) => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set
    setter?.call(element, String(next))
    element.dispatchEvent(new Event('input', { bubbles: true }))
  }, value)
}

async function waitEnabled(page, label) {
  await page.waitForFunction((text) => {
    const button = [...document.querySelectorAll('button')].find((element) =>
      element.textContent?.trim().startsWith(text),
    )
    return !!button && !button.disabled
  }, label)
}

let vite
let browser

async function shutdown(code = 0) {
  try {
    await browser?.close()
  } catch {}
  try {
    vite?.child.kill('SIGTERM')
  } catch {}
  process.exit(code)
}

process.on('SIGINT', () => void shutdown(0))
process.on('SIGTERM', () => void shutdown(0))

try {
  const port = await freePort(Number(process.env.DEMO_PORT ?? 5188))
  const server = await startVite(port)
  vite = server
  const base = server.base

  browser = await chromium.launch({ headless, args: ['--no-sandbox'] })
  browser.on('disconnected', () => void shutdown(0))

  const passengerPage = await prepare(browser, 'passenger', {
    width: 1280,
    height: 800,
  })
  const driverPage = await prepare(browser, 'driver', {
    width: 430,
    height: 900,
  })

  await login(driverPage, base, 'driver')
  await driverPage.getByLabel('Sumber posisi pengemudi').waitFor()
  await driverPage
    .getByLabel('Sumber posisi pengemudi')
    .selectOption('simulation')
  await setRange(driverPage.getByLabel('Kecepatan simulasi'), 0)
  await setRange(driverPage.getByLabel('Titik mulai simulasi'), 0)
  await waitEnabled(driverPage, 'Narik')

  await login(passengerPage, base, 'passenger')
  // route=... menyaring pilihan arah ke kode trayek yang sama dengan tugas pengemudi.
  await passengerPage.goto(`${base}/penumpang?route=${route.id}`)
  // Arah trayek sudah dipilih agar presentasi cukup satu klik; presenter tetap
  // bisa mengganti dropdown bila ingin menjelaskan pemilihan jurusan.
  await passengerPage
    .getByLabel('Arah jurusan megat')
    .selectOption(route.id)
    .catch(() => {})
  await waitEnabled(passengerPage, 'Megat')

  console.log(`
================= DEMO FIXTURE SIAP =================
Ini simulasi lokal (API + WebSocket tiruan), BUKAN Supabase/backend nyata.
Jendela PENUMPANG : ${base}/penumpang?route=${route.id}
Jendela PENGEMUDI : ${base}/pengemudi
Trayek            : ${route.code} · ${route.name}
Kendaraan         : D 1000 AB (${users.driver.name})

Urutan klik:
 1. PENGEMUDI : tekan "Narik" (sumber simulasi & kecepatan 0 sudah disiapkan)
 2. PENUMPANG : tekan "Megat Angkot"
 3. PENGEMUDI : tekan "Saya melihat penumpang"
 4. PENUMPANG : tekan "Saya naik D 1000 AB"
 5. PENUMPANG : reload halaman, lalu "Saya sudah turun — selesai"
 6. PENUMPANG : buka Riwayat
 7. PENGEMUDI : tekan "Offline"

Ulangi demo dari awal: Ctrl+C lalu jalankan lagi perintahnya.
Ctrl+C untuk menutup kedua jendela dan server.
=====================================================
`)

  if (smoke) {
    // Mode uji cepat: jalankan seluruh alur tanpa interaksi lalu keluar.
    await driverPage.getByRole('button', { name: 'Narik', exact: true }).click()
    await driverPage.waitForFunction(() =>
      document.body.textContent?.includes('Simulasi aktif'),
    )
    await passengerPage
      .getByRole('button', { name: 'Megat Angkot', exact: true })
      .click()
    await passengerPage
      .getByText('Mencari pengemudi', { exact: true })
      .waitFor()
    await driverPage
      .getByRole('button', { name: 'Saya melihat penumpang' })
      .click()
    await driverPage
      .getByText('Anda sudah merespons', { exact: true })
      .waitFor()
    await passengerPage
      .getByRole('button', { name: 'Saya naik D 1000 AB' })
      .click()
    await passengerPage.waitForURL('**/penumpang/perjalanan')
    await passengerPage
      .getByRole('heading', { name: 'Perjalanan aktif', exact: true })
      .waitFor()
    await passengerPage.reload()
    await passengerPage
      .getByRole('heading', { name: 'Perjalanan aktif', exact: true })
      .waitFor()
    await passengerPage
      .getByRole('button', { name: 'Saya sudah turun — selesai' })
      .click()
    await passengerPage
      .getByRole('heading', { name: 'Perjalanan selesai', exact: true })
      .waitFor()
    await driverPage.getByRole('button', { name: 'Offline', exact: true }).click()
    await driverPage.waitForFunction(() =>
      document.body.textContent?.includes('GPS tidak dibagikan'),
    )
    console.log('[demo] SMOKE PASS: Narik → Megat → respons → naik → reload → selesai → Offline')
    await shutdown(0)
  }

  await new Promise(() => {})
} catch (error) {
  console.error('\n[demo] GAGAL:', error instanceof Error ? error.message : error)
  if (!headless)
    console.error(
      '[demo] Jika jendela browser tidak dapat dibuka, coba: DEMO_HEADLESS=1 npm run demo:offline',
    )
  await shutdown(1)
}
