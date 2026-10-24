import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import VehicleCard from './VehicleCard'
import { makeVehicle, renderWithProviders } from '../test/utils'

describe('VehicleCard', () => {
  it('shows the make, model, category, price and stock', () => {
    renderWithProviders(<VehicleCard vehicle={makeVehicle()} onPurchase={vi.fn()} />)

    expect(screen.getByText('Toyota Camry')).toBeInTheDocument()
    // The category appears both as the subtitle and inside the placeholder.
    expect(screen.getByText('Sedan · 2024')).toBeInTheDocument()
    expect(screen.getByText('$25,999')).toBeInTheDocument()
    expect(screen.getByText('In stock · 10')).toBeInTheDocument()
  })

  it('calls onPurchase with the vehicle when the button is clicked', async () => {
    const onPurchase = vi.fn()
    const vehicle = makeVehicle()
    renderWithProviders(<VehicleCard vehicle={vehicle} onPurchase={onPurchase} />)

    await userEvent.click(screen.getByRole('button', { name: /purchase toyota camry/i }))

    expect(onPurchase).toHaveBeenCalledWith(vehicle)
  })

  it('disables the purchase button when stock is zero', () => {
    renderWithProviders(
      <VehicleCard vehicle={makeVehicle({ quantity: 0 })} onPurchase={vi.fn()} />,
    )

    const button = screen.getByRole('button', { name: /out of stock/i })
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('Out of stock')
  })

  it('does not fire onPurchase when out of stock', async () => {
    const onPurchase = vi.fn()
    renderWithProviders(
      <VehicleCard vehicle={makeVehicle({ quantity: 0 })} onPurchase={onPurchase} />,
    )

    await userEvent.click(screen.getByRole('button', { name: /out of stock/i })).catch(() => {})

    expect(onPurchase).not.toHaveBeenCalled()
  })

  it('shows a low-stock warning at three units or fewer', () => {
    renderWithProviders(
      <VehicleCard vehicle={makeVehicle({ quantity: 2 })} onPurchase={vi.fn()} />,
    )

    expect(screen.getByText('Low stock · 2')).toBeInTheDocument()
  })

  it('shows a busy state while its purchase is in flight', () => {
    renderWithProviders(
      <VehicleCard vehicle={makeVehicle()} onPurchase={vi.fn()} isPurchasing />,
    )

    const button = screen.getByRole('button', { name: /purchase toyota camry/i })
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent(/purchasing/i)
  })

  it('renders a placeholder instead of an image when there is no image_url', () => {
    renderWithProviders(<VehicleCard vehicle={makeVehicle()} onPurchase={vi.fn()} />)

    expect(screen.queryByRole('img', { name: 'Toyota Camry' })).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: /placeholder image/i })).toBeInTheDocument()
  })

  it('renders the real image when a url is present', () => {
    renderWithProviders(
      <VehicleCard
        vehicle={makeVehicle({ image_url: 'https://example.com/car.jpg' })}
        onPurchase={vi.fn()}
      />,
    )

    expect(screen.getByRole('img', { name: 'Toyota Camry' })).toHaveAttribute(
      'src',
      'https://example.com/car.jpg',
    )
  })

  it('links to the vehicle details page', () => {
    renderWithProviders(<VehicleCard vehicle={makeVehicle({ id: 7 })} onPurchase={vi.fn()} />)

    expect(screen.getByRole('link', { name: 'Toyota Camry' })).toHaveAttribute(
      'href',
      '/vehicles/7',
    )
  })
})
