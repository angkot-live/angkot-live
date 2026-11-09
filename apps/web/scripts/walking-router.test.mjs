import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createWalkingRouter, hasUnavailableWalks } from '../src/features/routing/walking-router.ts'

const from = [-6.8713, 107.5804]
const to = [-6.8765, 107.5785]
const coordinates = [[107.5804, -6.8713], [107.5804, -6.8765], [107.5785, -6.8765]]
const walk = { from, to, path: [], routing: 'estimated', meters: 790, minutes: 11 }
const reply = (distance = 900, geometry = coordinates) => new Response(JSON.stringify({
  code: 'Ok', routes: [{ distance, geometry: { type: 'LineString', coordinates: geometry } }],
}))
const router = (fetcher) => createWalkingRouter({ fetcher, requestIntervalMs: 0 })

test('requests the foot backend and uses all street geometry in Leaflet coordinate order', async () => {
  const client = router(async (url) => {
    assert.match(url, /routed-foot\/route\/v1\/foot\/107\.5804,-6\.8713;107\.5785,-6\.8765/)
    assert.match(url, /overview=full&geometries=geojson/)
    return reply()
  })
  const result = await client.routeWalk(walk)
  assert.deepEqual(result.path, [from, [-6.8765, 107.5804], to])
  assert.equal(result.meters, 900)
  assert.equal(result.minutes, 12)
  assert.equal(result.routing, 'routed')
})

test('reuses successful routes instead of repeatedly calling the public service', async () => {
  let calls = 0
  const client = router(async () => { calls++; return reply() })
  await client.routeWalk(walk)
  await client.routeWalk(walk)
  assert.equal(calls, 1)
})

test('identical endpoints require no request or invented walking time', async () => {
  const client = router(async () => assert.fail('No fetch expected'))
  const result = await client.routeWalk({ ...walk, to: from })
  assert.equal(result.meters, 0)
  assert.equal(result.minutes, 0)
  assert.deepEqual(result.path, [])
})

test('network failures never fall back to a straight polyline and can be retried', async () => {
  let calls = 0
  const client = router(async () => {
    if (++calls === 1) throw new Error('offline')
    return reply()
  })
  const failed = await client.routeWalk(walk)
  assert.equal(failed.routing, 'unavailable')
  assert.deepEqual(failed.path, [])
  assert.equal(failed.meters, walk.meters)
  assert.equal((await client.routeWalk(walk)).routing, 'routed')
})

test('rejects missing routes, server errors, malformed geometry, and distant snapped streets', async () => {
  for (const response of [
    new Response('{}', { status: 503 }),
    new Response(JSON.stringify({ code: 'NoRoute' })),
    reply(-1), reply(900, [[NaN, 0], [0, 0]]), reply(900, [[108, -7], [108.1, -7]]),
  ]) {
    const result = await router(async () => response).routeWalk(walk)
    assert.equal(result.routing, 'unavailable')
    assert.deepEqual(result.path, [])
  }
})

test('updates access, transfer and egress distances, trip totals, and ranking without mutating input', async () => {
  let calls = 0
  const client = router(async () => { calls++; return reply() })
  const itinerary = {
    id: 'a', legs: [], transfers: [{ walk }], accessWalk: walk, egressWalk: walk,
    walkMinutes: 33, totalMinutes: 50, score: 56,
  }
  const input = {
    itineraries: [itinerary, { ...itinerary, id: 'b', totalMinutes: 49, score: 55 }],
    walkOnly: walk,
  }
  const result = await client.routePlan(input)
  assert.equal(calls, 1, 'Deduplicate identical access, egress, transfer and walk-only requests')
  assert.equal(result.itineraries[0].id, 'b')
  const updated = result.itineraries[1]
  assert.equal(updated.walkMinutes, 36)
  assert.equal(updated.totalMinutes, 53)
  assert.equal(updated.score, 95)
  assert.equal(updated.transfers[0].walk.routing, 'routed')
  assert.equal(updated.accessWalk.meters, 900)
  assert.equal(updated.egressWalk.meters, 900)
  assert.equal(result.walkOnly.meters, 900)
  assert.equal(itinerary.totalMinutes, 50)
  assert.equal(walk.routing, 'estimated')
  assert.equal(hasUnavailableWalks(result), false)
})

test('failed walking routes remain explicitly marked as estimates in the plan', async () => {
  const client = router(async () => { throw new Error('offline') })
  const result = await client.routePlan({ itineraries: [], walkOnly: walk })
  assert.equal(hasUnavailableWalks(result), true)
})

test('cancellation prevents obsolete searches from fetching or publishing a fallback', async () => {
  const controller = new AbortController()
  controller.abort()
  const client = router(async () => assert.fail('No fetch expected'))
  await assert.rejects(client.routeWalk(walk, controller.signal), { name: 'AbortError' })
  await assert.rejects(client.routePlan({ itineraries: [], walkOnly: walk }, controller.signal), { name: 'AbortError' })
})
