import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import VehicleForm from './VehicleForm'
import { makeVehicle, renderWithProviders } from '../test/utils'

function setup(props = {}) {
  const onSubmit = vi.fn()
  const onCancel = vi.fn()
  renderWithProviders(<VehicleForm onSubmit={onSubmit} onCancel={onCancel} {...props} />)
  return { onSubmit, onCancel }
}

describe('VehicleForm validation', () => {
  it('blocks submission and reports missing required fields', async () => {
    const { onSubmit } = setup()

    await userEvent.click(screen.getByRole('button', { name: /save vehicle/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('Make is required')).toBeInTheDocument()
    expect(screen.getByText('Model is required')).toBeInTheDocument()
    expect(screen.getByText('Price is required')).toBeInTheDocument()
  })

  it('rejects a price of zero', async () => {
    const { onSubmit } = setup()

    await userEvent.type(screen.getByLabelText(/make/i), 'Toyota')
    await userEvent.type(screen.getByLabelText(/model/i), 'Camry')
    await userEvent.type(screen.getByLabelText(/price/i), '0')
    await userEvent.click(screen.getByRole('button', { name: /save vehicle/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('Price must be greater than zero')).toBeInTheDocument()
  })

  it('rejects a negative quantity', async () => {
    const { onSubmit } = setup()

    await userEvent.type(screen.getByLabelText(/make/i), 'Toyota')
    await userEvent.type(screen.getByLabelText(/model/i), 'Camry')
    await userEvent.type(screen.getByLabelText(/price/i), '25000')
    const quantity = screen.getByLabelText(/quantity in stock/i)
    await userEvent.clear(quantity)
    await userEvent.type(quantity, '-2')
    await userEvent.click(screen.getByRole('button', { name: /save vehicle/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('Quantity cannot be negative')).toBeInTheDocument()
  })

  it('rejects an out-of-range year', async () => {
    const { onSubmit } = setup()

    await userEvent.type(screen.getByLabelText(/make/i), 'Toyota')
    await userEvent.type(screen.getByLabelText(/model/i), 'Camry')
    await userEvent.type(screen.getByLabelText(/price/i), '25000')
    await userEvent.type(screen.getByLabelText(/^year$/i), '1850')
    await userEvent.click(screen.getByRole('button', { name: /save vehicle/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/between 1900 and 2100/i)).toBeInTheDocument()
  })

  it('clears a field error once the field is corrected', async () => {
    setup()

    await userEvent.click(screen.getByRole('button', { name: /save vehicle/i }))
    expect(screen.getByText('Make is required')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/make/i), 'Toyota')

    expect(screen.queryByText('Make is required')).not.toBeInTheDocument()
  })
})

describe('VehicleForm submission', () => {
  it('sends a normalised payload to the API', async () => {
    const { onSubmit } = setup()

    await userEvent.type(screen.getByLabelText(/make/i), '  Honda  ')
    await userEvent.type(screen.getByLabelText(/model/i), 'Civic')
    await userEvent.selectOptions(screen.getByLabelText(/category/i), 'Hatchback')
    await userEvent.type(screen.getByLabelText(/price/i), '24499.5')
    const quantity = screen.getByLabelText(/quantity in stock/i)
    await userEvent.clear(quantity)
    await userEvent.type(quantity, '6')
    await userEvent.click(screen.getByRole('button', { name: /save vehicle/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      make: 'Honda',
      model: 'Civic',
      category: 'Hatchback',
      price: '24499.50',
      quantity: 6,
      year: null,
      description: null,
      image_url: null,
    })
  })

  it('pre-fills the form when editing an existing vehicle', () => {
    setup({ vehicle: makeVehicle(), submitLabel: 'Save changes' })

    expect(screen.getByLabelText(/make/i)).toHaveValue('Toyota')
    expect(screen.getByLabelText(/model/i)).toHaveValue('Camry')
    expect(screen.getByLabelText(/price/i)).toHaveValue(25999)
    expect(screen.getByLabelText(/quantity in stock/i)).toHaveValue(10)
  })

  it('shows a server-side error above the form', () => {
    setup({ serverError: 'Vehicle could not be saved' })

    expect(screen.getByRole('alert')).toHaveTextContent('Vehicle could not be saved')
  })

  it('shows server-side field errors next to the field', () => {
    setup({ serverFieldErrors: { price: 'Input should be greater than 0' } })

    expect(screen.getByText('Input should be greater than 0')).toBeInTheDocument()
  })

  it('calls onCancel without submitting', async () => {
    const { onSubmit, onCancel } = setup()

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onCancel).toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('disables both buttons while saving', () => {
    setup({ busy: true })

    expect(screen.getByRole('button', { name: /save vehicle/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
  })
})
