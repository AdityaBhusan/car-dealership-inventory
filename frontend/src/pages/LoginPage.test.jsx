import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const login = vi.fn()
const navigate = vi.fn()

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login, isAuthenticated: false }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

import LoginPage from './LoginPage'
import { renderWithProviders } from '../test/utils'

describe('LoginPage', () => {
  beforeEach(() => {
    login.mockReset()
    navigate.mockReset()
  })

  it('submits the typed credentials', async () => {
    login.mockResolvedValue({ id: 1, role: 'user' })
    renderWithProviders(<LoginPage />)

    await userEvent.type(screen.getByLabelText(/email/i), 'jordan@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'CustomerPass123!')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(login).toHaveBeenCalledWith('jordan@example.com', 'CustomerPass123!')
  })

  it('navigates to the dashboard after a successful sign in', async () => {
    login.mockResolvedValue({ id: 1, role: 'user' })
    renderWithProviders(<LoginPage />)

    await userEvent.type(screen.getByLabelText(/email/i), 'jordan@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'CustomerPass123!')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(navigate).toHaveBeenCalledWith('/', { replace: true })
  })

  it('shows the backend message when the credentials are wrong', async () => {
    login.mockRejectedValue({
      response: { status: 401, data: { detail: 'Incorrect email or password' } },
    })
    renderWithProviders(<LoginPage />)

    await userEvent.type(screen.getByLabelText(/email/i), 'jordan@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('trims whitespace from the email before sending it', async () => {
    login.mockResolvedValue({ id: 1 })
    renderWithProviders(<LoginPage />)

    await userEvent.type(screen.getByLabelText(/email/i), '  jordan@example.com  ')
    await userEvent.type(screen.getByLabelText(/password/i), 'CustomerPass123!')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(login).toHaveBeenCalledWith('jordan@example.com', 'CustomerPass123!')
  })

  it('offers a link to registration', () => {
    renderWithProviders(<LoginPage />)

    expect(screen.getByRole('link', { name: /create one/i })).toHaveAttribute('href', '/register')
  })
})
