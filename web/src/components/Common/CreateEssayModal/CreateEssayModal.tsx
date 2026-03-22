import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { useBodyScrollLock } from '../../../hooks/scroll/useBodyScrollLock'
import { useToast } from '../../../hooks/social/useToast'
import { useAuth } from '../../../hooks/auth/useAuth'
import { useData } from '../../../hooks/auth/useData'
import { friendlyErrorMessage } from '../../../services/api'
import './CreateEssayModal.css'

const MAX_TITLE_LENGTH = 20
const MAX_EXCERPT_LENGTH = 30
const MAX_CONTENT_LENGTH = 500

interface CreateEssayModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CreateEssayModal({ isOpen, onClose }: CreateEssayModalProps) {
  const { currentUser } = useAuth()
  const { addEssay } = useData()

  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')

  const { toast } = useToast()
  const overlayRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const mouseDownTargetRef = useRef<EventTarget | null>(null)

  useBodyScrollLock(isOpen)

  const handleClose = useCallback(() => {
    const tl = gsap.timeline({ onComplete: onClose })
    tl.to(containerRef.current, {
      scale: 0.95,
      y: 30,
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
    }).to(overlayRef.current, {
      opacity: 0,
      duration: 0.2,
    }, '-=0.1')
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    gsap.set(overlayRef.current, { opacity: 0 })
    gsap.set(containerRef.current, { opacity: 0, scale: 0.95, y: 30 })

    const tl = gsap.timeline()
    tl.to(overlayRef.current, {
      opacity: 1,
      duration: 0.3,
      ease: 'power2.out',
    }).to(containerRef.current, {
      opacity: 1,
      scale: 1,
      y: 0,
      duration: 0.5,
      ease: 'back.out(1.3)',
    }, '-=0.15')

    return () => { tl.kill() }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, handleClose])

  const showToast = useCallback((msg: string) => {
    toast.info(msg)
  }, [toast])

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = useCallback(async () => {
    if (!currentUser || isSubmitting) return
    if (!title.trim()) { showToast('请输入标题'); return }
    if (!content.trim()) { showToast('请输入正文'); return }
    if (content.trim().length < 10) { showToast('正文至少 10 字'); return }

    setIsSubmitting(true)
    try {
      await addEssay({ title: title.trim(), excerpt: excerpt.trim(), content: content.trim() })
      setTitle('')
      setExcerpt('')
      setContent('')
      showToast('随笔已发布')
      timerRef.current = setTimeout(() => handleClose(), 1000)
    } catch (err) {
      toast.error(friendlyErrorMessage(err, '发布失败，请稍后重试'))
    } finally {
      setIsSubmitting(false)
    }
  }, [title, excerpt, content, currentUser, isSubmitting, showToast, handleClose, addEssay, toast])

  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

  if (!isOpen) return null

  const canSubmit = title.trim().length > 0 && content.trim().length > 0

  return createPortal(
    <div
      className="create-essay-overlay"
      ref={overlayRef}
      onMouseDown={e => { mouseDownTargetRef.current = e.target }}
      onClick={e => { if (e.target === overlayRef.current && mouseDownTargetRef.current === overlayRef.current) handleClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Write essay"
    >
      <div
        className="create-essay-container"
        ref={containerRef}
        onClick={e => e.stopPropagation()}
      >
        <button className="create-essay-close" onClick={handleClose} aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="create-essay-form">
          <div className="create-essay-header">
            <h2 className="create-essay-heading">Write an Essay</h2>
            <span className="create-essay-hint">分享你的想法和感悟</span>
          </div>

          <div className="create-essay-field">
            <label className="create-essay-label" htmlFor="essay-title">标题</label>
            <input
              id="essay-title"
              className="xo-input create-essay-title-input"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value.slice(0, MAX_TITLE_LENGTH))}
              placeholder=""
              maxLength={MAX_TITLE_LENGTH}
            />
            <span className={`create-essay-char-count create-essay-char-count--inline${title.length >= MAX_TITLE_LENGTH ? ' create-essay-char-count--limit' : ''}`}>
              {title.length} / {MAX_TITLE_LENGTH}
            </span>
          </div>

          <div className="create-essay-field">
            <label className="create-essay-label" htmlFor="essay-excerpt">摘要（选填）</label>
            <textarea
              id="essay-excerpt"
              className="xo-textarea create-essay-excerpt-input"
              value={excerpt}
              onChange={e => setExcerpt(e.target.value.slice(0, MAX_EXCERPT_LENGTH))}
              placeholder=""
              maxLength={MAX_EXCERPT_LENGTH}
              rows={1}
            />
            <span className={`create-essay-char-count create-essay-char-count--inline${excerpt.length >= MAX_EXCERPT_LENGTH ? ' create-essay-char-count--limit' : ''}`}>
              {excerpt.length} / {MAX_EXCERPT_LENGTH}
            </span>
          </div>

          <div className="create-essay-field" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <label className="create-essay-label" htmlFor="essay-content">正文</label>
            <textarea
              id="essay-content"
              className="xo-textarea create-essay-content-input"
              value={content}
              onChange={e => setContent(e.target.value.slice(0, MAX_CONTENT_LENGTH))}
              onWheel={e => e.stopPropagation()}
              placeholder=""
              maxLength={MAX_CONTENT_LENGTH}
            />
          </div>
        </div>

        <div className="create-essay-footer">
          <span className={`create-essay-char-count${content.length >= MAX_CONTENT_LENGTH ? ' create-essay-char-count--limit' : ''}`}>
            {content.length} / {MAX_CONTENT_LENGTH}
          </span>
          <div className="create-essay-actions">
            <button className="xo-btn-secondary create-essay-cancel-btn" onClick={handleClose}>
              取消
            </button>
            <button
              className="xo-btn-primary create-essay-submit-btn"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              发布随笔
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  )
}
