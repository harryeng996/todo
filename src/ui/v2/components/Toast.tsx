import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ToastContext, type ToastOptions } from './toastContext.ts'

interface LiveToast extends ToastOptions {
  id: number
}

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<LiveToast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const show = useCallback((toast: ToastOptions) => {
    // Newest on top; at most three at a time.
    setToasts((list) => [...list.slice(-2), { ...toast, id: nextId++ }])
  }, [])

  return (
    <ToastContext value={show}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext>
  )
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: LiveToast
  onDismiss: (id: number) => void
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration ?? 4500)
    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  return (
    <motion.div
      layout
      className={`toast toast--${toast.tone ?? 'default'}`}
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 500, damping: 36 }}
    >
      <span>{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          className="toast__action"
          onClick={() => {
            toast.action!.run()
            onDismiss(toast.id)
          }}
        >
          {toast.action.label}
        </button>
      )}
    </motion.div>
  )
}
