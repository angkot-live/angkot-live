import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '')
  const tls = new URL('../../.local/tls/', import.meta.url)
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: '0.0.0.0',
      port: Number(env.LOCAL_WEB_PORT || 5173),
      strictPort: true,
      fs: {
        deny: [
          '.env',
          '.env.*',
          '**/.git/**',
          '**/.local/**',
          '**/*.{key,crt,pem}',
        ],
      },
      https:
        env.LOCAL_HTTPS === 'true'
          ? {
              key: readFileSync(new URL('server.key', tls)),
              cert: readFileSync(new URL('server.crt', tls)),
            }
          : undefined,
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${env.LOCAL_API_PORT || 8080}`,
          ws: true,
        },
        '/supabase': {
          target: 'http://127.0.0.1:54321',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/supabase/, ''),
        },
      },
    },
  }
})
