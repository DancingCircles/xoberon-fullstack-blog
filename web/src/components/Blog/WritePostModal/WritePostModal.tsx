import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { useBodyScrollLock } from '../../../hooks/scroll/useBodyScrollLock'
import { useToast } from '../../../hooks/social/useToast'
import { useAuth } from '../../../hooks/auth/useAuth'
import { useData } from '../../../hooks/auth/useData'
import { friendlyErrorMessage } from '../../../services/api'
import type { BlogCategory } from '../../../assets/data/types'
import MarkdownRenderer from '../../Common/MarkdownRenderer'
import './WritePostModal.css'

interface WritePostModalProps {
  isOpen: boolean
  onClose: () => void
}

const MAX_TAGS = 3
const MAX_TAG_LENGTH = 5

export default function WritePostModal({ isOpen, onClose }: WritePostModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const mouseDownTargetRef = useRef<EventTarget | null>(null)
  const { toast } = useToast()
  const { currentUser } = useAuth()
  const { addPost } = useData()

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    content: '',
    tags: ''
  })

  useBodyScrollLock(isOpen)

  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])

  const parseTags = useCallback((rawTags: string) => (
    rawTags
      .split(/[,，]/)
      .map(tag => tag.trim().replace(/\s+/g, ' '))
      .filter(Boolean)
  ), [])

  const normalizeTagsInput = useCallback((rawTags: string) => (
    parseTags(rawTags)
      .slice(0, MAX_TAGS)
      .map(tag => tag.slice(0, MAX_TAG_LENGTH))
      .join(', ')
  ), [parseTags])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    if (name === 'tags') {
      setFormData(prev => ({ ...prev, tags: normalizeTagsInput(value) }))
      return
    }
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser || isSubmitting) return
    if (!formData.title.trim()) { toast.info('请输入标题'); return }
    if (formData.title.trim().length > 30) { toast.info('标题不能超过 30 字符'); return }
    if (!formData.category) { toast.info('请选择分类'); return }
    if (!formData.content.trim()) { toast.info('请输入内容'); return }
    if (formData.content.trim().length < 20) { toast.info('内容至少 20 字'); return }
    if (formData.content.trim().length > 2000) { toast.info('内容不能超过 2000 字'); return }
    const tagList = parseTags(formData.tags)
    if (tagList.length > MAX_TAGS) { toast.info('标签最多 3 个'); return }
    if (tagList.some(t => t.length > MAX_TAG_LENGTH)) { toast.info('单个标签不能超过 5 个字'); return }

    setIsSubmitting(true)
    try {
      await addPost({
        title: formData.title.trim(),
        content: formData.content.trim(),
        category: formData.category as BlogCategory,
        tags: tagList,
      })
      setFormData({ title: '', category: '', content: '', tags: '' })
      toast.success('帖子已发布')
      timerRef.current = setTimeout(() => handleClose(), 800)
    } catch (err) {
      toast.error(friendlyErrorMessage(err, '发布失败，请稍后重试'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div
      className="write-modal-overlay"
      ref={overlayRef}
      onMouseDown={e => { mouseDownTargetRef.current = e.target }}
      onClick={e => { if (e.target === overlayRef.current && mouseDownTargetRef.current === overlayRef.current) handleClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Write new post"
    >
      <div
        className="write-modal-container"
        ref={containerRef}
        onClick={e => e.stopPropagation()}
      >
        <button className="write-modal-close" onClick={handleClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18" /><path d="M6 6L18 18" />
          </svg>
        </button>

        <div className="write-modal-header">
          <h2 className="write-modal-title">NEW POST</h2>
        </div>

        <form className="write-modal-form" onSubmit={handleSubmit}>
          <div className="write-mobile-tabs">
            <button
              type="button"
              className={`write-mobile-tab ${mobileTab === 'edit' ? 'write-mobile-tab--active' : ''}`}
              onClick={() => setMobileTab('edit')}
            >EDIT</button>
            <button
              type="button"
              className={`write-mobile-tab ${mobileTab === 'preview' ? 'write-mobile-tab--active' : ''}`}
              onClick={() => setMobileTab('preview')}
            >PREVIEW</button>
          </div>
          <div className={`write-form-grid write-form-grid--mobile-${mobileTab}`}>
            <div className="write-form-section">
              <div className="write-input-group">
                <label>TITLE</label>
                <input
                  type="text"
                  name="title"
                  className="xo-input"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="ENTER POST TITLE"
                  maxLength={30}
                  required
                />
                <span className="write-char-count">{formData.title.length}/30</span>
              </div>

              <div className="write-input-row">
                <div className="write-input-group">
                  <label>CATEGORY</label>
                  <select
                    name="category"
                    className="xo-select"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">SELECT</option>
                    <option value="Design">DESIGN</option>
                    <option value="Tech">TECH</option>
                    <option value="Culture">CULTURE</option>
                  </select>
                </div>
                <div className="write-input-group">
                  <label>TAGS</label>
                  <input
                    type="text"
                    name="tags"
                    className="xo-input"
                    value={formData.tags}
                    onChange={handleInputChange}
                    placeholder="TAG1, TAG2"
                    maxLength={60}
                  />
                </div>
              </div>

              <div className="write-input-group write-content-editor">
                <label>CONTENT (MARKDOWN)</label>
                <textarea
                  name="content"
                  className="xo-textarea"
                  value={formData.content}
                  onChange={e => setFormData(prev => ({ ...prev, content: e.target.value.slice(0, 2000) }))}
                  onWheel={e => e.stopPropagation()}
                  placeholder="# HELLO WORLD..."
                  maxLength={2000}
                  required
                />
                <span className="write-char-count">{formData.content.length}/2000</span>
              </div>
            </div>

            <div className="write-preview-section">
              <label>PREVIEW</label>
              <div className="write-preview-box" onWheel={e => e.stopPropagation()}>
                {formData.title || formData.content ? (
                  <div className="write-preview-content">
                    <div className="write-preview-header">
                      <span className="write-preview-category">{formData.category || 'Category'}</span>
                      <h1 className="write-preview-title">{formData.title || 'Post Title'}</h1>
                      <div className="write-preview-meta">
                        <span>{new Date().toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '')}</span>
                      </div>
                      {parseTags(formData.tags).length > 0 && (
                        <div className="write-preview-tags">
                          {parseTags(formData.tags).map((tag, idx) => (
                            <span key={`${tag}-${idx}`} className="write-preview-tag">#{tag}</span>
                          ))}
                        </div>
                      )}
                      <hr className="write-preview-divider" />
                    </div>
                    <MarkdownRenderer content={formData.content} preserveLineBreaks />
                  </div>
                ) : (
                  <div className="write-preview-placeholder">Preview will appear here...</div>
                )}
              </div>
            </div>
          </div>

          <div className="write-form-footer">
            <button type="button" className="xo-btn-secondary write-cancel-btn" onClick={handleClose}>CANCEL</button>
            <button type="submit" className="xo-btn-primary write-submit-btn">PUBLISH</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
