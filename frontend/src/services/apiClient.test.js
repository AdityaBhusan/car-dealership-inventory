import { beforeEach, describe, expect, it } from 'vitest'

import {
  extractErrorMessage,
  extractFieldErrors,
  getAccessToken,
  setAccessToken,
} from './apiClient'

describe('extractErrorMessage', () => {
  it('uses a plain string detail from FastAPI', () => {
    const error = { response: { status: 409, data: { detail: 'Vehicle is out of stock' } } }

    expect(extractErrorMessage(error)).toBe('Vehicle is out of stock')
  })

  it('summarises a FastAPI validation error list', () => {
    const error = {
      response: {
        status: 422,
        data: {
          detail: [
            { loc: ['body', 'price'], msg: 'Input should be greater than 0' },
            { loc: ['body', 'make'], msg: 'Value error, must not be blank' },
          ],
        },
      },
    }

    const message = extractErrorMessage(error)

    expect(message).toContain('price: Input should be greater than 0')
    expect(message).toContain('make: must not be blank')
  })

  it('explains a network failure in plain language', () => {
    expect(extractErrorMessage({ message: 'Network Error' })).toBe(
      'Cannot reach the server. Is the backend running?',
    )
  })

  it('falls back to a status-specific message when there is no detail', () => {
    expect(extractErrorMessage({ response: { status: 403, data: {} } })).toBe(
      'You do not have permission to do that.',
    )
  })

  it('uses the supplied fallback for an unexpected shape', () => {
    expect(extractErrorMessage({ response: { status: 500, data: {} } }, 'Boom')).toBe('Boom')
  })
})

describe('extractFieldErrors', () => {
  it('maps validation errors onto form field names', () => {
    const error = {
      response: {
        data: {
          detail: [
            { loc: ['body', 'quantity'], msg: 'Input should be greater than or equal to 0' },
          ],
        },
      },
    }

    expect(extractFieldErrors(error)).toEqual({
      quantity: 'Input should be greater than or equal to 0',
    })
  })

  it('returns an empty object when there is nothing to map', () => {
    expect(extractFieldErrors({ response: { data: { detail: 'nope' } } })).toEqual({})
    expect(extractFieldErrors(undefined)).toEqual({})
  })
})

describe('access token handling', () => {
  beforeEach(() => {
    setAccessToken(null)
  })

  it('stores and returns the token', () => {
    setAccessToken('a.b.c')

    expect(getAccessToken()).toBe('a.b.c')
  })

  it('mirrors the token to sessionStorage, not localStorage', () => {
    setAccessToken('a.b.c')

    expect(window.sessionStorage.getItem('dealership.accessToken')).toBe('a.b.c')
    expect(window.localStorage.getItem('dealership.accessToken')).toBeNull()
  })

  it('clears the stored token on sign out', () => {
    setAccessToken('a.b.c')

    setAccessToken(null)

    expect(getAccessToken()).toBeNull()
    expect(window.sessionStorage.getItem('dealership.accessToken')).toBeNull()
  })
})
