export interface Comment {
  id: string
  authorId: string
  author: string
  avatar: string
  date: string
  content: string
}

export type BlogCategory = 'Design' | 'Tech' | 'Culture'

export interface BlogPost {
  id: string
  title: string
  excerpt: string
  content: string // Markdown content
  date: string
  category: BlogCategory
  slug: string
  readTime: number // minutes
  tags: string[]
  likes: number
  author: {
    name: string
    avatar: string
    handle: string
  }
  comments: Comment[]
}

export interface EssayItem {
  id: string
  title: string
  excerpt: string
  content: string
  date: string
  likes: number
  author: {
    name: string
    avatar: string
    handle: string
  }
}

export type UserRole = 'owner' | 'admin' | 'user'

export interface UserProfile {
  id: string
  name: string
  handle: string
  avatar: string
  bio: string
  role: UserRole
  postCount: number
  essayCount: number
  email?: string
  createdAt?: string
}