import type { Report, Vehicle, VehicleStatus } from '@/types'
import { routes } from '@/data/routes'
export { routes } from '@/data/routes'

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
  routes: 37,
  reportsThisMonth: 186,
  followUpRate: 92,
}
