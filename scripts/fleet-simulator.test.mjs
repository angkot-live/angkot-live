import test from 'node:test'
import assert from 'node:assert/strict'
import { prepareRoute, fleetFrame, distance, loopbackURL } from './fleet-simulator.mjs'

test('fleet follows each disconnected chain without drawing a bridge', () => {
  const chains = prepareRoute({ segments: [[[0, 0], [0, 0.01]], [[1, 1], [1.01, 1]]] })
  assert.equal(chains.length, 2)
  const first = fleetFrame(chains[0], chains[0].length / 2)
  assert.deepEqual(first.position, [0, 0.005])
  assert.equal(first.heading, 90)
  const terminal = fleetFrame(chains[0], chains[0].length + 100)
  assert.deepEqual(terminal.position, [0, 0.01])
  assert.equal(terminal.ended, true)
  assert.deepEqual(fleetFrame(chains[1], 0).position, [1, 1])
})
test('fleet motion respects speed and points at route bends', () => {
  const [chain] = prepareRoute({ polyline: [[0, 0], [0, 0.01], [0.01, 0.01]] })
  const before = fleetFrame(chain, 0.2)
  const after = fleetFrame(chain, 0.2 + 30 * 3 / 3600)
  assert.ok(Math.abs(distance(before.position, after.position) - 0.025) < 1e-6)
  const bend = fleetFrame(chain, chain.cumulative[1] + 0.1)
  assert.ok(bend.position[0] > 0)
  assert.equal(bend.position[1], 0.01)
  assert.equal(bend.heading, 0)
  assert.throws(() => prepareRoute({ id: 'bad', polyline: [[0, 0]] }))
})
test('fleet rejects remote APIs even when Supabase config is local', () => {
  assert.equal(loopbackURL('http://127.0.0.1:8080/api').hostname, '127.0.0.1')
  for (const url of ['https://project.example/api', 'http://192.168.1.7:8080/api', 'http://secret@localhost/api'])
    assert.throws(() => loopbackURL(url))
})
