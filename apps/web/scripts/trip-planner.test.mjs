import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { planTrip, tripScore } from '../src/features/routing/trip-planner.ts'

const { routes } = JSON.parse(await readFile(new URL('../src/data/angkot-routes.json', import.meta.url)))

test('location beside the Sarijadi start boards route 13 nearby instead of walking to Sutami', () => {
  const publicRouteStart = routes.find((route) => route.id === '4650417').polyline[0]
  const plan = planTrip(routes, publicRouteStart, [-6.8925, 107.585])
  const direct = plan.itineraries.find((itinerary) =>
    itinerary.legs.length === 1 && itinerary.legs[0].route.code === '13',
  )
  assert.ok(direct, 'Keep the direct route to Mall d’Botanica')
  assert.equal(direct.legs[0].route.id, '4650417', 'Use the direction Sarijadi → Stasiun Hall')
  assert.ok(direct.accessWalk.meters < 100, `Expected nearby boarding, got ${direct.accessWalk.meters} m`)
  assert.ok(direct.legs[0].boardIndex < 5, 'Board near the beginning of the outbound route')
})

test('nearby boarding does not allow riding backward along a directed route', () => {
  const route = {
    id: 'one-way', code: 'test', name: 'One-way loop',
    polyline: [[0, 0.006], [0, 0.012], [0.006, 0.012], [0.006, 0], [0, 0]],
  }
  const plan = planTrip([route], [0, 0], [0, 0.012])
  assert.equal(plan.itineraries.length, 1)
  const leg = plan.itineraries[0].legs[0]
  assert.equal(leg.boardIndex, 0, 'The closest point is at the end and cannot reach the destination')
  assert.deepEqual(leg.path, [[0, 0.006], [0, 0.012]])
})

test('a small time saving does not outweigh a long walk, while duration remains unchanged', () => {
  // A 24-minute itinerary with 12 minutes walking should rank below a
  // 25-minute itinerary with only 2 minutes walking.
  assert.ok(tripScore(25, 2, 0) < tripScore(24, 12, 0))
  assert.ok(tripScore(25, 2, 0) < tripScore(25, 2, 1))
})
