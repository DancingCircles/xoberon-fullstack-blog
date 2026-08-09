import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { LikesProvider } from '../likes/LikesProvider'
import { useLikes } from '../../hooks/social/useLikes'
import { AuthContext, type AuthContextType } from '../auth/AuthContext'
import type { ReactNode } from 'react'

vi.mock('../../services/runtime', () => ({
  togglePostLike: vi.fn(() => Promise.resolve({ liked: true, likeCount: 1 })),
  toggleEssayLike: vi.fn(() => Promise.resolve({ liked: true, likeCount: 1 })),
  fetchMyLikes: vi.fn(() => Promise.resolve({ postIds: [], essayIds: [] })),
}))

import { togglePostLike as apiTogglePostLike, toggleEssayLike as apiToggleEssayLike, fetchMyLikes } from '../../services/runtime'

const authValue = {
  currentUser: { id: 'u1', name: 'Test', handle: '@test', bio: '', avatar: '', role: 'user', postCount: 0, essayCount: 0 },
  isAuthenticated: true,
  isLoading: false,
  isChecking: false,
  authStatus: 'authenticated',
  isAdmin: false,
  isOwner: false,
  login: vi.fn(), register: vi.fn(), logout: vi.fn(), updateProfile: vi.fn(), requireAuth: vi.fn(() => true),
} as AuthContextType

function wrapper({ children }: { children: ReactNode }) {
  return <AuthContext.Provider value={authValue}><LikesProvider>{children}</LikesProvider></AuthContext.Provider>
}

describe('LikesProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(apiTogglePostLike).mockResolvedValue({ liked: true, likeCount: 1 })
    vi.mocked(apiToggleEssayLike).mockResolvedValue({ liked: true, likeCount: 1 })
    vi.mocked(fetchMyLikes).mockResolvedValue({ postIds: [], essayIds: [] })
  })

  it('初始状态没有点赞', () => {
    const { result } = renderHook(() => useLikes(), { wrapper })
    expect(result.current.isPostLiked('p1')).toBe(false)
    expect(result.current.isEssayLiked('e1')).toBe(false)
  })

  it('togglePostLike 添加文章点赞', async () => {
    const { result } = renderHook(() => useLikes(), { wrapper })
    await act(async () => { await result.current.togglePostLike('p1') })
    expect(result.current.isPostLiked('p1')).toBe(true)
  })

  it('togglePostLike 再次调用取消点赞', async () => {
    vi.mocked(apiTogglePostLike)
      .mockResolvedValueOnce({ liked: true, likeCount: 1 })
      .mockResolvedValueOnce({ liked: false, likeCount: 0 })
    const { result } = renderHook(() => useLikes(), { wrapper })
    await act(async () => { await result.current.togglePostLike('p1') })
    expect(result.current.isPostLiked('p1')).toBe(true)
    await act(async () => { await result.current.togglePostLike('p1') })
    expect(result.current.isPostLiked('p1')).toBe(false)
  })

  it('toggleEssayLike 添加随笔点赞', async () => {
    const { result } = renderHook(() => useLikes(), { wrapper })
    await act(async () => { await result.current.toggleEssayLike('e1') })
    expect(result.current.isEssayLiked('e1')).toBe(true)
  })

  it('文章和随笔点赞互不影响', async () => {
    const { result } = renderHook(() => useLikes(), { wrapper })
    await act(async () => { await result.current.togglePostLike('x1') })
    expect(result.current.isPostLiked('x1')).toBe(true)
    expect(result.current.isEssayLiked('x1')).toBe(false)
  })

  it('点赞状态不写入 localStorage', async () => {
    const { result } = renderHook(() => useLikes(), { wrapper })
    await act(async () => { await result.current.togglePostLike('p1') })
    const stored = JSON.parse(localStorage.getItem('xoberon-liked-posts') ?? '[]')
    expect(stored).not.toContain('p1')
  })

  it('rolls an optimistic post like back when the API fails', async () => {
    vi.mocked(apiTogglePostLike).mockRejectedValueOnce(new Error('network'))
    const { result } = renderHook(() => useLikes(), { wrapper })
    await act(async () => { await result.current.togglePostLike('p1', 7) })
    expect(result.current.isPostLiked('p1')).toBe(false)
    expect(result.current.postLikeCount('p1', 7)).toBe(7)
    expect(result.current.isPostPending('p1')).toBe(false)
  })

  it('从服务端恢复点赞状态', async () => {
    vi.mocked(fetchMyLikes).mockResolvedValue({ postIds: ['p99'], essayIds: ['e99'] })
    const { result } = renderHook(() => useLikes(), { wrapper })
    await act(async () => {})
    expect(result.current.isPostLiked('p99')).toBe(true)
    expect(result.current.isEssayLiked('e99')).toBe(true)
  })
})
