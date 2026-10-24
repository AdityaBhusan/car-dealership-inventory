import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import {
  fetchCurrentUser,
  getAccessToken,
  loginRequest,
  registerRequest,
  setAccessToken,
  setUnauthorizedHandler,
} from '../services/apiClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // "Restoring" until we know whether the stored token is still valid.
  const [isRestoring, setIsRestoring] = useState(Boolean(getAccessToken()))

  const logout = useCallback(() => {
    setAccessToken(null)
    setUser(null)
  }, [])

  // The API client calls this when the backend rejects our token.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null))
    return () => setUnauthorizedHandler(null)
  }, [])

  // On first load, verify any token left over from a page refresh.
  useEffect(() => {
    if (!getAccessToken()) return

    let cancelled = false
    fetchCurrentUser()
      .then((currentUser) => {
        if (!cancelled) setUser(currentUser)
      })
      .catch(() => {
        if (!cancelled) {
          setAccessToken(null)
          setUser(null)
        }
      })
      .finally(() => {
        if (!cancelled) setIsRestoring(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const { access_token: token } = await loginRequest(email, password)
    setAccessToken(token)
    try {
      const currentUser = await fetchCurrentUser()
      setUser(currentUser)
      return currentUser
    } catch (error) {
      setAccessToken(null)
      throw error
    }
  }, [])

  const register = useCallback(
    async (name, email, password) => {
      await registerRequest(name, email, password)
      return login(email, password)
    },
    [login],
  )

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      isRestoring,
      login,
      register,
      logout,
    }),
    [user, isRestoring, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }
  return context
}
