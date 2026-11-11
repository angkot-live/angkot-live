import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { demoSettings, demoOrigin } from './demo-settings.mjs'

test('fresh setup uses HTTP and default ports without a certificate settings file', async () => {
  assert.equal(demoOrigin(await demoSettings('/nonexistent/angkot-settings.json')), 'http://localhost:5173')
})
test('HTTPS LAN configuration is preserved and malformed JSON is not hidden', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'angkot-settings-'))
  const file = join(dir, 'settings.json')
  try {
    await writeFile(file, JSON.stringify({ host: '192.168.1.7', webPort: 5180, https: true }))
    assert.equal(demoOrigin(await demoSettings(file)), 'https://192.168.1.7:5180')
    await writeFile(file, '{broken')
    await assert.rejects(demoSettings(file), SyntaxError)
  } finally { await rm(dir, { recursive: true }) }
})
