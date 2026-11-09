import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMegatStore } from '../src/features/tracking/megat-store.ts'
import { canSeeMegat, parseMegat, projectToRoute } from '../src/features/tracking/megat-engine.ts'

const route = { id: 'out', code: '13', origin: 'Sarijadi', name: 'Outbound', polyline: [[0, 0], [0, 0.01], [0, 0.02]] }
const reverse = { ...route, id: 'back', polyline: [...route.polyline].reverse() }
const routes = [route, reverse]
const driver = (now = 10000, patch = {}) => ({
  id: 'driver-1', routeId: 'out', position: [0, 0], status: 'jalan', lastSeenAt: now, driverVerified: true, ...patch,
})
const input = (patch = {}) => ({ passengerId: 'p1', name: 'Passenger', destination: 'Mall', routeId: 'out', position: [0, 0.005], ...patch })

function bus({ storage = true, broadcast = true } = {}) {
  let disk = null
  const receivers = new Map()
  const send = (source, value) => {
    for (const [id, receive] of receivers) if (id !== source) queueMicrotask(() => receive(structuredClone(value)))
  }
  return {
    transport(id) {
      return {
        read: () => storage ? disk : null,
        write: (state) => {
          if (!storage) return
          const json = JSON.stringify(state)
          if (json !== disk) { disk = json; send(id, json) }
        },
        publish: (state) => { if (broadcast) send(id, state) },
        listen: (receive) => { receivers.set(id, receive); return () => receivers.delete(id) },
      }
    },
  }
}
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve() }
function setup(options) {
  let now = 10000
  let sequence = 0
  const shared = bus(options)
  const make = (id) => createMegatStore(routes, shared.transport(id), id, () => now, () => `${id}-${++sequence}`)
  return { make, shared, advance: (ms) => { now += ms }, time: () => now }
}

for (const channel of ['broadcast', 'storage']) {
  test(`passenger → driver response → passenger cancel synchronizes using ${channel}`, async () => {
    const env = setup({ broadcast: channel === 'broadcast' })
    const pax = env.make('pax'), drv = env.make('drv')
    const request = pax.create(input())
    await flush()
    assert.equal(drv.getSnapshot().requests[0].status, 'searching')
    assert.ok(canSeeMegat(drv.getSnapshot().requests[0], driver(), route, env.time()))
    assert.equal(drv.accept(request.id, driver()), true)
    await flush()
    assert.equal(pax.getSnapshot().requests[0].status, 'accepted')
    assert.equal(pax.getSnapshot().requests[0].vehicleId, 'driver-1')
    const oldAccepted = drv.getSnapshot().state
    assert.equal(pax.cancel(request.id, 'p1'), true)
    await flush()
    assert.equal(drv.getSnapshot().requests[0].status, 'cancelled')
    env.shared.transport('obsolete').publish(oldAccepted)
    await flush()
    assert.equal(drv.getSnapshot().requests[0].status, 'cancelled', 'Old responses must not resurrect cancellation')
    pax.close(); drv.close()
  })
}

test('walking requests stay hidden until passenger confirms arrival; timeout starts upon arrival', () => {
  const env = setup(), store = env.make('one')
  const request = store.create(input({ position: [0.002, 0.005] }))
  assert.equal(request.status, 'walking')
  assert.equal(canSeeMegat(request, driver(), route, env.time()), false)
  assert.equal(store.accept(request.id, driver()), false)
  env.advance(61000)
  assert.equal(store.arrive(request.id, 'p1', [0.002, 0.005]), false, 'A passenger still outside the route must not be moved artificially')
  assert.equal(store.arrive(request.id, 'p1', [0, 0.005]), true)
  const arrived = store.getSnapshot().requests[0]
  assert.equal(arrived.status, 'searching')
  assert.deepEqual(arrived.position, arrived.pickup)
  assert.equal(arrived.expiresAt, env.time() + 60000)
  assert.equal(canSeeMegat(arrived, driver(env.time()), route, env.time()), true)
  store.close()
})

test('request expires by absolute time after backgrounding or reload; late responses are rejected', () => {
  const env = setup(), store = env.make('one')
  const request = store.create(input())
  env.advance(60000)
  const reloaded = env.make('reload')
  assert.equal(reloaded.getSnapshot().requests[0].status, 'expired')
  assert.equal(reloaded.accept(request.id, driver(env.time())), false)
  assert.equal(reloaded.arrive(request.id, 'p1', [0, 0.005]), false)
  assert.equal(reloaded.cancel(request.id, 'p1'), false)
  store.close(); reloaded.close()
})

test('driver visibility enforces exact route direction, radius, route proximity, freshness and eligibility', () => {
  const env = setup(), store = env.make('one')
  const r = store.create(input())
  for (const invalid of [
    { routeId: 'back' }, { status: 'offline' }, { status: 'istirahat' }, { isExample: true },
    { driverVerified: false }, { lastSeenAt: env.time() - 15001 },
    { position: [0, 0.007] }, { position: [0.002, 0] },
  ]) assert.equal(canSeeMegat(r, driver(env.time(), invalid), route, env.time()), false, JSON.stringify(invalid))
  assert.equal(canSeeMegat(r, driver(), route, env.time(), 0.1), false)
  assert.equal(canSeeMegat(r, driver(), reverse, env.time()), false)
  assert.equal(canSeeMegat(r, driver(), route, env.time()), true)
  store.close()
})

test('boarding removes passenger from waiting markers and cannot be performed by another passenger', () => {
  const env = setup(), store = env.make('one')
  const r = store.create(input())
  assert.equal(store.board(r.id, 'p1'), false)
  assert.equal(store.cancel(r.id, 'someone-else'), false)
  store.accept(r.id, driver())
  assert.equal(store.board(r.id, 'someone-else'), false)
  assert.equal(store.board(r.id, 'p1'), true)
  assert.equal(canSeeMegat(store.getSnapshot().requests[0], driver(), route, env.time()), false)
  assert.equal(store.accept(r.id, driver()), false)
  store.close()
})

test('same-passenger retries replace old requests even within the same millisecond', () => {
  const env = setup(), store = env.make('one')
  const a = store.create(input()), b = store.create(input())
  assert.equal(store.getSnapshot().state.requests[a.id].status, 'cancelled')
  assert.equal(store.getSnapshot().requests.length, 1)
  assert.equal(store.getSnapshot().requests[0].id, b.id)
  store.close()
})

test('concurrent different-passenger requests merge without losing either request', async () => {
  const env = setup({ storage: false }), a = env.make('a'), b = env.make('b')
  a.create(input({ passengerId: 'p1' })); b.create(input({ passengerId: 'p2' }))
  await flush()
  assert.equal(a.getSnapshot().requests.length, 2)
  assert.deepEqual(a.getSnapshot().state, b.getSnapshot().state)
  a.close(); b.close()
})

test('two concurrent drivers converge to one accepted vehicle', async () => {
  const env = setup({ storage: false }), pax = env.make('p'), a = env.make('a'), b = env.make('b')
  const r = pax.create(input())
  await flush()
  a.accept(r.id, driver()); b.accept(r.id, driver(env.time(), { id: 'driver-2' }))
  await flush()
  assert.deepEqual(a.getSnapshot().state, b.getSnapshot().state)
  assert.equal(pax.getSnapshot().requests[0].vehicleId, 'driver-2')
  pax.close(); a.close(); b.close()
})

test('no automatic driver match occurs after eight seconds', () => {
  const env = setup(), store = env.make('one')
  store.create(input())
  env.advance(8000); store.tick()
  assert.equal(store.getSnapshot().requests[0].status, 'searching')
  assert.equal(store.getSnapshot().requests[0].vehicleId, null)
  store.close()
})

test('concurrent cancellation takes precedence over a driver response', async () => {
  const env = setup({ storage: false }), pax = env.make('a'), drv = env.make('z')
  const request = pax.create(input())
  await flush()
  pax.cancel(request.id, 'p1')
  drv.accept(request.id, driver())
  await flush()
  assert.equal(pax.getSnapshot().requests[0].status, 'cancelled')
  assert.equal(drv.getSnapshot().requests[0].status, 'cancelled')
  pax.close(); drv.close()
})

test('projection chooses a point along the road instead of a distant sparse vertex', () => {
  const projected = projectToRoute([0, 0.005], route)
  assert.deepEqual(projected.point, [0, 0.005])
  assert.equal(projected.distanceKm, 0)
})

test('invalid channel/storage payloads are rejected', () => {
  assert.equal(parseMegat('not-json', routes), null)
  assert.equal(parseMegat({ schema: 1, requests: [] }, routes), null)
  assert.equal(parseMegat({ schema: 1, requests: { broken: {} } }, routes), null)
})
