import { useState } from 'react'
import { Loader2 } from 'lucide-react'

import ErrorMessage from './ErrorMessage'

const CATEGORIES = ['Sedan', 'SUV', 'Hatchback', 'Coupe', 'Electric', 'Truck', 'Van']

const EMPTY = {
  make: '',
  model: '',
  category: 'Sedan',
  price: '',
  quantity: '0',
  year: '',
  description: '',
  image_url: '',
}

function toFormState(vehicle) {
  if (!vehicle) return EMPTY
  return {
    make: vehicle.make ?? '',
    model: vehicle.model ?? '',
    category: vehicle.category ?? 'Sedan',
    price: vehicle.price != null ? String(vehicle.price) : '',
    quantity: vehicle.quantity != null ? String(vehicle.quantity) : '0',
    year: vehicle.year != null ? String(vehicle.year) : '',
    description: vehicle.description ?? '',
    image_url: vehicle.image_url ?? '',
  }
}

/** Client-side checks mirror the backend rules; the backend remains authoritative. */
function validate(values) {
  const errors = {}

  if (!values.make.trim()) errors.make = 'Make is required'
  if (!values.model.trim()) errors.model = 'Model is required'
  if (!values.category.trim()) errors.category = 'Category is required'

  const price = Number(values.price)
  if (values.price === '' || Number.isNaN(price)) {
    errors.price = 'Price is required'
  } else if (price <= 0) {
    errors.price = 'Price must be greater than zero'
  }

  const quantity = Number(values.quantity)
  if (values.quantity === '' || !Number.isInteger(quantity)) {
    errors.quantity = 'Quantity must be a whole number'
  } else if (quantity < 0) {
    errors.quantity = 'Quantity cannot be negative'
  }

  if (values.year !== '') {
    const year = Number(values.year)
    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      errors.year = 'Enter a year between 1900 and 2100'
    }
  }

  return errors
}

/** Only send fields the API accepts, with empty optionals as null. */
function toPayload(values) {
  return {
    make: values.make.trim(),
    model: values.model.trim(),
    category: values.category.trim(),
    price: Number(values.price).toFixed(2),
    quantity: Number(values.quantity),
    year: values.year === '' ? null : Number(values.year),
    description: values.description.trim() === '' ? null : values.description.trim(),
    image_url: values.image_url.trim() === '' ? null : values.image_url.trim(),
  }
}

export default function VehicleForm({
  vehicle = null,
  onSubmit,
  onCancel,
  submitLabel = 'Save vehicle',
  serverError = null,
  serverFieldErrors = {},
  busy = false,
}) {
  const [values, setValues] = useState(() => toFormState(vehicle))
  const [errors, setErrors] = useState({})

  const fieldError = (name) => errors[name] || serverFieldErrors[name]

  const update = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    onSubmit(toPayload(values))
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <ErrorMessage message={serverError} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="vehicle-make" className="label">
            Make *
          </label>
          <input
            id="vehicle-make"
            value={values.make}
            onChange={update('make')}
            placeholder="Toyota"
            aria-invalid={Boolean(fieldError('make'))}
            className={`input ${fieldError('make') ? 'input-error' : ''}`}
          />
          {fieldError('make') && <p className="field-error">{fieldError('make')}</p>}
        </div>

        <div>
          <label htmlFor="vehicle-model" className="label">
            Model *
          </label>
          <input
            id="vehicle-model"
            value={values.model}
            onChange={update('model')}
            placeholder="Camry"
            aria-invalid={Boolean(fieldError('model'))}
            className={`input ${fieldError('model') ? 'input-error' : ''}`}
          />
          {fieldError('model') && <p className="field-error">{fieldError('model')}</p>}
        </div>

        <div>
          <label htmlFor="vehicle-category" className="label">
            Category *
          </label>
          <select
            id="vehicle-category"
            value={values.category}
            onChange={update('category')}
            className={`input ${fieldError('category') ? 'input-error' : ''}`}
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          {fieldError('category') && <p className="field-error">{fieldError('category')}</p>}
        </div>

        <div>
          <label htmlFor="vehicle-year" className="label">
            Year
          </label>
          <input
            id="vehicle-year"
            type="number"
            min="1900"
            max="2100"
            value={values.year}
            onChange={update('year')}
            placeholder="2024"
            aria-invalid={Boolean(fieldError('year'))}
            className={`input ${fieldError('year') ? 'input-error' : ''}`}
          />
          {fieldError('year') && <p className="field-error">{fieldError('year')}</p>}
        </div>

        <div>
          <label htmlFor="vehicle-price" className="label">
            Price (USD) *
          </label>
          <input
            id="vehicle-price"
            type="number"
            min="0.01"
            step="0.01"
            value={values.price}
            onChange={update('price')}
            placeholder="25000.00"
            aria-invalid={Boolean(fieldError('price'))}
            className={`input ${fieldError('price') ? 'input-error' : ''}`}
          />
          {fieldError('price') && <p className="field-error">{fieldError('price')}</p>}
        </div>

        <div>
          <label htmlFor="vehicle-quantity" className="label">
            Quantity in stock *
          </label>
          <input
            id="vehicle-quantity"
            type="number"
            min="0"
            step="1"
            value={values.quantity}
            onChange={update('quantity')}
            aria-invalid={Boolean(fieldError('quantity'))}
            className={`input ${fieldError('quantity') ? 'input-error' : ''}`}
          />
          {fieldError('quantity') && <p className="field-error">{fieldError('quantity')}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="vehicle-description" className="label">
          Description
        </label>
        <textarea
          id="vehicle-description"
          rows={3}
          value={values.description}
          onChange={update('description')}
          placeholder="Short sales blurb shown on the inventory card."
          className="input resize-y"
        />
      </div>

      <div>
        <label htmlFor="vehicle-image-url" className="label">
          Image URL
        </label>
        <input
          id="vehicle-image-url"
          type="url"
          value={values.image_url}
          onChange={update('image_url')}
          placeholder="Leave empty to use the styled placeholder"
          className="input"
        />
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={busy} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={busy} className="btn-primary">
          {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
