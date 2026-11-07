import { chromium } from 'playwright'

const base = 'http://localhost:5173'
const targets = [
  { path: '/', name: 'landing' },
  { path: '/peta', name: 'map' },
  { path: '/rute', name: 'search-route' },
  { path: '/trayek', name: 'route-list' },
  { path: '/trayek/3415464', name: 'route-detail' },
  { path: '/statistik', name: 'statistics' },
  { path: '/bantuan', name: 'help' },
  { path: '/login', name: 'login' },
  { path: '/lupa-password', name: 'forgot-password' },
  { path: '/register', name: 'register-role' },
  { path: '/register/penumpang', name: 'register-passenger' },
  { path: '/pengemudi/daftar', name: 'driver-onboarding' },
  { path: '/pengemudi/verifikasi', name: 'driver-verification' },
  { path: '/dev/ui', name: 'ui-gallery' },
]

const roles = {
  penumpang: {
    id: 'u-penumpang',
    name: 'Sari Wulandari',
    email: 'sari@angkot-live.id',
    phone: '081234567890',
    role: 'penumpang',
  },
  pengemudi: {
    id: 'u-pengemudi',
    name: 'Asep Sunandar',
    email: 'asep@angkot-live.id',
    phone: '081234567891',
    role: 'pengemudi',
  },
  admin: {
    id: 'u-admin',
    name: 'Petugas Dishub',
    email: 'admin@angkot-live.id',
    phone: '081234567892',
    role: 'admin',
  },
}

const browser = await chromium.launch()
const errors = []

async function capture(viewportName, viewport, path, name, role) {
  const context = await browser.newContext({ viewport })
  if (role) {
    await context.addInitScript(
      ({ key, user }) => {
        window.localStorage.setItem(
          key,
          JSON.stringify({ state: { user }, version: 0 }),
        )
      },
      { key: 'angkot-live.auth', user: roles[role] },
    )
  }
  const page = await context.newPage()
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[${viewportName}] ${path} console: ${msg.text()}`)
  })
  page.on('pageerror', (error) => {
    errors.push(`[${viewportName}] ${path} pageerror: ${error.message}`)
  })
  await page.goto(base + path, { waitUntil: 'domcontentloaded' })
  const hasMap =
    path === '/peta' ||
    path === '/penumpang' ||
    path.startsWith('/trayek/') ||
    path.includes('perjalanan') ||
    path === '/pengemudi' ||
    path === '/admin/monitoring' ||
    path.startsWith('/admin/trayek/')
  await page.waitForTimeout(hasMap ? 2500 : 1200)
  await page.screenshot({
    path: `shots/${name}-${viewportName}.png`,
    fullPage: path !== '/peta' && path !== '/penumpang',
  })
  await context.close()
}

for (const target of targets) {
  await capture('desktop', { width: 1440, height: 900 }, target.path, target.name)
  await capture('mobile', { width: 390, height: 844 }, target.path, target.name)
}

await capture('desktop', { width: 1440, height: 900 }, '/penumpang', 'passenger-map', 'penumpang')
await capture('mobile', { width: 390, height: 844 }, '/penumpang', 'passenger-map', 'penumpang')

const passengerPages = [
  { path: '/penumpang/dashboard', name: 'passenger-dashboard' },
  { path: '/penumpang/perjalanan', name: 'passenger-active-trip' },
  { path: '/penumpang/laporan', name: 'passenger-reports' },
  { path: '/penumpang/laporan/rep-1', name: 'passenger-report-detail' },
  { path: '/penumpang/lapor', name: 'passenger-create-report' },
  { path: '/penumpang/riwayat', name: 'passenger-history' },
  { path: '/penumpang/profil', name: 'passenger-profile' },
  { path: '/penumpang/notifikasi', name: 'passenger-notifications' },
]

for (const target of passengerPages) {
  await capture('desktop', { width: 1440, height: 900 }, target.path, target.name, 'penumpang')
  await capture('mobile', { width: 390, height: 844 }, target.path, target.name, 'penumpang')
}

const driverPages = [
  { path: '/pengemudi/dashboard', name: 'driver-dashboard' },
  { path: '/pengemudi/inbox', name: 'driver-inbox' },
  { path: '/pengemudi/profil', name: 'driver-profile' },
]

for (const target of driverPages) {
  await capture('desktop', { width: 1440, height: 900 }, target.path, target.name, 'pengemudi')
  await capture('mobile', { width: 390, height: 844 }, target.path, target.name, 'pengemudi')
}
const adminPages = [
  { path: '/admin', name: 'admin-dashboard' },
  { path: '/admin/monitoring', name: 'admin-monitoring' },
  { path: '/admin/pengemudi', name: 'admin-verification-queue' },
  { path: '/admin/pengemudi/app-1', name: 'admin-verification-detail' },
  { path: '/admin/trayek', name: 'admin-routes' },
  { path: '/admin/trayek/3415464', name: 'admin-route-editor' },
  { path: '/admin/kendaraan', name: 'admin-vehicles' },
  { path: '/admin/laporan', name: 'admin-reports' },
  { path: '/admin/laporan/rep-1', name: 'admin-report-detail' },
  { path: '/admin/pesan', name: 'admin-messages' },
  { path: '/admin/pengguna', name: 'admin-users' },
]

for (const target of adminPages) {
  await capture('desktop', { width: 1440, height: 900 }, target.path, target.name, 'admin')
  await capture('mobile', { width: 390, height: 844 }, target.path, target.name, 'admin')
}

console.log(JSON.stringify(errors, null, 2))
await browser.close()
