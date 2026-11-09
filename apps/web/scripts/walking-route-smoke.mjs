// Live integration check against the pedestrian service, using public landmark coordinates.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { planTrip } from '../src/features/routing/trip-planner.ts'
import { walkingRouter } from '../src/features/routing/walking-router.ts'

const { routes } = JSON.parse(await readFile(new URL('../src/data/angkot-routes.json', import.meta.url)))
const plan = planTrip(routes, [-6.8713, 107.5804], [-6.8925, 107.585])
const routed = await walkingRouter.routePlan(plan)
assert.ok(routed.itineraries.length > 0)
for (const itinerary of routed.itineraries) {
  for (const walk of [itinerary.accessWalk, itinerary.egressWalk, ...itinerary.transfers.map((t) => t.walk)]) {
    assert.equal(walk.routing, 'routed', `Walk could not be routed: ${JSON.stringify([walk.from, walk.to])}`)
    if (walk.meters > 100) assert.ok(walk.path.length > 2, 'Street geometry must contain intermediate points')
  }
}
console.log(JSON.stringify(routed.itineraries.map((itinerary) => ({
  routes: itinerary.legs.map((leg) => leg.route.code),
  accessMeters: itinerary.accessWalk.meters,
  accessPoints: itinerary.accessWalk.path.length,
  transferPoints: itinerary.transfers.map((transfer) => transfer.walk.path.length),
  egressMeters: itinerary.egressWalk.meters,
  egressPoints: itinerary.egressWalk.path.length,
  totalMinutes: itinerary.totalMinutes,
})), null, 2))
