import { useRef, useEffect, useCallback, type JSX } from 'react'
import gsap from 'gsap'
import type { ToastItem } from '../../../contexts/toast/ToastContext'
import './Toast.css'

interface ToastProps {
  item: ToastItem
  onDismiss: (id: string) => void
}

const ICON_MAP: Record<string, JSX.Element> = {
  success: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  warning: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
}

export default function Toast({ item, onDismiss }: ToastProps) {
  const elRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = elRef.current
    if (!el) return
    const tw = gsap.fromTo(el,
      { y: -40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.35, ease: 'back.out(1.4)' }
    )
    return () => { tw.kill() }
  }, [])

  const handleDismiss = useCallback(() => {
    const el = elRef.current
    if (!el) return
    gsap.to(el, {
      y: -30,
      opacity: 0,
      duration: 0.25,
      ease: 'power2.in',
      onComplete: () => onDismiss(item.id),
    })
  }, [item.id, onDismiss])

  const handleAction = useCallback(() => {
    item.action?.onClick()
    handleDismiss()
  }, [item.action, handleDismiss])

  return (
    <div
      ref={elRef}
      className={`xo-toast xo-toast--${item.type}`}
      role="status"
    >
      <span className="xo-toast-icon">{ICON_MAP[item.type]}</span>
      <span className="xo-toast-message">{item.message}</span>
      {item.action && (
        <button className="xo-toast-action" onClick={handleAction}>
          {item.action.label}
        </button>
      )}
      <button className="xo-toast-close" onClick={handleDismiss} aria-label="Dismiss">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}
