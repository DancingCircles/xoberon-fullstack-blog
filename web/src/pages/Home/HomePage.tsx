import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import '../../styles/home/index.css'
import CupheadModel from '../../components/3D/CupheadModel'
import AnimatedTitle from '../../components/Common/AnimatedTitle'
import starDeco from '../../assets/images/Icons/decorations/star-deco.svg'
import flowerDeco from '../../assets/images/Icons/decorations/flower-deco.svg'
import muchaLeft from '../../assets/images/mucha-left.jpg'
import muchaRight from '../../assets/images/mucha-right.jpg'

const processSteps = [
  {
    id: 1,
    step: '01',
    title: 'EXPLORE',
    desc: 'Curiosity drives everything. 深入未知领域，研究前沿技术与设计趋势。用 AI 拓宽认知边界，让 Claude & Cursor 成为探索的加速器。'
  },
  {
    id: 2,
    step: '02',
    title: 'DESIGN',
    desc: 'Clarity over complexity, function over decoration. 每一个元素都有存在的理由。追求 Visual harmony & purposeful aesthetics，让设计自己说话。'
  },
  {
    id: 3,
    step: '03',
    title: 'DEVELOP',
    desc: 'Golang 构建稳健的 backend architecture，React & GSAP 打造沉浸式 frontend experience。AI-assisted development，让代码兼具 Performance & elegance。'
  },
  {
    id: 4,
    step: '04',
    title: 'DELIVER',
    desc: 'Ship fast, iterate faster. 每一次交付都是新起点，用 CI/CD 驱动持续进化。Pixel-perfect execution，细节决定品质。'
  },
]

export default function HomePage() {
  const navigate = useNavigate()
  const workSectionRef = useRef<HTMLElement>(null)
  const processSectionRef = useRef<HTMLElement>(null)
  const processTrackRef = useRef<HTMLDivElement>(null)
  const teamSectionRef = useRef<HTMLElement>(null)
  const ctaSectionRef = useRef<HTMLElement>(null)

  const heroRef = useRef<HTMLElement>(null)

  // Cuphead 模型控制状态
  const [modelRotation, setModelRotation] = useState(0)
  const [isModelPlaying, setIsModelPlaying] = useState(true)

  const handleRotateLeft = useCallback(() => {
    setModelRotation(prev => prev + Math.PI / 4)
  }, [])

  const handleRotateRight = useCallback(() => {
    setModelRotation(prev => prev - Math.PI / 4)
  }, [])

  const handleTogglePlay = useCallback(() => {
    setIsModelPlaying(prev => !prev)
  }, [])


  // Work section 竖线延伸动画 - 从 hero 延续下来，参差不齐地增长
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const section = workSectionRef.current
      const lines = section?.querySelectorAll('.section-work__extend-lines span')
      if (!lines || !section) return

      // 每根线的起始延迟不同（百分比），造成参差不齐的效果
      const delays = [0, 12, 4, 18, 7, 15, 2]
      // 目标高度：section 高度的 75%（大约到 PORTFOLIO 标题顶部）
      const targetHeight = () => section.offsetHeight * 0.75

      lines.forEach((line, i) => {
        gsap.fromTo(line,
          { height: 0 },
          {
            height: () => targetHeight(),
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: `top ${100 - delays[i]}%`,
              end: 'top 15%',
              scrub: true,
              invalidateOnRefresh: true,
            },
          }
        )
      })
    }, workSectionRef)

    return () => ctx.revert()
  }, [])

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const track = processTrackRef.current
      const section = processSectionRef.current

      if (track && section) {
        const scrollDistance = () => track.scrollWidth - window.innerWidth
        // 缩短竖向滚动距离，让横向移动速度与竖向滚动体感一致
        const scrollEnd = () => scrollDistance() * 0.6

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: () => `+=${scrollEnd()}`,
            pin: true,
            scrub: true,
            invalidateOnRefresh: true,
            refreshPriority: 1,
          }
        })

        tl.to(track, {
          x: () => -scrollDistance(),
          ease: 'none',
          duration: 1
        })

        // 入场动画：卡片从上方落下摇晃，像被钉在公告板上
        const cards = track.querySelectorAll('.process-card')
        cards.forEach((card) => {
          gsap.fromTo(card,
            {
              y: -120,
              opacity: 0,
              rotation: -8,
              transformOrigin: 'top center',
            },
            {
              y: 0,
              opacity: 1,
              rotation: 0,
              duration: 0.8,
              ease: 'elastic.out(1.2, 0.4)',
              scrollTrigger: {
                trigger: card,
                containerAnimation: tl,
                start: 'left 90%',
                toggleActions: 'play none none reverse',
              },
            }
          )
        })
      }
    }, processSectionRef)

    return () => ctx.revert()
  }, [])

  // Team section 动画
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const section = teamSectionRef.current
      if (!section) return

      // 标题：幕布揭开效果，每行从左到右逐行显露
      const titleLines = section.querySelectorAll('.section-team__title-reveal')
      titleLines.forEach((line, i) => {
        gsap.fromTo(line,
          { clipPath: 'inset(0 100% 0 0)', x: -30 },
          {
            clipPath: 'inset(0 0% 0 0)',
            x: 0,
            duration: 1,
            delay: i * 0.2,
            ease: 'power4.inOut',
            scrollTrigger: {
              trigger: section,
              start: 'top 70%',
              toggleActions: 'play none none reverse',
            },
          }
        )
      })

      // 描述文字：淡入上移
      gsap.from(section.querySelector('.section-team__desc'), {
        y: 40,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 60%',
          toggleActions: 'play none none reverse',
        },
      })

      // (About Me) 标签：从右侧滑入
      gsap.from(section.querySelector('.section-team__about-label'), {
        x: 60,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 55%',
          toggleActions: 'play none none reverse',
        },
      })

      // 三个圆点：依次弹出，像被按上去
      gsap.from(section.querySelectorAll('.section-team__dot'), {
        scale: 0,
        opacity: 0,
        duration: 0.5,
        ease: 'back.out(3)',
        stagger: 0.15,
        scrollTrigger: {
          trigger: section,
          start: 'top 45%',
          toggleActions: 'play none none reverse',
        },
      })
    }, teamSectionRef)

    return () => ctx.revert()
  }, [])

  // CTA section 动画 - 按钮从中间横向展开
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const section = ctaSectionRef.current
      if (!section) return

      gsap.fromTo(section.querySelector('.section-cta__button'),
        {
          clipPath: 'inset(0 50%)',
          opacity: 0,
        },
        {
          clipPath: 'inset(0 0%)',
          opacity: 1,
          duration: 0.8,
          ease: 'power4.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 55%',
            toggleActions: 'play none none reverse',
          },
        }
      )
    }, ctaSectionRef)

    return () => ctx.revert()
  }, [])

  // 所有 pin 和动画创建完成后，刷新 ScrollTrigger 位置计算
  useEffect(() => {
    ScrollTrigger.sort()
    ScrollTrigger.refresh()

    // 等字体加载完成后再 refresh（字体会改变元素高度，导致 pin 计算偏移）
    let cancelled = false
    document.fonts.ready.then(() => {
      if (cancelled) return
      ScrollTrigger.sort()
      ScrollTrigger.refresh()
    })

    return () => { cancelled = true }
  }, [])

  return (
    <div className="page page--home">
      <main className="hero" ref={heroRef}>
        <div className="hero__grid-lines">
          <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
        </div>

        <div className="hero__model">
          <CupheadModel
            rotation={modelRotation}
            isPlaying={isModelPlaying}
            onRotateLeft={handleRotateLeft}
            onRotateRight={handleRotateRight}
            onTogglePlay={handleTogglePlay}
          />
        </div>

        <h1 className="hero__brand">Studio</h1>

        <div className="hero__lower">
          <div className="hero__arrow">
            <svg viewBox="0 0 40 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 0V55M20 55L4 39M20 55L36 39" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>

          <p className="hero__tagline">
            Design &amp; Develop<br />
            AI-Powered Creation<br />
            EST. 2026
          </p>
        </div>

        <button className="hero__apply-btn" onClick={() => navigate('/search')}>WORKS</button>
      </main>

      <section className="section-work" ref={workSectionRef}>
        <div className="section-work__grid"></div>
        <div className="section-work__extend-lines">
          <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
        </div>

        <div className="section-work__topbar">
          <span className="section-work__topbar-name">XOBERON</span>
          <span className="section-work__topbar-handle">@xoberon</span>
        </div>

        <div className="section-work__photo section-work__photo--left">
          <img src={muchaLeft} alt="Mucha style artwork" />
        </div>
        <div className="section-work__photo section-work__photo--right">
          <img src={muchaRight} alt="Mucha style artwork" />
        </div>

        <h2 className="section-work__title section-work__title--bottom-left">
          PORTFOLIO<img className="section-work__deco-inline" src={starDeco} alt="" />
        </h2>
        <h2 className="section-work__title section-work__title--top-right">
          <img className="section-work__deco-inline" src={flowerDeco} alt="" />CREATIVE
        </h2>

        <p className="section-work__desc section-work__desc--bottom">
          Blending aesthetics with engineering，用设计思维驱动技术实现。
          在 Art & Code 的交汇处，构建有温度的 Digital experience。
        </p>
        <p className="section-work__desc section-work__desc--right">
          AI-native workflow, human-centered design.
          用 Cursor & Claude 加速创作，
          追求 Performance & beauty 的极致平衡。
        </p>
      </section>

      <section className="section-clients">
        <header className="section-clients__header">
          <h2 className="section-clients__title">
            <AnimatedTitle
              text="WHO"
              className="section-clients__title-line section-clients__title-line--red"
              enableScrollTrigger
            />
            <AnimatedTitle
              text="WE'VE DONE"
              className="section-clients__title-line"
              enableScrollTrigger
              delay={0.15}
            />
            <AnimatedTitle
              text="IT WITH"
              className="section-clients__title-line"
              enableScrollTrigger
              delay={0.3}
            />
          </h2>
          <p className="section-clients__intro">
            React & Vite for blazing-fast frontend, Golang for robust backend, GSAP for cinematic animations.
            Cursor、Claude & Gemini 作为 AI 工具链深度参与开发全流程。
            Technology meets aesthetics, code becomes craft.
          </p>
        </header>
      </section>

      <section className="section-process" ref={processSectionRef}>
        <div className="process-track" ref={processTrackRef}>
          <div className="process-panel process-panel--title">
            <h2 className="section-process__title">
              <AnimatedTitle
                text="HOW"
                className="section-process__line section-process__line--red"
                enableScrollTrigger
                highlightIndices={[0]}
              />
              <AnimatedTitle
                text="IT'S"
                className="section-process__line section-process__line--black"
                enableScrollTrigger
                highlightIndices={[2]}
                delay={0.15}
              />
              <AnimatedTitle
                text="DONE"
                className="section-process__line section-process__line--black"
                enableScrollTrigger
                highlightIndices={[1]}
                delay={0.3}
              />
            </h2>
          </div>

          {processSteps.map((step) => (
            <div key={step.id} className="process-panel process-panel--step">
              <div className="process-card">
                <div className="process-card__number">{step.step}</div>
                <h3 className="process-card__title">{step.title}</h3>
                <p className="process-card__desc">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section-team" ref={teamSectionRef}>
        <div className="section-team__content">
          <div className="section-team__left">
            <h2 className="section-team__title">
              <span className="section-team__title-word section-team__title-reveal">WHO'S</span>
              <span className="section-team__title-word section-team__title-word--red section-team__title-reveal">BEHIND</span>
            </h2>
            <p className="section-team__desc section-team__desc--large">
              Passionate about design systems & creative engineering. 用 AI 重新定义开发范式，在 Aesthetics & Technology 之间寻找完美交点。
            </p>
          </div>

          <div className="section-team__right">
            <div className="section-team__right-content">
              <span className="section-team__about-label">(About Me)</span>
              <div className="section-team__dots">
                <span className="section-team__dot"></span>
                <span className="section-team__dot"></span>
                <span className="section-team__dot"></span>
              </div>
            </div>
          </div>
        </div>

        <footer className="section-team__footer">
          <div className="section-team__footer-item">
            <span className="section-team__footer-num">01</span>
            <span className="section-team__footer-label">XOBERON</span>
            <span className="section-team__footer-value">FRESH GRADUATE / DEVELOPER & DESIGNER</span>
          </div>
          <div className="section-team__footer-item">
            <span className="section-team__footer-num">02</span>
            <span className="section-team__footer-label">STATUS</span>
            <span className="section-team__footer-value">ROMANTICIZING STUDENT LIFE</span>
          </div>
          <div className="section-team__footer-item">
            <span className="section-team__footer-num">03</span>
            <span className="section-team__footer-label">LIFE GOAL</span>
            <span className="section-team__footer-value">DO BETTER</span>
          </div>
        </footer>
      </section>

      <section className="section-cta" ref={ctaSectionRef}>
        <h2 className="section-cta__title">
          <span className="section-cta__line">LET'S</span>
          <span className="section-cta__line section-cta__line--accent">BEGINNING</span>
        </h2>
        <button
          className="section-cta__button"
          onClick={() => navigate('/journal')}
        >
          EXPLORE POSTS
          <span className="section-cta__button-arrow">→</span>
        </button>
      </section>
    </div>
  )
}
