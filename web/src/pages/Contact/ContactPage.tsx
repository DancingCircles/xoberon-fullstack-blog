import { useCallback, useRef, useState, useLayoutEffect } from 'react'
import { useAuth } from '../../hooks/auth/useAuth'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lottie, { type LottieRefCurrentProps } from 'lottie-react'
import StudioShowcase from '../../components/Contact/StudioShowcase'
import ContactModal from '../../components/Contact/ContactModal'
import steamboatWillie from '../../assets/images/contact/steamboat-willie.json'
import gibliTribute from '../../assets/images/contact/gibli-tribute.json'
import buttonStar1 from '../../assets/images/Icons/buttons/button-star-1.svg'
import buttonStar2 from '../../assets/images/Icons/buttons/button-star-2.svg'
import buttonTop from '../../assets/images/Icons/buttons/button-top.svg'
import buttonBottom from '../../assets/images/Icons/buttons/button-bottom.svg'
import './ContactPage.css'

gsap.registerPlugin(ScrollTrigger)

export default function ContactPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const steamboatLottieRef = useRef<LottieRefCurrentProps>(null)
  const moverRef = useRef<HTMLDivElement>(null)
  const visualRef = useRef<HTMLDivElement>(null)
  const isAnimating = useRef(false)
  const statementRef = useRef<HTMLElement>(null)

  const handlePortalHover = useCallback(() => {
    if (lottieRef.current) {
      lottieRef.current.play()
    }

    if (isAnimating.current || !moverRef.current) return
    isAnimating.current = true

    const tl = gsap.timeline({
      onComplete: () => {
        isAnimating.current = false
      }
    })

    tl.to(moverRef.current, { x: -600, duration: 1.5, ease: 'power2.in' })
      .set(moverRef.current, { x: 600 })
      .to(moverRef.current, { x: 0, duration: 1.5, ease: 'power2.out', delay: 2 })
  }, [])

  const handlePortalClick = useCallback(() => {
    if (!visualRef.current) return
    gsap.killTweensOf(visualRef.current)
    gsap.to(visualRef.current, { 
      scale: 0, 
      rotation: -15, 
      opacity: 0, 
      duration: 0.4, 
      ease: 'back.in(1.2)', 
      transformOrigin: 'center center' 
    })
  }, [])

  const handlePortalMouseLeave = useCallback(() => {
    if (lottieRef.current) {
      lottieRef.current.pause()
    }
    if (!visualRef.current) return
    gsap.killTweensOf(visualRef.current)
    gsap.to(visualRef.current, { 
      scale: 1, 
      rotation: 0, 
      opacity: 1, 
      duration: 1, 
      ease: 'elastic.out(1, 0.5)', 
      transformOrigin: 'center center' 
    })
  }, [])

  const { requireAuth } = useAuth()

  const handleOpenModal = useCallback(() => {
    if (!requireAuth()) return
    setIsModalOpen(true)
  }, [requireAuth])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  // =============================================
  // Statement Section Animation (Scrubbing / 滚动随动)
  // =============================================
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const statementSection = statementRef.current
      if (!statementSection) return

      // ==========================================
      // 1. 米老鼠与文字交互 (Pin & Scrub)
      // ==========================================
      const titles = statementSection.querySelectorAll('.cp-statement-hero-line')
      const lottieContainer = statementSection.querySelector('.cp-statement-right')
      
      // 针对移动端特殊处理：不使用 Pin 动画
      const isMobile = window.innerWidth <= 768;

      if (isMobile) {
        // 移动端：直接显示，移除隐藏样式，不绑定 ScrollTrigger
        gsap.set(lottieContainer, { x: 0, scale: 1 })
        gsap.set(titles, { opacity: 1, x: 0, filter: 'blur(0px)', scale: 1 })
        
        // 如果需要可以简单的自动播放
        if (steamboatLottieRef.current) steamboatLottieRef.current.play()
      } else {
        // PC端保持原有的 Pin 动画
        // 让 Lottie 初始居中：右半边容器中心在 75vw，屏幕中心在 50vw，需左移 25vw
        // 同时让容器宽度撑满便于居中显示
        gsap.set(lottieContainer, { x: '-25vw', scale: 1.2 })
        // 让文字初始隐藏且挤在一起，准备被“吹出来”
        gsap.set(titles, { opacity: 0, x: 200, filter: 'blur(8px)', scale: 0.8 })

        // 创建一个固定(pin)动画序列
        const pinTl = gsap.timeline({
          scrollTrigger: {
            trigger: statementSection,
            start: 'top top',
            end: '+=150%',
            pin: true,
            scrub: 0.3,
            onEnter: () => {
              // 开始滚动时播放米老鼠动画
              if (steamboatLottieRef.current) steamboatLottieRef.current.play()
            },
            onLeaveBack: () => {
              // 滚回去时暂停并重置
              if (steamboatLottieRef.current) {
                steamboatLottieRef.current.pause()
                steamboatLottieRef.current.goToAndStop(0, true)
              }
            }
          }
        })

        // 动画序列：
        // (1) 米老鼠平滑地从屏幕中央退回右侧本来的位置
        pinTl.to(lottieContainer, {
          x: 0,
          scale: 1,
          duration: 2,
          ease: 'power2.inOut'
        }, 0)
        // (2) 同时，文字像被吹出来一样，从右向左浮现
        .to(titles, {
          x: 0,
          opacity: 1,
          scale: 1,
          filter: 'blur(0px)',
          duration: 1.5,
          stagger: 0.2, // 逐行吹出
          ease: 'back.out(1.2)'
        }, 0.5) // 稍微延迟一点，等老鼠开始往右退的时候文字再出来
      }

      // ==========================================
      // 以下线条/文字动画用独立 ScrollTrigger + pinnedContainer
      // 让 GSAP 在 pin 偏移后正确计算触发时机
      // ==========================================
      const staircase = statementSection.querySelector('.cp-statement-staircase')
      const topRight = statementSection.querySelectorAll('.cp-floating-title--top-right span')
      const floatingLine = statementSection.querySelector('.cp-floating-line')

      if (!isMobile) {
        gsap.fromTo(staircase,
          { clipPath: 'inset(0 100% 0 0)' },
          {
            clipPath: 'inset(0 0% 0 0)',
            scrollTrigger: {
              trigger: staircase,
              pinnedContainer: statementSection,
              start: 'top 90%',
              end: 'bottom 50%',
              scrub: 1,
            }
          }
        )

        gsap.fromTo(topRight,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.05,
            scrollTrigger: {
              trigger: '.cp-statement-portal-wrapper',
              pinnedContainer: statementSection,
              start: 'top 80%',
              end: 'top 40%',
              scrub: 1,
            }
          }
        )

        gsap.fromTo(floatingLine,
          { clipPath: 'inset(0 100% 0 0)' },
          {
            clipPath: 'inset(0 0% 0 0)',
            scrollTrigger: {
              trigger: floatingLine,
              pinnedContainer: statementSection,
              start: 'top 90%',
              end: 'bottom 50%',
              scrub: 1,
            }
          }
        )
      }

    }, statementRef)

    return () => ctx.revert()
  }, [])

  return (
    <div className="page page--contact">
      <ContactModal isOpen={isModalOpen} onClose={handleCloseModal} />
      <StudioShowcase />

      {/* 第二屏 + 阶梯过渡（合并长页） */}
      <section className="cp-statement" ref={statementRef}>
        <div className="cp-statement-left">
          <h2 className="cp-statement-hero-title">
            <span className="cp-statement-hero-line">LET'S</span>
            <span className="cp-statement-hero-line">TALK</span>
          </h2>
        </div>
        <div className="cp-statement-right">
          <Lottie
            lottieRef={steamboatLottieRef}
            animationData={steamboatWillie}
            loop
            autoplay={false}
            className="cp-statement-lottie"
          />
        </div>
        <div 
          className="cp-statement-portal-wrapper"
          onMouseLeave={handlePortalMouseLeave}
          onClick={handlePortalClick}
          onMouseEnter={handlePortalHover}
        >
          <div className="cp-statement-portal-visual" ref={visualRef}>
            <div className="cp-statement-portal-rect">
              <div className="cp-statement-portal-mover" ref={moverRef}>
                <Lottie
                  lottieRef={lottieRef}
                  animationData={gibliTribute}
                  loop={true}
                  autoplay={false}
                  className="cp-statement-portal-lottie"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 矩形左侧竖排字母标题 */}
        <div className="cp-floating-title cp-floating-title--top-right">
          {'BREAKTHEWALL'.split('').map((char, i) => (
            <span key={i}>{char}</span>
          ))}
        </div>

        <svg className="cp-statement-staircase" viewBox="0 -5 100 110" preserveAspectRatio="none" aria-hidden="true">
          <path
            d="M0 100 H14.3 V83.3 H28.6 V66.7 H42.9 V50 H57.1 V33.3 H71.4 V16.7 H85.7 V0 H100"
            stroke="var(--color-cream-bg)"
            strokeWidth={3}
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* 底部左侧大标题 */}
        <div className="cp-floating-title cp-floating-title--bottom-left">
          <span className="cp-ft-red">BUILD</span>
          <span className="cp-ft-cream">THE</span>
          <span className="cp-ft-cream">DREAM</span>
        </div>

        {/* 底部的反向阶梯线条 (左上 -> 右下) */}
        <svg className="cp-floating-line" viewBox="0 -5 100 110" preserveAspectRatio="none" aria-hidden="true">
          <path
            d="M0 0 H14.3 V16.7 H28.6 V33.3 H42.9 V50 H57.1 V66.7 H71.4 V83.3 H85.7 V100 H100"
            stroke="var(--color-cream-bg)"
            strokeWidth={3}
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </section>

      {/* 第四屏 */}
      <section className="cp-roster">
        <div className="cp-roster-inner">
          <h2 className="cp-roster-title">LINEUP</h2>

          <div className="cp-roster-list">
            <div className="cp-roster-header">
              <span>TECH</span>
              <span>ROLE</span>
              <span>SCOPE</span>
            </div>
            {[
              { name: 'REACT', role: 'FRONTEND FRAMEWORK', time: 'CORE' },
              { name: 'GOLANG', role: 'BACKEND LANGUAGE', time: 'CORE' },
              { name: 'GSAP', role: 'ANIMATION ENGINE', time: 'CORE' },
              { name: 'TYPESCRIPT', role: 'TYPE SYSTEM', time: 'CORE' },
              { name: 'CURSOR', role: 'AI-POWERED IDE', time: 'DAILY' },
              { name: 'CLAUDE', role: 'AI ASSISTANT', time: 'DAILY' },
            ].map((item, i) => (
              <div className="cp-roster-row" key={i}>
                <span className="cp-roster-name">{item.name}</span>
                <span className="cp-roster-role">{item.role}</span>
                <span className="cp-roster-time">{item.time}</span>
              </div>
            ))}
            <div className="cp-roster-row cp-roster-row--highlight">
              <span className="cp-roster-name">XOBERON</span>
              <span className="cp-roster-role">CREATOR & DEVELOPER</span>
              <span className="cp-roster-time">2026</span>
            </div>
          </div>
        </div>

        <div className="cp-roster-footer">
          <div className="cp-roster-footer-text">
            <span>POWERED BY AI & PASSION</span>
            <span>&copy; 2026</span>
            <span>CRAFTED BY XOBERON</span>
          </div>
          <button
            type="button"
            className="cp-roster-btn cp-roster-btn--footer"
            aria-label="Contact Us"
            onClick={handleOpenModal}
          >
            <div className="cp-roster-btn-wrapper">
              <img src={buttonStar1} alt="" className="cp-btn-star cp-btn-star--1" />
              <img src={buttonStar2} alt="" className="cp-btn-star cp-btn-star--2" />
              <img src={buttonBottom} alt="" className="cp-btn-base" />
              <div className="cp-btn-top-container">
                <img src={buttonTop} alt="" className="cp-btn-top" />
              </div>
            </div>
          </button>
        </div>
      </section>
    </div>
  )
}
