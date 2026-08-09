import { useState, useCallback, useEffect, useMemo, type ReactNode } from 'react'
import { LikesContext } from './LikesContext'
import { togglePostLike as apiTogglePostLike, toggleEssayLike as apiToggleEssayLike, fetchMyLikes } from '../../services/runtime'
import { useAuth } from '../../hooks/auth/useAuth'

interface LikesProviderProps { children: ReactNode }
type CountMap = Record<string, number>

export function LikesProvider({ children }: LikesProviderProps) {
  const { currentUser, isChecking } = useAuth()
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set())
  const [likedEssayIds, setLikedEssayIds] = useState<Set<string>>(new Set())
  const [postCounts, setPostCounts] = useState<CountMap>({})
  const [essayCounts, setEssayCounts] = useState<CountMap>({})
  const [pendingPosts, setPendingPosts] = useState<Set<string>>(new Set())
  const [pendingEssays, setPendingEssays] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    if (isChecking) return () => { cancelled = true }
    const load = currentUser
      ? fetchMyLikes()
      : Promise.resolve({ postIds: [] as string[], essayIds: [] as string[] })
    load.then(({ postIds, essayIds }) => {
      if (!cancelled) {
        setLikedPostIds(new Set(postIds))
        setLikedEssayIds(new Set(essayIds))
        setPostCounts({})
        setEssayCounts({})
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [currentUser, isChecking])

  const togglePostLike = useCallback(async (id: string, currentCount = 0) => {
    if (pendingPosts.has(id)) return
    const wasLiked = likedPostIds.has(id)
    const previousCount = postCounts[id] ?? currentCount
    setPendingPosts(prev => new Set(prev).add(id))
    setLikedPostIds(prev => { const next = new Set(prev); if (wasLiked) next.delete(id); else next.add(id); return next })
    setPostCounts(prev => ({ ...prev, [id]: Math.max(0, previousCount + (wasLiked ? -1 : 1)) }))
    try {
      const result = await apiTogglePostLike(id)
      setLikedPostIds(prev => { const next = new Set(prev); if (result.liked) next.add(id); else next.delete(id); return next })
      setPostCounts(prev => ({ ...prev, [id]: result.likeCount }))
    } catch {
      setLikedPostIds(prev => { const next = new Set(prev); if (wasLiked) next.add(id); else next.delete(id); return next })
      setPostCounts(prev => {
        const next = { ...prev }
        next[id] = previousCount
        return next
      })
    } finally {
      setPendingPosts(prev => { const next = new Set(prev); next.delete(id); return next })
    }
  }, [likedPostIds, pendingPosts, postCounts])

  const toggleEssayLike = useCallback(async (id: string, currentCount = 0) => {
    if (pendingEssays.has(id)) return
    const wasLiked = likedEssayIds.has(id)
    const previousCount = essayCounts[id] ?? currentCount
    setPendingEssays(prev => new Set(prev).add(id))
    setLikedEssayIds(prev => { const next = new Set(prev); if (wasLiked) next.delete(id); else next.add(id); return next })
    setEssayCounts(prev => ({ ...prev, [id]: Math.max(0, previousCount + (wasLiked ? -1 : 1)) }))
    try {
      const result = await apiToggleEssayLike(id)
      setLikedEssayIds(prev => { const next = new Set(prev); if (result.liked) next.add(id); else next.delete(id); return next })
      setEssayCounts(prev => ({ ...prev, [id]: result.likeCount }))
    } catch {
      setLikedEssayIds(prev => { const next = new Set(prev); if (wasLiked) next.add(id); else next.delete(id); return next })
      setEssayCounts(prev => {
        const next = { ...prev }
        next[id] = previousCount
        return next
      })
    } finally {
      setPendingEssays(prev => { const next = new Set(prev); next.delete(id); return next })
    }
  }, [likedEssayIds, pendingEssays, essayCounts])

  const value = useMemo(() => ({
    likedPostIds, likedEssayIds, togglePostLike, toggleEssayLike,
    isPostLiked: (id: string) => likedPostIds.has(id),
    isEssayLiked: (id: string) => likedEssayIds.has(id),
    postLikeCount: (id: string, fallback: number) => postCounts[id] ?? fallback,
    essayLikeCount: (id: string, fallback: number) => essayCounts[id] ?? fallback,
    isPostPending: (id: string) => pendingPosts.has(id),
    isEssayPending: (id: string) => pendingEssays.has(id),
  }), [likedPostIds, likedEssayIds, togglePostLike, toggleEssayLike, postCounts, essayCounts, pendingPosts, pendingEssays])

  return <LikesContext.Provider value={value}>{children}</LikesContext.Provider>
}
