import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { LenisContext } from './LenisContext'

// Register GSAP plugin at module level
gsap.registerPlugin(ScrollTrigger)

const NATIVE_SCROLL_MEDIA_QUERY = '(max-width: 900px), (max-height: 560px), (hover: none) and (pointer: coarse)'

function shouldUseNativeScroll() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia(NATIVE_SCROLL_MEDIA_QUERY).matches
}

function subscribeToNativeScrollQuery(onStoreChange: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {}
  }

  const mediaQuery = window.matchMedia(NATIVE_SCROLL_MEDIA_QUERY)

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', onStoreChange)
    return () => mediaQuery.removeEventListener('change', onStoreChange)
  }

  mediaQuery.addListener(onStoreChange)
  return () => mediaQuery.removeListener(onStoreChange)
}

interface LenisProviderProps {
  children: ReactNode
}

export function LenisProvider({ children }: LenisProviderProps) {
  const [lenis, setLenis] = useState<Lenis | null>(null)
  const useNativeScroll = useSyncExternalStore(
    subscribeToNativeScrollQuery,
    shouldUseNativeScroll,
    () => false,
  )

  useEffect(() => {
    if (useNativeScroll) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- keeps context aligned when mobile switches to native scroll
      setLenis(null)
      return
    }

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

    setLenis(lenisInstance)

    return () => {
      gsap.ticker.remove(tickerCallback)
      lenisInstance.destroy()
    }
  }, [useNativeScroll])

  const value = useMemo(() => ({ lenis }), [lenis])

  return (
    <LenisContext.Provider value={value}>
      {children}
    </LenisContext.Provider>
  )
}
