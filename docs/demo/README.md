# Panduan demo Angkot Live

Tanggal pembaruan: 11 November 2026.

Mulai dengan [instalasi dan setup](INSTALLATION_AND_SETUP.md), lalu ikuti [operasional dua role](PASSENGER_DRIVER_DEMO.md). Gunakan [checklist](DEMO_CHECKLIST.md) sebelum presentasi dan [naskah presenter](PRESENTER_SCRIPT.md) saat latihan.

Bila Docker/Supabase tidak tersedia dan waktu sangat terbatas, pakai [demo kilat fixture](OFFLINE_DEMO.md) (`npm run demo:offline`). Demo itu berlabel jelas sebagai simulasi dan bukan bukti integrasi nyata.

- [Demo kilat tanpa Docker](OFFLINE_DEMO.md): satu perintah, dua jendela, batasannya.
- [Instalasi dan setup](INSTALLATION_AND_SETUP.md): setup pertama, startup harian, HTTPS dan Android.
- [Demo penumpang–pengemudi](PASSENGER_DRIVER_DEMO.md): lokasi browser terkontrol, Narik, Megat, boarding dan cleanup.
- [Naskah presenter](PRESENTER_SCRIPT.md): presentasi sembilan menit.
- [Checklist demo](DEMO_CHECKLIST.md): persiapan hingga shutdown.
- [Hasil pengujian](TEST_RESULTS.md): bukti aktual, batas fixture dan pengujian yang terhalang.
- [Masalah dan recovery](KNOWN_ISSUES_AND_RECOVERY.md): pemulihan cepat tanpa reset database.
- [Arsitektur dan flow](ARCHITECTURE_AND_FLOW.md): diagram, matriks integrasi dan audit prioritas.
- [Changelog implementasi](IMPLEMENTATION_CHANGELOG.md): perubahan kode dan batas implementasi.

Dokumen kanonis tetap [PRD](../resource/PRD.md), [roadmap](../ROADMAP.md), [setup lengkap](../setup/SETUP.md), [rencana integrasi](../planning/MVP_INTEGRATION_PLAN.md), [ERD awal](../planning/erd.md), dan [OpenAPI](../../apps/api/api/openapi.json). Matriks di sini merujuk implementasi MVP terkini; ERD awal memuat beberapa rancangan lanjutan.

Status: pengujian unit, build dan browser fixture tersedia. Penerimaan dua role dengan Supabase nyata dan Android belum dijalankan pada lingkungan sesi ini. Jangan menggunakan screenshot fixture sebagai bukti armada atau GPS lapangan.
