import { Link } from 'react-router-dom'
import { Compass, Home } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900">
        <Compass size={26} className="text-blue-400" aria-hidden="true" />
      </span>
      <p className="mt-6 text-sm font-bold uppercase tracking-widest text-slate-400">Error 404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        That page does not exist. It may have been moved, or the link may be out of date.
      </p>
      <Link to="/" className="btn-dark mt-8">
        <Home size={16} aria-hidden="true" />
        Back to inventory
      </Link>
    </div>
  )
}
