import assert from 'node:assert/strict'
import { test } from 'node:test'
import { coordinateLabel, parseCoordinatePair, parseCoordinates } from '../src/lib/coordinates.ts'

test('accepts negative latitude, positive longitude and whitespace in latitude/longitude order', () => {
  assert.deepEqual(parseCoordinates(' -6.871300 ', ' 107.580400 '), [-6.8713, 107.5804])
  assert.deepEqual(parseCoordinatePair(' -6.871300, 107.580400 '), [-6.8713, 107.5804])
})

test('accepts valid zero and geographical boundaries', () => {
  assert.deepEqual(parseCoordinates('0', '0'), [0, 0])
  assert.deepEqual(parseCoordinates('-90', '180'), [-90, 180])
  assert.deepEqual(parseCoordinates('90', '-180'), [90, -180])
})

test('rejects empty, malformed and out-of-range input instead of silently creating a zero point', () => {
  for (const value of [null, '', ',', ' , ', '-6.9,', ',107.5', '-6.9,107.5,0', '91,107', '-6,181', 'NaN,107', 'Infinity,0', '0x10,107', 'Bandung', '1e2,107']) {
    assert.equal(parseCoordinatePair(value), null, String(value))
  }
  assert.equal(parseCoordinates('-6,876', '107,578'), null, 'Decimal separator must be a dot')
})

test('coordinate labels and shared URL parameters preserve six-decimal precision', () => {
  const point = [-6.871301, 107.580401]
  const params = new URLSearchParams({ fl: coordinateLabel(point), tl: coordinateLabel([-6.8925, 107.585]) })
  const restored = new URLSearchParams(params.toString())
  assert.deepEqual(parseCoordinatePair(restored.get('fl')), point)
  assert.deepEqual(parseCoordinatePair(restored.get('tl')), [-6.8925, 107.585])
})
