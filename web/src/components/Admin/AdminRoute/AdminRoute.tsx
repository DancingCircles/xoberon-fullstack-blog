import { Navigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/auth/useAuth'

interface AdminRouteProps {
  children: React.ReactNode
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, isAdmin, isChecking } = useAuth()

  if (isChecking) return <div className="page-loading" role="status">正在验证登录状态…</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/home" replace />

  return <>{children}</>
}
