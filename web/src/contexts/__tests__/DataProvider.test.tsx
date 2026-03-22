import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { DataProvider } from '../data/DataProvider'
import { ToastContext } from '../toast/ToastContext'
import { useData } from '../../hooks/auth/useData'
import type { ReactNode } from 'react'
import type { BlogPost, EssayItem } from '../../assets/data/types'

const fakePosts: BlogPost[] = [
  {
    id: 'p1', title: 'Mock Post 1', excerpt: 'excerpt', content: 'content',
    date: '2026-01-01', category: 'Tech', slug: 'mock-1', readTime: 3,
    tags: ['test'], likes: 10, author: { name: 'X', avatar: '', handle: '@x' }, comments: [],
  },
]
const fakeEssays: EssayItem[] = [
  {
    id: 'e1', title: 'Mock Essay', excerpt: 'exc', content: 'body',
    date: '2026-01-01', likes: 5, author: { name: 'X', avatar: '', handle: '@x' },
  },
]

vi.mock('../../services/mockRuntime', () => ({
  fetchPosts: vi.fn(() => Promise.resolve({ items: fakePosts, total: 1 })),
  fetchEssays: vi.fn(() => Promise.resolve({ items: fakeEssays, total: 1 })),
  createPost: vi.fn(),
  createEssay: vi.fn(),
  createComment: vi.fn(),
}))
vi.mock('../../services/api', () => ({
  friendlyErrorMessage: vi.fn((_: unknown, fb: string) => fb),
}))

import * as mockRuntime from '../../services/mockRuntime'

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ToastContext.Provider value={{ toast: mockToast }}>
      <DataProvider>{children}</DataProvider>
    </ToastContext.Provider>
  )
}

describe('DataProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.mocked(mockRuntime.fetchPosts).mockResolvedValue({ items: fakePosts, total: 1 })
    vi.mocked(mockRuntime.fetchEssays).mockResolvedValue({ items: fakeEssays, total: 1 })
  })

  it('初始状态加载后包含数据', async () => {
    const { result } = renderHook(() => useData(), { wrapper })
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    expect(result.current.posts.length).toBeGreaterThan(0)
    expect(result.current.essays.length).toBeGreaterThan(0)
    expect(result.current.error).toBeNull()
  })

  it('addPost 添加新文章', async () => {
    const newPost: BlogPost = {
      id: 'p2', title: 'Test Post', excerpt: '', content: 'Content here',
      date: '2026-03-02', category: 'Tech', slug: 'test-post', readTime: 1,
      tags: ['test'], likes: 0, author: { name: 'X', avatar: '', handle: '@x' }, comments: [],
    }
    vi.mocked(mockRuntime.createPost).mockResolvedValue(newPost)
    const { result } = renderHook(() => useData(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let created: BlogPost | undefined
    await act(async () => {
      created = await result.current.addPost(
        { title: 'Test Post', content: 'Content here', category: 'Tech', tags: ['test'] },
      )
    })
    expect(created).toBeDefined()
    expect(created!.title).toBe('Test Post')
    expect(result.current.posts.some(p => p.title === 'Test Post')).toBe(true)
  })

  it('addEssay 添加新随笔', async () => {
    const newEssay: EssayItem = {
      id: 'e2', title: 'My Essay', excerpt: 'Short', content: 'Long content',
      date: '2026-03-02', likes: 0, author: { name: 'X', avatar: '', handle: '@x' },
    }
    vi.mocked(mockRuntime.createEssay).mockResolvedValue(newEssay)
    const { result } = renderHook(() => useData(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let created: EssayItem | undefined
    await act(async () => {
      created = await result.current.addEssay(
        { title: 'My Essay', excerpt: 'Short', content: 'Long content' },
      )
    })
    expect(created).toBeDefined()
    expect(created!.title).toBe('My Essay')
    expect(result.current.essays.some(e => e.title === 'My Essay')).toBe(true)
  })

  it('addComment 追加评论到文章', async () => {
    const { result } = renderHook(() => useData(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const postId = result.current.posts[0]?.id
    if (!postId) return

    const fakeComment = { id: 'c1', authorId: 'u-x', author: 'X', avatar: '', date: '2026-03-02', content: 'Nice post!' }
    vi.mocked(mockRuntime.createComment).mockResolvedValue(fakeComment)

    await act(async () => {
      await result.current.addComment(postId, 'Nice post!')
    })
    const post = result.current.posts.find(p => p.id === postId)
    expect(post?.comments.some(c => c.content === 'Nice post!')).toBe(true)
  })

  it('加载失败时设置 error', async () => {
    vi.mocked(mockRuntime.fetchPosts).mockRejectedValue(new Error('fail'))
    vi.mocked(mockRuntime.fetchEssays).mockRejectedValue(new Error('fail'))
    const { result } = renderHook(() => useData(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).not.toBeNull()
  })
})
