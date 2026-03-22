import { useRef } from 'react'
import gsap from 'gsap'
import { useLikes } from '../../../hooks/social/useLikes'
import { useAuth } from '../../../hooks/auth/useAuth'
import './LikeButton.css'

interface LikeButtonProps {
  type: 'post' | 'essay'
  itemId: string
  initialLikes?: number
}

export default function LikeButton({ type, itemId, initialLikes = 0 }: LikeButtonProps) {
  const { togglePostLike, toggleEssayLike, isPostLiked, isEssayLiked } = useLikes()
  const { requireAuth } = useAuth()
  const heartRef = useRef<SVGSVGElement>(null)
  const particlesRef = useRef<HTMLDivElement>(null)

  const liked = type === 'post' ? isPostLiked(itemId) : isEssayLiked(itemId)
  const displayLikes = initialLikes + (liked ? 1 : 0)

  const handleLike = () => {
    if (!requireAuth()) return
    if (type === 'post') togglePostLike(itemId)
    else toggleEssayLike(itemId)

    if (!liked && heartRef.current) {
      gsap.fromTo(heartRef.current,
        { scale: 1 },
        { scale: 1.5, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.out' }
      )
    }

    if (!liked && particlesRef.current) {
      const particles = particlesRef.current.children
      gsap.fromTo(particles,
        { x: 0, y: 0, opacity: 1, scale: 0.5 },
        {
          x: () => (Math.random() - 0.5) * 60,
          y: () => (Math.random() - 1) * 60,
          opacity: 0,
          scale: 0,
          duration: 0.6,
          ease: 'power2.out',
          stagger: 0.02,
        }
      )
    }
  }

  return (
    <button
      className={`like-button ${liked ? 'liked' : ''}`}
      onClick={handleLike}
      aria-label={liked ? 'Unlike' : 'Like'}
    >
      <div className="like-icon-wrapper">
        <svg
          ref={heartRef}
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill={liked ? 'var(--color-accent)' : 'none'}
          stroke={liked ? 'var(--color-accent)' : 'currentColor'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>

        <div ref={particlesRef} className="particles">
          {[...Array(8)].map((_, i) => (
            <span key={i} className="particle" />
          ))}
        </div>
      </div>
      <span className="like-count">{displayLikes}</span>
    </button>
  )
}
