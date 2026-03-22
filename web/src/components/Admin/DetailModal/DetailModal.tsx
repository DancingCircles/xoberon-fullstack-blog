import { type ReactNode, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useBodyScrollLock } from '../../../hooks/scroll/useBodyScrollLock'
import './DetailModal.css'

interface DetailModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  headerMeta?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

export default function DetailModal({
  isOpen,
  onClose,
  title,
  headerMeta,
  children,
  footer,
}: DetailModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const mouseDownTargetRef = useRef<EventTarget | null>(null)
  useBodyScrollLock(isOpen)

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])

  if (!isOpen) return null

  return createPortal(
    <div className="detail-modal__overlay" ref={overlayRef} onMouseDown={e => { mouseDownTargetRef.current = e.target }} onClick={e => { if (e.target === overlayRef.current && mouseDownTargetRef.current === overlayRef.current) handleClose() }}>
      <div
        className="detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={e => e.stopPropagation()}
      >
        <div className="detail-modal__header">
          {headerMeta && <div className="detail-modal__meta">{headerMeta}</div>}
          <button className="detail-modal__close" onClick={handleClose} aria-label="关闭">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <h2 className="detail-modal__title">{title}</h2>

        <div className="detail-modal__body">
          {children}
        </div>

        {footer && (
          <div className="detail-modal__footer">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
