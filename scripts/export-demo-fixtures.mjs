import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import { createHash } from 'node:crypto'
import { root } from './demo-lib.mjs'

const routeData = JSON.parse(
  await readFile(`${root}apps/web/src/data/angkot-routes.json`, 'utf8'),
)
const fixture = {
  version: 1,
  referenceDate: '2026-11-11',
  sources: {},
  data: {},
}
for (const name of ['data', 'admin', 'passenger', 'driver']) {
  const path = `apps/web/src/mocks/${name}.ts`
  const source = await readFile(root + path, 'utf8')
  fixture.sources[path] = createHash('sha256').update(source).digest('hex')
  const code = stripTypeScriptTypes(source)
    .replace(
      /^import .*from ['"]@\/data\/routes['"]\s*$/gm,
      `const routes = ${JSON.stringify(routeData.routes)};`,
    )
    .replace(/^export \{ routes \} from ['"]@\/data\/routes['"]\s*$/gm, '')
  if (/\bimport\s/.test(code))
    throw new Error(`Unexpected runtime import: ${path}`)
  const mod = await import(
    `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
  )
  Object.assign(fixture.data, mod)
}
delete fixture.data.publicStats
fixture.data.vehicles = fixture.data.vehicles.map(
  ({ id, plate, routeId, driverName }) => ({ id, plate, routeId, driverName }),
)
await mkdir(root + 'supabase/fixtures', { recursive: true })
await writeFile(
  root + 'supabase/fixtures/mock-data.json',
  JSON.stringify(fixture, null, 2) + '\n',
)
console.log(
  'Fixture diekspor dari empat modul mock; posisi simulasi dan agregat diabaikan.',
)
