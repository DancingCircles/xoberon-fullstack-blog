import { Navigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/auth/useAuth'

interface AdminRouteProps {
  children: React.ReactNode
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, isAdmin } = useAuth()

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/home" replace />

  return <>{children}</>
}
