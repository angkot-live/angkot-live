export interface TripLeg {
  routeCode: string
  routeName: string
  from: string
  to: string
  durationMinutes: number
  fare: number
  boardAt: string
  alightAt: string
}

export interface Trip {
  id: string
  code: string
  date: string
  routeCode: string
  routeName: string
  from: string
  to: string
  durationMinutes: number
  distanceKm: number
  fare: number
  status: 'selesai' | 'dibatalkan'
  legs?: TripLeg[]
}

export const trips: Trip[] = [
  {
    id: 'trip-1',
    code: 'TRP-2091',
    date: '2026-10-31T07:42:00+07:00',
    routeCode: '08',
    routeName: 'Stasiun Hall — Dago',
    from: 'Stasiun Hall',
    to: 'Simpang Dago',
    durationMinutes: 14,
    distanceKm: 5.8,
    fare: 5000,
    status: 'selesai',
    legs: [
      {
        routeCode: '08',
        routeName: 'Stasiun Hall - Dago',
        from: 'Stasiun Hall',
        to: 'Simpang Dago',
        durationMinutes: 14,
        fare: 5000,
        boardAt: 'Halte Stasiun Hall',
        alightAt: 'Halte Simpang Dago',
      },
    ],
  },
  {
    id: 'trip-2',
    code: 'TRP-2077',
    date: '2026-10-30T17:15:00+07:00',
    routeCode: '05',
    routeName: 'Cicaheum — Ledeng',
    from: 'Gasibu',
    to: 'Ledeng',
    durationMinutes: 22,
    distanceKm: 8.4,
    fare: 5000,
    status: 'selesai',
    legs: [
      {
        routeCode: '05',
        routeName: 'Cicaheum - Ledeng',
        from: 'Gasibu',
        to: 'Ledeng',
        durationMinutes: 22,
        fare: 5000,
        boardAt: 'Halte Gasibu',
        alightAt: 'Halte Ledeng',
      },
    ],
  },
  {
    id: 'trip-3',
    code: 'TRP-2054',
    date: '2026-10-28T06:58:00+07:00',
    routeCode: '02',
    routeName: 'Kalapa — Cicaheum',
    from: 'Kalapa',
    to: 'Kiaracondong',
    durationMinutes: 18,
    distanceKm: 6.1,
    fare: 5000,
    status: 'selesai',
  },
  {
    id: 'trip-4',
    code: 'TRP-2038',
    date: '2026-10-26T19:22:00+07:00',
    routeCode: '16',
    routeName: 'Riung Bandung — Cicaheum',
    from: 'Riung Bandung',
    to: 'Antapani',
    durationMinutes: 0,
    distanceKm: 0,
    fare: 0,
    status: 'dibatalkan',
  },
  {
    id: 'trip-5',
    code: 'TRP-2011',
    date: '2026-10-24T08:05:00+07:00',
    routeCode: '08',
    routeName: 'Stasiun Hall — Dago',
    from: 'Cihampelas',
    to: 'Dago',
    durationMinutes: 11,
    distanceKm: 3.9,
    fare: 5000,
    status: 'selesai',
  },
]

export interface AppNotification {
  id: string
  title: string
  body: string
  time: string
  kind: 'trip' | 'report' | 'promo' | 'system'
  unread: boolean
}

export const notifications: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'Laporan LPR-1042 diproses',
    body: 'Laporan pengemudi ugal-ugalan sudah diteruskan ke petugas pengawas trayek.',
    time: 'Hari ini, 09.14',
    kind: 'report',
    unread: true,
  },
  {
    id: 'notif-2',
    title: 'Angkot 08 mendekat',
    body: 'Angkot D 1024 AB berjarak 2 halte dari Halte Stasiun Hall.',
    time: 'Kemarin, 07.38',
    kind: 'trip',
    unread: true,
  },
  {
    id: 'notif-3',
    title: 'Perjalanan selesai',
    body: 'Terima kasih sudah naik angkot 05. Perjalanan 22 menit tercatat di riwayat.',
    time: '30 Okt, 17.37',
    kind: 'trip',
    unread: false,
  },
  {
    id: 'notif-4',
    title: 'Laporan LPR-1038 selesai',
    body: 'Lampu kabin angkot D 1098 AB sudah diperbaiki. Terima kasih atas laporanmu.',
    time: '22 Okt, 10.02',
    kind: 'report',
    unread: false,
  },
  {
    id: 'notif-5',
    title: 'Jadwal trayek diperbarui',
    body: 'Trayek 23 kini beroperasi sampai pukul 20.00 WIB setiap hari.',
    time: '20 Okt, 08.00',
    kind: 'system',
    unread: false,
  },
]
