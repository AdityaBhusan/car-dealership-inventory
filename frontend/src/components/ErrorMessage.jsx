import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function ErrorMessage({ message, onRetry = null, className = '' }) {
  if (!message) return null

  return (
    <div
      role="alert"
      className={`flex flex-wrap items-start gap-3 rounded-lg border border-red-200 bg-red-50
                  px-4 py-3 ${className}`}
    >
      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" aria-hidden="true" />
      <p className="flex-1 text-sm font-medium text-red-800">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-700
                     underline-offset-2 hover:underline"
        >
          <RefreshCw size={14} aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  )
}
