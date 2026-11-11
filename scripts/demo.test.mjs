import test from 'node:test'
import assert from 'node:assert/strict'
import { uuid, jsonFile } from './demo-lib.mjs'

test('UUID seed stabil dan domain terpisah', () => {
  assert.equal(uuid('v-1'), uuid('v-1'))
  assert.notEqual(uuid('v-1'), uuid('app-1'))
  assert.match(
    uuid('v-1'),
    /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  )
})
test('Fixture tidak membawa simulasi GPS atau agregat ke seed', async () => {
  const { data } = await jsonFile('supabase/fixtures/mock-data.json')
  assert.equal(data.vehicles.length, 14)
  assert.equal(data.driverApplicants.length, 5)
  assert.equal(data.publicStats, undefined)
  assert.ok(data.vehicles.every((v) => !('position' in v) && !('status' in v)))
})
