import { useState, useCallback, useMemo, useEffect, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AuthContext } from './AuthContext'
import type { AuthActionResult } from './AuthContext'
import { useToast } from '../../hooks/social/useToast'
import { getAuthToken, clearAuthToken, friendlyErrorMessage } from '../../services/api'
import {
  loginApi,
  registerApi,
  logoutApi,
  updateProfileApi,
  fetchCurrentUser,
} from '../../services/runtime'
import type { UserProfile } from '../../assets/data/types'
import { resolveAvatarSrc } from '../../utils/avatar'

const USER_STORAGE_KEY = 'xoberon-user'

function saveUser(user: UserProfile) {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({
    ...user,
    avatar: resolveAvatarSrc(user.avatar, user.handle || user.id || user.name),
  }))
}

function clearStoredUser() {
  localStorage.removeItem(USER_STORAGE_KEY)
}


interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  const isAuthenticated = currentUser !== null
  const authStatus: 'checking' | 'authenticated' | 'anonymous' = isChecking
    ? 'checking'
    : isAuthenticated ? 'authenticated' : 'anonymous'
  const isOwner = currentUser?.role === 'owner'
  const isAdmin = currentUser?.role === 'admin' || isOwner

  // 监听 401 事件，自动登出
  useEffect(() => {
    const handleUnauthorized = () => {
      setCurrentUser(null)
      clearStoredUser()
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      if (!getAuthToken()) {
        clearStoredUser()
        if (!cancelled) setIsChecking(false)
        return
      }
      try {
        const user = await fetchCurrentUser()
        if (!cancelled) {
          setCurrentUser(user)
          saveUser(user)
        }
      } catch {
        clearAuthToken()
        clearStoredUser()
        if (!cancelled) setCurrentUser(null)
      } finally {
        if (!cancelled) setIsChecking(false)
      }
    }
    void bootstrap()
    return () => { cancelled = true }
  }, [])

  const login = useCallback(async (username: string, password: string): Promise<AuthActionResult> => {
    setIsLoading(true)
    try {
      await loginApi(username, password)
      const user = await fetchCurrentUser()
      setCurrentUser(user)
      saveUser(user)
      return { ok: true }
    } catch (err) {
      clearAuthToken()
      clearStoredUser()
      return { ok: false, message: friendlyErrorMessage(err, '用户名或密码错误') }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (username: string, email: string, password: string, captchaId: string, captchaCode: string): Promise<AuthActionResult> => {
    setIsLoading(true)
    try {
      await registerApi(username, email, password, username, captchaId, captchaCode)
      const user = await fetchCurrentUser()
      setCurrentUser(user)
      saveUser(user)
      return { ok: true }
    } catch (err) {
      clearAuthToken()
      clearStoredUser()
      return { ok: false, message: friendlyErrorMessage(err, '注册失败，请检查输入后重试') }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutApi()
    } catch {
      // 即使 API 失败也清理本地状态
    }
    setCurrentUser(null)
    clearStoredUser()
    clearAuthToken()
  }, [])

  const updateProfile = useCallback(async (updates: Partial<Pick<UserProfile, 'name' | 'bio' | 'avatar'>>) => {
    if (!currentUser) return
    const updated = await updateProfileApi({
      name: updates.name ?? currentUser.name,
      bio: updates.bio,
      avatar: updates.avatar,
    })
    setCurrentUser(updated)
    saveUser(updated)
  }, [currentUser])

  const requireAuth = useCallback((): boolean => {
    if (currentUser) return true
    toast.info('请先登录再操作', {
      label: '去登录',
      onClick: () => navigate('/login', { state: { from: location.pathname } }),
    })
    return false
  }, [currentUser, toast, navigate, location.pathname])

  const value = useMemo(() => ({
    currentUser,
    isAuthenticated,
    isLoading,
    isChecking,
    authStatus,
    isAdmin,
    isOwner,
    login,
    register,
    logout,
    updateProfile,
    requireAuth,
  }), [currentUser, isAuthenticated, isLoading, isChecking, authStatus, isAdmin, isOwner, login, register, logout, updateProfile, requireAuth])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
