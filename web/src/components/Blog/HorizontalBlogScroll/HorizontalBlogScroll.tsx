import { useRef, useEffect, useState, useLayoutEffect, useCallback } from 'react'
import gsap from 'gsap'
import type { BlogPost } from '../../../assets/data/mockData'
import { useData } from '../../../hooks/auth/useData'
import { fetchRecommendations } from '../../../services/mockRuntime'
import { useLenis } from '../../../hooks/scroll/useLenis'
import BlogModal from '../BlogModal'
import BlogCard from '../BlogCard'
import Watermark from '../../Common/Watermark'
import './HorizontalBlogScroll.css'

export default function HorizontalBlogScroll() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(1)
  const activeIndexRef = useRef(activeIndex)
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null)
  const [draggingCursor, setDraggingCursor] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [recommendedPosts, setRecommendedPosts] = useState<BlogPost[]>([])
  const { posts: blogPosts } = useData()
  const { lenis } = useLenis()

  useEffect(() => {
    let cancelled = false
    fetchRecommendations({ limit: 5 })
      .then(data => { if (!cancelled) setRecommendedPosts(data) })
      .catch(() => { })
    return () => { cancelled = true }
  }, [])

  // Drag state
  const isDragging = useRef(false)
  const startX = useRef(0)
  const currentX = useRef(0)
  const dragStartTranslateX = useRef(0)
  const isMounted = useRef(false)
  const touchStartY = useRef(0)
  const directionLocked = useRef<'horizontal' | 'vertical' | null>(null)

  // Keep ref in sync with state
  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])

  const displayPosts = recommendedPosts.length > 0 ? recommendedPosts : blogPosts.slice(0, 5)

  // Get card dimensions based on viewport
  const getCardDimensions = useCallback(() => {
    const viewportWidth = window.innerWidth
    let cardW = 480
    let margin = 50

    // 仅移动端分层：与 CSS 断点保持一致，避免中心点计算偏移
    if (viewportWidth <= 600) {
      cardW = 280
      margin = 12
    } else if (viewportWidth <= 768) {
      cardW = 340
      margin = 20
    }

    return { cardW, margin, totalItemWidth: cardW + (margin * 2) }
  }, [])

  // Calculate X position to center a given index
  const getTargetX = useCallback((index: number) => {
    if (!sectionRef.current) return 0
    const { totalItemWidth } = getCardDimensions()
    const viewportWidth = sectionRef.current.clientWidth
    const activeItemCenter = (index * totalItemWidth) + (totalItemWidth / 2)
    return (viewportWidth / 2) - activeItemCenter
  }, [getCardDimensions])

  // Snap to nearest card and update activeIndex
  const snapToNearest = useCallback(() => {
    const { totalItemWidth } = getCardDimensions()
    const viewportWidth = sectionRef.current?.clientWidth || 0

    // Current center position in content space
    const centerInContent = (viewportWidth / 2) - currentX.current

    // Find which card index is closest to center
    let nearestIndex = Math.round((centerInContent - (totalItemWidth / 2)) / totalItemWidth)
    nearestIndex = Math.max(0, Math.min(nearestIndex, displayPosts.length - 1))

    setActiveIndex(nearestIndex)

    // Animate to snap position
    const targetX = getTargetX(nearestIndex)
    gsap.to(containerRef.current, {
      x: targetX,
      duration: 0.5,
      ease: "power3.out",
      onUpdate: () => {
        if (containerRef.current) {
          const transform = gsap.getProperty(containerRef.current, "x") as number
          currentX.current = transform
        }
      }
    })
  }, [getCardDimensions, getTargetX, displayPosts.length])

  // Scroll to active index (called on mount and activeIndex change from click)
  const scrollToActive = useCallback((index: number, animated = true) => {
    if (!containerRef.current || !sectionRef.current) return

    const targetX = getTargetX(index)

    if (animated) {
      gsap.to(containerRef.current, {
        x: targetX,
        duration: 0.8,
        ease: "power3.out",
        onUpdate: () => {
          if (containerRef.current) {
            const transform = gsap.getProperty(containerRef.current, "x") as number
            currentX.current = transform
          }
        }
      })
    } else {
      gsap.set(containerRef.current, { x: targetX })
      currentX.current = targetX
    }
  }, [getTargetX])

  // Initialize position
  useLayoutEffect(() => {
    scrollToActive(activeIndexRef.current, false)

    const handleResize = () => scrollToActive(activeIndexRef.current, false)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [scrollToActive])

  // Animate when activeIndex changes (from click) — 跳过首次挂载，避免与 useLayoutEffect 的无动画初始化冲突
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true
      return
    }
    scrollToActive(activeIndex, true)
  }, [activeIndex, scrollToActive])

  // Drag handlers
  useEffect(() => {
    const container = containerRef.current
    const section = sectionRef.current
    if (!container || !section) return

    const handleDragStart = (clientX: number, clientY?: number) => {
      isDragging.current = true
      startX.current = clientX
      dragStartTranslateX.current = currentX.current
      directionLocked.current = null
      if (clientY !== undefined) touchStartY.current = clientY

      gsap.killTweensOf(container)
      setDraggingCursor(true)
    }

    const handleDragMove = (clientX: number, clientY?: number) => {
      if (!isDragging.current) return

      if (directionLocked.current === null && clientY !== undefined) {
        const dx = Math.abs(clientX - startX.current)
        const dy = Math.abs(clientY - touchStartY.current)
        const threshold = 8

        if (dx > threshold || dy > threshold) {
          if (dx > dy) {
            directionLocked.current = 'horizontal'
            if (lenis) lenis.stop()
          } else {
            directionLocked.current = 'vertical'
            isDragging.current = false
            setDraggingCursor(false)
            return
          }
        } else {
          return
        }
      }

      const deltaX = clientX - startX.current
      const newX = dragStartTranslateX.current + deltaX

      gsap.set(container, { x: newX })
      currentX.current = newX
    }

    const handleDragEnd = () => {
      if (!isDragging.current) return
      isDragging.current = false
      setDraggingCursor(false)
      directionLocked.current = null

      if (lenis) lenis.start()

      snapToNearest()
    }

    // Mouse events
    const onMouseDown = (e: MouseEvent) => {
      // Only start drag on left click
      if (e.button !== 0) return
      handleDragStart(e.clientX)
    }

    const onMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX)
    }

    const onMouseUp = () => {
      handleDragEnd()
    }

    // Touch events — pass clientY for direction detection
    const onTouchStart = (e: TouchEvent) => {
      handleDragStart(e.touches[0].clientX, e.touches[0].clientY)
    }

    const onTouchMove = (e: TouchEvent) => {
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY)
    }

    const onTouchEnd = () => {
      handleDragEnd()
    }

    // Add listeners
    section.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    section.addEventListener('touchstart', onTouchStart, { passive: true })
    section.addEventListener('touchmove', onTouchMove, { passive: true })
    section.addEventListener('touchend', onTouchEnd)

    return () => {
      // Ensure Lenis is resumed if component unmounts mid-drag
      if (isDragging.current && lenis) lenis.start()
      section.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)

      section.removeEventListener('touchstart', onTouchStart)
      section.removeEventListener('touchmove', onTouchMove)
      section.removeEventListener('touchend', onTouchEnd)
    }
  }, [displayPosts.length, snapToNearest, lenis])

  const handlePostClick = (index: number, post: BlogPost, e: React.MouseEvent) => {
    // If we were dragging, don't treat as click
    const deltaX = Math.abs(e.clientX - startX.current)
    if (deltaX > 10) {
      e.preventDefault()
      return
    }

    if (index === activeIndex) {
      setSelectedPost(post)
      setIsModalOpen(true)
    } else {
      setActiveIndex(index)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    closeTimerRef.current = setTimeout(() => setSelectedPost(null), 300)
  }

  useEffect(() => {
    return () => clearTimeout(closeTimerRef.current)
  }, [])

  const handleModalPostClick = (post: BlogPost) => {
    setSelectedPost(post)
    setIsModalOpen(true)
  }

  return (
    <div className={`horizontal-scroll-section${draggingCursor ? ' is-dragging' : ''}`} ref={sectionRef}>
      {/* Title */}
      <div className="horizontal-section-title">
        <h2>你可能感兴趣的内容</h2>
      </div>

      {/* Background Watermark */}
      <Watermark
        lines={[
          'INSIGHTS — INSIGHTS — INSIGHTS — INSIGHTS — INSIGHTS —',
          'CREATIVITY — CREATIVITY — CREATIVITY — CREATIVITY —',
          'XOBERON — XOBERON — XOBERON — XOBERON — XOBERON —'
        ]}
      />

      <div className="slider-viewport">
        <div className="scroll-container" ref={containerRef}>
          {displayPosts.map((post, index) => (
            <BlogCard
              key={post.id}
              post={post}
              isActive={index === activeIndex}
              onClick={(e) => handlePostClick(index, post, e)}
            />
          ))}
        </div>
      </div>

      <BlogModal
        post={selectedPost}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onPostClick={handleModalPostClick}
      />

    </div>
  )
}
