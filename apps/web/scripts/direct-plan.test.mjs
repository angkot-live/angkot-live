import assert from 'node:assert/strict'
import { test } from 'node:test'
import { directTripPlan } from '../src/features/routing/direct-plan.ts'
const route = {
  id: 'out',
  code: '01',
  origin: 'A',
  destination: 'B',
  polyline: [
    [0, 0],
    [0, 0.01],
    [0, 0.02],
  ],
  isActive: true,
}
const recommendation = {
  route: { id: 'out' },
  board: [0, 0.002],
  alight: [0, 0.018],
  rideKm: 1.78,
  minutes: 14,
  chain: 0,
  boardOffsetKm: 0.222,
  alightOffsetKm: 2.002,
}
test('direct presentation keeps canonical board/alight and direction', () => {
  const plan = directTripPlan([route], [0, 0.002], [0, 0.018], [recommendation])
  assert.equal(plan.itineraries.length, 1)
  const i = plan.itineraries[0]
  assert.equal(i.kind, 'langsung')
  assert.deepEqual(i.legs[0].board, recommendation.board)
  assert.deepEqual(i.legs[0].alight, recommendation.alight)
  assert.deepEqual(i.legs[0].path, [
    [0, 0.002],
    [0, 0.01],
    [0, 0.018],
  ])
  assert.equal(i.legs[0].rideKm, recommendation.rideKm)
  assert.equal(i.transfers.length, 0)
  assert.deepEqual(i.accessWalk.path, [])
})
test('unknown/inactive directions and reversed offsets never yield an itinerary', () => {
  assert.equal(
    directTripPlan([route], [0, 0], [0, 0.02], []).itineraries.length,
    0,
  )
  for (const item of [
    { ...recommendation, route: { id: 'return' } },
    { ...recommendation, chain: 1 },
    { ...recommendation, alightOffsetKm: 0.1 },
  ])
    assert.equal(
      directTripPlan([route], [0, 0], [0, 0.02], [item]).itineraries.length,
      0,
    )
  assert.equal(
    directTripPlan(
      [{ ...route, isActive: false }],
      [0, 0],
      [0, 0.02],
      [recommendation],
    ).itineraries.length,
    0,
  )
})
