import { useRef, useLayoutEffect } from 'react'
import gsap from 'gsap'
import './TypographicHero.css'

// 单词数据类型
interface WordData {
  text: string
  type: 'display' | 'script'
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'huge'
  accent?: boolean
}

// 文字数据
const lines: WordData[][] = [
  [
    { text: "XOBERON'S", type: 'display', size: 'md' },
    { text: 'curated', type: 'script', size: 'sm' },
  ],
  [
    { text: 'INSIGHTS', type: 'display', size: 'xl', accent: true },
    { text: 'for', type: 'script', size: 'xs' },
    { text: 'QUALITY,', type: 'display', size: 'lg' },
  ],
  [
    { text: 'taste,', type: 'script', size: 'lg' },
    { text: 'AND', type: 'display', size: 'xs' },
    { text: 'DIVERSE', type: 'display', size: 'xl', accent: true },
  ],
  [
    { text: 'PERSPECTIVES.', type: 'display', size: 'huge' },
  ],
]

export default function TypographicHero() {
  const containerRef = useRef<HTMLDivElement>(null)
  const charsRef = useRef<HTMLSpanElement[]>([])
  const mainTl = useRef<gsap.core.Timeline | null>(null)

  // 入场动画 - 只在这里处理
  useLayoutEffect(() => {
    // 确保清理之前的动画
    if (mainTl.current) {
      mainTl.current.kill()
    }
    
    const chars = charsRef.current
    if (chars.length === 0) return

    // 设置初始状态
    chars.forEach((char) => {
      if (!char) return
      gsap.set(char, {
        opacity: 0,
        y: 80,
        x: gsap.utils.random(-30, 30),
        rotateZ: gsap.utils.random(-90, 90),
        scale: 0.3,
        filter: 'blur(10px)'
      })
    })

    // 创建入场动画
    mainTl.current = gsap.timeline({ delay: 0.2 })
    
    let globalIndex = 0
    lines.forEach((line, lineIdx) => {
      line.forEach((word, wordIdx) => {
        const wordChars = word.text.split('')
        wordChars.forEach((_, charIdx) => {
          const char = chars[globalIndex]
          if (char) {
            const delay = lineIdx * 0.1 + wordIdx * 0.05 + charIdx * 0.02
            mainTl.current?.to(char, {
              opacity: 1,
              y: 0,
              x: 0,
              rotateZ: 0,
              scale: 1,
              filter: 'blur(0px)',
              duration: 0.6,
              ease: 'back.out(1.7)',
            }, delay)
          }
          globalIndex++
        })
      })
    })

    return () => {
      if (mainTl.current) {
        mainTl.current.kill()
        mainTl.current = null
      }
    }
  }, [])

  let charIdx = 0

  return (
    <div 
      className="typographic-hero"
      ref={containerRef}
    >
      {lines.map((line, lineIdx) => (
        <div key={lineIdx} className="hero-line">
          {line.map((word, wordIdx) => (
            <span key={wordIdx} className={`word-wrapper type-${word.type} size-${word.size}${word.accent ? ' word-accent' : ''}`}>
              {word.text.split('').map((char, ci) => {
                const idx = charIdx++
                return (
                  <span
                    key={ci}
                    ref={el => { if (el) charsRef.current[idx] = el }}
                    className="hero-char"
                    style={{ 
                      display: 'inline-block',
                      whiteSpace: char === ' ' ? 'pre' : 'normal'
                    }}
                  >
                    {char}
                  </span>
                )
              })}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}
