import { PackageOpen } from 'lucide-react'

export default function EmptyState({
  title = 'Nothing to show',
  message,
  icon: Icon = PackageOpen,
  action = null,
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <Icon size={22} className="text-slate-500" aria-hidden="true" />
      </span>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {message && <p className="max-w-sm text-sm text-slate-500">{message}</p>}
      {action}
    </div>
  )
}
