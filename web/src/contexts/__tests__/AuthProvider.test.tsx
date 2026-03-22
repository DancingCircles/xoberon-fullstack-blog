import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../auth/AuthProvider'
import { useAuth } from '../../hooks/auth/useAuth'
import { ToastContext } from '../toast/ToastContext'
import type { ReactNode } from 'react'

vi.mock('../../services/mockRuntime', () => ({
  loginApi: vi.fn(),
  registerApi: vi.fn(),
  logoutApi: vi.fn(() => Promise.resolve()),
  updateProfileApi: vi.fn(),
}))
vi.mock('../../services/api', () => ({
  getAuthToken: vi.fn(() => 'fake-token'),
  clearAuthToken: vi.fn(),
  setAuthToken: vi.fn(),
  friendlyErrorMessage: vi.fn((_err: unknown, fallback: string) => fallback),
}))

import { loginApi, registerApi } from '../../services/mockRuntime'

const mockUser = {
  id: 'u1',
  name: 'X',
  handle: '@x',
  bio: '',
  avatar: '',
  role: 'user' as const,
  postCount: 0,
  essayCount: 0,
}

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ToastContext.Provider value={{ toast: mockToast }}>
      <MemoryRouter>
        <AuthProvider>{children}</AuthProvider>
      </MemoryRouter>
    </ToastContext.Provider>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('初始状态未登录', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.currentUser).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('register 创建新用户', async () => {
    vi.mocked(registerApi).mockResolvedValue({ token: 't1', user: mockUser })
    const { result } = renderHook(() => useAuth(), { wrapper })
    let res: { ok: boolean } | undefined
    await act(async () => {
      res = await result.current.register('X', 'x@test.com', 'pass123', 'captcha-1', 'ABCD')
    })
    expect(res?.ok).toBe(true)
    expect(result.current.currentUser).not.toBeNull()
    expect(result.current.currentUser?.name).toBe('X')
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('register 失败返回 ok: false', async () => {
    vi.mocked(registerApi).mockRejectedValue(new Error('dup'))
    const { result } = renderHook(() => useAuth(), { wrapper })
    let res: { ok: boolean } | undefined
    await act(async () => {
      res = await result.current.register('X2', 'dup@test.com', 'pass456', 'captcha-1', 'ABCD')
    })
    expect(res?.ok).toBe(false)
  })

  it('register 后 localStorage 有记录', async () => {
    vi.mocked(registerApi).mockResolvedValue({ token: 't2', user: mockUser })
    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {
      await result.current.register('X', 'stored@test.com', 'pass', 'captcha-1', 'ABCD')
    })
    const stored = localStorage.getItem('xoberon-user')
    expect(stored).not.toBeNull()
    expect(JSON.parse(stored!).name).toBe('X')
  })

  it('logout 清空当前用户', async () => {
    vi.mocked(registerApi).mockResolvedValue({ token: 't3', user: mockUser })
    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {
      await result.current.register('X', 'logout@test.com', 'pass', 'captcha-1', 'ABCD')
    })
    expect(result.current.isAuthenticated).toBe(true)
    await act(async () => { await result.current.logout() })
    expect(result.current.currentUser).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('logout 清除 localStorage', async () => {
    vi.mocked(registerApi).mockResolvedValue({ token: 't4', user: mockUser })
    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {
      await result.current.register('X', 'clear@test.com', 'pass', 'captcha-1', 'ABCD')
    })
    await act(async () => { await result.current.logout() })
    expect(localStorage.getItem('xoberon-user')).toBeNull()
  })

  it('login 成功', async () => {
    vi.mocked(loginApi).mockResolvedValue({ token: 't5', user: { ...mockUser, email: 'login@test.com' } })
    const { result } = renderHook(() => useAuth(), { wrapper })
    let res: { ok: boolean } | undefined
    await act(async () => {
      res = await result.current.login('x', 'pass')
    })
    expect(res?.ok).toBe(true)
    expect(result.current.currentUser).not.toBeNull()
  })

  it('login 用不存在的凭据返回 ok: false', async () => {
    vi.mocked(loginApi).mockRejectedValue(new Error('wrong'))
    const { result } = renderHook(() => useAuth(), { wrapper })
    let res: { ok: boolean } | undefined
    await act(async () => {
      res = await result.current.login('nope', 'pass')
    })
    expect(res?.ok).toBe(false)
  })

  it('requireAuth 未登录时调用 toast.info', () => {
    mockToast.info.mockClear()
    const { result } = renderHook(() => useAuth(), { wrapper })
    let ok = true
    act(() => { ok = result.current.requireAuth() })
    expect(ok).toBe(false)
    expect(mockToast.info).toHaveBeenCalledWith('请先登录再操作', expect.any(Object))
  })

  it('requireAuth 已登录时返回 true', async () => {
    vi.mocked(loginApi).mockResolvedValue({ token: 't6', user: mockUser })
    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {
      await result.current.login('x', 'pass')
    })
    let ok = false
    act(() => { ok = result.current.requireAuth() })
    expect(ok).toBe(true)
  })
})
