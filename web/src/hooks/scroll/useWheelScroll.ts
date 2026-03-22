import { useEffect, type RefObject } from 'react'

/**
 * Manually handle wheel events on a scrollable element inside a modal,
 * preventing background page scroll while allowing the element to scroll.
 */
export function useWheelScroll(
  ref: RefObject<HTMLElement | null>,
  isActive: boolean
) {
  useEffect(() => {
    if (!isActive || !ref.current) return

    const element = ref.current

    const handleWheel = (e: WheelEvent) => {
      // Prevent default to stop background scrolling
      e.preventDefault()
      e.stopPropagation()

      // Manually scroll the element
      element.scrollTop += e.deltaY
    }

    // Add wheel event listener with passive: false to allow preventDefault
    element.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      element.removeEventListener('wheel', handleWheel)
    }
  }, [isActive, ref])
}
