import { useState, useCallback, useMemo, useEffect, useRef, type ReactNode } from 'react'
import { DataContext } from './DataContext'
import type { AddPostInput, AddEssayInput } from './DataContext'
import type { BlogPost, EssayItem, Comment } from '../../assets/data/types'
import { friendlyErrorMessage } from '../../services/api'
import * as mockRuntime from '../../services/runtime'
import { useToast } from '../../hooks/social/useToast'
import { useAuth } from '../../hooks/auth/useAuth'

const MODERATION_CHECK_DELAY = 8_000
const PAGE_SIZE = 20

function mergeById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const seen = new Set(current.map(item => item.id))
  return [...current, ...incoming.filter(item => !seen.has(item.id))]
}

interface DataProviderProps {
  children: ReactNode
}

export function DataProvider({ children }: DataProviderProps) {
  const { toast } = useToast()
  const { currentUser } = useAuth()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [essays, setEssays] = useState<EssayItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [postTotal, setPostTotal] = useState(0)
  const [essayTotal, setEssayTotal] = useState(0)
  const [postPage, setPostPage] = useState(1)
  const [essayPage, setEssayPage] = useState(1)

  // 用 ref 避免 useCallback 依赖不稳定的 toast 引用
  const toastRef = useRef(toast)
  useEffect(() => { toastRef.current = toast }, [toast])
  const mountedRef = useRef(true)

  useEffect(() => {
    if (!currentUser) return
    const timer = window.setTimeout(() => {
      const refreshAuthor = <T extends BlogPost | EssayItem>(item: T): T =>
        item.author.handle === currentUser.handle
          ? { ...item, author: { ...item.author, name: currentUser.name, avatar: currentUser.avatar } }
          : item
      setPosts(prev => prev.map(refreshAuthor))
      setEssays(prev => prev.map(refreshAuthor))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [currentUser])

  const refreshPosts = useCallback(async () => {
    try {
      const { items, total } = await mockRuntime.fetchPosts({ page: 1, pageSize: PAGE_SIZE })
      setPosts(items)
      setPostTotal(total)
      setPostPage(1)
    } catch (err) {
      setError(friendlyErrorMessage(err, '加载文章失败'))
    }
  }, [])

  const refreshEssays = useCallback(async () => {
    try {
      const { items, total } = await mockRuntime.fetchEssays({ page: 1, pageSize: PAGE_SIZE })
      setEssays(items)
      setEssayTotal(total)
      setEssayPage(1)
    } catch (err) {
      setError(friendlyErrorMessage(err, '加载随笔失败'))
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setError(null)
      const [postsResult, essaysResult] = await Promise.allSettled([
        mockRuntime.fetchPosts({ page: 1, pageSize: PAGE_SIZE }),
        mockRuntime.fetchEssays({ page: 1, pageSize: PAGE_SIZE }),
      ])
      if (cancelled) return

      const errors: string[] = []
      if (postsResult.status === 'fulfilled') {
        setPosts(postsResult.value.items)
        setPostTotal(postsResult.value.total)
      } else {
        errors.push(friendlyErrorMessage(postsResult.reason, '加载文章失败'))
      }
      if (essaysResult.status === 'fulfilled') {
        setEssays(essaysResult.value.items)
        setEssayTotal(essaysResult.value.total)
      } else {
        errors.push(friendlyErrorMessage(essaysResult.reason, '加载随笔失败'))
      }

      if (errors.length > 0) setError(errors.join('; '))
      setIsLoading(false)
    }
    load()
    mountedRef.current = true
    return () => { cancelled = true; mountedRef.current = false }
  }, [])

  const addPost = useCallback(async (input: AddPostInput): Promise<BlogPost> => {
    const post = await mockRuntime.createPost({
      title: input.title.trim(),
      content: input.content.trim(),
      category: input.category,
      tags: input.tags,
    })
    setPosts(prev => [post, ...prev])

    // 延迟检查审核结果：AI 审核可能在几秒内将内容 hidden/删除
    setTimeout(async () => {
      if (!mountedRef.current) return
      try {
        const { items } = await mockRuntime.fetchPosts({ page: 1, pageSize: PAGE_SIZE })
        if (!mountedRef.current) return
        setPosts(items)
        if (!items.some(p => p.id === post.id)) {
          toastRef.current.info('您的内容正在审核中，通过后将自动显示')
        }
      } catch { /* 静默忽略刷新失败 */ }
    }, MODERATION_CHECK_DELAY)

    return post
  }, [])

  const addEssay = useCallback(async (input: AddEssayInput): Promise<EssayItem> => {
    const essay = await mockRuntime.createEssay({
      title: input.title.trim(),
      excerpt: input.excerpt.trim(),
      content: input.content.trim(),
    })
    setEssays(prev => [essay, ...prev])

    setTimeout(async () => {
      if (!mountedRef.current) return
      try {
        const { items } = await mockRuntime.fetchEssays({ page: 1, pageSize: PAGE_SIZE })
        if (!mountedRef.current) return
        setEssays(items)
        if (!items.some(e => e.id === essay.id)) {
          toastRef.current.info('您的内容正在审核中，通过后将自动显示')
        }
      } catch { /* 静默忽略刷新失败 */ }
    }, MODERATION_CHECK_DELAY)

    return essay
  }, [])

  const removePost = useCallback((postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId))
  }, [])

  const removeEssay = useCallback((essayId: string) => {
    setEssays(prev => prev.filter(e => e.id !== essayId))
  }, [])

  const addComment = useCallback(async (postId: string, content: string): Promise<Comment> => {
    const comment = await mockRuntime.createComment(postId, content)
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? { ...p, comments: [...p.comments, comment] }
          : p,
      ),
    )
    return comment
  }, [])

  const updatePost = useCallback(async (id: string, input: AddPostInput): Promise<BlogPost> => {
    const post = await mockRuntime.updatePost(id, input)
    setPosts(prev => prev.map(item => item.id === id ? post : item))
    return post
  }, [])

  const updateEssay = useCallback(async (id: string, input: AddEssayInput): Promise<EssayItem> => {
    const essay = await mockRuntime.updateEssay(id, input)
    setEssays(prev => prev.map(item => item.id === id ? essay : item))
    return essay
  }, [])

  const loadMorePosts = useCallback(async () => {
    if (posts.length >= postTotal) return
    const nextPage = postPage + 1
    const { items, total } = await mockRuntime.fetchPosts({ page: nextPage, pageSize: PAGE_SIZE })
    setPosts(prev => mergeById(prev, items))
    setPostTotal(total)
    setPostPage(nextPage)
  }, [posts.length, postTotal, postPage])

  const loadMoreEssays = useCallback(async () => {
    if (essays.length >= essayTotal) return
    const nextPage = essayPage + 1
    const { items, total } = await mockRuntime.fetchEssays({ page: nextPage, pageSize: PAGE_SIZE })
    setEssays(prev => mergeById(prev, items))
    setEssayTotal(total)
    setEssayPage(nextPage)
  }, [essays.length, essayTotal, essayPage])

  const value = useMemo(() => ({
    posts,
    essays,
    isLoading,
    error,
    postTotal,
    essayTotal,
    hasMorePosts: posts.length < postTotal,
    hasMoreEssays: essays.length < essayTotal,
    addPost,
    updatePost,
    addEssay,
    updateEssay,
    addComment,
    removePost,
    removeEssay,
    refreshPosts,
    refreshEssays,
    loadMorePosts,
    loadMoreEssays,
  }), [posts, essays, isLoading, error, postTotal, essayTotal, addPost, updatePost, addEssay, updateEssay, addComment, removePost, removeEssay, refreshPosts, refreshEssays, loadMorePosts, loadMoreEssays])

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}
