import { useState, useCallback, useMemo, type ReactNode } from 'react'
import { LikesContext } from './LikesContext'
import { togglePostLike as apiTogglePostLike, toggleEssayLike as apiToggleEssayLike } from '../../services/mockRuntime'

const STORAGE_KEY_POSTS = 'xoberon-liked-posts'
const STORAGE_KEY_ESSAYS = 'xoberon-liked-essays'

function loadFromStorage(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return new Set(JSON.parse(raw) as string[])
  } catch { /* ignore */ }
  return new Set()
}

function saveToStorage(key: string, ids: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...ids]))
}

interface LikesProviderProps {
  children: ReactNode
}

export function LikesProvider({ children }: LikesProviderProps) {
  const [likedPostIds, setLikedPostIds] = useState(() => loadFromStorage(STORAGE_KEY_POSTS))
  const [likedEssayIds, setLikedEssayIds] = useState(() => loadFromStorage(STORAGE_KEY_ESSAYS))

  const togglePostLike = useCallback(async (id: string) => {
    // 乐观更新：先更新 UI，再调 API
    setLikedPostIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveToStorage(STORAGE_KEY_POSTS, next)
      return next
    })

    try {
      const { liked } = await apiTogglePostLike(id)
      // API 返回的真实状态可能与乐观更新不一致，以 API 为准
      setLikedPostIds(prev => {
        const next = new Set(prev)
        if (liked) next.add(id)
        else next.delete(id)
        saveToStorage(STORAGE_KEY_POSTS, next)
        return next
      })
    } catch {
      // API 失败时回滚乐观更新
      setLikedPostIds(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        saveToStorage(STORAGE_KEY_POSTS, next)
        return next
      })
    }
  }, [])

  const toggleEssayLike = useCallback(async (id: string) => {
    setLikedEssayIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveToStorage(STORAGE_KEY_ESSAYS, next)
      return next
    })

    try {
      const { liked } = await apiToggleEssayLike(id)
      setLikedEssayIds(prev => {
        const next = new Set(prev)
        if (liked) next.add(id)
        else next.delete(id)
        saveToStorage(STORAGE_KEY_ESSAYS, next)
        return next
      })
    } catch {
      setLikedEssayIds(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        saveToStorage(STORAGE_KEY_ESSAYS, next)
        return next
      })
    }
  }, [])

  const isPostLiked = useCallback((id: string) => likedPostIds.has(id), [likedPostIds])
  const isEssayLiked = useCallback((id: string) => likedEssayIds.has(id), [likedEssayIds])

  const value = useMemo(() => ({
    likedPostIds,
    likedEssayIds,
    togglePostLike,
    toggleEssayLike,
    isPostLiked,
    isEssayLiked,
  }), [likedPostIds, likedEssayIds, togglePostLike, toggleEssayLike, isPostLiked, isEssayLiked])

  return (
    <LikesContext.Provider value={value}>
      {children}
    </LikesContext.Provider>
  )
}
