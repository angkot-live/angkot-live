export type ApplicantStatus = 'menunggu' | 'disetujui' | 'ditolak'

export interface DriverApplicant {
  id: string
  name: string
  nik: string
  wa: string
  plate: string
  model: string
  year: string
  color: string
  routeId: string
  routeCode: string
  routeName: string
  registeredAt: string
  docsComplete: number
  docsTotal: number
  status: ApplicantStatus
  koperasi: string
  address: string
  sim: string
  simExpiry: string
  experience: string
  simValid: boolean
  stnkValid: boolean
  kirValid: boolean
}

export const driverApplicants: DriverApplicant[] = [
  {
    id: 'app-1',
    name: 'Pak Supriatna',
    nik: '3273109140790002',
    wa: '+62 812-3456-7890',
    plate: 'D 1982 AC',
    model: 'Suzuki Carry 1.5 Futura',
    year: '2018',
    color: 'Hijau Kuning Gading',
    routeId: 'r-08',
    routeCode: '08',
    routeName: 'Stasiun Hall — Dago',
    registeredAt: '2026-10-24T08:42:00+07:00',
    docsComplete: 5,
    docsTotal: 5,
    status: 'menunggu',
    koperasi: 'Kopamas Unit Cicaheum',
    address: 'Jl. Babakan Tarogong No. 42, Bojongloa Kaler, Bandung',
    sim: '3271-9204-00418',
    simExpiry: '18 Agu 2027',
    experience: '11 tahun',
    simValid: true,
    stnkValid: true,
    kirValid: true,
  },
  {
    id: 'app-2',
    name: 'Kang Asep Hidayat',
    nik: '3273180205850001',
    wa: '+62 857-2201-9988',
    plate: 'D 1433 BZ',
    model: 'Daihatsu Gran Max 1.3',
    year: '2020',
    color: 'Biru Cerah Strip Putih',
    routeId: 'r-05',
    routeCode: '05',
    routeName: 'Cicaheum — Ledeng',
    registeredAt: '2026-10-24T09:15:00+07:00',
    docsComplete: 5,
    docsTotal: 5,
    status: 'menunggu',
    koperasi: 'Kobanter Baru',
    address: 'Jl. Cicaheum Raya No. 12, Bandung',
    sim: '3271-1180-88231',
    simExpiry: '02 Feb 2028',
    experience: '6 tahun',
    simValid: true,
    stnkValid: true,
    kirValid: true,
  },
  {
    id: 'app-3',
    name: 'Pak Dadang Hermawan',
    nik: '3273061211720003',
    wa: '+62 813-8821-4432',
    plate: 'D 1754 YU',
    model: 'Mitsubishi Colt T120SS',
    year: '2017',
    color: 'Cokelat Strip Krem',
    routeId: 'r-02',
    routeCode: '02',
    routeName: 'Kalapa — Cicaheum',
    registeredAt: '2026-10-24T10:04:00+07:00',
    docsComplete: 5,
    docsTotal: 5,
    status: 'menunggu',
    koperasi: 'Kopamas Unit Cicaheum',
    address: 'Jl. Kiaracondong No. 88, Bandung',
    sim: '3271-5501-99210',
    simExpiry: '14 Des 2026',
    experience: '9 tahun',
    simValid: true,
    stnkValid: true,
    kirValid: true,
  },
  {
    id: 'app-4',
    name: 'Kang Cecep Rusli',
    nik: '327310509890007',
    wa: '+62 821-1409-7711',
    plate: 'D 1801 KL',
    model: 'Suzuki Carry Futura 1.5',
    year: '2019',
    color: 'Hijau Daun List Merah',
    routeId: 'r-16',
    routeCode: '16',
    routeName: 'Riung Bandung — Cicaheum',
    registeredAt: '2026-10-24T10:48:00+07:00',
    docsComplete: 4,
    docsTotal: 5,
    status: 'menunggu',
    koperasi: 'Kobanter Baru',
    address: 'Jl. Riung Bandung No. 7, Bandung',
    sim: '3271-7730-11209',
    simExpiry: '30 Jun 2027',
    experience: '4 tahun',
    simValid: true,
    stnkValid: true,
    kirValid: false,
  },
  {
    id: 'app-5',
    name: 'Pak Iwan Setiawan',
    nik: '3273112203910004',
    wa: '+62 822-5510-8833',
    plate: 'D 2210 QA',
    model: 'Suzuki Carry 1.5',
    year: '2021',
    color: 'Hijau Stabilo',
    routeId: 'r-23',
    routeCode: '23',
    routeName: 'Gunung Batu — Kalapa',
    registeredAt: '2026-10-23T14:20:00+07:00',
    docsComplete: 5,
    docsTotal: 5,
    status: 'ditolak',
    koperasi: 'Kopamas Unit Cicaheum',
    address: 'Jl. Setiabudi No. 210, Bandung',
    sim: '3271-9902-33418',
    simExpiry: '11 Nov 2025',
    experience: '7 tahun',
    simValid: false,
    stnkValid: true,
    kirValid: true,
  },
]

export interface AdminUser {
  id: string
  name: string
  email: string
  role: 'Penumpang' | 'Pengemudi' | 'Admin'
  status: 'aktif' | 'ditangguhkan'
  joinedAt: string
  lastActive: string
}

export const adminUsers: AdminUser[] = [
  {
    id: 'usr-1',
    name: 'Sari Wulandari',
    email: 'sari@angkot-live.id',
    role: 'Penumpang',
    status: 'aktif',
    joinedAt: '12 Sep 2026',
    lastActive: 'Hari ini, 09.12',
  },
  {
    id: 'usr-2',
    name: 'Asep Sunandar',
    email: 'asep@angkot-live.id',
    role: 'Pengemudi',
    status: 'aktif',
    joinedAt: '03 Agu 2026',
    lastActive: 'Hari ini, 08.40',
  },
  {
    id: 'usr-3',
    name: 'Budi Santoso',
    email: 'budi@dishub.bandung.go.id',
    role: 'Admin',
    status: 'aktif',
    joinedAt: '01 Jan 2026',
    lastActive: 'Hari ini, 10.02',
  },
  {
    id: 'usr-4',
    name: 'Rina Marlina',
    email: 'rina@angkot-live.id',
    role: 'Penumpang',
    status: 'aktif',
    joinedAt: '20 Okt 2026',
    lastActive: 'Kemarin, 18.22',
  },
  {
    id: 'usr-5',
    name: 'Dedi Kurnia',
    email: 'dedi@angkot-live.id',
    role: 'Pengemudi',
    status: 'ditangguhkan',
    joinedAt: '15 Jul 2026',
    lastActive: '28 Okt 2026, 11.05',
  },
]
