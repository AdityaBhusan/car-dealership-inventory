import axios from 'axios'

/**
 * Centralised API client.
 *
 * Token handling, documented honestly:
 * the access token lives in a module variable (in memory) and is mirrored to
 * sessionStorage so a page refresh does not log the user out. sessionStorage is
 * readable by any JavaScript running on this origin, so this is NOT immune to
 * XSS — it is a pragmatic choice for an assessment SPA. A production system
 * should keep the token in an httpOnly, Secure, SameSite cookie issued by the
 * backend, with CSRF protection, so that page scripts can never read it.
 */

const STORAGE_KEY = 'dealership.accessToken'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

let accessToken = readStoredToken()
let onUnauthorized = null

function readStoredToken() {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY)
  } catch {
    // Private mode or storage disabled: in-memory only.
    return null
  }
}

export function getAccessToken() {
  return accessToken
}

export function setAccessToken(token) {
  accessToken = token || null
  try {
    if (accessToken) {
      window.sessionStorage.setItem(STORAGE_KEY, accessToken)
    } else {
      window.sessionStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Ignore storage failures; the in-memory token still works for this tab.
  }
}

/** Registers the callback used when the backend rejects our token. */
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url = error.config?.url || ''
    // An expired or revoked token: drop it and let the app send the user to
    // the login page. A failed login attempt is not a session expiry.
    if (status === 401 && !url.includes('/api/auth/login')) {
      setAccessToken(null)
      onUnauthorized?.()
    }
    return Promise.reject(error)
  },
)

/** Turns an axios/FastAPI error into a single human-readable sentence. */
export function extractErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error?.response) {
    return error?.message === 'Network Error'
      ? 'Cannot reach the server. Is the backend running?'
      : fallback
  }

  const { status, data } = error.response
  const detail = data?.detail

  if (typeof detail === 'string') return detail

  // FastAPI validation errors arrive as a list of {loc, msg, type}.
  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((item) => {
        const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : null
        const message = item.msg?.replace(/^Value error,\s*/i, '') || 'is invalid'
        return field && field !== 'body' ? `${field}: ${message}` : message
      })
      .join('; ')
  }

  if (status === 401) return 'Your session has expired. Please sign in again.'
  if (status === 403) return 'You do not have permission to do that.'
  if (status === 404) return 'That item no longer exists.'
  return fallback
}

/** Maps FastAPI validation errors to { fieldName: message } for forms. */
export function extractFieldErrors(error) {
  const detail = error?.response?.data?.detail
  if (!Array.isArray(detail)) return {}

  return detail.reduce((fields, item) => {
    const name = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : null
    if (name && name !== 'body' && !fields[name]) {
      fields[name] = item.msg?.replace(/^Value error,\s*/i, '') || 'is invalid'
    }
    return fields
  }, {})
}

// --- auth ---------------------------------------------------------------

export async function loginRequest(email, password) {
  const { data } = await api.post('/api/auth/login', { email, password })
  return data
}

export async function registerRequest(name, email, password) {
  const { data } = await api.post('/api/auth/register', { name, email, password })
  return data
}

export async function fetchCurrentUser() {
  const { data } = await api.get('/api/auth/me')
  return data
}

// --- vehicles -----------------------------------------------------------

export async function fetchVehicles() {
  const { data } = await api.get('/api/vehicles')
  return data
}

export async function searchVehicles(filters = {}) {
  const params = {}
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' && value !== null && value !== undefined) {
      params[key] = value
    }
  }
  const { data } = await api.get('/api/vehicles/search', { params })
  return data
}

export async function fetchVehicle(id) {
  const { data } = await api.get(`/api/vehicles/${id}`)
  return data
}

export async function createVehicle(payload) {
  const { data } = await api.post('/api/vehicles', payload)
  return data
}

export async function updateVehicle(id, payload) {
  const { data } = await api.put(`/api/vehicles/${id}`, payload)
  return data
}

export async function deleteVehicle(id) {
  await api.delete(`/api/vehicles/${id}`)
}

export async function purchaseVehicle(id) {
  const { data } = await api.post(`/api/vehicles/${id}/purchase`)
  return data
}

export async function restockVehicle(id, quantity) {
  const { data } = await api.post(`/api/vehicles/${id}/restock`, { quantity })
  return data
}
