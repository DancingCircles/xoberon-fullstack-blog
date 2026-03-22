import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Toast from '../../components/Common/Toast/Toast'
import { ToastContext } from './ToastContext'
import type { ToastType, ToastAction, ToastItem } from './ToastContext'

const TOAST_DURATION = 3000
const TOAST_DURATION_WITH_ACTION = 6000
const MAX_TOASTS = 5

interface ToastProviderProps {
  children: React.ReactNode
}

export default function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    timersRef.current.delete(id)
  }, [])

  const addToast = useCallback((type: ToastType, message: string, action?: ToastAction) => {
    const id = String(++idRef.current)
    setToasts(prev => {
      const next = [...prev, { id, type, message, action }]
      return next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next
    })
    const duration = action ? TOAST_DURATION_WITH_ACTION : TOAST_DURATION
    timersRef.current.set(id, setTimeout(() => removeToast(id), duration))
  }, [removeToast])

  useEffect(() => {
    const timers = timersRef.current
    return () => timers.forEach(t => clearTimeout(t))
  }, [])

  const toast = useMemo(() => ({
    success: (msg: string, action?: ToastAction) => addToast('success', msg, action),
    error: (msg: string, action?: ToastAction) => addToast('error', msg, action),
    warning: (msg: string, action?: ToastAction) => addToast('warning', msg, action),
    info: (msg: string, action?: ToastAction) => addToast('info', msg, action),
  }), [addToast])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="toast-container" aria-live="polite">
          {toasts.map(t => (
            <Toast key={t.id} item={t} onDismiss={removeToast} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}
