import { useEffect } from 'react'
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
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth

    // Pause Lenis BEFORE locking body to prevent RAF loop from fighting fixed position
    if (lenis) lenis.stop()

    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    document.body.style.paddingRight = `${scrollBarWidth}px`
    document.body.style.overflowY = 'scroll'

    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.paddingRight = ''
      document.body.style.overflowY = ''

      if (lenis) {
        // force: true bypasses isStopped check so Lenis updates its internal scroll position
        lenis.scrollTo(scrollY, { immediate: true, force: true })
        lenis.start()
      } else {
        window.scrollTo(0, scrollY)
      }
    }
  }, [isOpen, lenis])
}
