import { createContext } from 'react'
import type Lenis from 'lenis'

export interface LenisContextType {
  lenis: Lenis | null
}

export const LenisContext = createContext<LenisContextType | undefined>(undefined)
