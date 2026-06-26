import { useEffect } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLenis } from './useLenis'

/**
 * Lock body scroll when a modal/overlay is open.
 * Pauses Lenis smooth scroll to prevent internal state desync,
 * saves scroll position and compensates for scrollbar width to prevent layout shift.
 */
export function useBodyScrollLock(isOpen: boolean) {
  const { lenis } = useLenis()

  useEffect(() => {
    if (!isOpen) return

    const scrollY = window.scrollY
    const lockPathname = window.location.pathname
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth
    const previousBodyStyle = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
      paddingRight: document.body.style.paddingRight,
      overflowY: document.body.style.overflowY,
      overscrollBehavior: document.body.style.overscrollBehavior,
    }

    // Pause Lenis BEFORE locking body to prevent RAF loop from fighting fixed position
    if (lenis) lenis.stop()

    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.width = '100%'
    document.body.style.paddingRight = `${scrollBarWidth}px`
    document.body.style.overflowY = 'scroll'
    document.body.style.overscrollBehavior = 'none'

    return () => {
      document.body.style.position = previousBodyStyle.position
      document.body.style.top = previousBodyStyle.top
      document.body.style.left = previousBodyStyle.left
      document.body.style.right = previousBodyStyle.right
      document.body.style.width = previousBodyStyle.width
      document.body.style.paddingRight = previousBodyStyle.paddingRight
      document.body.style.overflowY = previousBodyStyle.overflowY
      document.body.style.overscrollBehavior = previousBodyStyle.overscrollBehavior

      const shouldRestoreScroll = window.location.pathname === lockPathname

      if (lenis) {
        lenis.start()
        if (shouldRestoreScroll) {
          lenis.scrollTo(scrollY, { immediate: true, force: true })
        }
      }

      if (shouldRestoreScroll) {
        window.scrollTo(0, scrollY)
      }

      requestAnimationFrame(() => {
        if (shouldRestoreScroll) {
          window.scrollTo(0, scrollY)
        }
        lenis?.resize()
        if (shouldRestoreScroll) {
          lenis?.scrollTo(scrollY, { immediate: true, force: true })
        }
        ScrollTrigger.refresh()
      })
    }
  }, [isOpen, lenis])
}
