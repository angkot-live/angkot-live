import assert from 'node:assert/strict'
import { test } from 'node:test'
import { groupRouteDirections, vehiclesForRouteSelection, vehiclesWithinRadius } from '../src/features/tracking/route-directory.ts'

const routes = [
  { id: '13-out', code: '13', name: 'Sarijadi → Hall', color: '#004425' },
  { id: '13-back', code: '13', name: 'Hall → Sarijadi', color: '#004425' },
  { id: '14-out', code: '14', name: 'Another route', color: '#aabbcc' },
]
const vehicles = [{ id: 'a', routeId: '13-out' }, { id: 'b', routeId: '13-back' }, { id: 'c', routeId: '14-out' }]

test('the initial directory and cleared selection do not reveal vehicle positions', () => {
  for (const selection of ['', 'semua', 'unknown']) assert.deepEqual(vehiclesForRouteSelection(vehicles, selection, routes), [])
})

test('selecting one route code reveals its directions and excludes other routes', () => {
  assert.deepEqual(vehiclesForRouteSelection(vehicles, '13', routes).map((v) => v.id), ['a', 'b'])
  assert.deepEqual(vehiclesForRouteSelection(vehicles, '14', routes).map((v) => v.id), ['c'])
  assert.deepEqual(vehiclesForRouteSelection(vehicles, '13-out', routes).map((v) => v.id), ['a'])
})

test('opposite directions appear as one route card while retaining their geometry references', () => {
  const groups = groupRouteDirections(routes)
  assert.equal(groups.length, 2)
  assert.equal(groups[0].code, '13')
  assert.deepEqual(groups[0].directions.map((r) => r.id), ['13-out', '13-back'])
  assert.equal(groups[1].directions.length, 1)
})

test('radius filter keeps only vehicles within 500 meters from the current location', () => {
  const center = [-6.9039, 107.618]
  const inside = { id: 'near', position: [-6.905, 107.619] }
  const outside = { id: 'far', position: [-6.92, 107.64] }
  assert.deepEqual(
    vehiclesWithinRadius([inside, outside], center, 0.5).map((vehicle) => vehicle.id),
    ['near'],
  )
})
