import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { LenisContext } from './LenisContext'

// Register GSAP plugin at module level
gsap.registerPlugin(ScrollTrigger)

interface LenisProviderProps {
  children: ReactNode
}

export function LenisProvider({ children }: LenisProviderProps) {
  const [lenis, setLenis] = useState<Lenis | null>(null)
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    const lenisInstance = new Lenis({
      duration: 0.8,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      syncTouch: false,
      touchMultiplier: 1,
    })

    // Synchronize Lenis with GSAP ScrollTrigger
    lenisInstance.on('scroll', ScrollTrigger.update)

    // Add Lenis's requestAnimationFrame to GSAP's ticker
    const tickerCallback = (time: number) => {
      lenisInstance.raf(time * 1000)
    }
    gsap.ticker.add(tickerCallback)

    // Disable lag smoothing to prevent stuttering
    gsap.ticker.lagSmoothing(0)

    lenisRef.current = lenisInstance
    // eslint-disable-next-line react-hooks/set-state-in-effect -- valid one-time initialization
    setLenis(lenisInstance)

    return () => {
      gsap.ticker.remove(tickerCallback)
      lenisInstance.destroy()
      lenisRef.current = null
    }
  }, [])

  const value = useMemo(() => ({ lenis }), [lenis])

  return (
    <LenisContext.Provider value={value}>
      {children}
    </LenisContext.Provider>
  )
}
