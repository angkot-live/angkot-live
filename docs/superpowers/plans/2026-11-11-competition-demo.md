# Rencana kesiapan demo Angkot Live

> **For agentic workers:** Gunakan superpowers:executing-plans untuk pelaksanaan langsung per tugas.

**Goal:** Memperjelas pengalaman publik dan dua role, mempertahankan validasi server, serta menyediakan demo dan bukti yang dapat diulang.

**Architecture:** Pertahankan React, Go/Fiber, Supabase dan snapshot WebSocket. Gunakan katalog/API aktual; pisahkan sumber GPS dan simulasi pada presentasi publik. Reuse rehearsal Playwright dengan konteks role terpisah.

**Tech Stack:** React/TypeScript/Vite, Go, PostgreSQL/PostGIS, Playwright.

**Spec:** Master prompt pengguna, 11 November 2026; salinan sumber berada di attachment sesi.

## Global Constraints

- Dokumentasi Bahasa Indonesia; tanpa klaim penerimaan Android atau hasil uji yang tidak dilakukan.
- Jangan melemahkan Auth, RLS, pencocokan arah, proximity, idempotency atau pemisahan sesi.
- Tidak menambah transfer/tip; tanpa upgrade dependensi besar atau reset database destruktif.
- Ruling: eksekusi langsung pada branch fitur di checkout pengguna agar perubahan terlihat di IDE; tidak membuat worktree kedua.
- Ruling: instruksi otonom pengguna melewati dialog persetujuan desain; desain mengikuti brand dan arsitektur existing.

## Review Focus

Navigasi tablet 768–1023 px, simulasi dianggap GPS asli, layanan kosong versus gagal, recovery koneksi/GPS, dan dokumentasi yang mengklaim integrasi belum dijalankan.

### Task 1: Baseline dan audit

- [x] Baca dokumen kanonis, router, tracking, HTTP/WS, migration dan rehearsal.
- [x] Jalankan unit frontend dan Go race sebagai baseline; periksa Docker/browser.
- [x] Catat temuan berprioritas dan matriks integrasi di docs/demo/ARCHITECTURE_AND_FLOW.md.

### Task 2: Landing, navigasi dan informasi dua role

Files: landing-page.tsx, landing-map-preview.tsx, public-shell.tsx, navigation.ts, driver-tracking-status.tsx, driver-map-page.tsx, index.html.

- [x] Tambahkan browser regression untuk navigasi tablet, penutupan menu, label simulasi, state gagal/kosong dan FAQ; jalankan sebelum implementasi.
- [x] Ekstrak preview SVG ringan, bedakan GPS/simulasi, hilangkan klaim Dishub, tambahkan FAQ, alur dua role, statistik dan retry.
- [x] Perjelas instruksi recovery driver dan feedback assignment kosong tanpa mengubah validasi bisnis.
- [x] Jalankan lint, unit, build, browser fixture dan regression baru.

### Task 3: Demo berulang dan dokumentasi

- [x] Reuse rehearsal tiga iterasi, geolocation browser, akun sementara dan cleanup existing.
- [x] Perbaiki penggunaan konfigurasi default HTTP pada rehearsal bila ditemukan tidak konsisten.
- [x] Buat sembilan dokumen docs/demo dan tautkan dari README.
- [x] Jalankan Go vet/race, audit runtime, SQL dan rehearsal bila prasyarat tersedia; tandai BLOCKED secara eksplisit.
- [x] Minta review terpisah, tangani temuan penting, perbarui bukti final.

## Bukti dan keputusan pelaksanaan

Baseline frontend 50 lulus dan Go race lulus. Implementasi, regression dan dokumentasi selesai; pengujian DB/rehearsal nyata BLOCKED tanpa Docker/Supabase. Tidak menyamakan fixture browser dengan penerimaan database. Detail dan status terbaru ada di docs/demo/TEST_RESULTS.md. Review independen dilakukan setelah diff tersedia; rencana merupakan catatan kerja, bukan klaim penerimaan perangkat.
