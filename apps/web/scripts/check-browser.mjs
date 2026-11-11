// Memastikan Chromium Playwright benar-benar bisa dijalankan.
// Dipakai CI setelah langkah install: install yang "sukses" belum tentu bisa
// launch bila library sistem kurang, dan kegagalan itu harus terlihat di sini
// (dengan pesan jelas), bukan sebagai timeout misterius di tes berikutnya.
import { chromium } from 'playwright'

let browser
try {
  browser = await chromium.launch({ args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setContent('<h1>ok</h1>')
  const text = await page.textContent('h1')
  if (text !== 'ok') throw new Error('Chromium tidak merender halaman uji')
  console.log('PASS chromium: launch + render berhasil')
} catch (error) {
  console.error(
    'FAIL chromium:',
    error instanceof Error ? error.message : error,
  )
  process.exitCode = 1
} finally {
  await browser?.close().catch(() => {})
}
