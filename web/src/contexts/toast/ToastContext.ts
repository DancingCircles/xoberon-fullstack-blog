import { createContext } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastItem {
  id: string
  type: ToastType
  message: string
  action?: ToastAction
}

interface ToastContextValue {
  toast: {
    success: (message: string, action?: ToastAction) => void
    error: (message: string, action?: ToastAction) => void
    warning: (message: string, action?: ToastAction) => void
    info: (message: string, action?: ToastAction) => void
  }
}

export const ToastContext = createContext<ToastContextValue | null>(null)
