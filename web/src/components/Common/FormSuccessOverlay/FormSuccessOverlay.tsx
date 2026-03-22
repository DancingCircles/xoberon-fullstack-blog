import { useRef, useEffect, useCallback } from 'react'
import gsap from 'gsap'
import './FormSuccessOverlay.css'

interface FormSuccessOverlayProps {
  isVisible: boolean
  text?: string
  onComplete?: () => void
}

export default function FormSuccessOverlay({
  isVisible,
  text = 'SENT!',
  onComplete,
}: FormSuccessOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const checkRef = useRef<SVGPathElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const tlRef = useRef<gsap.core.Timeline | null>(null)

  const handleComplete = useCallback(() => {
    onComplete?.()
  }, [onComplete])

  useEffect(() => {
    if (!isVisible) return
    const overlay = overlayRef.current
    const check = checkRef.current
    const textEl = textRef.current
    if (!overlay || !check || !textEl) return

    const totalLength = check.getTotalLength()

    gsap.set(overlay, { opacity: 0 })
    gsap.set(check, { strokeDasharray: totalLength, strokeDashoffset: totalLength })
    gsap.set(textEl, { opacity: 0 })

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.to(overlay, {
          opacity: 0,
          duration: 0.25,
          delay: 1,
          onComplete: handleComplete,
        })
      },
    })
    tlRef.current = tl

    tl.to(overlay, { opacity: 1, duration: 0.25, ease: 'power2.out' })
      .to(check, { strokeDashoffset: 0, duration: 0.45, ease: 'power2.out' })
      .to(textEl, { opacity: 1, duration: 0.25, ease: 'power2.out' }, '-=0.1')

    return () => { tl.kill() }
  }, [isVisible, handleComplete])

  if (!isVisible) return null

  return (
    <div className="form-success-btn-overlay" ref={overlayRef}>
      <svg className="form-success-btn-check" viewBox="0 0 36 36" width="28" height="28">
        <path
          ref={checkRef}
          d="M8 18l7 7 13-13"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="form-success-btn-text" ref={textRef}>{text}</span>
    </div>
  )
}
