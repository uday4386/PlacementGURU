import { Navigate, useLocation } from 'react-router-dom'
import { getAuthSession, getPortalPath, type UserRole } from '../lib/auth'

interface ProtectedRouteProps {
  role: UserRole
  children: React.ReactNode
}

export function ProtectedRoute({ role, children }: ProtectedRouteProps) {
  const location = useLocation()
  const session = getAuthSession()

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (session.role !== role) {
    return <Navigate to={getPortalPath(session.role)} replace />
  }

  return children
}
