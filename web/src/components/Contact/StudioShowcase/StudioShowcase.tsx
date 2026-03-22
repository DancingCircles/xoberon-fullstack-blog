import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import './StudioShowcase.css'

import heroLeft from '../../../assets/images/contact/hero-left.png'
import heroRight from '../../../assets/images/contact/hero-right.png'

export default function StudioShowcase() {
  const heroRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.1 })
      
      const photoLeft = '.ss-hero-photo--left'
      const photoRight = '.ss-hero-photo--right'
      const photoImgs = '.ss-hero-photo img'
      const title = '.ss-hero-title'
      const icon = '.ss-hero-bar-icon'
      const infos = '.ss-hero-bar-info'

      // ==========================================
      // 1. 初始状态 (优雅、极简)
      // ==========================================
      // 照片容器初始使用 clip-path 隐藏 (从下往上揭开)
      gsap.set([photoLeft, photoRight], { clipPath: 'inset(100% 0 0 0)' })
      // 内部图片放大，准备进行极轻微的视差缩放
      gsap.set(photoImgs, { scale: 1.15 }) 
      
      // 标题从下方浮现，初始状态保持 CSS 的 scaleY(1.6)，只用 opacity 和 blur
      gsap.set(title, { 
        y: 60, 
        opacity: 0, 
        filter: 'blur(8px)'
      })
      
      // 底部元素简单淡入上浮
      gsap.set(icon, { opacity: 0, scale: 0.8, rotation: -45 })
      gsap.set(infos, { y: 20, opacity: 0 })

      // ==========================================
      // 2. 动画序列 (舒缓、从容的节奏，类似首页幕布揭开)
      // ==========================================
      // [步骤 A] 照片如幕布般优雅升起
      tl.to([photoLeft, photoRight], {
        clipPath: 'inset(0% 0 0 0)',
        duration: 1.6,
        ease: 'power4.inOut',
        stagger: 0.15
      }, 0)
      // 内部图片同步缩放，营造空间感
      .to(photoImgs, {
        scale: 1,
        duration: 2.2,
        ease: 'power3.out'
      }, 0)
      
      // [步骤 B] 标题从容浮现，结束时还原 scaleY(1.6) 保持 CSS 原意
      .to(title, {
        y: 0,
        scaleY: 1.6,
        scaleX: 1,
        opacity: 1,
        filter: 'blur(0px)',
        duration: 1.6,
        ease: 'power4.out'
      }, 0.6)
      
      // [步骤 C] 底部信息顺滑入场
      .to(icon, {
        opacity: 1,
        scale: 1,
        rotation: 0,
        duration: 1.2,
        ease: 'power3.out'
      }, 1.0)
      .to(infos, {
        y: 0,
        opacity: 1,
        duration: 1.2,
        stagger: 0.15,
        ease: 'power3.out'
      }, 1.1)

    }, heroRef)

    return () => ctx.revert()
  }, [])

  return (
    <div className="studio-showcase">
      <section className="ss-hero" ref={heroRef}>
        <div className="ss-hero-photos">
          <div className="ss-hero-photo ss-hero-photo--left">
            <img src={heroLeft} alt="" />
          </div>
          <div className="ss-hero-photo ss-hero-photo--right">
            <img src={heroRight} alt="" />
          </div>
        </div>

        <h1 className="ss-hero-title">CONTACT</h1>

        <div className="ss-hero-bar">
          <div className="ss-hero-bar-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="16" cy="16" r="6" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="16" cy="16" r="2" fill="currentColor" />
              <line x1="16" y1="1" x2="16" y2="10" stroke="currentColor" strokeWidth="0.6" />
              <line x1="16" y1="22" x2="16" y2="31" stroke="currentColor" strokeWidth="0.6" />
              <line x1="1" y1="16" x2="10" y2="16" stroke="currentColor" strokeWidth="0.6" />
              <line x1="22" y1="16" x2="31" y2="16" stroke="currentColor" strokeWidth="0.6" />
            </svg>
          </div>

          <div className="ss-hero-bar-info">
            <span className="ss-hero-bar-bold">XOBERON DIGITAL STUDIO</span>
            <span className="ss-hero-bar-small">DESIGN & DEVELOP, AI-POWERED CREATION</span>
          </div>

          <div className="ss-hero-bar-info">
            <span className="ss-hero-bar-bold">AVAILABILITY</span>
            <span className="ss-hero-bar-small">OPEN FOR PROJECTS & COLLABORATIONS</span>
          </div>
        </div>
      </section>
    </div>
  )
}
