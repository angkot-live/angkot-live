import { spawn } from 'node:child_process'
import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { networkInterfaces } from 'node:os'
import { root, savePrivate, connection } from './demo-lib.mjs'

const cli = root + 'node_modules/.bin/supabase'
export async function run(command, args, options = {}) {
  const { capture = false, ...opts } = options
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      ...opts,
    })
    let stdout = '',
      stderr = ''
    if (capture) {
      child.stdout.on('data', (b) => {
        stdout += b
      })
      child.stderr.on('data', (b) => {
        stderr += b
      })
    }
    child.on('error', reject)
    child.on('close', (code) =>
      code === 0
        ? resolve(stdout)
        : reject(
            new Error(
              `${command} gagal (${code}). ${capture ? stderr.slice(-1500) : ''}`,
            ),
          ),
    )
  })
}
async function config() {
  try {
    return JSON.parse(await readFile(root + '.local/settings.json', 'utf8'))
  } catch {
    return { host: 'localhost', webPort: 5173, apiPort: 8080, https: false }
  }
}
async function configureAuth(s) {
  const scheme = s.https ? 'https' : 'http'
  const origin = `${scheme}://${s.host}:${s.webPort}`
  const origins = [
    ...new Set([
      origin,
      `${scheme}://localhost:${s.webPort}`,
      `${scheme}://127.0.0.1:${s.webPort}`,
    ]),
  ]
  const path = root + 'supabase/config.toml'
  let cfg = await readFile(path, 'utf8')
  cfg = cfg
    .replace(/^site_url = .*$/m, `site_url = "${origin}"`)
    .replace(
      /^additional_redirect_urls = .*$/m,
      `additional_redirect_urls = ${JSON.stringify(origins.map((o) => o + '/**'))}`,
    )
  await writeFile(path, cfg)
}
async function env() {
  const raw = await run(cli, ['status', '-o', 'json'], { capture: true })
  const c = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))
  await savePrivate('.local/connection.json', c)
  const s = await config(),
    scheme = s.https ? 'https' : 'http'
  const origin = `${scheme}://${s.host}:${s.webPort}`
  const origins = [
    ...new Set([
      origin,
      `${scheme}://localhost:${s.webPort}`,
      `${scheme}://127.0.0.1:${s.webPort}`,
    ]),
  ]
  await savePrivate(
    'apps/api/.env',
    `SUPABASE_URL=${c.API_URL}\nSUPABASE_SERVICE_ROLE_KEY=${c.SERVICE_ROLE_KEY}\nSUPABASE_ANON_KEY=${c.ANON_KEY}\nSUPABASE_PUBLIC_URL=/supabase\nWEB_ORIGIN=${origin}\nWEB_ORIGINS=${origins.join(',')}\nAPI_ADDR=127.0.0.1:${s.apiPort}\nENABLE_DEMO_LOGIN=true\nROUTES_FILE=../web/src/data/angkot-routes.json\n`,
  )
  await savePrivate(
    'apps/web/.env.local',
    `VITE_SUPABASE_URL=/supabase\nVITE_SUPABASE_ANON_KEY=${c.ANON_KEY}\nVITE_API_URL=/api\nVITE_ENABLE_DEMO_LOGIN=true\nLOCAL_HTTPS=${s.https}\nLOCAL_WEB_PORT=${s.webPort}\nLOCAL_API_PORT=${s.apiPort}\n`,
  )
  console.log(
    `Environment lokal ditulis (kunci disembunyikan). Aplikasi: ${origin}; Studio: http://127.0.0.1:54323`,
  )
}
const action = process.argv[2]
if (action === 'start') {
  console.log(
    'Menyiapkan Supabase lokal; unduhan image pertama dapat memerlukan beberapa menit…',
  )
  await mkdir(root + '.local', { recursive: true, mode: 0o700 })
  await configureAuth(await config())
  await run(
    cli,
    ['start', '-x', 'realtime,imgproxy,edge-runtime,logflare,vector,supavisor'],
    { capture: true },
  )
  await env()
} else if (action === 'env') await env()
else if (action === 'status') {
  const c = await connection()
  for (const path of ['/auth/v1/health', '/rest/v1/', '/storage/v1/status']) {
    const r = await fetch(c.API_URL + path, {
      headers: {
        apikey: c.ANON_KEY,
        Authorization: `Bearer ${c.SERVICE_ROLE_KEY}`,
      },
    })
    console.log(`${path}: ${r.status}`)
    if (!r.ok) process.exitCode = 1
  }
} else if (action === 'stop') await run(cli, ['stop'])
else if (action === 'migrate') await run(cli, ['migration', 'up', '--local'])
else if (action === 'reset') {
  // Deliberate explicit command: destroys this local project's database, never a remote database.
  await run(cli, ['db', 'reset', '--local', '--yes'], { capture: true })
  await env()
  await run(process.execPath, ['scripts/seed-demo.mjs'])
} else if (action === 'types') {
  const types = await run(cli, ['gen', 'types', 'typescript', '--local'], {
    capture: true,
  })
  await writeFile(root + 'apps/web/src/types/database.generated.ts', types)
  console.log('Tipe database aktual ditulis ke database.generated.ts')
} else if (action === 'web') {
  await run(
    process.execPath,
    [
      root + 'apps/web/node_modules/vite/bin/vite.js',
      '--host',
      '0.0.0.0',
      '--strictPort',
    ],
    {
      cwd: root + 'apps/web',
      env: { ...process.env, NODE_ENV: 'development' },
    },
  )
} else if (action === 'api') {
  const lines = (await readFile(root + 'apps/api/.env', 'utf8'))
    .trim()
    .split('\n')
  const vars = Object.fromEntries(
    lines
      .filter((l) => !l.startsWith('#') && l.includes('='))
      .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
  )
  await run('go', ['run', './cmd/api'], {
    cwd: root + 'apps/api',
    env: { ...process.env, ...vars },
  })
} else if (action === 'cert') {
  const s = await config()
  const hostArg = process.argv.indexOf('--host')
  const host = hostArg >= 0 ? process.argv[hostArg + 1] : 'localhost'
  if (!host || !/^[a-zA-Z0-9.:-]+$/.test(host))
    throw new Error('Hostname/IP tidak valid')
  const portArg = process.argv.indexOf('--port')
  const webPort = portArg >= 0 ? Number(process.argv[portArg + 1]) : s.webPort
  if (!Number.isInteger(webPort) || webPort < 1024 || webPort > 65535)
    throw new Error('Port tidak valid')
  await mkdir(root + '.local/tls', { recursive: true, mode: 0o700 })
  const tls = root + '.local/tls/'
  try {
    await access(tls + 'ca.key')
  } catch {
    await run(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-nodes',
        '-days',
        '3650',
        '-keyout',
        tls + 'ca.key',
        '-out',
        tls + 'ca.crt',
        '-subj',
        '/CN=Angkot Live Local Demo CA',
        '-addext',
        'basicConstraints=critical,CA:TRUE',
        '-addext',
        'keyUsage=critical,keyCertSign,cRLSign',
      ],
      { capture: true },
    )
  }
  const ips = Object.values(networkInterfaces())
    .flat()
    .filter((x) => x && x.family === 'IPv4')
    .map((x) => x.address)
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) ips.push(host)
  const san = [
    ...new Set([
      'DNS:localhost',
      ...ips.map((ip) => `IP:${ip}`),
      ...(!/^\d+\.\d+\.\d+\.\d+$/.test(host) ? [`DNS:${host}`] : []),
    ]),
  ].join(',')
  await writeFile(
    tls + 'server.ext',
    `subjectAltName=${san}\nextendedKeyUsage=serverAuth\nbasicConstraints=critical,CA:FALSE\n`,
  )
  await run(
    'openssl',
    [
      'req',
      '-new',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-keyout',
      tls + 'server.key',
      '-out',
      tls + 'server.csr',
      '-subj',
      '/CN=Angkot Live Local',
    ],
    { capture: true },
  )
  await run(
    'openssl',
    [
      'x509',
      '-req',
      '-in',
      tls + 'server.csr',
      '-CA',
      tls + 'ca.crt',
      '-CAkey',
      tls + 'ca.key',
      '-CAcreateserial',
      '-out',
      tls + 'server.crt',
      '-days',
      '365',
      '-extfile',
      tls + 'server.ext',
    ],
    { capture: true },
  )
  await savePrivate('.local/settings.json', {
    ...s,
    host,
    webPort,
    https: true,
  })
  await configureAuth({ ...s, host, webPort, https: true })
  console.log(
    'Sertifikat tersedia di .local/tls. Percayai HANYA ca.crt pada perangkat demo; jangan bagikan ca.key/server.key. Restart Supabase agar redirect Auth berubah, lalu local:env.',
  )
} else throw new Error('Aksi local tidak dikenal')
