import { useRef, useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './AnimatedTitle.css'

gsap.registerPlugin(ScrollTrigger)

interface AnimatedTitleProps {
  text: string
  className?: string
  wrapperClass?: string
  enableScrollTrigger?: boolean
  delay?: number
  toggleActions?: string
  // 定义特殊字母的交互索引（无需指定颜色，只用于开启交互）
  highlightIndices?: number[]
}

export default function AnimatedTitle({
  text,
  className = '',
  wrapperClass = '',
  enableScrollTrigger = false,
  delay = 0,
  toggleActions = 'play none none none',
  highlightIndices = []
}: AnimatedTitleProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const lettersRef = useRef<(HTMLSpanElement | null)[]>([])

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const letters = lettersRef.current.filter(Boolean)
      
      const animConfig = {
        y: -100,
        opacity: 0,
        scaleY: 1.5, // 拉长，模拟下落速度感
        scaleX: 0.8,
        rotate: () => gsap.utils.random(-15, 15),
        duration: 0.8,
        stagger: 0.04,
        ease: "elastic.out(1, 0.5)",
        delay: delay
      }

      if (enableScrollTrigger && containerRef.current) {
        gsap.from(letters, {
          ...animConfig,
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 85%",
            toggleActions
          }
        })
      } else {
        gsap.from(letters, animConfig)
      }

    }, containerRef)

    return () => ctx.revert()
  }, [enableScrollTrigger, delay, toggleActions])

  const handleMouseEnter = (index: number) => {
    // 只有在 highlightIndices 中定义的字母才有交互效果
    if (!highlightIndices.includes(index)) return

    const letter = lettersRef.current[index]
    if (!letter) return

    // 橡皮筋动画 - 压扁回弹
    const tl = gsap.timeline({ overwrite: 'auto' })
    tl.to(letter, {
      scaleX: 1.3,
      scaleY: 0.7,
      y: 5,
      duration: 0.1,
      ease: 'power2.out'
    })
    .to(letter, {
      scaleX: 1,
      scaleY: 1,
      y: 0,
      duration: 0.8,
      ease: 'elastic.out(1, 0.3)'
    })
  }

  return (
    <div ref={containerRef} className={`animated-title ${wrapperClass}`}>
      {text.split('').map((char, i) => (
        <span
          key={i}
          ref={(el) => {
            if (el) lettersRef.current[i] = el
          }}
          className={`animated-title__char ${className}`}
          style={{ 
            display: 'inline-block', 
            cursor: highlightIndices.includes(i) ? 'default' : 'inherit',
            whiteSpace: char === ' ' ? 'pre' : 'normal',
            willChange: 'transform, opacity'
          }}
          onMouseEnter={() => handleMouseEnter(i)}
        >
          {char}
        </span>
      ))}
    </div>
  )
}
