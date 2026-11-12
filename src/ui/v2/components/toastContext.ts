import { createContext, useContext } from 'react'

export interface ToastOptions {
  message: string
  /** e.g. Undo */
  action?: { label: string; run: () => void }
  tone?: 'default' | 'success' | 'danger'
  /** ms; default 4500 */
  duration?: number
}

export const ToastContext = createContext<
  ((toast: ToastOptions) => void) | null
>(null)

export function useToast(): (toast: ToastOptions) => void {
  const show = useContext(ToastContext)
  if (!show) throw new Error('useToast must be used inside <ToastProvider>')
  return show
}
