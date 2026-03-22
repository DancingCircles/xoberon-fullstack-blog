import { useContext } from 'react'
import { LenisContext } from '../../contexts/lenis/LenisContext'
import type { LenisContextType } from '../../contexts/lenis/LenisContext'

const fallback: LenisContextType = { lenis: null }

/**
 * Returns the Lenis instance from context.
 * Safe to call outside LenisProvider (returns { lenis: null }).
 */
export function useLenis(): LenisContextType {
  const context = useContext(LenisContext)
  return context ?? fallback
}
