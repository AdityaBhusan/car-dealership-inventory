import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/apiClient', async () => {
  const actual = await vi.importActual('../services/apiClient')
  return {
    ...actual,
    fetchVehicles: vi.fn(),
    searchVehicles: vi.fn(),
    purchaseVehicle: vi.fn(),
  }
})

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Jordan Price', email: 'jordan@example.com', role: 'user' },
    isAuthenticated: true,
    isAdmin: false,
    isRestoring: false,
  }),
}))

import DashboardPage from './DashboardPage'
import { fetchVehicles, purchaseVehicle, searchVehicles } from '../services/apiClient'
import { makeVehicle, renderWithProviders } from '../test/utils'

const INVENTORY = [
  makeVehicle({ id: 1, make: 'Toyota', model: 'Camry', price: '25000.00', quantity: 2 }),
  makeVehicle({
    id: 2,
    make: 'Tesla',
    model: 'Model 3',
    category: 'Electric',
    price: '45000.00',
    quantity: 0,
  }),
]

describe('DashboardPage', () => {
  beforeEach(() => {
    fetchVehicles.mockResolvedValue(INVENTORY)
    searchVehicles.mockResolvedValue(INVENTORY)
    purchaseVehicle.mockReset()
  })

  it('shows a loading state before the inventory arrives', () => {
    renderWithProviders(<DashboardPage />)

    expect(screen.getByText(/loading inventory/i)).toBeInTheDocument()
  })

  it('renders a card per vehicle from the API', async () => {
    renderWithProviders(<DashboardPage />)

    expect(await screen.findByText('Toyota Camry')).toBeInTheDocument()
    expect(screen.getByText('Tesla Model 3')).toBeInTheDocument()
  })

  it('derives the summary statistics from the real API rows', async () => {
    renderWithProviders(<DashboardPage />)
    await screen.findByText('Toyota Camry')

    // 2 models, 2 units in stock, 2 x 25000 = 50K value, 1 out of stock.
    // Scope to the summary region: "Out of stock" also appears on a card badge.
    const summary = within(screen.getByRole('region', { name: /inventory summary/i }))
    const statValue = (label) =>
      summary.getByText(label).closest('div').querySelector('p + p').textContent

    expect(statValue('Vehicle models')).toBe('2')
    expect(statValue('Units in stock')).toBe('2')
    expect(statValue('Inventory value')).toBe('$50K')
    expect(statValue('Out of stock')).toBe('1')
  })

  it('greets the signed-in user by first name', async () => {
    renderWithProviders(<DashboardPage />)

    expect(await screen.findByText(/welcome back, jordan/i)).toBeInTheDocument()
  })

  it('disables purchase for the out-of-stock vehicle only', async () => {
    renderWithProviders(<DashboardPage />)
    await screen.findByText('Toyota Camry')

    expect(screen.getByRole('button', { name: /purchase toyota camry/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /tesla model 3 is out of stock/i })).toBeDisabled()
  })

  it('updates the card and notifies on a successful purchase', async () => {
    purchaseVehicle.mockResolvedValue({ ...INVENTORY[0], quantity: 1 })
    renderWithProviders(<DashboardPage />)
    await screen.findByText('Toyota Camry')

    await userEvent.click(screen.getByRole('button', { name: /purchase toyota camry/i }))

    expect(purchaseVehicle).toHaveBeenCalledWith(1)
    expect(await screen.findByRole('status')).toHaveTextContent(
      /purchased toyota camry. 1 left in stock/i,
    )
    await waitFor(() => expect(screen.getByText('Low stock · 1')).toBeInTheDocument())
  })

  it('surfaces a backend rejection without changing the stock shown', async () => {
    purchaseVehicle.mockRejectedValue({
      response: { status: 409, data: { detail: 'Vehicle is out of stock' } },
    })
    renderWithProviders(<DashboardPage />)
    await screen.findByText('Toyota Camry')

    await userEvent.click(screen.getByRole('button', { name: /purchase toyota camry/i }))

    expect(await screen.findByRole('status')).toHaveTextContent('Vehicle is out of stock')
    expect(screen.getByText('Low stock · 2')).toBeInTheDocument()
  })

  it('asks the backend to filter when the search box changes', async () => {
    renderWithProviders(<DashboardPage />)
    await screen.findByText('Toyota Camry')
    searchVehicles.mockResolvedValue([INVENTORY[1]])

    await userEvent.type(screen.getByLabelText(/search/i), 'tesla')

    await waitFor(() =>
      expect(searchVehicles).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'tesla' }),
      ),
    )
    await waitFor(() => expect(screen.queryByText('Toyota Camry')).not.toBeInTheDocument())
  })

  it('offers to clear filters when nothing matches', async () => {
    renderWithProviders(<DashboardPage />)
    await screen.findByText('Toyota Camry')
    searchVehicles.mockResolvedValue([])

    await userEvent.type(screen.getByLabelText(/search/i), 'ferrari')

    expect(await screen.findByText(/no vehicles match those filters/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument()
  })

  it('populates the make and category filters from the inventory', async () => {
    renderWithProviders(<DashboardPage />)
    await screen.findByText('Toyota Camry')

    const makeFilter = screen.getByLabelText(/make/i)
    expect(within(makeFilter).getByRole('option', { name: 'Tesla' })).toBeInTheDocument()
    expect(within(makeFilter).getByRole('option', { name: 'Toyota' })).toBeInTheDocument()
  })

  it('reports a failure to load the inventory', async () => {
    fetchVehicles.mockRejectedValue({ message: 'Network Error' })
    renderWithProviders(<DashboardPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot reach the server/i)
  })

  it('shows an empty state when there is no inventory at all', async () => {
    fetchVehicles.mockResolvedValue([])
    renderWithProviders(<DashboardPage />)

    expect(await screen.findByText(/the showroom is empty/i)).toBeInTheDocument()
  })
})
