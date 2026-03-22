import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { LikesProvider } from '../likes/LikesProvider'
import { useLikes } from '../../hooks/social/useLikes'
import type { ReactNode } from 'react'

vi.mock('../../services/mockRuntime', () => ({
  togglePostLike: vi.fn(() => Promise.resolve({ liked: true, likeCount: 1 })),
  toggleEssayLike: vi.fn(() => Promise.resolve({ liked: true, likeCount: 1 })),
}))

import { togglePostLike as apiTogglePostLike, toggleEssayLike as apiToggleEssayLike } from '../../services/mockRuntime'

function wrapper({ children }: { children: ReactNode }) {
  return <LikesProvider>{children}</LikesProvider>
}

describe('LikesProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(apiTogglePostLike).mockResolvedValue({ liked: true, likeCount: 1 })
    vi.mocked(apiToggleEssayLike).mockResolvedValue({ liked: true, likeCount: 1 })
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

  it('点赞状态持久化到 localStorage', async () => {
    const { result } = renderHook(() => useLikes(), { wrapper })
    await act(async () => { await result.current.togglePostLike('p1') })
    const stored = JSON.parse(localStorage.getItem('xoberon-liked-posts') ?? '[]')
    expect(stored).toContain('p1')
  })

  it('从 localStorage 恢复点赞状态', () => {
    localStorage.setItem('xoberon-liked-posts', JSON.stringify(['p99']))
    localStorage.setItem('xoberon-liked-essays', JSON.stringify(['e99']))
    const { result } = renderHook(() => useLikes(), { wrapper })
    expect(result.current.isPostLiked('p99')).toBe(true)
    expect(result.current.isEssayLiked('e99')).toBe(true)
  })
})
