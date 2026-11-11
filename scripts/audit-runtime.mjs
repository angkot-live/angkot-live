import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { resolve, dirname, relative } from 'node:path'
import { root, savePrivate } from './demo-lib.mjs'
const source = resolve(root, 'apps/web/src'),
  visited = new Set(),
  failures = []
async function local(spec, from) {
  const path = spec.startsWith('@/')
    ? resolve(source, spec.slice(2))
    : spec.startsWith('.')
      ? resolve(dirname(from), spec)
      : null
  if (!path) return null
  for (const candidate of [
    path,
    path + '.tsx',
    path + '.ts',
    path + '.js',
    resolve(path, 'index.tsx'),
    resolve(path, 'index.ts'),
  ])
    try {
      if ((await stat(candidate)).isFile()) return candidate
    } catch {}
  return null
}
async function visit(file) {
  if (visited.has(file)) return
  visited.add(file)
  const name = relative(source, file)
  if (
    /(^|\/)mocks\/|features\/messages\/message-store|features\/tracking\/(animated-vehicles|megat-store)|data\/angkot-routes\.json/.test(
      name,
    )
  )
    failures.push('Sumber fixture runtime: ' + name)
  if (!/\.[jt]sx?$/.test(file)) return
  const code = await readFile(file, 'utf8')
  if (/\bpersist\s*\(/.test(code))
    failures.push('Store persist operasional: ' + name)
  if (/onClick\s*=\s*\{\s*\(\)\s*=>\s*toast\.(success|info)\(/.test(code))
    failures.push('Aksi toast-only: ' + name)
  const specs = [
    ...code.matchAll(
      /\b(?:import|export)\s+(?!type\b)(?:[^'";]*?\s+from\s*)?['"]([^'"]+)['"]/g,
    ),
    ...code.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g),
  ].map((x) => x[1])
  for (const spec of specs) {
    const next = await local(spec, file)
    if (next) await visit(next)
  }
}
await visit(resolve(source, 'main.tsx'))
assert.deepEqual(failures, [], failures.join('\n'))
const report = {
  passed: true,
  modules: visited.size,
  scope:
    'Graph imports statis/dinamis dari main.tsx; prototype yang tidak dirutekan tidak masuk bundle demo',
  files: [...visited].map((x) => relative(source, x)).sort(),
  checked: [
    'no runtime mock imports',
    'no legacy persisted domain stores',
    'no toast-only success/info actions',
  ],
}
await savePrivate('.local/sprint5-runtime-audit.json', report)
console.log(
  `PASS audit runtime: ${visited.size} modul; tidak ada mock, store domain persist atau aksi toast-only pada bundle demo`,
)
