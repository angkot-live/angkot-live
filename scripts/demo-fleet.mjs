import { randomUUID } from 'node:crypto'
import { open, readFile, unlink, mkdir } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import { root, connection, client, jsonFile, uuid, password, savePrivate } from './demo-lib.mjs'
import { prepareRoute, fleetFrame, loopbackURL } from './fleet-simulator.mjs'

const manifestPath = '.local/fleet-manifest.json'
const lockPath = root + '.local/fleet.lock'
const c = await connection(), db = client(c)
const settings = await jsonFile('.local/settings.json').catch(() => ({ host: 'localhost', webPort: 5173, apiPort: 8080, https: false }))
const base = loopbackURL(process.env.DEMO_API_URL ?? `http://127.0.0.1:${settings.apiPort}/api`).href.replace(/\/$/, '')
const origin = `${settings.https ? 'https' : 'http'}://${settings.host}:${settings.webPort}`
const wsURL = base.replace(/^http/, 'ws') + '/ws'
const actors = []
let stopped = false, lockOwned = false, manifest
const stop = () => { stopped = true }
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
function checkStop() { if (stopped) throw new Error('Simulasi dihentikan') }

async function api(path, token, body) {
  const response = await fetch(base + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(12000),
  })
  const value = await response.json()
  if (!response.ok) throw new Error(value.error ?? `API ${response.status}`)
  return value
}
async function allUsers() {
  const users = []
  for (let page = 1; ; page++) {
    const result = await db(`/auth/v1/admin/users?page=${page}&per_page=1000`)
    users.push(...result.users)
    if (result.users.length < 1000) return users
  }
}
async function acquireLock() {
  await mkdir(root + '.local', { recursive: true, mode: 0o700 })
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const file = await open(lockPath, 'wx', 0o600)
      lockOwned = true
      await file.writeFile(String(process.pid))
      await file.close()
      return
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
      const pid = Number(await readFile(lockPath, 'utf8'))
      if (!Number.isInteger(pid) || pid <= 0) throw new Error('Lock simulator tidak valid; periksa .local/fleet.lock.')
      try { process.kill(pid, 0) } catch (e) {
        if (e.code === 'ESRCH') { await unlink(lockPath); continue }
        throw e
      }
      throw new Error(`Simulasi armada masih berjalan (PID ${pid}). Hentikan dengan Ctrl+C di terminalnya.`)
    }
  }
  throw new Error('Gagal mendapatkan lock simulator')
}

// Only this run's sessions and explicitly marked temporary Auth users are owned.
// end_tracking checks the session atomically, preserving any manual takeover.
async function cleanup(saved) {
  const failures = []
  for (const actor of saved.actors ?? []) {
    try {
      await db('/rest/v1/rpc/end_tracking', { method: 'POST', body: {
        p_actor: actor.id, p_session: actor.session, p_distance: 0, p_reason: 'fleet_stopped',
      } })
    } catch (error) { failures.push(error.message) }
  }
  const temporary = (await allUsers()).filter((u) =>
    u.user_metadata?.demo_fleet === true && u.user_metadata?.fleet_run === saved.runId)
  for (const user of temporary) {
    try {
      // These tables intentionally restrict driver deletion. Trip history keeps
      // its vehicle/provenance and its nullable driver FK is cleared by Postgres.
      for (const table of ['vehicle_positions', 'driver_duties'])
        await db(`/rest/v1/${table}?driver_id=eq.${user.id}`, { method: 'DELETE' })
      await db(`/auth/v1/admin/users/${user.id}`, { method: 'DELETE' })
    } catch (error) { failures.push(error.message) }
  }
  if (failures.length) throw new Error(`Cleanup belum lengkap: ${failures.join('; ')}. Jalankan npm run demo:fleet:cleanup setelah Supabase tersedia.`)
}

function connect(actor) {
  return new Promise((resolve, reject) => {
    // Node 24 supports WebSocketInit.headers; no browser Origin bypass needed.
    const ws = new WebSocket(wsURL, { headers: { Origin: origin } })
    actor.ws = ws
    const pendingMessages = new Map()
    actor.pending = pendingMessages
    let ready = false
    const timeout = setTimeout(() => { reject(new Error('WebSocket tidak merespons')); ws.close() }, 10000)
    const fail = (message) => {
      clearTimeout(timeout)
      if (actor.ws === ws) actor.disconnected = true
      for (const pending of pendingMessages.values()) pending.reject(new Error(message))
      pendingMessages.clear()
      if (!ready) reject(new Error(message))
    }
    ws.addEventListener('open', () => ws.send(JSON.stringify({ type: 'auth', token: actor.auth.access_token })))
    ws.addEventListener('error', () => fail('WebSocket gagal; periksa backend'))
    ws.addEventListener('close', () => fail('Koneksi WebSocket terputus'))
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      if (message.type === 'snapshot') {
        actor.duty = message.data.duty
        if (!ready) { ready = true; actor.disconnected = false; clearTimeout(timeout); resolve() }
      } else if (message.type === 'auth:error') fail('Sesi Auth simulator tidak valid')
      else if (message.id && pendingMessages.has(message.id)) {
        const pending = pendingMessages.get(message.id)
        pendingMessages.delete(message.id)
        if (message.type === 'ack') pending.resolve()
        else pending.reject(new Error(message.error ?? 'Posisi ditolak'))
      } else if (message.type === 'error' && !ready) fail(message.error ?? 'Snapshot gagal')
    })
  })
}
async function publish(actor, frame, speed) {
  if (actor.disconnected || actor.ws.readyState !== WebSocket.OPEN)
    throw new Error('WebSocket terputus; jalankan ulang simulator')
  const id = randomUUID()
  const ack = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      actor.pending.delete(id)
      reject(new Error('ACK posisi timeout'))
    }, 8000)
    actor.pending.set(id, {
      resolve: () => { clearTimeout(timeout); resolve() },
      reject: (error) => { clearTimeout(timeout); reject(error) },
    })
  })
  actor.ws.send(JSON.stringify({
    type: 'driver:position', id, session: actor.session,
    telemetrySource: 'simulation', position: frame.position,
    accuracy: 5, speedKph: speed, heading: frame.heading,
    sampledAt: Date.now(), sequence: ++actor.sequence,
  }))
  await ack
  actor.lastPublishedAt = Date.now()
}
async function mode(actor, value) {
  actor.duty = await api('/driver/duty', actor.auth.access_token, {
    mode: value, session: actor.session, telemetrySource: 'simulation',
  })
}
async function update(actor) {
  if (!actor.running) return
  if (actor.duty?.session !== actor.session || !['narik', 'ngetem'].includes(actor.duty.mode)) {
    actor.running = false
    actor.ws.close()
    console.log(`${actor.plate}: simulasi dilepas; sesi sudah dihentikan/diambil alih manual.`)
    return
  }
  if (Date.now() - (actor.lastPublishedAt ?? 0) < 2500) return
  if (actor.auth.expires_at * 1000 - Date.now() < 60000) {
    actor.auth = await db('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', key: c.ANON_KEY, body: { refresh_token: actor.auth.refresh_token },
    })
    const previousSocket = actor.ws
    await connect(actor)
    previousSocket.close()
  }
  const now = Date.now()
  if (actor.terminalAt && now - actor.terminalAt >= 12000) {
    // End the old duty with a session-scoped RPC, so a manual session is safe.
    await db('/rest/v1/rpc/end_tracking', { method: 'POST', body: {
      p_actor: actor.id, p_session: actor.session, p_distance: actor.duty.distanceKm ?? 0, p_reason: 'fleet_loop',
    } })
    // Let the engine reconcile the closed session before acquiring another.
    await delay(1100)
    actor.chainIndex = (actor.chainIndex + 1) % actor.chains.length
    actor.offset = 0
    actor.terminalAt = null
    await mode(actor, 'narik')
    actor.at = Date.now()
  }
  const elapsed = Math.max(0, Date.now() - actor.at)
  // Do not manufacture a large GPS jump after suspend or a slow network call.
  actor.offset += actor.speed * Math.min(elapsed, 5000) / 3600000
  actor.at = Date.now()
  const frame = fleetFrame(actor.chains[actor.chainIndex], actor.offset)
  if (frame.ended && !actor.terminalAt) {
    actor.terminalAt = Date.now()
    await mode(actor, 'ngetem')
  }
  await publish(actor, frame, frame.ended ? 0 : actor.speed)
}

try {
  await acquireLock()
  const previous = await jsonFile(manifestPath).catch((error) => {
    if (error.code === 'ENOENT') return null
    throw error
  })
  if (previous) { console.log('Membersihkan sesi simulator sebelumnya…'); await cleanup(previous); await unlink(root + manifestPath) }
  if (process.argv.includes('--cleanup')) console.log('Cleanup simulasi armada selesai.')
  else {
    const config = await api('/tracking/config')
    if (!config.simulationEnabled) throw new Error('Aktifkan demo Supabase lokal terlebih dahulu; simulasi ditolak backend.')
    const routes = new Map((await api('/routes')).map((r) => [r.id, r]))
    const { data } = await jsonFile('supabase/fixtures/mock-data.json')
    const vehicles = await db('/rest/v1/vehicles?select=id,plate_number,route_id')
    const profiles = await db('/rest/v1/driver_profiles?select=id,vehicle_id,verification_status,is_active_duty')
    const users = await allUsers()
    manifest = { runId: randomUUID(), actors: [] }
    await savePrivate(manifestPath, manifest)
    console.log('SIMULASI ARMADA LOKAL · kendaraan dari seeder, posisi bukan GPS perangkat.')
    for (const [index, fixture] of data.vehicles.entries()) {
      checkStop()
      const vehicle = vehicles.find((v) => v.id === uuid(fixture.id))
      const route = routes.get(vehicle?.route_id)
      if (!vehicle || !route) { console.log(`${fixture.plate}: dilewati; kendaraan/trayek aktif tidak tersedia.`); continue }
      const chains = prepareRoute(route)
      const assigned = profiles.find((p) => p.vehicle_id === vehicle.id)
      let auth
      if (assigned) {
        const user = users.find((u) => u.id === assigned.id)
        if (assigned.is_active_duty || assigned.verification_status !== 'disetujui' ||
            user?.email !== 'pengemudi@demo.angkot.local' || user?.user_metadata?.demo !== true) {
          console.log(`${vehicle.plate_number}: dilewati; sudah ditugaskan/dikendalikan pengemudi lain.`)
          continue
        }
        auth = await db('/auth/v1/token?grant_type=password', {
          method: 'POST', key: c.ANON_KEY, body: { email: user.email, password },
        })
        const duty = await api('/driver/duty', auth.access_token)
        if (['narik', 'ngetem'].includes(duty.mode)) { console.log(`${vehicle.plate_number}: sesi manual aktif, dilewati.`); continue }
      } else {
        const email = `fleet-${manifest.runId}-${index}@demo.angkot.local`
        const secret = randomUUID() + randomUUID()
        const user = await db('/auth/v1/admin/users', { method: 'POST', body: {
          email, password: secret, email_confirm: true,
          user_metadata: { name: `${fixture.driverName} (simulasi)`, role: 'pengemudi', demo_fleet: true, fleet_run: manifest.runId },
        } })
        await db(`/rest/v1/profiles?id=eq.${user.id}`, { method: 'PATCH', body: { role: 'pengemudi', name: `${fixture.driverName} (simulasi)` } })
        await db('/rest/v1/driver_profiles?on_conflict=id', {
          method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: {
            id: user.id, vehicle_id: vehicle.id, route_id: route.id,
            verification_status: 'disetujui', verified_at: new Date().toISOString(),
            // No fabricated document submission or verification queue entry.
            onboarding: { simulation: true },
          },
        })
        auth = await db('/auth/v1/token?grant_type=password', {
          method: 'POST', key: c.ANON_KEY, body: { email, password: secret },
        })
      }
      const actor = {
        id: auth.user.id, plate: vehicle.plate_number, auth,
        session: 'fleet-' + randomUUID(), chains, chainIndex: index % chains.length,
        speed: 22 + (index % 4) * 3, sequence: 0, running: true,
      }
      actors.push(actor)
      manifest.actors.push({ id: actor.id, session: actor.session })
      await savePrivate(manifestPath, manifest)
      checkStop()
      await mode(actor, 'narik')
      await connect(actor)
      actor.offset = chains[actor.chainIndex].length * (0.1 + (index % 7) * 0.1)
      actor.at = Date.now()
      await update(actor)
      console.log(`${vehicle.plate_number} · ${route.code} ${route.name} · ${actor.speed} km/jam`)
    }
    if (!actors.length) throw new Error('Tidak ada kendaraan seed yang dapat disimulasikan. Jalankan demo:seed jika database baru.')
    console.log(`${actors.length} angkot berjalan. Buka ${origin}/peta atau /admin/monitoring. Ctrl+C untuk berhenti.`)
    while (!stopped) {
      const started = Date.now()
      for (const actor of actors) {
        if (stopped) break
        try { await update(actor) } catch (error) {
          actor.running = false
          actor.ws?.close()
          console.error(`${actor.plate}: berhenti (${error.message}).`)
          await db('/rest/v1/rpc/end_tracking', { method: 'POST', body: {
            p_actor: actor.id, p_session: actor.session, p_distance: 0, p_reason: 'fleet_error',
          } })
        }
      }
      if (!actors.some((actor) => actor.running)) throw new Error('Seluruh sesi simulasi telah berakhir; jalankan ulang bila diperlukan.')
      await delay(Math.max(0, 3000 - (Date.now() - started)))
    }
  }
} catch (error) {
  if (!stopped) { console.error(error.message); process.exitCode = 1 }
} finally {
  for (const actor of actors) actor.ws?.close()
  if (manifest) {
    console.log('Menghentikan sesi simulasi dan membersihkan akun pengemudi sementara…')
    try { await cleanup(manifest); await unlink(root + manifestPath); console.log('Selesai. Data seed dan riwayat perjalanan tetap tersedia.') }
    catch (error) { console.error(error.message); process.exitCode = 1 }
  }
  if (lockOwned) await unlink(lockPath)
  process.removeListener('SIGINT', stop)
  process.removeListener('SIGTERM', stop)
}
