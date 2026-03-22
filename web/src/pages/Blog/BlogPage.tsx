import { useState, useCallback, useRef } from 'react'
import TypographicHero from '../../components/Blog/TypographicHero'
import HorizontalBlogScroll from '../../components/Blog/HorizontalBlogScroll'
import BlogList from '../../components/Blog/BlogList'
import WritePostModal from '../../components/Blog/WritePostModal'
import Footer from '../../components/Layout/Footer'
import FloatingButton from '../../components/Common/FloatingButton'
import { useAuth } from '../../hooks/auth/useAuth'
import './BlogPage.css'

export default function BlogPage() {
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false)
  const { requireAuth } = useAuth()
  const scrollTargetRef = useRef<HTMLDivElement>(null)

  const handleWrite = useCallback(() => {
    if (!requireAuth()) return
    setIsWriteModalOpen(true)
  }, [requireAuth])

  return (
    <div className="page page--blog">
      <div className="blog-landing-screen">
        <TypographicHero />
        
        <div className="blog-landing-controls">
          {/* Controls removed */}
        </div>

        <button 
          className="scroll-down-indicator" 
          onClick={() => scrollTargetRef.current?.scrollIntoView({ behavior: 'smooth' })}
          aria-label="Scroll to content"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M12 19L5 12M12 19L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div ref={scrollTargetRef}>
        <HorizontalBlogScroll />
      </div>
      
      <div className="blog-all-posts-section">
        <BlogList />
      </div>

      <Footer />

      <FloatingButton label="WRITE" onClick={handleWrite} />

      {/* Write Post Modal */}
      <WritePostModal 
        isOpen={isWriteModalOpen} 
        onClose={() => setIsWriteModalOpen(false)} 
      />
    </div>
  )
}
