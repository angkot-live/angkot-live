// Read-only checks. Never migrate, seed, reset or modify duties.
import { demoSettings, demoOrigin } from './demo-settings.mjs'
import { connection } from './demo-lib.mjs'
const settings = await demoSettings()
let failed = false
async function check(label, url, headers = {}) {
  try {
    const result = await fetch(url, { headers, signal: AbortSignal.timeout(5000) })
    if (!result.ok) throw new Error(`HTTP ${result.status}`)
    console.log(`PASS ${label}`)
  } catch (error) {
    failed = true
    console.error(`FAIL ${label}: ${error.message}`)
  }
}
try {
  const c = await connection()
  await check('Supabase Auth', c.API_URL + '/auth/v1/health', { apikey: c.ANON_KEY })
} catch {
  failed = true
  console.error('FAIL konfigurasi Supabase lokal. Jalankan npm run local:start, lalu npm run local:env.')
}
await check('Backend dan katalog', `http://127.0.0.1:${settings.apiPort ?? 8080}/api/health`)
await check('Frontend', demoOrigin(settings))
console.log('Pastikan fleet berhenti sebelum rehearsal. Gunakan sesi browser terpisah dan GPS penumpang yang sesuai trayek.')
process.exitCode = failed ? 1 : 0
