import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pickupEta } from '../src/features/tracking/eta.ts'
const route = {
  id: 'out',
  polyline: [
    [0, 0],
    [0, 0.02],
  ],
}
const vehicle = {
  routeId: 'out',
  position: [0, 0.001],
  status: 'jalan',
  speedKph: 20,
  lastSeenAt: Date.now(),
}
test('ETA follows the route to the pickup and rejects a passed point', () => {
  assert.ok(pickupEta(vehicle, [0, 0.01], route) > 0)
  assert.equal(pickupEta(vehicle, [0, 0], route), null)
  assert.equal(
    pickupEta({ ...vehicle, status: 'ngetem' }, [0, 0.01], route),
    null,
  )
  assert.equal(
    pickupEta({ ...vehicle, lastSeenAt: Date.now() - 16000 }, [0, 0.01], route),
    null,
  )
})
test('ETA never bridges disconnected chains', () => {
  const multi = {
    ...route,
    segments: [
      route.polyline,
      [
        [0.01, 0],
        [0.01, 0.02],
      ],
    ],
  }
  assert.equal(pickupEta(vehicle, [0.01, 0.01], multi), null)
})
test('ETA requires the assigned active direction and a usable speed', () => {
  assert.equal(pickupEta(vehicle, [0, 0.01], { ...route, id: 'return' }), null)
  assert.equal(
    pickupEta(vehicle, [0, 0.01], { ...route, isActive: false }),
    null,
  )
  assert.equal(pickupEta({ ...vehicle, speedKph: NaN }, [0, 0.01], route), null)
  assert.equal(pickupEta(vehicle, null, route), null)
})
