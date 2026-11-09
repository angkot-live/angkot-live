import {
  BarChart3,
  Bus,
  FileText,
  Inbox,
  LayoutDashboard,
  Map,
  MessageSquare,
  Radio,
  Route,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
}

export const publicNav = [
  { label: 'Peta Live', to: '/peta' },
  { label: 'Cari Rute', to: '/peta?tab=rute' },
  { label: 'Trayek', to: '/trayek' },
  { label: 'Statistik', to: '/statistik' },
]

export const passengerNav: NavItem[] = [
  { label: 'Peta', to: '/penumpang', icon: Map, end: true },
  { label: 'Cari Rute', to: '/peta?tab=rute', icon: Search },
  { label: 'Riwayat', to: '/penumpang/riwayat', icon: Route },
  { label: 'Laporan', to: '/penumpang/laporan', icon: FileText },
  { label: 'Profil', to: '/penumpang/profil', icon: UserRound },
]

export const driverNav: NavItem[] = [
  { label: 'Peta Kerja', to: '/pengemudi', icon: Map, end: true },
  { label: 'Dashboard', to: '/pengemudi/dashboard', icon: LayoutDashboard },
  { label: 'Inbox', to: '/pengemudi/inbox', icon: Inbox },
  { label: 'Profil', to: '/pengemudi/profil', icon: UserRound },
]

export const adminNav: NavItem[] = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Monitoring', to: '/admin/monitoring', icon: Radio },
  { label: 'Verifikasi', to: '/admin/pengemudi', icon: ShieldCheck },
  { label: 'Trayek', to: '/admin/trayek', icon: Route },
  { label: 'Kendaraan', to: '/admin/kendaraan', icon: Bus },
  { label: 'Laporan', to: '/admin/laporan', icon: FileText },
  { label: 'Pesan', to: '/admin/pesan', icon: MessageSquare },
  { label: 'Pengguna', to: '/admin/pengguna', icon: Users },
]

export const adminSecondaryNav: NavItem[] = [
  { label: 'Statistik Publik', to: '/statistik', icon: BarChart3 },
]
