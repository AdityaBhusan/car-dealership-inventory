import { Loader2 } from 'lucide-react'

export default function LoadingSpinner({ label = 'Loading…', size = 20, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 text-slate-500 ${className}`} role="status">
      <Loader2 size={size} className="animate-spin" aria-hidden="true" />
      <span className="text-sm font-medium">{label}</span>
    </span>
  )
}

export function FullPageSpinner({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <LoadingSpinner label={label} size={24} />
    </div>
  )
}
