import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Car, Loader2, LogIn } from 'lucide-react'

import ErrorMessage from '../components/ErrorMessage'
import { useAuth } from '../context/AuthContext'
import { extractErrorMessage } from '../services/apiClient'

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (isAuthenticated) {
    return <Navigate to={location.state?.from || '/'} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await login(email.trim(), password)
      navigate(location.state?.from || '/', { replace: true })
    } catch (requestError) {
      setError(extractErrorMessage(requestError, 'Could not sign in. Please check your details.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-50 px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900">
            <Car size={24} className="text-blue-400" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Apex Motors</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to manage and browse inventory.</p>
        </div>

        <div className="card p-6 sm:p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <ErrorMessage message={error} />

            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="input"
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="input"
              />
            </div>

            <button type="submit" disabled={busy} className="btn-dark w-full">
              {busy ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn size={16} aria-hidden="true" />
                  Sign in
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            No account yet?{' '}
            <Link to="/register" className="font-semibold text-blue-700 hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
