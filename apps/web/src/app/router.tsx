import { lazy } from 'react'
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom'

import { AdminShell } from '@/components/layout/admin-shell'
import { PublicShell } from '@/components/layout/public-shell'
const AdminDashboardPage = lazy(() =>
  import('@/features/admin/dashboard-page').then((m) => ({
    default: m.AdminDashboardPage,
  })),
)
const MonitoringPage = lazy(() =>
  import('@/features/admin/monitoring-page').then((m) => ({
    default: m.MonitoringPage,
  })),
)
const AdminReportDetailPage = lazy(() =>
  import('@/features/admin/report-detail-page').then((m) => ({
    default: m.ReportDetailPage,
  })),
)
const RouteEditorPage = lazy(() =>
  import('@/features/admin/route-editor-page').then((m) => ({
    default: m.RouteEditorPage,
  })),
)
const RoutesListPage = lazy(() =>
  import('@/features/admin/routes-list-page').then((m) => ({
    default: m.RoutesListPage,
  })),
)
const ReportsListPage = lazy(() =>
  import('@/features/admin/reports-list-page').then((m) => ({
    default: m.ReportsListPage,
  })),
)
const VerificationDetailPage = lazy(() =>
  import('@/features/admin/verification-detail-page').then((m) => ({
    default: m.VerificationDetailPage,
  })),
)
const VerificationQueuePage = lazy(() =>
  import('@/features/admin/verification-queue-page').then((m) => ({
    default: m.VerificationQueuePage,
  })),
)
import { RoleShell } from '@/components/layout/role-shell'
import {
  ForgotPasswordPage,
  ResetPasswordPage,
} from '@/features/auth/forgot-password-page'
const LoginPage = lazy(() =>
  import('@/features/auth/login-page').then((m) => ({ default: m.LoginPage })),
)
const RegisterPassengerPage = lazy(() =>
  import('@/features/auth/register-passenger-page').then((m) => ({
    default: m.RegisterPassengerPage,
  })),
)
const RegisterRolePage = lazy(() =>
  import('@/features/auth/register-role-page').then((m) => ({
    default: m.RegisterRolePage,
  })),
)
import { homeForRole, useAuthStore } from '@/features/auth/auth-store'
const DriverDashboardPage = lazy(() =>
  import('@/features/driver/driver-dashboard-page').then((m) => ({
    default: m.DriverDashboardPage,
  })),
)
const DriverInboxPage = lazy(() =>
  import('@/features/driver/inbox-page').then((m) => ({
    default: m.DriverInboxPage,
  })),
)
const DriverMapPage = lazy(() =>
  import('@/features/driver/driver-map-page').then((m) => ({
    default: m.DriverMapPage,
  })),
)
const DriverOnboardingPage = lazy(() =>
  import('@/features/driver/driver-onboarding-page').then((m) => ({
    default: m.DriverOnboardingPage,
  })),
)
const DriverProfilePage = lazy(() =>
  import('@/features/driver/profile-page').then((m) => ({
    default: m.DriverProfilePage,
  })),
)
const DriverVerificationPage = lazy(() =>
  import('@/features/driver/driver-verification-page').then((m) => ({
    default: m.DriverVerificationPage,
  })),
)
const LandingPage = lazy(() =>
  import('@/features/landing/landing-page').then((m) => ({
    default: m.LandingPage,
  })),
)
const MapScreen = lazy(() =>
  import('@/features/map/map-screen').then((m) => ({ default: m.MapScreen })),
)
const ActiveTripPage = lazy(() =>
  import('@/features/passenger/active-trip-page').then((m) => ({
    default: m.ActiveTripPage,
  })),
)
const CreateReportPage = lazy(() =>
  import('@/features/passenger/create-report-page').then((m) => ({
    default: m.CreateReportPage,
  })),
)
const PassengerDashboardPage = lazy(() =>
  import('@/features/passenger/dashboard-page').then((m) => ({
    default: m.PassengerDashboardPage,
  })),
)
const HistoryPage = lazy(() =>
  import('@/features/passenger/history-page').then((m) => ({
    default: m.HistoryPage,
  })),
)
const NotificationsPage = lazy(() =>
  import('@/features/passenger/notifications-page').then((m) => ({
    default: m.NotificationsPage,
  })),
)
const PassengerProfilePage = lazy(() =>
  import('@/features/passenger/profile-page').then((m) => ({
    default: m.PassengerProfilePage,
  })),
)
const ReportDetailPage = lazy(() =>
  import('@/features/passenger/report-detail-page').then((m) => ({
    default: m.ReportDetailPage,
  })),
)
const ReportsPage = lazy(() =>
  import('@/features/passenger/reports-page').then((m) => ({
    default: m.ReportsPage,
  })),
)
const HelpPage = lazy(() =>
  import('@/features/public/help-page').then((m) => ({ default: m.HelpPage })),
)
const StatisticsPage = lazy(() =>
  import('@/features/public/statistics-page').then((m) => ({
    default: m.StatisticsPage,
  })),
)
const RouteDetailPage = lazy(() =>
  import('@/features/routes/route-detail-page').then((m) => ({
    default: m.RouteDetailPage,
  })),
)
const RouteListPage = lazy(() =>
  import('@/features/routes/route-list-page').then((m) => ({
    default: m.RouteListPage,
  })),
)
const NotFoundPage = lazy(() =>
  import('@/features/shared/not-found-page').then((m) => ({
    default: m.NotFoundPage,
  })),
)
import { driverNav, passengerNav } from '@/lib/navigation'
import type { Role } from '@/types'

function RequireRole({
  role,
  children,
}: {
  role: Role
  children: React.ReactNode
}) {
  const user = useAuthStore((state) => state.user)
  const initialized = useAuthStore((state) => state.initialized)
  const location = useLocation()

  if (!initialized)
    return (
      <p role="status" className="p-8">
        Memulihkan sesi…
      </p>
    )

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: { pathname: location.pathname, search: location.search },
        }}
      />
    )
  }

  if (user.role !== role) {
    return <Navigate to={homeForRole(user.role)} replace />
  }

  if (role === 'pengemudi' && user.driverVerification !== 'disetujui') {
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

export const router = createBrowserRouter([
  {
    element: <PublicShell />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'peta', element: <PublicMapPage /> },
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
  { path: 'reset-password', element: <ResetPasswordPage /> },
  { path: 'pengemudi/daftar', element: <DriverOnboardingPage /> },
  { path: 'pengemudi/verifikasi', element: <DriverVerificationPage /> },
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
      { path: 'admin/laporan', element: <ReportsListPage /> },
      { path: 'admin/laporan/:id', element: <AdminReportDetailPage /> },
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
