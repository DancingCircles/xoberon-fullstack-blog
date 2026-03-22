import { createContext } from 'react'

export interface LikesContextType {
  likedPostIds: Set<string>
  likedEssayIds: Set<string>
  togglePostLike: (id: string) => Promise<void>
  toggleEssayLike: (id: string) => Promise<void>
  isPostLiked: (id: string) => boolean
  isEssayLiked: (id: string) => boolean
}

export const LikesContext = createContext<LikesContextType | undefined>(undefined)
