import { Navigate, Outlet } from 'react-router-dom'

import { FullPageSpinner } from './LoadingSpinner'
import { useAuth } from '../context/AuthContext'

/**
 * Administrators only. This is a convenience for navigation, not the security
 * boundary: the backend independently rejects non-admin callers with 403.
 */
export default function AdminRoute() {
  const { isAuthenticated, isAdmin, isRestoring } = useAuth()

  if (isRestoring) return <FullPageSpinner label="Restoring your session…" />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />

  return <Outlet />
}
