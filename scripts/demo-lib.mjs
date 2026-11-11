import { createHash } from 'node:crypto'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

export const root = fileURLToPath(new URL('../', import.meta.url))
export const password = 'AngkotDemo123!'
export const roles = ['penumpang', 'pengemudi', 'admin']
export const accounts = roles.map((role) => ({
  role,
  email: `${role}@demo.angkot.local`,
}))
export function uuid(value) {
  const bytes = createHash('sha256')
    .update(`angkot-live-demo-v1:${value}`)
    .digest()
    .subarray(0, 16)
  bytes[6] = (bytes[6] & 15) | 80
  bytes[8] = (bytes[8] & 63) | 128
  const h = bytes.toString('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
export async function jsonFile(path) {
  return JSON.parse(await readFile(new URL(path, `file://${root}`), 'utf8'))
}
export async function connection() {
  const c = await jsonFile('.local/connection.json')
  if (
    !['127.0.0.1', 'localhost', '[::1]'].includes(new URL(c.API_URL).hostname)
  )
    throw new Error('Seeder/reset hanya untuk Supabase loopback lokal.')
  if (!c.SERVICE_ROLE_KEY || !c.ANON_KEY)
    throw new Error('Jalankan npm run local:env terlebih dahulu.')
  return c
}
export function client(c) {
  return async (
    path,
    { method = 'GET', body, headers = {}, key = c.SERVICE_ROLE_KEY } = {},
  ) => {
    const response = await fetch(c.API_URL + path, {
      method,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        ...(body instanceof Uint8Array
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body:
        body === undefined
          ? undefined
          : body instanceof Uint8Array
            ? body
            : JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    })
    const text = await response.text()
    if (!response.ok)
      throw new Error(
        `${method} ${path.split('?')[0]}: ${response.status} ${text.slice(0, 600)}`,
      )
    return text ? JSON.parse(text) : null
  }
}
export async function savePrivate(path, value) {
  await mkdir(`${root}.local`, { recursive: true, mode: 0o700 })
  await writeFile(
    `${root}${path}`,
    typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n',
    { mode: 0o600 },
  )
}
