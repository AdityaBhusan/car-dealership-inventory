import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

const TONES = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  info: 'border-slate-200 bg-white text-slate-900',
}

const ICON_TONES = {
  success: 'text-emerald-600',
  error: 'text-red-600',
  info: 'text-blue-600',
}

let nextId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (message, variant = 'info', duration = 4000) => {
      const id = ++nextId
      setToasts((current) => [...current, { id, message, variant }])
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration)
      }
      return id
    },
    [dismiss],
  )

  const value = useMemo(
    () => ({
      notify,
      notifySuccess: (message) => notify(message, 'success'),
      notifyError: (message) => notify(message, 'error', 6000),
      dismiss,
    }),
    [notify, dismiss],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center
                   gap-2 sm:inset-x-auto sm:right-6 sm:items-end"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const Icon = ICONS[toast.variant] ?? Info
          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex w-full max-w-sm animate-fade-in items-start gap-3
                          rounded-xl border px-4 py-3 shadow-card-hover ${TONES[toast.variant]}`}
            >
              <Icon size={18} className={`mt-0.5 shrink-0 ${ICON_TONES[toast.variant]}`} />
              <p className="flex-1 text-sm font-medium">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
                aria-label="Dismiss notification"
              >
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used inside a ToastProvider')
  }
  return context
}
