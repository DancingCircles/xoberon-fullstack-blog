import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import './NotFoundPage.css'

export default function NotFoundPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const charsRef = useRef<HTMLSpanElement[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        charsRef.current,
        { y: 80, opacity: 0, rotateX: -90 },
        {
          y: 0,
          opacity: 1,
          rotateX: 0,
          duration: 0.6,
          stagger: 0.12,
          ease: 'back.out(1.7)',
        }
      )

      gsap.fromTo(
        '.nf-subtitle',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, delay: 0.6, ease: 'power2.out' }
      )

      gsap.fromTo(
        '.nf-btn',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, delay: 0.8, ease: 'power2.out' }
      )
    }, containerRef)

    return () => ctx.revert()
  }, [])

  const digits = ['4', '0', '4']

  return (
    <div className="page page--not-found" ref={containerRef}>
      <h1 className="nf-title" aria-label="404">
        {digits.map((char, i) => (
          <span
            key={i}
            className="nf-char"
            ref={el => { if (el) charsRef.current[i] = el }}
          >
            {char}
          </span>
        ))}
      </h1>
      <p className="nf-subtitle">Page not found</p>
      <button
        className="xo-btn-primary nf-btn"
        onClick={() => navigate('/home')}
      >
        Go Home
      </button>
    </div>
  )
}
