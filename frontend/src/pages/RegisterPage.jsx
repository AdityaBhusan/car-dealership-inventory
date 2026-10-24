import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Car, Loader2, UserPlus } from 'lucide-react'

import ErrorMessage from '../components/ErrorMessage'
import { useAuth } from '../context/AuthContext'
import { extractErrorMessage, extractFieldErrors } from '../services/apiClient'

const MIN_PASSWORD_LENGTH = 8

export default function RegisterPage() {
  const { register, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [values, setValues] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (isAuthenticated) return <Navigate to="/" replace />

  const update = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const validate = () => {
    const found = {}
    if (!values.name.trim()) found.name = 'Please enter your name'
    if (!values.email.trim()) found.email = 'Please enter your email address'
    if (values.password.length < MIN_PASSWORD_LENGTH) {
      found.password = `Use at least ${MIN_PASSWORD_LENGTH} characters`
    }
    if (values.confirm !== values.password) found.confirm = 'Passwords do not match'
    return found
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)

    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setBusy(true)
    try {
      await register(values.name.trim(), values.email.trim(), values.password)
      navigate('/', { replace: true })
    } catch (requestError) {
      setErrors(extractFieldErrors(requestError))
      setError(extractErrorMessage(requestError, 'Could not create your account.'))
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
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            New accounts can browse and purchase inventory.
          </p>
        </div>

        <div className="card p-6 sm:p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <ErrorMessage message={error} />

            <div>
              <label htmlFor="name" className="label">
                Full name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={values.name}
                onChange={update('name')}
                placeholder="John Doe"
                aria-invalid={Boolean(errors.name)}
                className={`input ${errors.name ? 'input-error' : ''}`}
              />
              {errors.name && <p className="field-error">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={update('email')}
                placeholder="you@example.com"
                aria-invalid={Boolean(errors.email)}
                className={`input ${errors.email ? 'input-error' : ''}`}
              />
              {errors.email && <p className="field-error">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={values.password}
                onChange={update('password')}
                placeholder="At least 8 characters"
                aria-invalid={Boolean(errors.password)}
                className={`input ${errors.password ? 'input-error' : ''}`}
              />
              {errors.password && <p className="field-error">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="confirm" className="label">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={values.confirm}
                onChange={update('confirm')}
                placeholder="Re-enter your password"
                aria-invalid={Boolean(errors.confirm)}
                className={`input ${errors.confirm ? 'input-error' : ''}`}
              />
              {errors.confirm && <p className="field-error">{errors.confirm}</p>}
            </div>

            <button type="submit" disabled={busy} className="btn-dark w-full">
              {busy ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  Creating account…
                </>
              ) : (
                <>
                  <UserPlus size={16} aria-hidden="true" />
                  Create account
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-blue-700 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
