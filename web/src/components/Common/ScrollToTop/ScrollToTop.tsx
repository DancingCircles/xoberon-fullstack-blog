import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLenis } from '../../../hooks/scroll/useLenis'

const OPEN_MODAL_SELECTOR = '[role="dialog"][aria-modal="true"]'

function clearStaleBodyScrollLock() {
  if (document.querySelector(OPEN_MODAL_SELECTOR)) return
  if (document.body.style.position !== 'fixed') return

  document.body.style.position = ''
  document.body.style.top = ''
  document.body.style.left = ''
  document.body.style.right = ''
  document.body.style.width = ''
  document.body.style.paddingRight = ''
  document.body.style.overflowY = ''
  document.body.style.overscrollBehavior = ''
}

/**
 * 路由切换时自动滚动到页面顶部（刷新页面不回顶），
 * 同时清理旧页面的 ScrollTrigger 实例并刷新新页面的位置计算。
 */
export default function ScrollToTop() {
  const { pathname } = useLocation()
  const { lenis } = useLenis()
  const prevPathnameRef = useRef(pathname)

  useEffect(() => {
    if (prevPathnameRef.current === pathname) return
    prevPathnameRef.current = pathname

    clearStaleBodyScrollLock()

    if (lenis) {
      lenis.start()
      lenis.resize()
      lenis.scrollTo(0, { immediate: true, force: true })
    } else {
      window.scrollTo(0, 0)
    }

    // Each page cleans up its own ScrollTrigger instances via gsap.context().revert().
    // We only need to clear cached scroll positions and refresh after new page mounts.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        clearStaleBodyScrollLock()
        lenis?.resize()
        ScrollTrigger.clearScrollMemory()
        ScrollTrigger.refresh()
        lenis?.resize()
      })
    })
  }, [pathname, lenis])

  return null
}
