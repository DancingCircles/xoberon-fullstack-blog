import { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { useBodyScrollLock } from '../../../hooks/scroll/useBodyScrollLock'
import { useWheelScroll } from '../../../hooks/scroll/useWheelScroll'
import { useAuth } from '../../../hooks/auth/useAuth'
import { useData } from '../../../hooks/auth/useData'
import { useToast } from '../../../hooks/social/useToast'
import { deleteEssay } from '../../../services/mockRuntime'
import { friendlyErrorMessage } from '../../../services/api'
import LikeButton from '../LikeButton'
import type { EssayItem } from '../../../assets/data/mockData'
import './EssayModal.css'

export type { EssayItem }

interface EssayModalProps {
  essay: EssayItem | null
  isOpen: boolean
  onClose: () => void
}

export default function EssayModal({ essay, isOpen, onClose }: EssayModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const mouseDownTargetRef = useRef<EventTarget | null>(null)
  const { currentUser } = useAuth()
  const { removeEssay } = useData()
  const { toast } = useToast()

  const isOwnEssay = currentUser !== null && essay !== null && essay.author.handle === currentUser.handle

  useBodyScrollLock(isOpen && !!essay)
  useWheelScroll(scrollRef, isOpen && !!essay)

  // 关闭动画
  const handleClose = useCallback(() => {
    const tl = gsap.timeline({ onComplete: onClose })

    tl.to(contentRef.current, {
      opacity: 0,
      scale: 0.9,
      y: 20,
      duration: 0.3,
      ease: 'power2.in',
    }).to(
      overlayRef.current,
      { opacity: 0, duration: 0.2 },
      '-=0.1'
    )
  }, [onClose])

  // 打开动画
  useEffect(() => {
    if (isOpen && essay) {
      gsap.set(overlayRef.current, { opacity: 0 })
      gsap.set(contentRef.current, { opacity: 0, scale: 0.9, y: 20 })

      const tl = gsap.timeline()
      tl.to(overlayRef.current, {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
      }).to(
        contentRef.current,
        { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: 'back.out(1.2)' },
        '-=0.1'
      )

      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0
      }

      return () => { tl.kill() }
    }
  }, [isOpen, essay])

  // ESC 关闭
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])

  if (!essay) return null

  return createPortal(
    <div
      className="essay-modal-overlay"
      ref={overlayRef}
      onMouseDown={e => { mouseDownTargetRef.current = e.target }}
      onClick={e => { if (e.target === overlayRef.current && mouseDownTargetRef.current === overlayRef.current) handleClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={essay.title}
    >
      <div
        className="essay-modal-container"
        ref={contentRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button className="essay-modal-close" onClick={handleClose} aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* 内容区 */}
        <div className="essay-modal-scroll" ref={scrollRef}>
          <div className="essay-modal-topbar">
            <img
              src={essay.author.avatar}
              alt={essay.author.name}
              className="essay-modal-avatar"
            />
            <span className="essay-modal-date">{essay.date}</span>
            <div className="essay-modal-topbar-right">
              <LikeButton type="essay" itemId={essay.id} initialLikes={essay.likes} />
            </div>
          </div>

          <h2 className="essay-modal-title">{essay.title}</h2>

          <div className="essay-modal-body">
            {essay.content.split('\n\n').map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>

        </div>

        {isOwnEssay && (
          <button
            className="modal-delete-btn"
            title="删除随笔"
            aria-label="删除随笔"
            onClick={() => {
              if (!essay) return
              toast.warning('确定删除此随笔吗？', {
                label: '确认删除',
                onClick: async () => {
                  try {
                    await deleteEssay(essay.id)
                    removeEssay(essay.id)
                    toast.success('随笔已删除')
                    onClose()
                  } catch (err) {
                    toast.error(friendlyErrorMessage(err, '删除随笔失败'))
                  }
                }
              })
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
    </div>,
    document.body
  )
}
