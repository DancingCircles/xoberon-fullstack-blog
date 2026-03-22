import { useContext } from 'react'
import { LikesContext, type LikesContextType } from '../../contexts/likes/LikesContext'

export function useLikes(): LikesContextType {
  const ctx = useContext(LikesContext)
  if (!ctx) throw new Error('useLikes must be used within a LikesProvider')
  return ctx
}
