# Katalog Hasil Pemisahan GeoJSON Trayek Angkot Kota Bandung

Dokumen ini merupakan referensi terstruktur untuk **hasil pemisahan 82 arah jalur angkot Kota Bandung** (37 nomor trayek bolak-balik/cabang) agar mudah dibaca oleh **AI Agent** maupun diintegrasikan langsung ke **Google Maps (GMaps)**.

---

## 1. Struktur Folder Hasil Pemisahan

| Path / Folder | Isi Data | Tipe Geometri | Kapan Digunakan di Google Maps? |
|---|---|---|---|
| [`index_jalur.json`](./index_jalur.json) | Metadata 82 jalur, `bounds_gmaps`, `center_gmaps`, `endstops_gmaps` (`{lat, lng}`), daftar `jalan_dilalui`, & path file | JSON Metadata | **Baca file ini pertama kali** untuk menampilkan daftar trayek di UI, fitur pencarian jalan, pin terminal instan, & auto-zoom `map.fitBounds()` |
| [`gabungan/`](./gabungan/) | 82 file GeoJSON gabungan (`ways` + `endstops`) | `LineString` + `Point` | Saat menggunakan `map.data.loadGeoJson()` (cukup 1x fetch untuk mendapatkan garis rute sekaligus titik terminal) |
| [`ways/`](./ways/) | 82 file GeoJSON khusus lintasan jalan | `LineString` | Saat merender garis trayek menggunakan komponen `<Polyline />` terpisah |
| [`endstops/`](./endstops/) | 82 file GeoJSON khusus titik pemberhentian akhir | `Point` | Saat merender pin terminal menggunakan `<AdvancedMarker />` atau `<Marker />` |

---

## 2. Struktur Metadata Siap Pakai GMaps (`index_jalur.json`)

Setiap item di dalam `daftar_jalur` pada `index_jalur.json` sudah memiliki koordinat yang dikonversi ke format `{ lat, lng }` Google Maps serta *bounding box* siap pakai:

```json
{
  "kode_jalur": "3415464",
  "nomor_trayek": "01A",
  "nama_rute": "Abdul Muis → Cicaheum via Binong",
  "label_jalur": "01A: Abdul Muis → Cicaheum via Binong",
  "nama_file": "01A_abdul_muis_ke_cicaheum_via_binong_3415464.geojson",
  "jumlah_fitur_ways": 108,
  "jumlah_fitur_endstops": 2,
  "jumlah_fitur_gabungan": 110,
  "endstops_gmaps": [
    {
      "id": 3374033509,
      "name": "Terminal Abdul Muis/Kebon Kalapa",
      "lat": -6.9276428,
      "lng": 107.6058322
    },
    {
      "id": 11291524413,
      "name": "Terminal Angkot Cicaheum",
      "lat": -6.9024172,
      "lng": 107.6562486
    }
  ],
  "bounds_gmaps": {
    "north": -6.8977908,
    "south": -6.9343972,
    "east": 107.6572943,
    "west": 107.6058322
  },
  "center_gmaps": {
    "lat": -6.916094,
    "lng": 107.6315632
  },
  "jalan_dilalui": [
    "Jalan PH. H. Mustofa",
    "Jalan Turangga",
    "Jalan Mochammad Ramdhan",
    "Jalan Jenderal Gatot Subroto",
    "Jalan Balonggede",
    "Jalan Kyai Haji Ahmad Dahlan",
    "Jalan Brigjend. Katamso",
    "Jalan Supratman",
    "Jalan Pungkur",
    "Jalan Palasari",
    "Jalan Lodaya",
    "Jalan Pahlawan",
    "Jalan Lauk Emas",
    "Jalan Dewi Sartika",
    "Jalan R.A.A. Martanegara",
    "Jalan Sadakeling",
    "Jalan Jakarta",
    "Jalan H. Ibrahim Adjie",
    "Jalan Lapang Supratman",
    "Jalan Kautamaan Istri",
    "Jalan Jenderal Ahmad Yani",
    "Jalan Cikuray",
    "Jalan Karapitan"
  ],
  "files": {
    "gabungan": "output_geojson/gabungan/01A_abdul_muis_ke_cicaheum_via_binong_3415464.geojson",
    "ways": "output_geojson/ways/01A_abdul_muis_ke_cicaheum_via_binong_3415464.geojson",
    "endstops": "output_geojson/endstops/01A_abdul_muis_ke_cicaheum_via_binong_3415464.geojson"
  }
}
```

### Atribut `properties` di Dalam Setiap File `.geojson`
- `kode_jalur` (`string`): ID unik jalur (contoh: `"3415464"`)
- `nomor_trayek` (`string`): Nomor trayek angkot (contoh: `"01A"`)
- `nama_rute` (`string`): Nama rute (contoh: `"Abdul Muis → Cicaheum via Binong"`)
- `label_jalur` (`string`): Gabungan kode & nama rute (contoh: `"01A: Abdul Muis → Cicaheum via Binong"`)
- `kategori_data` (`string`): Bernilai `"ways"` untuk segmen garis jalan, atau `"endstops"` untuk titik terminal
- `name` (`string`, opsional): Nama jalan (pada `ways`) atau nama terminal/pangkalan (pada `endstops`)

---

## 3. Contoh Integrasi Cepat ke Google Maps

```javascript
// 1. Fetch katalog utama index_jalur.json
const res = await fetch('/output_geojson/index_jalur.json');
const { daftar_jalur } = await res.json();

// 2. Pilih rute (misal berdasarkan kode_jalur atau pencarian jalan_dilalui)
const rute = daftar_jalur.find((item) => item.kode_jalur === '3415464');

// 3. Langsung fokuskan kamera Google Maps ke area rute (tanpa hitung manual!)
map.fitBounds(rute.bounds_gmaps);

// 4. Render Marker titik awal & akhir langsung dari endstops_gmaps
rute.endstops_gmaps.forEach((stop) => {
  new google.maps.Marker({
    map,
    position: { lat: stop.lat, lng: stop.lng },
    title: `${rute.label_jalur} (${stop.name})`,
  });
});

// 5. Render garis lintasan dari folder ways/
const waysRes = await fetch(`/${rute.files.ways}`);
const waysGeoJson = await waysRes.json();
map.data.addGeoJson(waysGeoJson);
map.data.setStyle({ strokeColor: '#10B981', strokeWeight: 5 });
```

> **Catatan Penting Koordinat GeoJSON vs Google Maps:**
> - Di dalam `index_jalur.json` (`endstops_gmaps`, `bounds_gmaps`, `center_gmaps`), seluruh koordinat **sudah berformat `{ lat, lng }` Google Maps**.
> - Di dalam file `.geojson` (`gabungan/`, `ways/`, `endstops/`), koordinat mengikuti standar GeoJSON **`[longitude, latitude]`**. Jika mem-parsing `geometry.coordinates` secara manual untuk `<Polyline />`, balik urutannya menjadi `{ lat: coord[1], lng: coord[0] }`.

---

## 4. Katalog Lengkap 82 Arah Jalur (Dikelompokkan per Nomor Trayek)

### Trayek `01A`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `3415464` | **Abdul Muis → Cicaheum via Binong** | • **Terminal Abdul Muis/Kebon Kalapa** (`-6.9276428, 107.6058322`)<br>• **Terminal Angkot Cicaheum** (`-6.9024172, 107.6562486`) | 108 | [`gabungan`](./gabungan/01A_abdul_muis_ke_cicaheum_via_binong_3415464.geojson) · [`ways`](./ways/01A_abdul_muis_ke_cicaheum_via_binong_3415464.geojson) · [`endstops`](./endstops/01A_abdul_muis_ke_cicaheum_via_binong_3415464.geojson) |
| `4635390` | **Cicaheum → Abdul Muis via Binong** | • **Terminal Angkot Cicaheum** (`-6.9024172, 107.6562486`)<br>• **Terminal Abdul Muis/Kebon Kalapa** (`-6.9276428, 107.6058322`) | 133 | [`gabungan`](./gabungan/01A_cicaheum_ke_abdul_muis_via_binong_4635390.geojson) · [`ways`](./ways/01A_cicaheum_ke_abdul_muis_via_binong_4635390.geojson) · [`endstops`](./endstops/01A_cicaheum_ke_abdul_muis_via_binong_4635390.geojson) |

- **Nama file (`3415464`)**: `01A_abdul_muis_ke_cicaheum_via_binong_3415464.geojson`  
  **Jalan yang dilalui**: Jalan PH. H. Mustofa, Jalan Turangga, Jalan Mochammad Ramdhan, Jalan Jenderal Gatot Subroto, Jalan Balonggede, Jalan Kyai Haji Ahmad Dahlan, Jalan Brigjend. Katamso, Jalan Supratman, Jalan Pungkur, Jalan Palasari, Jalan Lodaya, Jalan Pahlawan, Jalan Lauk Emas, Jalan Dewi Sartika, Jalan R.A.A. Martanegara, Jalan Sadakeling, Jalan Jakarta, Jalan H. Ibrahim Adjie, Jalan Lapang Supratman, Jalan Kautamaan Istri, Jalan Jenderal Ahmad Yani, Jalan Cikuray, Jalan Karapitan
- **Nama file (`4635390`)**: `01A_cicaheum_ke_abdul_muis_via_binong_4635390.geojson`  
  **Jalan yang dilalui**: Jalan H. Ibrahim Adjie, Jalan Dewi Sartika, Jalan Mohammad Toha, Jalan R.A.A. Martanegara, Jalan Turangga, Jalan PH. H. Mustofa, Jalan Gajah, Jalan Jenderal Gatot Subroto, Jalan Brigjend. Katamso, Jalan Gurame, Jalan Sadakeling, Jalan Jenderal Ahmad Yani, Jalan Palasari, Jalan Lodaya, Jalan Pahlawan, Jalan Ibu Inggit Ganarsih, Jalan Supratman, Jalan Cikutra, Jalan BKR, Jalan Mochammad Ramdhan, Jalan Kyai Haji Ahmad Dahlan, Jalan Buah Batu

### Trayek `01B`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `4636155` | **Abdul Muis → Cicaheum via Aceh** | • **Terminal Abdul Muis/Kebon Kalapa** (`-6.9276428, 107.6058322`)<br>• **Terminal Angkot Cicaheum** (`-6.9024172, 107.6562486`) | 71 | [`gabungan`](./gabungan/01B_abdul_muis_ke_cicaheum_via_aceh_4636155.geojson) · [`ways`](./ways/01B_abdul_muis_ke_cicaheum_via_aceh_4636155.geojson) · [`endstops`](./endstops/01B_abdul_muis_ke_cicaheum_via_aceh_4636155.geojson) |
| `4635842` | **Cicaheum → Abdul Muis via Aceh** | • **Terminal Angkot Cicaheum** (`-6.9024172, 107.6562486`)<br>• **Terminal Abdul Muis/Kebon Kalapa** (`-6.9276428, 107.6058322`) | 66 | [`gabungan`](./gabungan/01B_cicaheum_ke_abdul_muis_via_aceh_4635842.geojson) · [`ways`](./ways/01B_cicaheum_ke_abdul_muis_via_aceh_4635842.geojson) · [`endstops`](./endstops/01B_cicaheum_ke_abdul_muis_via_aceh_4635842.geojson) |

- **Nama file (`4636155`)**: `01B_abdul_muis_ke_cicaheum_via_aceh_4636155.geojson`  
  **Jalan yang dilalui**: Jalan Taman Pramuka, Jalan Karapitan, Jalan Mochammad Ramdhan, Jalan PH. H. Mustofa, Jalan Balonggede, Jalan Lombok, Jalan Cendana, Jalan Sumbawa, Jalan Brigjend. Katamso, Jalan Pahlawan, Jalan Pungkur, Jalan Aceh, Jalan Dewi Sartika, Jalan Banda, Jalan Belitung, Jalan Cikutra, Jalan Supratman, Jalan Kautamaan Istri, Jalan Aceh 108, Jalan Sunda, Jalan Jenderal Ahmad Yani, Jalan Lapang Supratman
- **Nama file (`4635842`)**: `01B_cicaheum_ke_abdul_muis_via_aceh_4635842.geojson`  
  **Jalan yang dilalui**: Jalan Dewi Sartika, Jalan PH. H. Mustofa, Jalan Lengkong Besar, Jalan Brigjend. Katamso, Jalan Ibu Inggit Ganarsih, Jalan Tamblong, Jalan Sumatra, Jalan Cendana, Jalan Belitung, Jalan Jenderal Ahmad Yani, Jalan Lapang Supratman, Jalan Laksamana Laut Raden Eddy Martadinata, Jalan Pahlawan, Jalan Aceh, Jalan Supratman, Jalan Lombok, Jalan Taman Pramuka

### Trayek `02`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `4643111` | **Abdul Muis → Dago** | • **Terminal Abdul Muis/Kebon Kalapa** (`-6.9276428, 107.6058322`)<br>• **Terminal Dago** (`-6.8670778, 107.6212119`) | 81 | [`gabungan`](./gabungan/02_abdul_muis_ke_dago_4643111.geojson) · [`ways`](./ways/02_abdul_muis_ke_dago_4643111.geojson) · [`endstops`](./endstops/02_abdul_muis_ke_dago_4643111.geojson) |
| `4643109` | **Dago → Abdul Muis** | • **Resor Dago Pakar** (`-6.8651759, 107.6263618`)<br>• **Terminal Abdul Muis/Kebon Kalapa** (`-6.9276428, 107.6058322`) | 83 | [`gabungan`](./gabungan/02_dago_ke_abdul_muis_4643109.geojson) · [`ways`](./ways/02_dago_ke_abdul_muis_4643109.geojson) · [`endstops`](./endstops/02_dago_ke_abdul_muis_4643109.geojson) |

- **Nama file (`4643111`)**: `02_abdul_muis_ke_dago_4643111.geojson`  
  **Jalan yang dilalui**: Jalan Karapitan, Jalan Mochammad Ramdhan, Jalan Seram, Jalan Ir. H. Djuanda, Jalan Balonggede, Jalan Belitung, Jalan Sumbawa, Jalan Pungkur, Jalan Aceh, Jalan Sumatra, Jalan Dewi Sartika, Jalan L.L. RE. Martadinata, Jalan Kautamaan Istri, Jalan Sunda, Terminal Dago
- **Nama file (`4643109`)**: `02_dago_ke_abdul_muis_4643109.geojson`  
  **Jalan yang dilalui**: Jalan Merdeka, Jalan Ir. H. Djuanda, Jalan Hasanudin, Jalan Dipatiukur, Jalan Dewi Sartika, Jalan Lengkong Besar, Jalan Ibu Inggit Ganarsih, Jalan Tamblong, Jalan Sumatra, Jalan Belitung, Jalan Kalimantan, Jalan Aceh, Jalan Raya Golf, Jalan Raya Dago Resort

### Trayek `03`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `4308300` | **Abdul Muis → Ledeng** | • **Terminal Abdul Muis/Kebon Kalapa** (`-6.9276428, 107.6058322`)<br>• **Terminal Ledeng** (`-6.85933, 107.5951942`) | 107 | [`gabungan`](./gabungan/03_abdul_muis_ke_ledeng_4308300.geojson) · [`ways`](./ways/03_abdul_muis_ke_ledeng_4308300.geojson) · [`endstops`](./endstops/03_abdul_muis_ke_ledeng_4308300.geojson) |
| `4636013` | **Ledeng → Abdul Muis** | • **Terminal Ledeng** (`-6.85933, 107.5951942`)<br>• **Terminal Abdul Muis/Kebon Kalapa** (`-6.9276428, 107.6058322`) | 87 | [`gabungan`](./gabungan/03_ledeng_ke_abdul_muis_4636013.geojson) · [`ways`](./ways/03_ledeng_ke_abdul_muis_4636013.geojson) · [`endstops`](./endstops/03_ledeng_ke_abdul_muis_4636013.geojson) |

- **Nama file (`4308300`)**: `03_abdul_muis_ke_ledeng_4308300.geojson`  
  **Jalan yang dilalui**: Jalan Merdeka, Jalan Pajajaran, Jalan Cihampelas, Jalan Raden Adipati Aria Wiranatakusumah, Jalan Pasir Kaliki, Jalan Sukajadi, Jalan Karapitan, Jalan Mochammad Ramdhan, Jalan Perintis Kemerdekaan, Jalan Pasteur, Jalan Balonggede, Jalan Lombok, Jalan Sumbawa, Jalan Banda, Jalan Wastukancana, Jalan Abdul Rivai, Jalan Pungkur, Jalan Dokter Djunjunan, Jalan Dewi Sartika, Jalan L.L. RE. Martadinata, Jalan Dr. Setiabudi, Jalan Kautamaan Istri, Jalan Sunda, Jalan HOS. Cokroaminoto
- **Nama file (`4636013`)**: `03_ledeng_ke_abdul_muis_4636013.geojson`  
  **Jalan yang dilalui**: Jalan L.L. RE. Martadinata, Jalan Purnawarman, Jalan Cihampelas, Jalan Dewi Sartika, Jalan Lengkong Besar, Jalan Dr. Setiabudi, Jalan Ibu Inggit Ganarsih, Jalan Tamblong, Jalan Sumatra, Jalan Belitung, Jalan Kalimantan, Jalan Wastukancana, Jalan Wastukencana, Jalan Aceh

### Trayek `04`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `4294191` | **Abdul Muis → Elang** | • **Terminal Abdul Muis/Kebon Kalapa** (`-6.9276428, 107.6058322`)<br>• **Simpang Holis Soekarno Hatta** (`-6.923662, 107.5751042`) | 30 | [`gabungan`](./gabungan/04_abdul_muis_ke_elang_4294191.geojson) · [`ways`](./ways/04_abdul_muis_ke_elang_4294191.geojson) · [`endstops`](./endstops/04_abdul_muis_ke_elang_4294191.geojson) |
| `4647871` | **Elang → Abdul Muis** | • **Simpang Holis Soekarno Hatta** (`-6.923662, 107.5751042`)<br>• **Terminal Abdul Muis/Kebon Kalapa** (`-6.9276428, 107.6058322`) | 31 | [`gabungan`](./gabungan/04_elang_ke_abdul_muis_4647871.geojson) · [`ways`](./ways/04_elang_ke_abdul_muis_4647871.geojson) · [`endstops`](./endstops/04_elang_ke_abdul_muis_4647871.geojson) |

- **Nama file (`4294191`)**: `04_abdul_muis_ke_elang_4294191.geojson`  
  **Jalan yang dilalui**: Jalan Ibu Inggit Ganarsih, Jalan Pagarsih Barat, Jalan Suryani Dalam, Jalan Panjunan, Jalan Kopo, Jalan Pungkur, Jalan Otto Iskandardinata, Jalan Astana Anyar, Jalan Suryani, Jalan Nana Rohana, Jalan Holis, Jalan Pasir Koja, Jalan Dewi Sartika
- **Nama file (`4647871`)**: `04_elang_ke_abdul_muis_4647871.geojson`  
  **Jalan yang dilalui**: Jalan Dewi Sartika, Jalan Pagarsih Barat, Jalan Suryani Dalam, Jalan Kalipah Apo, Jalan Otto Iskandardinata, Jalan Ibu Inggit Ganarsih, Jalan Suryani, Jalan Nana Rohana, Jalan Holis

### Trayek `05`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `4291047` | **Cicaheum → Ledeng** | • **Terminal Angkot Cicaheum** (`-6.9024172, 107.6562486`)<br>• **Terminal Ledeng** (`-6.85933, 107.5951942`) | 118 | [`gabungan`](./gabungan/05_cicaheum_ke_ledeng_4291047.geojson) · [`ways`](./ways/05_cicaheum_ke_ledeng_4291047.geojson) · [`endstops`](./endstops/05_cicaheum_ke_ledeng_4291047.geojson) |
| `4637081` | **Ledeng → Cicaheum** | • **Terminal Ledeng** (`-6.85933, 107.5951942`)<br>• **Terminal Angkot Cicaheum** (`-6.9024172, 107.6562486`) | 95 | [`gabungan`](./gabungan/05_ledeng_ke_cicaheum_4637081.geojson) · [`ways`](./ways/05_ledeng_ke_cicaheum_4637081.geojson) · [`endstops`](./endstops/05_ledeng_ke_cicaheum_4637081.geojson) |

- **Nama file (`4291047`)**: `05_cicaheum_ke_ledeng_4291047.geojson`  
  **Jalan yang dilalui**: Jalan Sulanjana, Jalan Cihampelas, Jalan Diponegoro, Jalan Sukajadi, Jalan Tamansari, Jalan Jurang, Jalan Lamping, Jalan Sukamaju, Jalan PH. H. Mustofa, Jalan Siliwangi, Jalan Surapati, Jalan Aria Jipang, Jalan Brigjend. Katamso, Jalan Jenderal Ahmad Yani, Jalan Pahlawan, Jalan Sentot Alibasyah, Jalan Dr. Setiabudi, Jalan Supratman, Jalan Boscha
- **Nama file (`4637081`)**: `05_ledeng_ke_cicaheum_4637081.geojson`  
  **Jalan yang dilalui**: Jalan Sentot Alibasyah, Jalan Siliwangi, Jalan Tamansari, Jalan PH. H. Mustofa, Jalan Surapati, Jalan Cikapayang, Jalan Dr. Setiabudi, Jalan Cihampelas, Jalan Sumur Bandung, Jalan Brigjend. Katamso, Jalan Diponegoro, Jalan Supratman, Jalan Pahlawan, Jalan Jenderal Ahmad Yani

### Trayek `06`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `4291189` | **Cicaheum → Ciroyom** | • **Terminal Angkot Cicaheum** (`-6.9024172, 107.6562486`)<br>• **Stasiun Ciroyom** (`-6.914151, 107.5890644`) | 123 | [`gabungan`](./gabungan/06_cicaheum_ke_ciroyom_4291189.geojson) · [`ways`](./ways/06_cicaheum_ke_ciroyom_4291189.geojson) · [`endstops`](./endstops/06_cicaheum_ke_ciroyom_4291189.geojson) |
| `4637686` | **Ciroyom → Cicaheum** | • **Stasiun Ciroyom** (`-6.914151, 107.5890644`)<br>• **Terminal Angkot Cicaheum** (`-6.9024172, 107.6562486`) | 128 | [`gabungan`](./gabungan/06_ciroyom_ke_cicaheum_4637686.geojson) · [`ways`](./ways/06_ciroyom_ke_cicaheum_4637686.geojson) · [`endstops`](./endstops/06_ciroyom_ke_cicaheum_4637686.geojson) |

- **Nama file (`4291189`)**: `06_cicaheum_ke_ciroyom_4291189.geojson`  
  **Jalan yang dilalui**: Jalan Cihampelas, Jalan HOS. Cokroaminoto, Jalan Aruna, Jalan PH. H. Mustofa, Jalan Surapati, Jalan Siliwangi, Jalan Sederhana, Jalan Tamansari, Jalan Pasir Kaliki, Jalan Pasteur, Jalan Prabudimuntur, Jalan Penata Yudha, Jalan Profesor Christiaan Eijkman, Jalan Pajajaran, Jalan Dipatiukur, Jalan Jenderal Ahmad Yani, Jalan Prabu Dimuntur, Jalan Sumur Bandung, Jalan Arjuna, Jalan Layang Ciroyom, Jalan Ciroyom
- **Nama file (`4637686`)**: `06_ciroyom_ke_cicaheum_4637686.geojson`  
  **Jalan yang dilalui**: Jalan Dursasana, Jalan Aruna, Jalan Pasir Kaliki, Jalan Sukajadi, Jalan Siliwangi, Jalan Dipatiukur, Jalan Ciroyom, Jalan Sukamaju, Jalan Karangsari, Jalan Sederhana, Jalan PH. H. Mustofa, Jalan Dr. Setiabudi, Jalan Cihampelas, Jalan Surapati, Jalan Singaperbangsa, Jalan Astina, Jalan HOS. Cokroaminoto, Jalan Wirayuda Barat, Jalan Pajajaran, Jalan Arjuna, Jalan Jenderal Ahmad Yani, Jalan Layang Ciroyom

### Trayek `07`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `4308485` | **Gasibu → Derwati** | • **Lapangan Gasibu A** (`-6.9011743, 107.6199195`)<br>• **Simpang Derwati** (`-6.9667195, 107.6866274`) | 102 | [`gabungan`](./gabungan/07_gasibu_ke_derwati_4308485.geojson) · [`ways`](./ways/07_gasibu_ke_derwati_4308485.geojson) · [`endstops`](./endstops/07_gasibu_ke_derwati_4308485.geojson) |
| `4648328` | **Derwati → Gasibu** | • **Simpang Derwati** (`-6.9667195, 107.6866274`)<br>• **Lapangan Gasibu A** (`-6.9011743, 107.6199195`) | 129 | [`gabungan`](./gabungan/07_derwati_ke_gasibu_4648328.geojson) · [`ways`](./ways/07_derwati_ke_gasibu_4648328.geojson) · [`endstops`](./endstops/07_derwati_ke_gasibu_4648328.geojson) |

- **Nama file (`4308485`)**: `07_gasibu_ke_derwati_4308485.geojson`  
  **Jalan yang dilalui**: Jalan H. Ibrahim Adjie, Jalan Terusan Kiara Condong, Jalan Derwati, Jalan Diponegoro, Jalan Supratman, Jalan Jenderal Ahmad Yani, Jalan Marga Cinta, Marga Cinta, Jalan Letnan Jenderal Ibrahim Adjie, Jalan Gedebage Selatan
- **Nama file (`4648328`)**: `07_derwati_ke_gasibu_4648328.geojson`  
  **Jalan yang dilalui**: Jalan Terusan Kiara Condong, Jalan Derwati, Jalan Diponegoro, Jalan Supratman, Jalan Marga Cinta, Marga Cinta, Jalan Sentot Alibasyah, Jalan Jakarta, Jalan H. Ibrahim Adjie, Jalan Lapang Supratman, Jalan Letnan Jenderal Ibrahim Adjie, Jalan Gedebage Selatan

### Trayek `08`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `4308486` | **Kiara Artha → Leuwipanjang** | • **Seberang Kiara Artha** (`-6.9146708, 107.6438226`)<br>• **Leuwipanjang Soekarno Hatta** (`-6.9468277, 107.5934341`) | 79 | [`gabungan`](./gabungan/08_kiara_artha_ke_leuwipanjang_4308486.geojson) · [`ways`](./ways/08_kiara_artha_ke_leuwipanjang_4308486.geojson) · [`endstops`](./endstops/08_kiara_artha_ke_leuwipanjang_4308486.geojson) |
| `4649692` | **Leuwipanjang → Kiara Artha** | • **Leuwipanjang Soekarno Hatta** (`-6.9468277, 107.5934341`)<br>• **Seberang Kiara Artha** (`-6.9146708, 107.6438226`) | 71 | [`gabungan`](./gabungan/08_leuwipanjang_ke_kiara_artha_4649692.geojson) · [`ways`](./ways/08_leuwipanjang_ke_kiara_artha_4649692.geojson) · [`endstops`](./endstops/08_leuwipanjang_ke_kiara_artha_4649692.geojson) |

- **Nama file (`4308486`)**: `08_kiara_artha_ke_leuwipanjang_4308486.geojson`  
  **Jalan yang dilalui**: Jalan H. Ibrahim Adjie, Jalan Soekarno-Hatta, Jalan Letnan Jenderal Ibrahim Adjie
- **Nama file (`4649692`)**: `08_leuwipanjang_ke_kiara_artha_4649692.geojson`  
  **Jalan yang dilalui**: Jalan Soekarno-Hatta, Jalan H. Ibrahim Adjie, Jalan Terusan Jakarta

### Trayek `09`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `4292372` | **Stasiun Hall → Dago** | • **Stasiun Timur** (`-6.9153572, 107.604546`)<br>• **Terminal Dago** (`-6.8670778, 107.6212119`)<br>• **Taman Budaya** (`-6.8682321, 107.6205719`) | 51 | [`gabungan`](./gabungan/09_stasiun_hall_ke_dago_4292372.geojson) · [`ways`](./ways/09_stasiun_hall_ke_dago_4292372.geojson) · [`endstops`](./endstops/09_stasiun_hall_ke_dago_4292372.geojson) |
| `4642250` | **Dago → Stasiun Hall** | • **Terminal Dago** (`-6.8670778, 107.6212119`)<br>• **Stasiun Timur** (`-6.9153572, 107.604546`) | 47 | [`gabungan`](./gabungan/09_dago_ke_stasiun_hall_4642250.geojson) · [`ways`](./ways/09_dago_ke_stasiun_hall_4642250.geojson) · [`endstops`](./endstops/09_dago_ke_stasiun_hall_4642250.geojson) |

- **Nama file (`4292372`)**: `09_stasiun_hall_ke_dago_4292372.geojson`  
  **Jalan yang dilalui**: Jalan L.L. RE. Martadinata, Jalan Perintis Kemerdekaan, Jalan Stasiun Timur, Jalan Otto Iskandardinata, Jalan Ir. H. Djuanda, Jalan Wastukancana, Terminal Dago
- **Nama file (`4642250`)**: `09_dago_ke_stasiun_hall_4642250.geojson`  
  **Jalan yang dilalui**: Jalan Merdeka, Jalan Braga, Jalan Ir. H. Djuanda, Jalan Perintis Kemerdekaan, Jalan Suniaraja, Terminal Dago, Jalan Otto Iskandardinata

### Trayek `10`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `4425938` | **Stasiun Hall → Sadang Serang** | • **Stasiun Timur** (`-6.9153572, 107.604546`)<br>• **Terminal Sadang Serang** (`-6.8912645, 107.6249966`) | 57 | [`gabungan`](./gabungan/10_stasiun_hall_ke_sadang_serang_4425938.geojson) · [`ways`](./ways/10_stasiun_hall_ke_sadang_serang_4425938.geojson) · [`endstops`](./endstops/10_stasiun_hall_ke_sadang_serang_4425938.geojson) |
| `4642211` | **Sadang Serang → Stasiun Hall** | • **Terminal Sadang Serang** (`-6.8912645, 107.6249966`)<br>• **Stasiun Timur** (`-6.9153572, 107.604546`) | 56 | [`gabungan`](./gabungan/10_sadang_serang_ke_stasiun_hall_4642211.geojson) · [`ways`](./ways/10_sadang_serang_ke_stasiun_hall_4642211.geojson) · [`endstops`](./endstops/10_sadang_serang_ke_stasiun_hall_4642211.geojson) |

- **Nama file (`4425938`)**: `10_stasiun_hall_ke_sadang_serang_4425938.geojson`  
  **Jalan yang dilalui**: Jalan Lembong, Jalan Braga, Jalan Perintis Kemerdekaan, Jalan Stasiun Timur, Jalan Otto Iskandardinata, Jalan Citarum, Jalan Lombok, Jalan Sumbawa, Jalan Brigjend. Katamso, Jalan Veteran, Jalan Diponegoro, Jalan Supratman, Jalan Pahlawan, Jalan Banda, Jalan Belitung, Jalan Sadang Serang, Jalan Terminal Sadangserang, Jalan Cikutra Barat, Jalan Taman Citarum, Jalan Sunda, Jalan Intan Raya
- **Nama file (`4642211`)**: `10_sadang_serang_ke_stasiun_hall_4642211.geojson`  
  **Jalan yang dilalui**: Jalan Citarum, Jalan Braga, Jalan Perintis Kemerdekaan, Jalan Diponegoro, Jalan Belitung, Jalan Brigjend. Katamso, Jalan Suniaraja, Jalan Cikutra Barat, Jalan Pahlawan, Jalan Merdeka, Jalan Aceh, Jalan Sumatra, Jalan Sadang Serang, Jalan Terminal Sadangserang, Jalan Lombok, Jalan Supratman, Jalan Otto Iskandardinata, Jalan Cikutra, Jalan Intan Raya

### Trayek `11A`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `4430737` | **Ciumbuleuit → Sederhana** | • **RSAU dr. Salamun** (`-6.8635418, 107.6049689`) | 19 | [`gabungan`](./gabungan/11A_ciumbuleuit_ke_sederhana_4430737.geojson) · [`ways`](./ways/11A_ciumbuleuit_ke_sederhana_4430737.geojson) · [`endstops`](./endstops/11A_ciumbuleuit_ke_sederhana_4430737.geojson) |
| `4802256` | **Sederhana → Ciumbuleuit** | • **RSAU dr. Salamun** (`-6.8635418, 107.6049689`) | 31 | [`gabungan`](./gabungan/11A_sederhana_ke_ciumbuleuit_4802256.geojson) · [`ways`](./ways/11A_sederhana_ke_ciumbuleuit_4802256.geojson) · [`endstops`](./endstops/11A_sederhana_ke_ciumbuleuit_4802256.geojson) |

- **Nama file (`4430737`)**: `11A_ciumbuleuit_ke_sederhana_4430737.geojson`  
  **Jalan yang dilalui**: Jalan Cihampelas, Jalan Sampurna, Jalan Makmur, Jalan Profesor Christiaan Eijkman, Jalan Bapa Husen, Jalan Siliwangi, Jalan Ciumbuleuit, Jalan Sederhana
- **Nama file (`4802256`)**: `11A_sederhana_ke_ciumbuleuit_4802256.geojson`  
  **Jalan yang dilalui**: Jalan Sukajadi, Jalan Sukamaju, Jalan Karangsari, Jalan Sederhana, Jalan Dr. Setiabudi, Jalan Cihampelas, Jalan Ciumbuleuit, Jalan Profesor Christiaan Eijkman

### Trayek `11B`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `4802257` | **Ciumbuleuit → Stasiun Hall** | • **UNPAR** (`-6.8753147, 107.6044647`)<br>• **Stasiun Hall** (`-6.9161432, 107.6024325`) | 67 | [`gabungan`](./gabungan/11B_ciumbuleuit_ke_stasiun_hall_4802257.geojson) · [`ways`](./ways/11B_ciumbuleuit_ke_stasiun_hall_4802257.geojson) · [`endstops`](./endstops/11B_ciumbuleuit_ke_stasiun_hall_4802257.geojson) |
| `4802258` | **Stasiun Hall → Ciumbuleuit** | • **Stasiun Hall** (`-6.9161432, 107.6024325`)<br>• **RSAU dr. Salamun** (`-6.8635418, 107.6049689`) | 73 | [`gabungan`](./gabungan/11B_stasiun_hall_ke_ciumbuleuit_4802258.geojson) · [`ways`](./ways/11B_stasiun_hall_ke_ciumbuleuit_4802258.geojson) · [`endstops`](./endstops/11B_stasiun_hall_ke_ciumbuleuit_4802258.geojson) |

- **Nama file (`4802257`)**: `11B_ciumbuleuit_ke_stasiun_hall_4802257.geojson`  
  **Jalan yang dilalui**: Jalan Cicendo, Jalan Pajajaran, Jalan Cihampelas, Jalan HOS. Cokroaminoto, Jalan Kebon Kawung, Jalan Kebon Jati, Jalan Pasteur, Jalan Siliwangi, Jalan Ciumbuleuit, Jalan Suniaraja
- **Nama file (`4802258`)**: `11B_stasiun_hall_ke_ciumbuleuit_4802258.geojson`  
  **Jalan yang dilalui**: Jalan Pajajaran, Jalan Cihampelas, Jalan Raden Adipati Aria Wiranatakusumah, Jalan Pasir Kaliki, Jalan Sukajadi, Jalan Perintis Kemerdekaan, Jalan Karangsari, Jalan Stasiun Timur, Jalan Otto Iskandardinata, Jalan Dr. Setiabudi, Jalan Pasteur, Jalan Ciumbuleuit, Jalan Wastukancana, Jalan Abdul Rivai, Jalan Dokter Djunjunan, Jalan Suniaraja, Jalan HOS. Cokroaminoto

### Trayek `12`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `16634809` | **Stasiun Hall → Gedebage** | • **Stasiun Hall** (`-6.9161432, 107.6024325`)<br>• **Pasar Induk Gedebage** (`-6.9364151, 107.6972019`) | 108 | [`gabungan`](./gabungan/12_stasiun_hall_ke_gedebage_16634809.geojson) · [`ways`](./ways/12_stasiun_hall_ke_gedebage_16634809.geojson) · [`endstops`](./endstops/12_stasiun_hall_ke_gedebage_16634809.geojson) |
| `4433069` | **Gedebage → Stasiun Hall** | • **Pasar Induk Gedebage** (`-6.9364151, 107.6972019`)<br>• **Stasiun Hall** (`-6.9161432, 107.6024325`) | 155 | [`gabungan`](./gabungan/12_gedebage_ke_stasiun_hall_4433069.geojson) · [`ways`](./ways/12_gedebage_ke_stasiun_hall_4433069.geojson) · [`endstops`](./endstops/12_gedebage_ke_stasiun_hall_4433069.geojson) |

- **Nama file (`16634809`)**: `12_stasiun_hall_ke_gedebage_16634809.geojson`  
  **Jalan yang dilalui**: Jalan Otto Iskandardinata, Jalan Banceuy, Jalan Pasar Barat, Jalan Pasar Selatan, Jalan ABC, Jalan Talaga Bodas, Jalan Alun-alun Timur, Jalan Malabar, Jalan Naripan, Jalan Kliningan, Jalan Palasari, Jalan Soekarno-Hatta, Jalan Jenderal Gatot Subroto, Jalan Reog, Jalan Karawitan, Jalan Suniaraja, Jalan Jenderal Ahmad Yani, Jalan Dalem Kaum, Jalan Asia Afrika, Jalan Pelajar Pejuang 45, Jalan R.A.A. Martanegara, Soekarno Hatta Frontage Boulevard, Jalan Buah Batu, Jalan Kepatihan, Jalan Dewi Sartika
- **Nama file (`4433069`)**: `12_gedebage_ke_stasiun_hall_4433069.geojson`  
  **Jalan yang dilalui**: Jalan HOS. Cokroaminoto, Jalan Kebon Kawung, Jalan Kebon Jati, Jalan Malabar, Jalan Braga, Jalan Perintis Kemerdekaan, Jalan Talaga Bodas, Jalan R.A.A. Martanegara, Jalan Terusan Halimun, Jalan Karawitan, Jalan Belitung, Jalan Sumbawa, Jalan Kliningan, Jalan Maskumambang, Jalan Palasari, Jalan Suniaraja, Jalan Merdeka, Jalan Aceh, Jalan Sumatra, Jalan Jenderal Ahmad Yani, Jalan Pelajar Pejuang 45, Jalan Soekarno-Hatta, Jalan Kebon Jukut, Soekarno Hatta Frontage Boulevard, Jalan Sunda, Jalan Buah Batu, Jalan Otto Iskandardinata

### Trayek `13`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `4420962` | **Stasiun Hall → Sarijadi** | • **Stasiun Hall** (`-6.9161432, 107.6024325`)<br>• **Simpang Sarimanah Sariasih** (`-6.8763392, 107.578232`) | 63 | [`gabungan`](./gabungan/13_stasiun_hall_ke_sarijadi_4420962.geojson) · [`ways`](./ways/13_stasiun_hall_ke_sarijadi_4420962.geojson) · [`endstops`](./endstops/13_stasiun_hall_ke_sarijadi_4420962.geojson) |
| `4650417` | **Sarijadi → Stasiun Hall** | • **Simpang Sarimanah Sariasih** (`-6.8763392, 107.578232`)<br>• **Stasiun Hall** (`-6.9161432, 107.6024325`) | 67 | [`gabungan`](./gabungan/13_sarijadi_ke_stasiun_hall_4650417.geojson) · [`ways`](./ways/13_sarijadi_ke_stasiun_hall_4650417.geojson) · [`endstops`](./endstops/13_sarijadi_ke_stasiun_hall_4650417.geojson) |

- **Nama file (`4420962`)**: `13_stasiun_hall_ke_sarijadi_4420962.geojson`  
  **Jalan yang dilalui**: Jalan Kebon Kawung, Jalan Prof. Dr. Surya Soemantri, Jalan Lemah Neundeut, Jalan Stasiun Timur, Jalan Otto Iskandardinata, Jalan Sariwangi, Jalan Sarimanis, Jalan HOS. Cokroaminoto, Jalan Suniaraja, Jalan Dr. Djunjunan, Jalan Perintis Kemerdekaan, Jalan Sarimanah, Jalan Kebon Jukut, Jalan Aceh
- **Nama file (`4650417`)**: `13_sarijadi_ke_stasiun_hall_4650417.geojson`  
  **Jalan yang dilalui**: Jalan Cicendo, Jalan Pajajaran, Jalan HOS. Cokroaminoto, Jalan Kebon Kawung, Jalan Kebon Jati, Jalan Terusan Prof. Dr. Ir. Sutami, Jalan Sariwangi, Jalan Sarimanis, Jalan Prof. Dr. Surya Soemantri, Jalan Dr. Djunjunan, Jalan Lemah Neundeut, Jalan Sarimanah, Jalan Dokter Djundjunan Setiakusumah, Jalan Suniaraja

### Trayek `14`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `4420961` | **Stasiun Hall → Gunung Batu** | • **Stasiun Hall** (`-6.9161432, 107.6024325`)<br>• **Gunung Batu** (`-6.8875315, 107.5672467`) | 64 | [`gabungan`](./gabungan/14_stasiun_hall_ke_gunung_batu_4420961.geojson) · [`ways`](./ways/14_stasiun_hall_ke_gunung_batu_4420961.geojson) · [`endstops`](./endstops/14_stasiun_hall_ke_gunung_batu_4420961.geojson) |
| `4649813` | **Gunung Batu → Stasiun Hall** | • **Gunung Batu** (`-6.8875315, 107.5672467`)<br>• **Stasiun Hall** (`-6.9161432, 107.6024325`) | 80 | [`gabungan`](./gabungan/14_gunung_batu_ke_stasiun_hall_4649813.geojson) · [`ways`](./ways/14_gunung_batu_ke_stasiun_hall_4649813.geojson) · [`endstops`](./endstops/14_gunung_batu_ke_stasiun_hall_4649813.geojson) |

- **Nama file (`4420961`)**: `14_stasiun_hall_ke_gunung_batu_4420961.geojson`  
  **Jalan yang dilalui**: Jalan Pajajaran, Jalan Cihampelas, Jalan Doktor Louis Otten, Jalan Perintis Kemerdekaan, Jalan Stasiun Timur, Jalan Otto Iskandardinata, Jalan Gunung Batu, Jalan Sukaraja II, Jalan Dakota, Overpass Gunung Batu, Jalan Sukaraja, Jalan Pasteur, Jalan Wastukancana, Jalan dr. Cipto, Jalan Abdul Rivai, Jalan Dokter Djunjunan, Jalan Suniaraja, Jalan Dr. Djunjunan, Jalan Dokter Gunawan Mangunkusumo, Bundaran Rajiman
- **Nama file (`4649813`)**: `14_gunung_batu_ke_stasiun_hall_4649813.geojson`  
  **Jalan yang dilalui**: Jalan Cicendo, Jalan Pajajaran, Jalan HOS. Cokroaminoto, Jalan Kebon Kawung, Jalan Kebon Jati, Jalan Gunung Batu, Jalan Sukaraja II, Jalan Dakota, Overpass Gunung Batu, Jalan Sukaraja, Jalan Cihampelas, Jalan Dr. Djunjunan, Jalan Pasteur, Jalan Wastukencana, Jalan Wastukancana, Jalan Dokter Djundjunan Setiakusumah, Jalan Prof. Dr. Surya Soemantri, Jalan Suniaraja

### Trayek `15`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `4432470` | **Margahayu Raya → Ledeng** | • **Terminal Margahayu Raya** (`-6.9465292, 107.6626652`)<br>• **Terminal Ledeng** (`-6.85933, 107.5951942`) | 138 | [`gabungan`](./gabungan/15_margahayu_raya_ke_ledeng_4432470.geojson) · [`ways`](./ways/15_margahayu_raya_ke_ledeng_4432470.geojson) · [`endstops`](./endstops/15_margahayu_raya_ke_ledeng_4432470.geojson) |
| `4642502` | **Ledeng → Margahayu Raya** | • **Terminal Ledeng** (`-6.85933, 107.5951942`)<br>• **Terminal Margahayu Raya** (`-6.9465292, 107.6626652`) | 142 | [`gabungan`](./gabungan/15_ledeng_ke_margahayu_raya_4642502.geojson) · [`ways`](./ways/15_ledeng_ke_margahayu_raya_4642502.geojson) · [`endstops`](./endstops/15_ledeng_ke_margahayu_raya_4642502.geojson) |

- **Nama file (`4432470`)**: `15_margahayu_raya_ke_ledeng_4432470.geojson`  
  **Jalan yang dilalui**: Jalan Merdeka, Jalan Pajajaran, Jalan Cihampelas, Jalan Raden Adipati Aria Wiranatakusumah, Jalan Pasir Kaliki, Jalan Sukajadi, Jalan Perintis Kemerdekaan, Jalan Layang Kiaracondong, Jalan Pasteur, Jalan Cendana, Jalan Wastukancana, Jalan Supratman, Jalan Abdul Rivai, Jalan Dokter Djunjunan, Jalan L.L. RE. Martadinata, Jalan Dr. Setiabudi, Jalan Jakarta, Jalan Soekarno-Hatta, Jalan Lapang Supratman, Jalan Taman Pramuka, Jalan H. Ibrahim Adjie, Jalan Rancabolang, Jalan HOS. Cokroaminoto, Jalan Letnan Jenderal Ibrahim Adjie
- **Nama file (`4642502`)**: `15_ledeng_ke_margahayu_raya_4642502.geojson`  
  **Jalan yang dilalui**: Jalan L.L. RE. Martadinata, Jalan H. Ibrahim Adjie, Jalan Taman Pramuka, Jalan Cemara, Jalan Dokter Setiabudi, Jalan Jurang, Jalan Makmur, Jalan Sederhana, Jalan Profesor Christiaan Eijkman, Jalan Layang Kiaracondong, Jalan Dr. Setiabudi, Jalan Cendana, Jalan Lapang Supratman, Jalan Jenderal Ahmad Yani, Jalan Cihampelas, Jalan Wastukencana, Jalan Wastukancana, Jalan Supratman, Jalan Soekarno-Hatta, Jalan Rancabolang, Jalan Raden Adipati Aria Wiranatakusumah

### Trayek `16`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `4634057` | **Riung Bandung → Dago** | • **Terminal Riung Bandung** (`-6.9493701, 107.6832703`)<br>• **Terminal Dago** (`-6.8670778, 107.6212119`) | 160 | [`gabungan`](./gabungan/16_riung_bandung_ke_dago_4634057.geojson) · [`ways`](./ways/16_riung_bandung_ke_dago_4634057.geojson) · [`endstops`](./endstops/16_riung_bandung_ke_dago_4634057.geojson) |
| `4284600` | **Dago → Riung Bandung** | • **Terminal Dago** (`-6.8670778, 107.6212119`)<br>• **Terminal Riung Bandung** (`-6.9493701, 107.6832703`) | 172 | [`gabungan`](./gabungan/16_dago_ke_riung_bandung_4284600.geojson) · [`ways`](./ways/16_dago_ke_riung_bandung_4284600.geojson) · [`endstops`](./endstops/16_dago_ke_riung_bandung_4284600.geojson) |

- **Nama file (`4634057`)**: `16_riung_bandung_ke_dago_4634057.geojson`  
  **Jalan yang dilalui**: Jalan L.L. RE. Martadinata, Jalan Surapati, Jalan Aria Jipang, Jalan Riung Hegar Raya, Jalan Riung Arum, Jalan Riung Tineung, Jalan Riung Subur, Jalan Menado, Jalan Anggrek, Jalan Patrakomala, Jalan Banda, Jalan Penata Yudha, Jalan Dipatiukur, Jalan Sukabumi, Jalan Cipamokolan, Jalan Riung Mungpulung Raya, Jalan Belitung, Jalan Diponegoro, Jalan Laswi, Jalan Prabu Dimuntur, Jalan Jakarta, Jalan Soekarno-Hatta, Jalan H. Ibrahim Adjie, Soekarno Hatta Frontage Boulevard, Jalan Ir. H. Djuanda, Jalan Siliwangi, Jalan Cilamaya, Jalan Kamuning, Jalan Letnan Jenderal Ibrahim Adjie, Jalan Riung Mulya I, Terminal Dago
- **Nama file (`4284600`)**: `16_dago_ke_riung_bandung_4284600.geojson`  
  **Jalan yang dilalui**: Jalan H. Ibrahim Adjie, Jalan Citarum, Jalan Sentot Alibasyah, Jalan Ir. H. Djuanda, Jalan Dipatiukur, Jalan Surapati, Jalan Riung Hegar Raya, Jalan Riung Arum, Jalan Riung Tineung, Jalan Riung Mungpulung Raya, Jalan Riung Mungpulung II, Jalan Penata Yudha, Jalan Jenderal Ahmad Yani, Jalan L.L. RE. Martadinata, Jalan Soekarno-Hatta, Jalan Cipamokolan, Soekarno Hatta Frontage Boulevard, Jalan Diponegoro, Terminal Dago

### Trayek `17`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `4648025` | **Pasar Induk Caringin → Dago** | • **Pasar Caringin** (`-6.9419021, 107.5829792`)<br>• **Terminal Dago** (`-6.8670778, 107.6212119`) | 135 | [`gabungan`](./gabungan/17_pasar_induk_caringin_ke_dago_4648025.geojson) · [`ways`](./ways/17_pasar_induk_caringin_ke_dago_4648025.geojson) · [`endstops`](./endstops/17_pasar_induk_caringin_ke_dago_4648025.geojson) |
| `4423238` | **Dago → Pasar Induk Caringin** | • **Terminal Dago** (`-6.8670778, 107.6212119`)<br>• **Pasar Induk Caringin** (`-6.9419015, 107.5831212`)<br>• **Pasar Caringin** (`-6.9419021, 107.5829792`) | 163 | [`gabungan`](./gabungan/17_dago_ke_pasar_induk_caringin_4423238.geojson) · [`ways`](./ways/17_dago_ke_pasar_induk_caringin_4423238.geojson) · [`endstops`](./endstops/17_dago_ke_pasar_induk_caringin_4423238.geojson) |

- **Nama file (`4648025`)**: `17_pasar_induk_caringin_ke_dago_4648025.geojson`  
  **Jalan yang dilalui**: Jalan L.L. RE. Martadinata, Jalan Purnawarman, Jalan Cihampelas, Jalan Kebon Jati, Jalan Arjuna, Jalan Ciroyom Timur, Jalan Ciroyom Barat, Jalan Surapati, Jalan Cikapayang, Jalan Cikondang, Jalan HOS. Cokroaminoto, Jalan Rereng Adumanis, Jalan Batik Kumeli, Jalan Tamansari, Jalan Cigadung Raya Tengah, Jalan Sawunggaling, Jalan Andir, Jalan Jamika, Jalan Wastukancana, Jalan Pajajaran, Jalan Hariangbanga, Jalan Cigadung Raya Barat, Jalan Cigadung Raya Timur, Jalan Rajawali Timur, Jalan Terusan Pasir Koja, Jalan Soekarno-Hatta, Jalan Raya Golf, Jalan Cikutra Barat, Jalan Jalaprang, Jalan Rereng Wulung, Jalan Sido Mukti, Jalan Rangga Gadang, Jalan Ir. H. Djuanda, Jalan Jendral Sudirman, Jalan Ciroyom, Terminal Dago
- **Nama file (`4423238`)**: `17_dago_ke_pasar_induk_caringin_4423238.geojson`  
  **Jalan yang dilalui**: Jalan Cicendo, Jalan Tamansari, Jalan L.L. RE. Martadinata, Jalan Purnawarman, Jalan Pajajaran, Jalan Kebon Kawung, Jalan Arjuna, Jalan Andir, Jalan Cikondang, Jalan Surapati, Jalan Prabudimuntur, Jalan Cigadung Raya Tengah, Jalan Sawunggaling, Jalan Harian Banga, Jalan Rangga Gadang, Jalan HOS. Cokroaminoto, Jalan Jamika, Jalan Cikutra Barat, Jalan Cikapayang, Jalan Babakan Ciparay, Jalan Prabu Dimuntur, Jalan Soekarno-Hatta, Jalan Wastukancana, Jalan Cigadung Raya Barat, Jalan Cigadung Raya Timur, Jalan Rajawali Timur, Jalan Jendral Sudirman, Jalan Ciroyom, Jalan Peta, Jalan Terusan Pasir Koja, Jalan Raya Golf, Jalan Pahlawan, Jalan Kyai Haji Wahid Hasyim, Jalan Ir. H. Djuanda, Jalan Waringin, Terminal Dago, Jalan Caringin, Jalan Pasir Koja, Jalan Dago Elos III, Jalan Cikutra, Jalan Layang Ciroyom, Jalan Kebon Jati

### Trayek `18`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `4422442` | **Panghegar Permai → Dipatiukur** | • **Pangkalan Angkot Panghegar** (`-6.9237417, 107.6835707`)<br>• **Baltos** (`-6.899504, 107.6099669`) | 104 | [`gabungan`](./gabungan/18_panghegar_permai_ke_dipatiukur_4422442.geojson) · [`ways`](./ways/18_panghegar_permai_ke_dipatiukur_4422442.geojson) · [`endstops`](./endstops/18_panghegar_permai_ke_dipatiukur_4422442.geojson) |
| `16644061` | **Dipatiukur → Panghegar Permai** | • **Baltos** (`-6.899504, 107.6099669`)<br>• **Pangkalan Angkot Panghegar** (`-6.9237417, 107.6835707`) | 93 | [`gabungan`](./gabungan/18_dipatiukur_ke_panghegar_permai_16644061.geojson) · [`ways`](./ways/18_dipatiukur_ke_panghegar_permai_16644061.geojson) · [`endstops`](./endstops/18_dipatiukur_ke_panghegar_permai_16644061.geojson) |

- **Nama file (`4422442`)**: `18_panghegar_permai_ke_dipatiukur_4422442.geojson`  
  **Jalan yang dilalui**: Jalan Sulanjana, Jalan L.L. RE. Martadinata, Jalan Diponegoro, Jalan Citarum, Jalan Cisanggarung, Jalan Jenderal Ahmad Yani, Jalan Sukabumi, Jalan Laswi, Jalan H. Ibrahim Adjie, Jalan Cicukang, Jalan Abdul Haris Nasution, Jalan Cisaranten Kulon, Jalan Jakarta, Jalan Taman Citarum, Jalan Cilamaya, Jalan Hayam Wuruk
- **Nama file (`16644061`)**: `18_dipatiukur_ke_panghegar_permai_16644061.geojson`  
  **Jalan yang dilalui**: Jalan Tamansari, Jalan L.L. RE. Martadinata, Jalan Sumatra, Jalan Sawunggaling, Jalan Harian Banga, Jalan Rangga Gadang, Jalan Belitung, Jalan Banda, Jalan Jenderal Ahmad Yani, Jalan Veteran, Jalan Wastukancana, Jalan Cicukang, Jalan Abdul Haris Nasution, Jalan Cisaranten Kulon, Jalan Anthorium, Jalan Sulanjana

### Trayek `19`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `16644123` | **Ciroyom → Sarijadi** | • **Stasiun Ciroyom** (`-6.914151, 107.5890644`)<br>• **Pasar Cibogo Sarijadi** (`-6.8826498, 107.5751448`) | 76 | [`gabungan`](./gabungan/19_ciroyom_ke_sarijadi_16644123.geojson) · [`ways`](./ways/19_ciroyom_ke_sarijadi_16644123.geojson) · [`endstops`](./endstops/19_ciroyom_ke_sarijadi_16644123.geojson) |
| `16644124` | **Sarijadi → Ciroyom** | • **Pasar Cibogo Sarijadi** (`-6.8826498, 107.5751448`)<br>• **Stasiun Ciroyom** (`-6.914151, 107.5890644`) | 91 | [`gabungan`](./gabungan/19_sarijadi_ke_ciroyom_16644124.geojson) · [`ways`](./ways/19_sarijadi_ke_ciroyom_16644124.geojson) · [`endstops`](./endstops/19_sarijadi_ke_ciroyom_16644124.geojson) |

- **Nama file (`16644123`)**: `19_ciroyom_ke_sarijadi_16644123.geojson`  
  **Jalan yang dilalui**: Jalan Dursasana, Jalan Aruna, Jalan Sindang Sirna, Jalan Pasir Kaliki, Jalan Sukajadi, Jalan Sari Endah Baru, Jalan Ciroyom, Jalan Simpang Sukaresmi, Jalan Sariasih, Jalan Cipedes Atas, Jalan Sarimanah, Jalan Geger Kalong Hilir, Jalan Astina, Jalan HOS. Cokroaminoto, Jalan Sarijadi Raya, Jalan Bungur, Jalan Lembah Sukaresmi, Jalan Pajajaran, Jalan Arjuna, Jalan Layang Ciroyom, Jalan Perintis, Jalan Sariwangi
- **Nama file (`16644124`)**: `19_sarijadi_ke_ciroyom_16644124.geojson`  
  **Jalan yang dilalui**: Jalan HOS. Cokroaminoto, Jalan Aruna, Jalan Sindang Sirna, Jalan Sirna Galih, Jalan Dokter Setiabudi, Jalan Jurang, Jalan Lamping, Jalan Makmur, Jalan Profesor Christiaan Eijkman, Jalan Karangsari, Jalan Sederhana, Jalan Sariasih, Jalan Cipedes Atas, Jalan Sarimanah, Jalan Sarijadi Raya, Jalan Pasir Kaliki, Jalan Pasteur, Jalan Geger Kalong Hilir, Jalan Pajajaran, Jalan Raden Adipati Aria Wiranatakusumah, Jalan Sariwangi, Jalan Arjuna, Jalan Dr. Setiabudi, Jalan Layang Ciroyom, Jalan Ciroyom

### Trayek `20`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `4650909` | **Ciroyom → Bumi Asri** | • **Stasiun Ciroyom** (`-6.914151, 107.5890644`)<br>• **Terminal Bumi Asri** (`-6.9324632, 107.5508272`) | 36 | [`gabungan`](./gabungan/20_ciroyom_ke_bumi_asri_4650909.geojson) · [`ways`](./ways/20_ciroyom_ke_bumi_asri_4650909.geojson) · [`endstops`](./endstops/20_ciroyom_ke_bumi_asri_4650909.geojson) |
| `4650925` | **Bumi Asri → Ciroyom** | • **Terminal Bumi Asri** (`-6.9324632, 107.5508272`)<br>• **Stasiun Ciroyom** (`-6.914151, 107.5890644`) | 40 | [`gabungan`](./gabungan/20_bumi_asri_ke_ciroyom_4650925.geojson) · [`ways`](./ways/20_bumi_asri_ke_ciroyom_4650925.geojson) · [`endstops`](./endstops/20_bumi_asri_ke_ciroyom_4650925.geojson) |

- **Nama file (`4650909`)**: `20_ciroyom_ke_bumi_asri_4650909.geojson`  
  **Jalan yang dilalui**: Jalan Ciroyom, Jalan Gempol Sari, Jalan Bojong Raya, Jalan Soekarno-Hatta, Jalan Garuda, Jalan Gempol, Jalan Jendral Sudirman, Jalan Raya Cijerah, Jalan Dirgantara Raya, Jalan Arjuna, Jalan Dirgantara, Jalan Holis, Bunderan Cibeureum
- **Nama file (`4650925`)**: `20_bumi_asri_ke_ciroyom_4650925.geojson`  
  **Jalan yang dilalui**: Jalan Rajawali Timur, Jalan Elang, Jalan Ciroyom Timur, Jalan Ciroyom Barat, Jalan Gempol Sari, Jalan Bojong Raya, Jalan Gempol, Jalan Raya Cijerah, Jalan Soekarno-Hatta, Jalan Dirgantara Raya, Jalan Holis, Bunderan Cibeureum, Jalan Ciroyom, Jalan Dirgantara, Jalan Arjuna

### Trayek `21`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `16644187` | **Ciroyom → Cikudapateuh** | • **SMA Trinitas** (`-6.916555, 107.5917139`)<br>• **Pangkalan Angkot Rajawali** (`-6.9132715, 107.5761151`)<br>• **Stasiun Cikudapateuh** (`-6.9189956, 107.6258024`) | 90 | [`gabungan`](./gabungan/21_ciroyom_ke_cikudapateuh_16644187.geojson) · [`ways`](./ways/21_ciroyom_ke_cikudapateuh_16644187.geojson) · [`endstops`](./endstops/21_ciroyom_ke_cikudapateuh_16644187.geojson) |
| `16644335` | **Cikudapateuh → Ciroyom** | • **Stasiun Cikudapateuh** (`-6.9189956, 107.6258024`)<br>• **Plaza Telkom Rajawali** (`-6.9129722, 107.5753653`)<br>• **Pangkalan Angkot Rajawali** (`-6.9132715, 107.5761151`) | 89 | [`gabungan`](./gabungan/21_cikudapateuh_ke_ciroyom_16644335.geojson) · [`ways`](./ways/21_cikudapateuh_ke_ciroyom_16644335.geojson) · [`endstops`](./endstops/21_cikudapateuh_ke_ciroyom_16644335.geojson) |

- **Nama file (`16644187`)**: `21_ciroyom_ke_cikudapateuh_16644187.geojson`  
  **Jalan yang dilalui**: Jalan Kebon Jati, Jalan Rajawali Timur, Jalan Gardujati, Jalan Mochammad Ramdhan, Jalan Terusan Halimun, Jalan Malabar, Jalan Kembang Sapatu, Jalan Kyai Haji Ahmad Dahlan, Jalan Palasari, Jalan Panjunan, Jalan Jenderal Gatot Subroto, Jalan Kyai Haji Wahid Hasyim, Jalan Lauk Emas, Jalan Laswi, Jalan Astana Anyar, Jalan Sadakeling, Jalan Jenderal Ahmad Yani, Jalan BKR, Jalan Peta, Jalan Karapitan
- **Nama file (`16644335`)**: `21_cikudapateuh_ke_ciroyom_16644335.geojson`  
  **Jalan yang dilalui**: Jalan Jendral Sudirman, Jalan Samoja Dalam, Jalan Malabar, Jalan Gajah, Jalan Kembang Sapatu, Jalan Gurame, Jalan Sadakeling, Jalan Terate, Jalan Cibadak, Jalan Palasari, Jalan Kopo, Jalan Kyai Haji Wahid Hasyim, Jalan Astana Anyar, Jalan Rajawali Barat, Jalan BKR, Jalan Peta, Jalan Mochammad Ramdhan, Jalan Pasir Koja, Jalan Kyai Haji Ahmad Dahlan, Jalan Buah Batu, Bunderan Cibeureum, Jalan Rajawali Timur

### Trayek `22`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `4652571` | **Kalapa → Buah Batu** | • **Terminal Abdul Muis/Kebon Kalapa** (`-6.9276428, 107.6058322`)<br>• **Cipagalo** (`-6.9657162, 107.6379086`) | 67 | [`gabungan`](./gabungan/22_kalapa_ke_buah_batu_4652571.geojson) · [`ways`](./ways/22_kalapa_ke_buah_batu_4652571.geojson) · [`endstops`](./endstops/22_kalapa_ke_buah_batu_4652571.geojson) |
| `4652619` | **Buah Batu → Kalapa** | • **Cipagalo** (`-6.9657162, 107.6379086`)<br>• **Terminal Abdul Muis/Kebon Kalapa** (`-6.9276428, 107.6058322`) | 59 | [`gabungan`](./gabungan/22_buah_batu_ke_kalapa_4652619.geojson) · [`ways`](./ways/22_buah_batu_ke_kalapa_4652619.geojson) · [`endstops`](./endstops/22_buah_batu_ke_kalapa_4652619.geojson) |
| `4652511` | **Kalapa → Sukajadi** | • **Terminal Abdul Muis/Kebon Kalapa** (`-6.9276428, 107.6058322`)<br>• **Junction 8 Sukajadi** (`-6.8840134, 107.596703`) | 98 | [`gabungan`](./gabungan/22_kalapa_ke_sukajadi_4652511.geojson) · [`ways`](./ways/22_kalapa_ke_sukajadi_4652511.geojson) · [`endstops`](./endstops/22_kalapa_ke_sukajadi_4652511.geojson) |
| `4652460` | **Sukajadi → Kalapa** | • **Junction 8 Sukajadi** (`-6.8840134, 107.596703`)<br>• **Terminal Abdul Muis/Kebon Kalapa** (`-6.9276428, 107.6058322`) | 93 | [`gabungan`](./gabungan/22_sukajadi_ke_kalapa_4652460.geojson) · [`ways`](./ways/22_sukajadi_ke_kalapa_4652460.geojson) · [`endstops`](./endstops/22_sukajadi_ke_kalapa_4652460.geojson) |

- **Nama file (`4652571`)**: `22_kalapa_ke_buah_batu_4652571.geojson`  
  **Jalan yang dilalui**: Jalan Kyai Haji Ahmad Dahlan, Jalan Lengkong Besar, Jalan Dalem Kaum, Jalan Cikawao, Jalan Buah Batu, Jalan Dewi Sartika, Jalan Pelajar Pejuang 45, Jalan Sadakeling
- **Nama file (`4652619`)**: `22_buah_batu_ke_kalapa_4652619.geojson`  
  **Jalan yang dilalui**: Jalan Dewi Sartika, Jalan Buah Batu, Jalan Lengkong Besar, Jalan Gurame, Jalan Ibu Inggit Ganarsih, Jalan Sadakeling, Jalan Cikawao, Jalan Karapitan
- **Nama file (`4652511`)**: `22_kalapa_ke_sukajadi_4652511.geojson`  
  **Jalan yang dilalui**: Jalan Cihampelas, Jalan Doktor Louis Otten, Jalan Kebon Kawung, Jalan Pasir Kaliki, Jalan Sukajadi, Jalan Sukamaju, Jalan Sederhana, Jalan Stasiun Timur, Jalan Otto Iskandardinata, Jalan Banceuy, Jalan Alun-alun Timur, Jalan Pasteur, Jalan dr. Cipto, Jalan Abdul Rivai, Jalan HOS. Cokroaminoto, Jalan Dokter Djunjunan, Jalan Dewi Sartika, Jalan Pajajaran, Jalan Perintis Kemerdekaan, Jalan Dalem Kaum, Jalan Asia Afrika, Jalan Kebon Jukut, Jalan Suniaraja, Jalan Aceh, Jalan Dokter Gunawan Mangunkusumo, Bundaran Rajiman, Jalan Cemara
- **Nama file (`4652460`)**: `22_sukajadi_ke_kalapa_4652460.geojson`  
  **Jalan yang dilalui**: Jalan Cicendo, Jalan Pajajaran, Jalan Lembong, Jalan Braga, Jalan Cemara, Jalan Perintis Kemerdekaan, Jalan Dewi Sartika, Jalan Lengkong Besar, Jalan Sederhana, Jalan Kebon Jukut, Jalan Pasir Kaliki, Jalan Ibu Inggit Ganarsih, Jalan Tamblong, Jalan Cihampelas, Jalan Profesor Christiaan Eijkman, Jalan Pasteur, Jalan Wastukencana, Jalan Wastukancana, Jalan Raden Adipati Aria Wiranatakusumah, Jalan Aceh, Jalan Otto Iskandardinata

### Trayek `23`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `4425899` | **Sederhana → Cijerah** | • **Makmur** (`-6.8941794, 107.5989838`)<br>• **Pasar Sederhana** (`-6.8908128, 107.5996153`)<br>• **Puskesmas Melong Asih** (`-6.9239338, 107.5629011`) | 71 | [`gabungan`](./gabungan/23_sederhana_ke_cijerah_4425899.geojson) · [`ways`](./ways/23_sederhana_ke_cijerah_4425899.geojson) · [`endstops`](./endstops/23_sederhana_ke_cijerah_4425899.geojson) |
| `4645553` | **Cijerah → Sederhana** | • **Puskesmas Melong Asih** (`-6.9239338, 107.5629011`)<br>• **SDN 061 Cijerah** (`-6.9218246, 107.5690228`)<br>• **Pasar Sederhana** (`-6.8908128, 107.5996153`) | 55 | [`gabungan`](./gabungan/23_cijerah_ke_sederhana_4645553.geojson) · [`ways`](./ways/23_cijerah_ke_sederhana_4645553.geojson) · [`endstops`](./endstops/23_cijerah_ke_sederhana_4645553.geojson) |

- **Nama file (`4425899`)**: `23_sederhana_ke_cijerah_4425899.geojson`  
  **Jalan yang dilalui**: Jalan HOS. Cokroaminoto, Jalan Jendral Sudirman, Jalan Makmur, Jalan Profesor Christiaan Eijkman, Jalan Sederhana, Jalan Melong Raya, Jalan Pasir Kaliki, Jalan Pasteur, Jalan Pajajaran, Jalan Abdul Rahman Saleh, Jalan Garuda, Jalan Raya Cijerah, Bunderan Cibeureum, Jalan Layang Nurtanio
- **Nama file (`4645553`)**: `23_cijerah_ke_sederhana_4645553.geojson`  
  **Jalan yang dilalui**: Jalan Dursasana, Jalan Rajawali Timur, Jalan Pasir Kaliki, Jalan Sederhana, Jalan Astina, Jalan HOS. Cokroaminoto, Jalan Abdul Rahman Saleh, Jalan Garuda, Jalan Raya Cijerah, Jalan Rajawali Barat, Jalan Jendral Sudirman, Jalan Melong Raya, Jalan Pajajaran, Jalan Layang Nurtanio

### Trayek `24`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `4321908` | **Sederhana → Cimindi** | • **Pasar Sederhana** (`-6.8908128, 107.5996153`)<br>• **Pangkalan Angkot Cimindi** (`-6.8953145, 107.5602213`) | 43 | [`gabungan`](./gabungan/24_sederhana_ke_cimindi_4321908.geojson) · [`ways`](./ways/24_sederhana_ke_cimindi_4321908.geojson) · [`endstops`](./endstops/24_sederhana_ke_cimindi_4321908.geojson) |
| `4649915` | **Cimindi → Sederhana** | • **Pangkalan Angkot Cimindi** (`-6.8953145, 107.5602213`)<br>• **Pasar Sederhana** (`-6.8908128, 107.5996153`) | 39 | [`gabungan`](./gabungan/24_cimindi_ke_sederhana_4649915.geojson) · [`ways`](./ways/24_cimindi_ke_sederhana_4649915.geojson) · [`endstops`](./endstops/24_cimindi_ke_sederhana_4649915.geojson) |

- **Nama file (`4321908`)**: `24_sederhana_ke_cimindi_4321908.geojson`  
  **Jalan yang dilalui**: Jalan Sukagalih, Jalan Makmur, Jalan Profesor Christiaan Eijkman, Jalan Sederhana, Jalan Gunung Batu, Jalan Sukaraja II, Jalan Dakota, Jalan Sukaraja, Jalan Dr. Djunjunan, Jalan Cipedes Selatan, Jalan Suka Mulya, Jalan Sukajadi
- **Nama file (`4649915`)**: `24_cimindi_ke_sederhana_4649915.geojson`  
  **Jalan yang dilalui**: Jalan Sukajadi, Jalan Sukagalih, Jalan Jurang, Jalan Sederhana, Jalan Gunung Batu, Jalan Sukaraja II, Jalan Dakota, Jalan Sukaraja, Jalan Cemara, Jalan Dr. Djunjunan, Jalan Cipedes Selatan, Jalan Suka Mulya, Jalan Prof. Dr. Surya Soemantri

### Trayek `25`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `16645492` | **Ciwastra → Cipamokolan** | • **Pasar Ciwastra** (`-6.9611563, 107.6664238`)<br>• **Bulog Kancab Bandung** (`-6.9389794, 107.6773057`) | 24 | [`gabungan`](./gabungan/25_ciwastra_ke_cipamokolan_16645492.geojson) · [`ways`](./ways/25_ciwastra_ke_cipamokolan_16645492.geojson) · [`endstops`](./endstops/25_ciwastra_ke_cipamokolan_16645492.geojson) |
| `16645493` | **Cipamokolan → Ciwastra** | • **Bulog Kancab Bandung** (`-6.9389794, 107.6773057`)<br>• **Pasar Ciwastra** (`-6.9611563, 107.6664238`) | 24 | [`gabungan`](./gabungan/25_cipamokolan_ke_ciwastra_16645493.geojson) · [`ways`](./ways/25_cipamokolan_ke_ciwastra_16645493.geojson) · [`endstops`](./endstops/25_cipamokolan_ke_ciwastra_16645493.geojson) |
| `19452155` | **Cisaranten Kulon → Ujungberung** | • **STMIK Jabar** (`-6.9377802, 107.6773616`)<br>• **Terminal Ujungberung** (`-6.9140461, 107.7028132`) | 28 | [`gabungan`](./gabungan/25_cisaranten_kulon_ke_ujungberung_19452155.geojson) · [`ways`](./ways/25_cisaranten_kulon_ke_ujungberung_19452155.geojson) · [`endstops`](./endstops/25_cisaranten_kulon_ke_ujungberung_19452155.geojson) |
| `19452156` | **Ujungberung → Cisaranten Kulon** | • **Terminal Ujungberung** (`-6.9140461, 107.7028132`)<br>• **STMIK Jabar** (`-6.9377802, 107.6773616`) | 28 | [`gabungan`](./gabungan/25_ujungberung_ke_cisaranten_kulon_19452156.geojson) · [`ways`](./ways/25_ujungberung_ke_cisaranten_kulon_19452156.geojson) · [`endstops`](./endstops/25_ujungberung_ke_cisaranten_kulon_19452156.geojson) |

- **Nama file (`16645492`)**: `25_ciwastra_ke_cipamokolan_16645492.geojson`  
  **Jalan yang dilalui**: Jalan Cipamokolan, Marga Cinta, Jalan Derwati, Jalan Marga Cinta
- **Nama file (`16645493`)**: `25_cipamokolan_ke_ciwastra_16645493.geojson`  
  **Jalan yang dilalui**: Jalan Cipamokolan, Marga Cinta, Jalan Derwati, Jalan Marga Cinta
- **Nama file (`19452155`)**: `25_cisaranten_kulon_ke_ujungberung_19452155.geojson`  
  **Jalan yang dilalui**: Jalan Cicukang, Jalan Cisaranten Kulon, Jalan Abdul Haris Nasution
- **Nama file (`19452156`)**: `25_ujungberung_ke_cisaranten_kulon_19452156.geojson`  
  **Jalan yang dilalui**: Jalan Cicukang, Jalan Cisaranten Kulon, Jalan Abdul Haris Nasution

### Trayek `26`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `4294474` | **Cisitu → Tegallega** | • **Pusdiklat Geologi Cisitu** (`-6.8796668, 107.6120709`)<br>• **Terminal Tegallega** (`-6.9338128, 107.6027695`) | 81 | [`gabungan`](./gabungan/26_cisitu_ke_tegallega_4294474.geojson) · [`ways`](./ways/26_cisitu_ke_tegallega_4294474.geojson) · [`endstops`](./endstops/26_cisitu_ke_tegallega_4294474.geojson) |
| `16646484` | **Tegallega → Cisitu** | • **Terminal Tegallega** (`-6.9338128, 107.6027695`)<br>• **Pusdiklat Geologi Cisitu** (`-6.8796668, 107.6120709`) | 99 | [`gabungan`](./gabungan/26_tegallega_ke_cisitu_16646484.geojson) · [`ways`](./ways/26_tegallega_ke_cisitu_16646484.geojson) · [`endstops`](./endstops/26_tegallega_ke_cisitu_16646484.geojson) |

- **Nama file (`4294474`)**: `26_cisitu_ke_tegallega_4294474.geojson`  
  **Jalan yang dilalui**: Jalan Cicendo, Jalan Pajajaran, Jalan Cihampelas, Jalan HOS. Cokroaminoto, Jalan Kebon Kawung, Jalan Kebon Jati, Jalan Dulatip, Jalan Siliwangi, Jalan Tamansari, Jalan Sangkuriang, Jalan Cisitu Lama, Jalan Sumur Bandung, Jalan Kalipah Apo, Jalan Wastukencana, Jalan Wastukancana, Jalan Otto Iskandardinata, Jalan Jendral Sudirman, Jalan Astana Anyar
- **Nama file (`16646484`)**: `26_tegallega_ke_cisitu_16646484.geojson`  
  **Jalan yang dilalui**: Jalan Cihampelas, Jalan Kebon Kawung, Jalan Kebon Jati, Jalan Gardujati, Jalan Tamansari, Jalan Stasiun Timur, Jalan Otto Iskandardinata, Jalan Sangkuriang, Jalan Cisitu Lama, Jalan HOS. Cokroaminoto, Jalan Suniaraja, Jalan Astana Anyar, Jalan Siliwangi, Jalan Pajajaran, Jalan Perintis Kemerdekaan, Jalan Wastukancana, Jalan Kebon Jukut, Jalan Aceh

### Trayek `27`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `4425956` | **Cijerah → Ciwastra → Derwati** | • **Mesjid Jami Al Hamidah Cibolerang** (`-6.9487566, 107.565655`)<br>• **Simpang Derwati** (`-6.9667195, 107.6866274`) | 120 | [`gabungan`](./gabungan/27_cijerah_ke_ciwastra_ke_derwati_4425956.geojson) · [`ways`](./ways/27_cijerah_ke_ciwastra_ke_derwati_4425956.geojson) · [`endstops`](./endstops/27_cijerah_ke_ciwastra_ke_derwati_4425956.geojson) |
| `16646697` | **Derwati → Ciwastra → Cijerah** | • **Simpang Derwati** (`-6.9667195, 107.6866274`)<br>• **Mesjid Jami Al Hamidah Cibolerang** (`-6.9487566, 107.565655`) | 106 | [`gabungan`](./gabungan/27_derwati_ke_ciwastra_ke_cijerah_16646697.geojson) · [`ways`](./ways/27_derwati_ke_ciwastra_ke_cijerah_16646697.geojson) · [`endstops`](./endstops/27_derwati_ke_ciwastra_ke_cijerah_16646697.geojson) |

- **Nama file (`4425956`)**: `27_cijerah_ke_ciwastra_ke_derwati_4425956.geojson`  
  **Jalan yang dilalui**: Jalan Marga Cinta, Jalan Derwati, Jalan Kyai Haji Wahid Hasyim, Jalan Pelajar Pejuang 45, Jalan Buah Batu, Marga Cinta, Jalan Cibolerang, Jalan Babakan Ciparay, Jalan Soekarno-Hatta, Jalan Peta, Jalan BKR, Jalan Caringin, Jalan Gedebage Selatan
- **Nama file (`16646697`)**: `27_derwati_ke_ciwastra_ke_cijerah_16646697.geojson`  
  **Jalan yang dilalui**: Jalan Terusan Kiara Condong, Jalan Derwati, Jalan BKR, Jalan Marga Cinta, Marga Cinta, Jalan Cibolerang, Jalan Kyai Haji Wahid Hasyim, Jalan Peta, Jalan Buah Batu, Jalan Soekarno-Hatta, Jalan Leuwi Panjang, Jalan Gedebage Selatan

### Trayek `28`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `5517528` | **Elang → Gedebage → Ujungberung** | • **Terminal Elang Damri** (`-6.9144895, 107.5753136`)<br>• **RSUD Ujungberung** (`-6.9158662, 107.6992861`) | 113 | [`gabungan`](./gabungan/28_elang_ke_gedebage_ke_ujungberung_5517528.geojson) · [`ways`](./ways/28_elang_ke_gedebage_ke_ujungberung_5517528.geojson) · [`endstops`](./endstops/28_elang_ke_gedebage_ke_ujungberung_5517528.geojson) |
| `16648201` | **Ujungberung → Gedebage → Elang** | • **RSUD Ujungberung** (`-6.9158662, 107.6992861`)<br>• **Terminal Elang Damri** (`-6.9144895, 107.5753136`) | 117 | [`gabungan`](./gabungan/28_ujungberung_ke_gedebage_ke_elang_16648201.geojson) · [`ways`](./ways/28_ujungberung_ke_gedebage_ke_elang_16648201.geojson) · [`endstops`](./endstops/28_ujungberung_ke_gedebage_ke_elang_16648201.geojson) |

- **Nama file (`5517528`)**: `28_elang_ke_gedebage_ke_ujungberung_5517528.geojson`  
  **Jalan yang dilalui**: Jalan Rajawali Timur, Jalan Pasir Salam, Jalan Otto Iskandardinata, Jalan Sriwijaya, Jalan Jamika, Jalan Soekarno-Hatta, Jalan Pungkur, Jalan Garuda, Jalan Jendral Sudirman, Jalan Pasir Koja, Jalan BKR, Soekarno Hatta Frontage Boulevard, Jalan Rumah Sakit, Jalan Peta, Jalan Kembar Timur II, Jalan Pasirluyu Timur, Jalan Pasirluyu Barat, Jalan Kembar Timur Raya, Jalan Kembar Timur I, Jalan Kembar VIII, Jalan Elang
- **Nama file (`16648201`)**: `28_ujungberung_ke_gedebage_ke_elang_16648201.geojson`  
  **Jalan yang dilalui**: Jalan Elang, Jalan Otto Iskandardinata, Jalan Pasir Salam, Jalan Panjunan, Jalan Jendral Sudirman, Jalan Kopo, Jalan Astana Anyar, Jalan Jamika, Jalan Soekarno-Hatta, Jalan BKR, Jalan Peta, Jalan Rumah Sakit, Bunderan Cibeureum, Jalan Pasir Koja, Soekarno Hatta Frontage Boulevard, Jalan Pasirluyu Barat, Jalan Pasirluyu Timur

### Trayek `29`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `18771773` | **Mengger → Soekarno Hatta (Mengger → Kalapa)** | • **SD Negeri Dayeuhkolot 08, 09, 12** (`-6.9840869, 107.6290533`)<br>• **Titik Pemberhentian** (`-6.949255, 107.6213965`) | 29 | [`gabungan`](./gabungan/29_mengger_ke_soekarno_hatta_mengger_ke_kalapa_18771773.geojson) · [`ways`](./ways/29_mengger_ke_soekarno_hatta_mengger_ke_kalapa_18771773.geojson) · [`endstops`](./endstops/29_mengger_ke_soekarno_hatta_mengger_ke_kalapa_18771773.geojson) |
| `18771772` | **Soekarno Hatta → Mengger (Kalapa → Mengger)** | • **Titik Pemberhentian** (`-6.949255, 107.6213965`)<br>• **SD Negeri Dayeuhkolot 08, 09, 12** (`-6.9840869, 107.6290533`) | 43 | [`gabungan`](./gabungan/29_soekarno_hatta_ke_mengger_kalapa_ke_mengger_18771772.geojson) · [`ways`](./ways/29_soekarno_hatta_ke_mengger_kalapa_ke_mengger_18771772.geojson) · [`endstops`](./endstops/29_soekarno_hatta_ke_mengger_kalapa_ke_mengger_18771772.geojson) |

- **Nama file (`18771773`)**: `29_mengger_ke_soekarno_hatta_mengger_ke_kalapa_18771773.geojson`  
  **Jalan yang dilalui**: Jalan Sukabirus, Jalan Sukapura, Jalan Menger Hilir, Jalan Sukaati, Jalan Soekarno-Hatta, Jalan Menger Tengah
- **Nama file (`18771772`)**: `29_soekarno_hatta_ke_mengger_kalapa_ke_mengger_18771772.geojson`  
  **Jalan yang dilalui**: Jalan Sukapura, Jalan Sukabirus, Jalan Menger Hilir, Jalan Soekarno-Hatta, Jalan Sukaati, Jalan Menger Tengah, Jalan Waas

### Trayek `30`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `16650514` | **Cicadas → Kalapa** | • **BTM** (`-6.9113592, 107.6435055`)<br>• **Terminal Abdul Muis/Kebon Kalapa** (`-6.9276428, 107.6058322`) | 104 | [`gabungan`](./gabungan/30_cicadas_ke_kalapa_16650514.geojson) · [`ways`](./ways/30_cicadas_ke_kalapa_16650514.geojson) · [`endstops`](./endstops/30_cicadas_ke_kalapa_16650514.geojson) |
| `16650513` | **Kalapa → Cicadas** | • **Terminal Abdul Muis/Kebon Kalapa** (`-6.9276428, 107.6058322`)<br>• **BTM** (`-6.9113592, 107.6435055`) | 88 | [`gabungan`](./gabungan/30_kalapa_ke_cicadas_16650513.geojson) · [`ways`](./ways/30_kalapa_ke_cicadas_16650513.geojson) · [`endstops`](./endstops/30_kalapa_ke_cicadas_16650513.geojson) |
| `16648408` | **Elang → Kalapa** | • **Pangkalan Angkot Rajawali** (`-6.9132715, 107.5761151`)<br>• **Terminal Abdul Muis/Kebon Kalapa** (`-6.9276428, 107.6058322`) | 39 | [`gabungan`](./gabungan/30_elang_ke_kalapa_16648408.geojson) · [`ways`](./ways/30_elang_ke_kalapa_16648408.geojson) · [`endstops`](./endstops/30_elang_ke_kalapa_16648408.geojson) |
| `16650512` | **Kalapa → Elang** | • **Terminal Abdul Muis/Kebon Kalapa** (`-6.9276428, 107.6058322`)<br>• **Plaza Telkom Rajawali** (`-6.9129722, 107.5753653`)<br>• **Pangkalan Angkot Rajawali** (`-6.9132715, 107.5761151`) | 79 | [`gabungan`](./gabungan/30_kalapa_ke_elang_16650512.geojson) · [`ways`](./ways/30_kalapa_ke_elang_16650512.geojson) · [`endstops`](./endstops/30_kalapa_ke_elang_16650512.geojson) |

- **Nama file (`16650514`)**: `30_cicadas_ke_kalapa_16650514.geojson`  
  **Jalan yang dilalui**: Jalan Dewi Sartika, Jalan Burangrang, Jalan Jenderal Gatot Subroto, Jalan Lengkong Besar, Jalan Ibu Inggit Ganarsih, Jalan Cikawao, Jalan H. Ibrahim Adjie, Jalan Sadakeling, Jalan Talaga Bodas
- **Nama file (`16650513`)**: `30_kalapa_ke_cicadas_16650513.geojson`  
  **Jalan yang dilalui**: Jalan H. Ibrahim Adjie, Jalan Burangrang, Jalan Lengkong Besar, Jalan Jenderal Gatot Subroto, Jalan Dalem Kaum, Jalan Cikawao, Jalan Dewi Sartika, Jalan Jenderal Ahmad Yani, Jalan Jakarta, Jalan Sadakeling
- **Nama file (`16648408`)**: `30_elang_ke_kalapa_16648408.geojson`  
  **Jalan yang dilalui**: Jalan Kebon Jati, Jalan Rajawali Timur, Jalan Otto Iskandardinata, Jalan Dewi Sartika, Jalan Suniaraja, Jalan Ibu Inggit Ganarsih
- **Nama file (`16650512`)**: `30_kalapa_ke_elang_16650512.geojson`  
  **Jalan yang dilalui**: Jalan Kebon Kawung, Jalan Aruna, Jalan Kasuari, Jalan Dadali, Jalan Stasiun Timur, Jalan Otto Iskandardinata, Jalan Banceuy, Jalan Alun-alun Timur, Jalan Pajajaran, Jalan HOS. Cokroaminoto, Jalan Garuda, Jalan Dewi Sartika, Jalan Perintis Kemerdekaan, Jalan Ciroyom, Jalan Dalem Kaum, Jalan Asia Afrika, Jalan Rajawali Barat, Jalan Kebon Jukut, Jalan Suniaraja, Jalan Aceh, Jalan Arjuna, Jalan Layang Ciroyom, Jalan Rajawali Timur

### Trayek `31`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `4639769` | **Antapani → Ciroyom** | • **Terminal Antapani** (`-6.915304, 107.6659285`)<br>• **Husein Pajajaran** (`-6.9068423, 107.588209`) | 126 | [`gabungan`](./gabungan/31_antapani_ke_ciroyom_4639769.geojson) · [`ways`](./ways/31_antapani_ke_ciroyom_4639769.geojson) · [`endstops`](./endstops/31_antapani_ke_ciroyom_4639769.geojson) |
| `4639770` | **Ciroyom → Antapani** | • **Husein Pajajaran** (`-6.9068423, 107.588209`)<br>• **Terminal Antapani** (`-6.915304, 107.6659285`) | 125 | [`gabungan`](./gabungan/31_ciroyom_ke_antapani_4639770.geojson) · [`ways`](./ways/31_ciroyom_ke_antapani_4639770.geojson) · [`endstops`](./endstops/31_ciroyom_ke_antapani_4639770.geojson) |

- **Nama file (`4639769`)**: `31_antapani_ke_ciroyom_4639769.geojson`  
  **Jalan yang dilalui**: Jalan Cicendo, Jalan Pajajaran, Jalan Kebon Kawung, Jalan Perintis Kemerdekaan, Jalan Bangka, Jalan Gudang Utara, Jalan Belitung, Jalan HOS. Cokroaminoto, Jalan Wastukancana, Jalan Sukabumi, Jalan Merdeka, Jalan Aceh, Jalan Sumatra, Jalan Laswi, Jalan Terusan Jakarta, Jalan Purwakarta, Jalan Cibatu, Jalan Jakarta, Jalan Jenderal Ahmad Yani, Jalan Kuningan, Jalan Subang
- **Nama file (`4639770`)**: `31_ciroyom_ke_antapani_4639770.geojson`  
  **Jalan yang dilalui**: Jalan L.L. RE. Martadinata, Jalan Purnawarman, Jalan Pajajaran, Jalan H. Ibrahim Adjie, Jalan Cihampelas, Jalan Terusan Jakarta, Jalan Bangka, Jalan Gudang Utara, Jalan Kalimantan, Jalan Belitung, Jalan Jenderal Ahmad Yani, Jalan Wastukancana, Jalan Subang, Jalan Aceh, Jalan Purwakarta, Jalan Cibatu, Jalan Kuningan

### Trayek `32`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `16650576` | **Cicadas → Cibiru → Panyileukan** | • **BTM** (`-6.9113592, 107.6435055`)<br>• **Seberang Kiara Artha** (`-6.9146708, 107.6438226`)<br>• **Pangkalan Angkot Bumi Panyileukan** (`-6.9466584, 107.712912`) | 98 | [`gabungan`](./gabungan/32_cicadas_ke_cibiru_ke_panyileukan_16650576.geojson) · [`ways`](./ways/32_cicadas_ke_cibiru_ke_panyileukan_16650576.geojson) · [`endstops`](./endstops/32_cicadas_ke_cibiru_ke_panyileukan_16650576.geojson) |
| `16650577` | **Panyileukan → Cicadas** | • **Pangkalan Angkot Bumi Panyileukan** (`-6.9466584, 107.712912`)<br>• **BTM** (`-6.9113592, 107.6435055`)<br>• **Jembar Awi Bitung** (`-6.9107061, 107.6395509`) | 96 | [`gabungan`](./gabungan/32_panyileukan_ke_cicadas_16650577.geojson) · [`ways`](./ways/32_panyileukan_ke_cicadas_16650577.geojson) · [`endstops`](./endstops/32_panyileukan_ke_cicadas_16650577.geojson) |

- **Nama file (`16650576`)**: `32_cicadas_ke_cibiru_ke_panyileukan_16650576.geojson`  
  **Jalan yang dilalui**: Jalan H. Ibrahim Adjie, Jalan Soekarno-Hatta, Soekarno Hatta Frontage Boulevard, Jalan Raya Bumi Panyileukan, Jalan Raya Panyileukan, Bunderan Cibiru
- **Nama file (`16650577`)**: `32_panyileukan_ke_cicadas_16650577.geojson`  
  **Jalan yang dilalui**: Jalan H. Ibrahim Adjie, Jalan Jenderal Ahmad Yani, Jalan Jakarta, Jalan Soekarno-Hatta, Soekarno Hatta Frontage Boulevard, Jalan Raya Bumi Panyileukan, Jalan Raya Panyileukan, Jalan Letnan Jenderal Ibrahim Adjie

### Trayek `33`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `4422550` | **Gedebage → Simpang Dago** | • **Pasar Induk Gedebage** (`-6.9364151, 107.6972019`)<br>• **Surya Kencana** (`-6.8948409, 107.6144033`) | 80 | [`gabungan`](./gabungan/33_gedebage_ke_simpang_dago_4422550.geojson) · [`ways`](./ways/33_gedebage_ke_simpang_dago_4422550.geojson) · [`endstops`](./endstops/33_gedebage_ke_simpang_dago_4422550.geojson) |
| `4642924` | **Simpang Dago → Gedebage** | • **Surya Kencana** (`-6.8948409, 107.6144033`)<br>• **Pasar Induk Gedebage** (`-6.9364151, 107.6972019`)<br>• **UPTD Laboratorium Lingkungan Hidup** (`-6.9074116, 107.6864696`) | 78 | [`gabungan`](./gabungan/33_simpang_dago_ke_gedebage_4642924.geojson) · [`ways`](./ways/33_simpang_dago_ke_gedebage_4642924.geojson) · [`endstops`](./endstops/33_simpang_dago_ke_gedebage_4642924.geojson) |

- **Nama file (`4422550`)**: `33_gedebage_ke_simpang_dago_4422550.geojson`  
  **Jalan yang dilalui**: Jalan Merak, Jalan Dederuk, Jalan PH. H. Mustofa, Jalan Surapati, Jalan Haji Hasan, Jalan Penata Yudha, Jalan Kyai Gede Utama, Jalan Jenderal Ahmad Yani, Jalan Dipatiukur, Jalan Cikutra, Jalan Abdul Haris Nasution, Jalan Pahlawan, Jalan Rumah Sakit, Jalan Japati, Jalan Puter, Jalan Wirayuda Timur, Jalan Hasanudin
- **Nama file (`4642924`)**: `33_simpang_dago_ke_gedebage_4642924.geojson`  
  **Jalan yang dilalui**: Jalan PH. H. Mustofa, Jalan Surapati, Jalan Pagergunung, Jalan Penata Yudha, Jalan Dipatiukur, Jalan Abdul Haris Nasution, Jalan Rumah Sakit, Jalan Jenderal Ahmad Yani, Jalan Hasanudin

### Trayek `34`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `4646137` | **Caringin → Sadang Serang** | • **Barat Simpang Kopo Caringin** (`-6.9467105, 107.5879339`)<br>• **Terminal Sadang Serang** (`-6.8912645, 107.6249966`) | 125 | [`gabungan`](./gabungan/34_caringin_ke_sadang_serang_4646137.geojson) · [`ways`](./ways/34_caringin_ke_sadang_serang_4646137.geojson) · [`endstops`](./endstops/34_caringin_ke_sadang_serang_4646137.geojson) |
| `4294473` | **Sadang Serang → Caringin** | • **Terminal Sadang Serang** (`-6.8912645, 107.6249966`)<br>• **Barat Simpang Kopo Caringin** (`-6.9467105, 107.5879339`) | 134 | [`gabungan`](./gabungan/34_sadang_serang_ke_caringin_4294473.geojson) · [`ways`](./ways/34_sadang_serang_ke_caringin_4294473.geojson) · [`endstops`](./endstops/34_sadang_serang_ke_caringin_4294473.geojson) |

- **Nama file (`4646137`)**: `34_caringin_ke_sadang_serang_4646137.geojson`  
  **Jalan yang dilalui**: Jalan dr. Rajiman, Jalan Dursasana, Jalan Rajawali Timur, Jalan Bojong Raya, Jalan Holis, Jalan Tubagus Ismail, Jalan Ganesha, Jalan Tamansari, Jalan Astina, Jalan Abdul Rivai, Jalan Abdul Rahman Saleh, Jalan Garuda, Jalan Wastukencana, Jalan Caringin, Jalan Raya Cijerah, Jalan Terminal Sadangserang, Jalan Ir. H. Djuanda, Jalan Rajawali Barat, Jalan Wastukancana, Jalan Jendral Sudirman, Jalan Sadang Serang, Jalan Pajajaran, Bundaran Rajiman, Jalan Intan Raya, Jalan Layang Nurtanio
- **Nama file (`4294473`)**: `34_sadang_serang_ke_caringin_4294473.geojson`  
  **Jalan yang dilalui**: Jalan Cicendo, Jalan Tamansari, Jalan L.L. RE. Martadinata, Jalan Purnawarman, Jalan Pajajaran, Jalan Kebon Kawung, Jalan Jendral Sudirman, Jalan Ir. H. Djuanda, Jalan Bojong Raya, Jalan Holis, Jalan Tubagus Ismail, Jalan Cikapayang, Jalan Sadang Tengah, Jalan Sawunggaling, Jalan Harian Banga, Jalan Rangga Gadang, Jalan HOS. Cokroaminoto, Jalan Siliwangi, Jalan Abdul Rahman Saleh, Jalan Garuda, Jalan Caringin, Jalan Babakan Ciparay, Jalan Sumur Bandung, Jalan Raya Cijerah, Jalan Soekarno-Hatta, Jalan Wastukancana, Jalan Sadang Serang, Jalan Kyai Haji Wahid Hasyim, Bunderan Cibeureum, Jalan Intan Raya, Jalan Layang Nurtanio

### Trayek `35`

| `kode_jalur` | Arah Rute (`nama_rute`) | Titik Pemberhentian Akhir (`lat, lng`) | Segmen Jalan | File GeoJSON Hasil Pemisahan |
|:---:|---|---|:---:|---|
| `16677494` | **Cibaduyut → Kalapa** | • **Terminal Cibaduyut** (`-6.9617658, 107.5937757`)<br>• **Terminal Abdul Muis/Kebon Kalapa** (`-6.9276428, 107.6058322`) | 51 | [`gabungan`](./gabungan/35_cibaduyut_ke_kalapa_16677494.geojson) · [`ways`](./ways/35_cibaduyut_ke_kalapa_16677494.geojson) · [`endstops`](./endstops/35_cibaduyut_ke_kalapa_16677494.geojson) |
| `5517546` | **Kalapa → Cibaduyut** | • **Terminal Abdul Muis/Kebon Kalapa** (`-6.9276428, 107.6058322`)<br>• **Terminal Cibaduyut** (`-6.9617658, 107.5937757`) | 27 | [`gabungan`](./gabungan/35_kalapa_ke_cibaduyut_5517546.geojson) · [`ways`](./ways/35_kalapa_ke_cibaduyut_5517546.geojson) · [`endstops`](./endstops/35_kalapa_ke_cibaduyut_5517546.geojson) |
| `16677558` | **Kalapa → Karangsetra** | • **Terminal Abdul Muis/Kebon Kalapa** (`-6.9276428, 107.6058322`)<br>• **Karangsetra Waterland** (`-6.8790317, 107.5951798`) | 60 | [`gabungan`](./gabungan/35_kalapa_ke_karangsetra_16677558.geojson) · [`ways`](./ways/35_kalapa_ke_karangsetra_16677558.geojson) · [`endstops`](./endstops/35_kalapa_ke_karangsetra_16677558.geojson) |
| `16677557` | **Karangsetra → Kalapa** | • **Karangsetra Waterland** (`-6.8790317, 107.5951798`)<br>• **Terminal Abdul Muis/Kebon Kalapa** (`-6.9276428, 107.6058322`) | 101 | [`gabungan`](./gabungan/35_karangsetra_ke_kalapa_16677557.geojson) · [`ways`](./ways/35_karangsetra_ke_kalapa_16677557.geojson) · [`endstops`](./endstops/35_karangsetra_ke_kalapa_16677557.geojson) |

- **Nama file (`16677494`)**: `35_cibaduyut_ke_kalapa_16677494.geojson`  
  **Jalan yang dilalui**: Jalan Dewi Sartika, Jalan Mohammad Toha, Jalan Raya Cibaduyut, Jalan Keluar Terminal Leuwipanjang, Jalan Ibu Inggit Ganarsih, Jalan Peta, Jalan Kyai Haji Wahid Hasyim, Jalur Bus AKDP Terminal Leuwipanjang, Jalan Leuwi Panjang, Jalur Masuk Bus, Jalur Bus AKDP
- **Nama file (`5517546`)**: `35_kalapa_ke_cibaduyut_5517546.geojson`  
  **Jalan yang dilalui**: Jalan Otto Iskandardinata, Jalan Raya Cibaduyut, Jalan Pungkur, Jalan Peta, Jalan Leuwi Panjang, Jalan Dewi Sartika
- **Nama file (`16677558`)**: `35_kalapa_ke_karangsetra_16677558.geojson`  
  **Jalan yang dilalui**: Jalan Gardujati, Jalan Pasir Kaliki, Jalan Sukajadi, Jalan Ibu Inggit Ganarsih, Jalan HOS. Cokroaminoto, Jalan Sindang Sirna, Jalan Pungkur, Jalan Otto Iskandardinata, Jalan Astana Anyar, Jalan Dewi Sartika, Jalan Sirna Galih
- **Nama file (`16677557`)**: `35_karangsetra_ke_kalapa_16677557.geojson`  
  **Jalan yang dilalui**: Jalan Cicendo, Jalan Pajajaran, Jalan HOS. Cokroaminoto, Jalan Kebon Kawung, Jalan Kebon Jati, Jalan Sirna Galih, Jalan Cemara, Jalan Dokter Setiabudi, Jalan Jurang, Jalan Makmur, Jalan Profesor Christiaan Eijkman, Jalan Karangsari, Jalan Sederhana, Jalan Dulatip, Jalan Dewi Sartika, Jalan Pasir Kaliki, Jalan Pasteur, Jalan Pungkur, Jalan Otto Iskandardinata, Jalan Ibu Inggit Ganarsih, Jalan Astana Anyar, Jalan Jendral Sudirman, Jalan Raden Adipati Aria Wiranatakusumah, Jalan Dr. Setiabudi
