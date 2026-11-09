import { createBrowserRouter, Navigate, Outlet, useLocation, useSearchParams } from 'react-router-dom'

import { AdminShell } from '@/components/layout/admin-shell'
import { PublicShell } from '@/components/layout/public-shell'
import { AdminDashboardPage } from '@/features/admin/dashboard-page'
import { MessagesPage } from '@/features/admin/messages-page'
import { MonitoringPage } from '@/features/admin/monitoring-page'
import { ReportDetailPage as AdminReportDetailPage } from '@/features/admin/report-detail-page'
import { RouteEditorPage } from '@/features/admin/route-editor-page'
import { RoutesListPage } from '@/features/admin/routes-list-page'
import { UsersPage } from '@/features/admin/users-page'
import { VehiclesPage } from '@/features/admin/vehicles-page'
import { ReportsListPage } from '@/features/admin/reports-list-page'
import { VerificationDetailPage } from '@/features/admin/verification-detail-page'
import { VerificationQueuePage } from '@/features/admin/verification-queue-page'
import { RoleShell } from '@/components/layout/role-shell'
import { ForgotPasswordPage } from '@/features/auth/forgot-password-page'
import { LoginPage } from '@/features/auth/login-page'
import { RegisterPassengerPage } from '@/features/auth/register-passenger-page'
import { RegisterRolePage } from '@/features/auth/register-role-page'
import { homeForRole, useAuthStore } from '@/features/auth/auth-store'
import { UiGalleryPage } from '@/features/dev/ui-gallery-page'
import { DriverDashboardPage } from '@/features/driver/driver-dashboard-page'
import { DriverInboxPage } from '@/features/driver/inbox-page'
import { DriverMapPage } from '@/features/driver/driver-map-page'
import { DriverOnboardingPage } from '@/features/driver/driver-onboarding-page'
import { DriverProfilePage } from '@/features/driver/profile-page'
import { DriverVerificationPage } from '@/features/driver/driver-verification-page'
import { LandingPage } from '@/features/landing/landing-page'
import { MapScreen } from '@/features/map/map-screen'
import { ActiveTripPage } from '@/features/passenger/active-trip-page'
import { CreateReportPage } from '@/features/passenger/create-report-page'
import { PassengerDashboardPage } from '@/features/passenger/dashboard-page'
import { HistoryPage } from '@/features/passenger/history-page'
import { NotificationsPage } from '@/features/passenger/notifications-page'
import { PassengerProfilePage } from '@/features/passenger/profile-page'
import { ReportDetailPage } from '@/features/passenger/report-detail-page'
import { ReportsPage } from '@/features/passenger/reports-page'
import { HelpPage } from '@/features/public/help-page'
import { StatisticsPage } from '@/features/public/statistics-page'
import { RouteDetailPage } from '@/features/routes/route-detail-page'
import { RouteListPage } from '@/features/routes/route-list-page'
import { NotFoundPage } from '@/features/shared/not-found-page'
import { driverNav, passengerNav } from '@/lib/navigation'
import type { Role } from '@/types'

function RequireRole({ role, children }: { role: Role; children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user)
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (user.role !== role) {
    return <Navigate to={homeForRole(user.role)} replace />
  }

  if (
    role === 'pengemudi' &&
    user.driverVerification &&
    user.driverVerification !== 'disetujui'
  ) {
    return <Navigate to="/pengemudi/verifikasi" replace />
  }

  return children
}

function PassengerLayout() {
  return (
    <RequireRole role="penumpang">
      <RoleShell nav={passengerNav} home="/penumpang" />
    </RequireRole>
  )
}

function DriverLayout() {
  return (
    <RequireRole role="pengemudi">
      <RoleShell nav={driverNav} home="/pengemudi" />
    </RequireRole>
  )
}

function AdminLayout() {
  return (
    <RequireRole role="admin">
      <AdminShell />
    </RequireRole>
  )
}

function PublicMapPage() {
  return <MapScreen />
}

function PassengerMapPage() {
  return <MapScreen passengerMode />
}

function RouteRedirect() {
  const [searchParams] = useSearchParams()
  const params = new URLSearchParams(searchParams)
  if (!params.has('tab')) {
    params.set('tab', 'rute')
  }
  return <Navigate to={`/peta?${params.toString()}`} replace />
}

export const router = createBrowserRouter([
  {
    element: <PublicShell />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'peta', element: <PublicMapPage /> },
      { path: 'rute', element: <RouteRedirect /> },
      { path: 'trayek', element: <RouteListPage /> },
      { path: 'trayek/:id', element: <RouteDetailPage /> },
      { path: 'statistik', element: <StatisticsPage /> },
      { path: 'bantuan', element: <HelpPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: 'login', element: <LoginPage /> },
  { path: 'register', element: <RegisterRolePage /> },
  { path: 'register/penumpang', element: <RegisterPassengerPage /> },
  { path: 'lupa-password', element: <ForgotPasswordPage /> },
  { path: 'pengemudi/daftar', element: <DriverOnboardingPage /> },
  { path: 'pengemudi/verifikasi', element: <DriverVerificationPage /> },
  {
    path: 'dev/ui',
    element: <UiGalleryPage />,
  },
  {
    element: <PassengerLayout />,
    children: [
      { path: 'penumpang', element: <PassengerMapPage /> },
      { path: 'penumpang/perjalanan', element: <ActiveTripPage /> },
      { path: 'penumpang/dashboard', element: <PassengerDashboardPage /> },
      { path: 'penumpang/riwayat', element: <HistoryPage /> },
      { path: 'penumpang/lapor', element: <CreateReportPage /> },
      { path: 'penumpang/laporan', element: <ReportsPage /> },
      { path: 'penumpang/laporan/:id', element: <ReportDetailPage /> },
      { path: 'penumpang/profil', element: <PassengerProfilePage /> },
      { path: 'penumpang/notifikasi', element: <NotificationsPage /> },
    ],
  },
  {
    element: <DriverLayout />,
    children: [
      { path: 'pengemudi', element: <DriverMapPage /> },

      { path: 'pengemudi/dashboard', element: <DriverDashboardPage /> },
      { path: 'pengemudi/inbox', element: <DriverInboxPage /> },
      { path: 'pengemudi/profil', element: <DriverProfilePage /> },
    ],
  },
  {
    element: <AdminLayout />,
    children: [
      { path: 'admin', element: <AdminDashboardPage /> },
      { path: 'admin/monitoring', element: <MonitoringPage /> },
      { path: 'admin/pengemudi', element: <VerificationQueuePage /> },
      { path: 'admin/pengemudi/:id', element: <VerificationDetailPage /> },
      { path: 'admin/trayek', element: <RoutesListPage /> },
      { path: 'admin/trayek/:id', element: <RouteEditorPage /> },
      { path: 'admin/kendaraan', element: <VehiclesPage /> },
      { path: 'admin/laporan', element: <ReportsListPage /> },
      { path: 'admin/laporan/:id', element: <AdminReportDetailPage /> },
      { path: 'admin/pesan', element: <MessagesPage /> },
      { path: 'admin/pengguna', element: <UsersPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])

export function RootRedirect() {
  return <Outlet />
}
