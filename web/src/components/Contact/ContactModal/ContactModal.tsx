import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { useBodyScrollLock } from '../../../hooks/scroll/useBodyScrollLock'
import { useToast } from '../../../hooks/social/useToast'
import { submitContact } from '../../../services/mockRuntime'
import FormSuccessOverlay from '../../Common/FormSuccessOverlay'
import './ContactModal.css'

interface ContactModalProps {
  isOpen: boolean
  onClose: () => void
}

interface FormValues {
  name: string
  email: string
  message: string
}

interface FormErrors {
  name?: string
  email?: string
  message?: string
}

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [showSuccess, setShowSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [values, setValues] = useState<FormValues>({ name: '', email: '', message: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const mouseDownTargetRef = useRef<EventTarget | null>(null)
  const { toast } = useToast()

  useBodyScrollLock(isOpen)

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {}
    if (!values.name.trim()) newErrors.name = 'REQUIRED'
    if (!values.email.trim()) {
      newErrors.email = 'REQUIRED'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      newErrors.email = 'INVALID EMAIL'
    }
    if (!values.message.trim()) newErrors.message = 'REQUIRED'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [values])

  const handleClose = useCallback(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        setValues({ name: '', email: '', message: '' })
        setErrors({})
        setShowSuccess(false)
        onClose()
      }
    })
    tl.to(contentRef.current, {
      scale: 0.2, rotation: -15, y: 50, opacity: 0,
      duration: 0.4, ease: 'back.in(1.5)'
    })
    tl.to(overlayRef.current, { opacity: 0, duration: 0.2 }, '-=0.1')
  }, [onClose])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    try {
      await submitContact({ name: values.name, email: values.email, message: values.message })
      setShowSuccess(true)
    } catch {
      toast.error('发送失败，请稍后重试')
    } finally {
      setIsSubmitting(false)
    }
  }, [validate, values, toast])

  useEffect(() => {
    if (isOpen) {
      const tl = gsap.timeline()
      gsap.set(overlayRef.current, { opacity: 0 })
      gsap.set(contentRef.current, { opacity: 0, scale: 0.2, rotation: -15, transformOrigin: 'bottom right', y: 50 })
      tl.to(overlayRef.current, { opacity: 1, duration: 0.3, ease: 'power2.out' })
      tl.to(contentRef.current, { opacity: 1, scale: 1, rotation: 0, y: 0, duration: 0.6, ease: 'back.out(1.5)' }, '-=0.15')

      return () => { tl.kill() }
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])

  if (!isOpen) return null

  return createPortal(
    <div className="contact-modal-overlay" ref={overlayRef} role="dialog" aria-modal="true" aria-label="Contact form" onMouseDown={e => { mouseDownTargetRef.current = e.target }} onClick={e => { if (e.target === overlayRef.current && mouseDownTargetRef.current === overlayRef.current) handleClose() }}>
      <div className="contact-modal-container" ref={contentRef} onClick={e => e.stopPropagation()}>
        <button className="contact-modal-close" onClick={handleClose} aria-label="Close modal">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <h2 className="contact-modal-title">REACH OUT</h2>

        <form className="xo-form contact-modal-form" onSubmit={handleSubmit} noValidate>
          <div className="xo-form-row">
            <div className="xo-form-group">
              <label htmlFor="name" className="xo-sr-only">FULL NAME</label>
              <input
                type="text"
                id="name"
                placeholder="FULL NAME"
                className={`xo-input${errors.name ? ' xo-input--error' : ''}`}
                value={values.name}
                maxLength={50}
                onChange={e => { setValues(v => ({ ...v, name: e.target.value })); setErrors(er => ({ ...er, name: undefined })) }}
              />
              {errors.name && <span className="xo-field-error">{errors.name}</span>}
            </div>
            <div className="xo-form-group">
              <label htmlFor="email" className="xo-sr-only">EMAIL</label>
              <input
                type="email"
                id="email"
                placeholder="EMAIL"
                className={`xo-input${errors.email ? ' xo-input--error' : ''}`}
                value={values.email}
                maxLength={100}
                onChange={e => { setValues(v => ({ ...v, email: e.target.value })); setErrors(er => ({ ...er, email: undefined })) }}
              />
              {errors.email && <span className="xo-field-error">{errors.email}</span>}
            </div>
          </div>

          <div className="xo-form-group">
            <label htmlFor="message" className="xo-sr-only">MESSAGE</label>
            <textarea
              id="message"
              placeholder="MESSAGE"
              className={`xo-textarea${errors.message ? ' xo-input--error' : ''}`}
              rows={6}
              maxLength={1000}
              value={values.message}
              onChange={e => { setValues(v => ({ ...v, message: e.target.value })); setErrors(er => ({ ...er, message: undefined })) }}
            />
            {errors.message && <span className="xo-field-error">{errors.message}</span>}
          </div>

          <button type="submit" className="xo-btn-primary form-submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'SENDING...' : 'SEND IT'}
            <FormSuccessOverlay
              isVisible={showSuccess}
              text="SENT!"
              onComplete={() => {
                setShowSuccess(false)
                handleClose()
              }}
            />
          </button>
        </form>

        <div className="contact-modal-footer">
          <div className="contact-info-item">
            <span className="contact-name">X</span>
          </div>
          <div className="contact-info-item">
            <a href="mailto:HELLO@EXAMPLE.COM">HELLO@EXAMPLE.COM</a>
          </div>
          <div className="contact-info-item">
            <a href="tel:+10000000000">+1 000 000 0000</a>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
