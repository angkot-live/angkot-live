import { readFile } from 'node:fs/promises'

export async function demoSettings(path = new URL('../.local/settings.json', import.meta.url)) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return { host: 'localhost', webPort: 5173, apiPort: 8080, https: false }
  }
}
export function demoOrigin(settings) {
  return `${settings.https ? 'https' : 'http'}://${settings.host}:${settings.webPort}`
}
