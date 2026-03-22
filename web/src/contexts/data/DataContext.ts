import { createContext } from 'react'
import type { BlogPost, EssayItem, Comment } from '../../assets/data/types'

export interface AddPostInput {
  title: string
  content: string
  category: BlogPost['category']
  tags: string[]
}

export interface AddEssayInput {
  title: string
  excerpt: string
  content: string
}

export interface DataContextType {
  posts: BlogPost[]
  essays: EssayItem[]
  isLoading: boolean
  error: string | null
  addPost: (input: AddPostInput) => Promise<BlogPost>
  addEssay: (input: AddEssayInput) => Promise<EssayItem>
  addComment: (postId: string, content: string) => Promise<Comment>
  removePost: (postId: string) => void
  removeEssay: (essayId: string) => void
  refreshPosts: () => Promise<void>
  refreshEssays: () => Promise<void>
}

export const DataContext = createContext<DataContextType | undefined>(undefined)
