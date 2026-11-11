import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'
const listeners = {}
runInNewContext(
  readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'),
  {
    self: {
      addEventListener: (name, fn) => (listeners[name] = fn),
      location: { origin: 'https://demo.local' },
    },
    URL,
  },
)
test('service worker never handles private API/Auth/Storage/signed URLs', () => {
  for (const path of [
    '/api/me',
    '/api/documents/url',
    '/supabase/auth/v1/user',
    '/supabase/storage/v1/object/sign/private?token=secret',
    '/storage/v1/object/a',
    '/document.pdf?token=secret',
    '/not-a-public-asset.pdf',
  ]) {
    let handled = false
    listeners.fetch({
      request: {
        method: 'GET',
        url: 'https://demo.local' + path,
        mode: 'cors',
        headers: new Headers(),
      },
      respondWith: () => (handled = true),
    })
    assert.equal(handled, false, path)
  }
})
