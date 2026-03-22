import { useState, useCallback, useMemo, useEffect, useRef, type ReactNode } from 'react'
import { DataContext } from './DataContext'
import type { AddPostInput, AddEssayInput } from './DataContext'
import type { BlogPost, EssayItem, Comment } from '../../assets/data/types'
import { friendlyErrorMessage } from '../../services/api'
import * as mockRuntime from '../../services/mockRuntime'
import { useToast } from '../../hooks/social/useToast'

const MODERATION_CHECK_DELAY = 8_000

interface DataProviderProps {
  children: ReactNode
}

export function DataProvider({ children }: DataProviderProps) {
  const { toast } = useToast()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [essays, setEssays] = useState<EssayItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 用 ref 避免 useCallback 依赖不稳定的 toast 引用
  const toastRef = useRef(toast)
  useEffect(() => { toastRef.current = toast }, [toast])
  const mountedRef = useRef(true)

  const refreshPosts = useCallback(async () => {
    try {
      const { items } = await mockRuntime.fetchPosts({ pageSize: 100 })
      setPosts(items)
    } catch (err) {
      setError(friendlyErrorMessage(err, '加载文章失败'))
    }
  }, [])

  const refreshEssays = useCallback(async () => {
    try {
      const { items } = await mockRuntime.fetchEssays({ pageSize: 100 })
      setEssays(items)
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
        mockRuntime.fetchPosts({ pageSize: 100 }),
        mockRuntime.fetchEssays({ pageSize: 100 }),
      ])
      if (cancelled) return

      const errors: string[] = []
      if (postsResult.status === 'fulfilled') {
        setPosts(postsResult.value.items)
      } else {
        errors.push(friendlyErrorMessage(postsResult.reason, '加载文章失败'))
      }
      if (essaysResult.status === 'fulfilled') {
        setEssays(essaysResult.value.items)
      } else {
        errors.push(friendlyErrorMessage(essaysResult.reason, '加载随笔失败'))
      }

      if (errors.length > 0) setError(errors.join('; '))
      setIsLoading(false)
    }
    load()
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
        const { items } = await mockRuntime.fetchPosts({ pageSize: 100 })
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
        const { items } = await mockRuntime.fetchEssays({ pageSize: 100 })
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

  const value = useMemo(() => ({
    posts,
    essays,
    isLoading,
    error,
    addPost,
    addEssay,
    addComment,
    removePost,
    removeEssay,
    refreshPosts,
    refreshEssays,
  }), [posts, essays, isLoading, error, addPost, addEssay, addComment, removePost, removeEssay, refreshPosts, refreshEssays])

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}
