import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getCurrentLocation, locationErrorMessage } from '../src/lib/geolocation.ts'

const position = { coords: { latitude: -6.9039, longitude: 107.618 } }

function mockLocation(responses, secure = true) {
  const calls = []
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { isSecureContext: secure } })
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      geolocation: {
        getCurrentPosition(success, failure, options) {
          calls.push(options)
          const response = responses.shift()
          if (response?.code) failure(response)
          else success(response)
        },
      },
    },
  })
  return calls
}

test('returns device coordinates when location succeeds', async () => {
  const calls = mockLocation([position])
  assert.equal(await getCurrentLocation(), position)
  assert.equal(calls.length, 1)
})

for (const code of [2, 3]) {
  test(`recovers from location error ${code} with network/cached location`, async () => {
    const calls = mockLocation([{ code }, position])
    assert.equal(await getCurrentLocation(), position)
    assert.equal(calls.length, 2)
    assert.equal(calls[1].enableHighAccuracy, false)
    assert.ok(calls[1].maximumAge > 0)
  })
}

test('does not retry denied permission and explains how to enable it', async () => {
  const denied = { code: 1 }
  const calls = mockLocation([denied])
  await assert.rejects(getCurrentLocation(), (error) => error === denied)
  assert.equal(calls.length, 1)
  assert.match(locationErrorMessage(denied), /pengaturan situs/)
})

test('reports the final failure after retry with a specific message', async () => {
  mockLocation([{ code: 2 }, { code: 3 }])
  await assert.rejects(getCurrentLocation(), (error) => {
    assert.match(locationErrorMessage(error), /batas waktu/)
    return true
  })
  assert.match(locationErrorMessage({ code: 2 }), /belum tersedia/)
})

test('explains secure context and unsupported browser requirements', async () => {
  const calls = mockLocation([], false)
  await assert.rejects(getCurrentLocation(), /HTTPS atau localhost/)
  assert.equal(calls.length, 0)
  mockLocation([])
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} })
  await assert.rejects(getCurrentLocation(), /tidak mendukung/)
})
