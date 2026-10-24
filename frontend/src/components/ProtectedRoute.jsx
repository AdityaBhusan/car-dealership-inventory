import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { FullPageSpinner } from './LoadingSpinner'
import { useAuth } from '../context/AuthContext'

/** Any signed-in user. Waits for session restore before redirecting. */
export default function ProtectedRoute() {
  const { isAuthenticated, isRestoring } = useAuth()
  const location = useLocation()

  if (isRestoring) return <FullPageSpinner label="Restoring your session…" />

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
