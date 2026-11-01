export interface DriverMessage {
  id: string
  from: string
  role: string
  title: string
  body: string
  time: string
  kind: 'admin' | 'system' | 'report'
  unread: boolean
}

export const driverMessages: DriverMessage[] = [
  {
    id: 'msg-1',
    from: 'Dishub Kota Bandung',
    role: 'Administrator',
    title: 'Pengingat uji KIR kendaraan',
    body: 'Yth. Asep Sunandar, masa berlaku uji KIR kendaraan D 1037 AB akan berakhir dalam 14 hari. Mohon segera melakukan uji ulang di Kantor Dishub Kota Bandung. Bawa STNK asli dan kartu uji lama.',
    time: 'Hari ini, 09.12',
    kind: 'admin',
    unread: true,
  },
  {
    id: 'msg-2',
    from: 'Sistem Angkot-Live',
    role: 'Notifikasi otomatis',
    title: 'Perjalanan hari ini tercatat',
    body: 'Kamu telah menyelesaikan 6 rit perjalanan dengan total jarak 42,8 km. Pendapatan tip hari ini Rp 18.000. Terima kasih sudah menjaga keselamatan penumpang.',
    time: 'Hari ini, 07.45',
    kind: 'system',
    unread: true,
  },
  {
    id: 'msg-3',
    from: 'Koordinator Trayek 08',
    role: 'Petugas lapangan',
    title: 'Pembinaan pengemudi Jumat',
    body: 'Diberitahukan bahwa akan dilaksanakan pembinaan pengemudi trayek 08 pada Jumat, 6 November 2026 pukul 09.00 di Aula Dishub Kota Bandung. Kehadiran bersifat wajib.',
    time: 'Kemarin, 16.20',
    kind: 'admin',
    unread: false,
  },
  {
    id: 'msg-4',
    from: 'Sistem Angkot-Live',
    role: 'Notifikasi otomatis',
    title: 'Laporan penumpang ditindaklanjuti',
    body: 'Laporan LPR-1042 terkait kecepatan kendaraan di Jalan Dago sudah diverifikasi petugas. Mohon mematuhi batas kecepatan dan rambu lalu lintas.',
    time: '29 Okt, 11.05',
    kind: 'report',
    unread: false,
  },
  {
    id: 'msg-5',
    from: 'Dishub Kota Bandung',
    role: 'Administrator',
    title: 'Verifikasi akun disetujui',
    body: 'Selamat! Akun pengemudi kamu telah disetujui. Kamu dapat mulai menerima penumpang melalui aplikasi Angkot-Live. Pastikan selalu mengaktifkan GPS saat bertugas.',
    time: '20 Okt, 08.30',
    kind: 'system',
    unread: false,
  },
  {
    id: 'msg-6',
    from: 'Sistem Angkot-Live',
    role: 'Notifikasi otomatis',
    title: 'Pengingat istirahat',
    body: 'Kamu sudah bertugas lebih dari 4 jam. Ambil waktu istirahat minimal 15 menit untuk menjaga konsentrasi berkendara.',
    time: '18 Okt, 14.10',
    kind: 'system',
    unread: false,
  },
]
