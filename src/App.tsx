import { BrowserRouter, Navigate, Route, Routes, useSearchParams } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { ProtectedRoute } from './components/ProtectedRoute'
import { getAuthSession, getPortalPath } from './lib/auth'

const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })))
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const AdminLayout = lazy(() => import('./pages/AdminDashboard').then((m) => ({ default: m.AdminLayout })))
const AdminStudentsPage = lazy(() => import('./pages/admin/AdminStudentsPage').then((m) => ({ default: m.AdminStudentsPage })))
const AdminFormsPage = lazy(() => import('./pages/admin/AdminFormsPage').then((m) => ({ default: m.AdminFormsPage })))
const AdminCompaniesPage = lazy(() => import('./pages/admin/AdminCompaniesPage').then((m) => ({ default: m.AdminCompaniesPage })))
const AdminEligibilityPage = lazy(() => import('./pages/admin/AdminEligibilityPage').then((m) => ({ default: m.AdminEligibilityPage })))
const AdminPlacementsPage = lazy(() => import('./pages/admin/AdminPlacementsPage').then((m) => ({ default: m.AdminPlacementsPage })))
const AdminNotificationsPage = lazy(() => import('./pages/admin/AdminNotificationsPage').then((m) => ({ default: m.AdminNotificationsPage })))
const AdminAuditPage = lazy(() => import('./pages/admin/AdminAuditPage').then((m) => ({ default: m.AdminAuditPage })))
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage })))
const StudentLayout = lazy(() => import('./pages/StudentDashboard').then((m) => ({ default: m.StudentLayout })))
const StudentHomePage = lazy(() => import('./pages/student/StudentHomePage').then((m) => ({ default: m.StudentHomePage })))
const StudentRegistrationPage = lazy(() => import('./pages/student/StudentRegistrationPage').then((m) => ({ default: m.StudentRegistrationPage })))
const StudentDrivesPage = lazy(() => import('./pages/student/StudentDrivesPage').then((m) => ({ default: m.StudentDrivesPage })))
const StudentPlacementUpdatesPage = lazy(() => import('./pages/student/StudentPlacementUpdatesPage').then((m) => ({ default: m.StudentPlacementUpdatesPage })))
const StudentNotificationsPage = lazy(() => import('./pages/student/StudentNotificationsPage').then((m) => ({ default: m.StudentNotificationsPage })))
const StudentCareerHubPage = lazy(() => import('./pages/student/StudentCareerHubPage').then((m) => ({ default: m.StudentCareerHubPage })))
const CoordinatorLayout = lazy(() => import('./pages/CoordinatorDashboard').then((m) => ({ default: m.CoordinatorLayout })))
const CoordinatorHomePage = lazy(() => import('./pages/coordinator/CoordinatorHomePage').then((m) => ({ default: m.CoordinatorHomePage })))
const CoordinatorStudentsPage = lazy(() => import('./pages/coordinator/CoordinatorStudentsPage').then((m) => ({ default: m.CoordinatorStudentsPage })))
const CoordinatorPlacementsPage = lazy(() => import('./pages/coordinator/CoordinatorPlacementsPage').then((m) => ({ default: m.CoordinatorPlacementsPage })))
const CoordinatorEligibilityPage = lazy(() => import('./pages/coordinator/CoordinatorEligibilityPage').then((m) => ({ default: m.CoordinatorEligibilityPage })))
const CoordinatorNotificationsPage = lazy(() => import('./pages/coordinator/CoordinatorNotificationsPage').then((m) => ({ default: m.CoordinatorNotificationsPage })))
const CoordinatorReportsPage = lazy(() => import('./pages/coordinator/CoordinatorReportsPage').then((m) => ({ default: m.CoordinatorReportsPage })))

function LoginRedirect() {
  const [searchParams] = useSearchParams()
  const roleParam = searchParams.get('role')

  if (roleParam) {
    return <LoginPage />
  }

  const session = getAuthSession()
  if (session) {
    return <Navigate to={getPortalPath(session.role)} replace />
  }

  return <LoginPage />
}

function AppShell() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginRedirect />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminEligibilityPage />} />
        <Route path="students" element={<AdminStudentsPage />} />
        <Route path="forms" element={<AdminFormsPage />} />
        <Route path="companies" element={<AdminCompaniesPage />} />
        <Route path="eligibility" element={<AdminEligibilityPage />} />
        <Route path="placements" element={<AdminPlacementsPage />} />
        <Route path="notifications" element={<AdminNotificationsPage />} />
        <Route path="audit" element={<AdminAuditPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      <Route
        path="/coordinator"
        element={
          <ProtectedRoute role="coordinator">
            <CoordinatorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<CoordinatorHomePage />} />
        <Route path="students" element={<CoordinatorStudentsPage />} />
        <Route path="placements" element={<CoordinatorPlacementsPage />} />
        <Route path="eligibility" element={<CoordinatorEligibilityPage />} />
        <Route path="notifications" element={<CoordinatorNotificationsPage />} />
        <Route path="reports" element={<CoordinatorReportsPage />} />
      </Route>

      <Route
        path="/student"
        element={
          <ProtectedRoute role="student">
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentHomePage />} />
        <Route path="registration" element={<StudentRegistrationPage />} />
        <Route path="drives" element={<StudentDrivesPage />} />
        <Route path="updates" element={<StudentPlacementUpdatesPage />} />
        <Route path="career" element={<StudentCareerHubPage />} />
        <Route path="notifications" element={<StudentNotificationsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-muted/40 text-sm font-medium text-muted-foreground">
            Loading CampusConnect portal...
          </div>
        }
      >
        <AppShell />
      </Suspense>
    </BrowserRouter>
  )
}

export default App
