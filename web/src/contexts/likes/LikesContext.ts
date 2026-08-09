import { createContext } from 'react'

export interface LikesContextType {
  likedPostIds: Set<string>
  likedEssayIds: Set<string>
  togglePostLike: (id: string, currentCount?: number) => Promise<void>
  toggleEssayLike: (id: string, currentCount?: number) => Promise<void>
  isPostLiked: (id: string) => boolean
  isEssayLiked: (id: string) => boolean
  postLikeCount: (id: string, fallback: number) => number
  essayLikeCount: (id: string, fallback: number) => number
  isPostPending: (id: string) => boolean
  isEssayPending: (id: string) => boolean
}

export const LikesContext = createContext<LikesContextType | undefined>(undefined)
