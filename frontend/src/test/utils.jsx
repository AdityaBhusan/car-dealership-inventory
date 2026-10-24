import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { ToastProvider } from '../context/ToastContext'

/** Renders a component inside the providers the app supplies at runtime. */
export function renderWithProviders(ui, { route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>{ui}</ToastProvider>
    </MemoryRouter>,
  )
}

export function makeVehicle(overrides = {}) {
  return {
    id: 1,
    make: 'Toyota',
    model: 'Camry',
    category: 'Sedan',
    price: '25999.00',
    quantity: 10,
    year: 2024,
    description: 'Dependable mid-size sedan.',
    image_url: null,
    created_at: '2026-10-24T12:00:00Z',
    updated_at: '2026-10-24T12:00:00Z',
    ...overrides,
  }
}
