import { createContext } from 'react'
import type { UserProfile } from '../../assets/data/types'

export interface AuthActionResult {
  ok: boolean
  message?: string
}

export interface AuthContextType {
  currentUser: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  isAdmin: boolean
  isOwner: boolean
  login: (username: string, password: string) => Promise<AuthActionResult>
  register: (username: string, email: string, password: string, captchaId: string, captchaCode: string) => Promise<AuthActionResult>
  logout: () => Promise<void>
  updateProfile: (updates: Partial<Pick<UserProfile, 'name' | 'bio' | 'avatar'>>) => Promise<void>
  requireAuth: () => boolean
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
