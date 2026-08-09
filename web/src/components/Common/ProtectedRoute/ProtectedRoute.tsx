import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../../hooks/auth/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isChecking } = useAuth()
  const location = useLocation()

  if (isChecking) return <div className="page-loading" role="status">正在验证登录状态…</div>

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <>{children}</>
}
