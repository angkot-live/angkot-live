import type { Report, RouteInfo, Vehicle, VehicleStatus } from '@/types'

export const routes: RouteInfo[] = [
  {
    id: 'r-08',
    code: '08',
    name: 'Stasiun Hall — Dago',
    origin: 'Stasiun Hall',
    destination: 'Dago',
    color: '#1F5C3A',
    polyline: [
      [-6.9147, 107.6026],
      [-6.9125, 107.6075],
      [-6.9092, 107.6112],
      [-6.9054, 107.6148],
      [-6.9011, 107.6179],
      [-6.8974, 107.6205],
      [-6.8935, 107.6218],
      [-6.8896, 107.6204],
      [-6.8854, 107.6182],
      [-6.8818, 107.6161],
    ],
  },
  {
    id: 'r-05',
    code: '05',
    name: 'Cicaheum — Ledeng',
    origin: 'Cicaheum',
    destination: 'Ledeng',
    color: '#325F99',
    polyline: [
      [-6.9024, 107.6472],
      [-6.9048, 107.6401],
      [-6.9069, 107.6322],
      [-6.9088, 107.6245],
      [-6.9112, 107.6171],
      [-6.9128, 107.6098],
      [-6.9136, 107.6024],
      [-6.9121, 107.5951],
      [-6.9098, 107.5882],
      [-6.9062, 107.5815],
    ],
  },
  {
    id: 'r-02',
    code: '02',
    name: 'Kalapa — Cicaheum',
    origin: 'Kalapa',
    destination: 'Cicaheum',
    color: '#B45309',
    polyline: [
      [-6.9182, 107.5921],
      [-6.9164, 107.5998],
      [-6.9148, 107.6074],
      [-6.9131, 107.6152],
      [-6.9114, 107.6231],
      [-6.9092, 107.6314],
      [-6.9066, 107.6392],
      [-6.9034, 107.6468],
    ],
  },
  {
    id: 'r-16',
    code: '16',
    name: 'Riung Bandung — Cicaheum',
    origin: 'Riung Bandung',
    destination: 'Cicaheum',
    color: '#7C3AED',
    polyline: [
      [-6.9443, 107.6531],
      [-6.9378, 107.6489],
      [-6.9312, 107.6448],
      [-6.9249, 107.6409],
      [-6.9188, 107.6371],
      [-6.9128, 107.6335],
      [-6.9071, 107.6302],
    ],
  },
  {
    id: 'r-23',
    code: '23',
    name: 'Gunung Batu — Kalapa',
    origin: 'Gunung Batu',
    destination: 'Kalapa',
    color: '#BE185D',
    polyline: [
      [-6.8671, 107.5891],
      [-6.8759, 107.5918],
      [-6.8848, 107.5942],
      [-6.8934, 107.5961],
      [-6.9018, 107.5978],
      [-6.9101, 107.5991],
      [-6.9182, 107.6002],
    ],
  },
]

const driverNames = [
  'Asep Sunandar',
  'Dadan Ramdani',
  'Eko Saputra',
  'Yayan Suryana',
  'Rudi Hartono',
  'Iwan Setiawan',
  'Dedi Kurnia',
  'Ujang Solihin',
]

const statuses: VehicleStatus[] = ['jalan', 'jalan', 'merayap', 'ngetem', 'jalan', 'jalan']

function pointOnRoute(polyline: [number, number][], t: number): [number, number] {
  const clamped = Math.min(Math.max(t, 0), 1)
  const scaled = clamped * (polyline.length - 1)
  const index = Math.min(Math.floor(scaled), polyline.length - 2)
  const local = scaled - index
  const [lat1, lng1] = polyline[index]
  const [lat2, lng2] = polyline[index + 1]
  return [lat1 + (lat2 - lat1) * local, lng1 + (lng2 - lng1) * local]
}

export const vehicles: Vehicle[] = Array.from({ length: 14 }, (_, index) => {
  const route = routes[index % routes.length]
  const status = statuses[index % statuses.length]
  return {
    id: `v-${index + 1}`,
    plate: `D ${1000 + index * 37} AB`,
    routeId: route.id,
    routeCode: route.code,
    routeName: route.name,
    driverName: driverNames[index % driverNames.length],
    status,
    position: pointOnRoute(route.polyline, (index * 0.13) % 1),
    heading: (index * 47) % 360,
    speedKph: status === 'ngetem' ? 0 : status === 'merayap' ? 9 : 28 + (index % 14),
    etaMinutes: 1 + (index % 12),
    seatsAvailable: 3 + (index % 9),
    driverVerified: index !== 3,
  }
})

export const reports: Report[] = [
  {
    id: 'rep-1',
    code: 'LPR-1042',
    category: 'pengemudi',
    subject: 'Pengemudi ugal-ugalan',
    description: 'Angkot melaju melebihi batas kecepatan di Jalan Dago.',
    status: 'diproses',
    createdAt: '2026-10-28T08:20:00+07:00',
    plate: 'D 1024 AB',
    response: 'Laporan diteruskan ke petugas pengawas trayek.',
  },
  {
    id: 'rep-2',
    code: 'LPR-1038',
    category: 'fasilitas',
    subject: 'Lampu kabin mati',
    description: 'Lampu penerangan dalam angkot tidak menyala saat malam.',
    status: 'selesai',
    createdAt: '2026-10-21T19:05:00+07:00',
    plate: 'D 1098 AB',
    response: 'Kendaraan sudah diperiksa dan lampu diganti.',
  },
    {
      id: 'rep-3',
      code: 'LPR-1051',
      category: 'tarif',
      subject: 'Tarif tidak sesuai',
      description: 'Pengemudi meminta tarif lebih tinggi dari ketentuan.',
      status: 'diterima',
      createdAt: '2026-10-31T06:40:00+07:00',
      plate: 'D 1135 AB',
    },
    {
      id: 'rep-4',
      code: 'LPR-1049',
      category: 'fasilitas',
      subject: 'Pintu angkot tidak bisa ditutup',
      description: 'Pintu belakang macet sehingga penumpang berisiko terjatuh saat kendaraan berjalan.',
      status: 'diproses',
      createdAt: '2026-10-30T16:12:00+07:00',
      plate: 'D 1172 AB',
      response: 'Tim teknis dijadwalkan memeriksa kendaraan pada 1 November 2026.',
    },
    {
      id: 'rep-5',
      code: 'LPR-1046',
      category: 'pengemudi',
      subject: 'Mengetem terlalu lama di halte',
      description: 'Angkot menunggu penumpang lebih dari 15 menit dan menyebabkan antrean panjang.',
      status: 'selesai',
      createdAt: '2026-10-27T11:35:00+07:00',
      plate: 'D 1061 AB',
      response: 'Pengemudi sudah diberikan pembinaan oleh koordinator trayek.',
    },
    {
      id: 'rep-6',
      code: 'LPR-1044',
      category: 'lainnya',
      subject: 'Suara knalpot mengganggu',
      description: 'Knalpot kendaraan mengeluarkan suara bising di kawasan permukiman.',
      status: 'diterima',
      createdAt: '2026-10-26T07:10:00+07:00',
      plate: 'D 1208 AB',
    },
    {
      id: 'rep-7',
      code: 'LPR-1040',
      category: 'fasilitas',
      subject: 'Kursi penumpang rusak',
      description: 'Busana kursi baris ketiga sobek dan rangka kursi menonjol.',
      status: 'selesai',
      createdAt: '2026-10-23T13:55:00+07:00',
      plate: 'D 1098 AB',
      response: 'Kursi sudah diganti oleh pemilik kendaraan.',
    },
  ]

export const publicStats = {
  activeVehicles: 1240,
  routes: 32,
  reportsThisMonth: 186,
  followUpRate: 92,
}
