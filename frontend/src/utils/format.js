/**
 * Prices arrive from the API as decimal strings (e.g. "25999.00") so no
 * precision is lost in JSON. Convert only at the moment of display.
 */

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const currencyWithCents = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

const compactCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

/**
 * Number(null) and Number('') are both 0, which would render a missing price
 * as "$0". Treat empty values as absent instead.
 */
function toAmount(value) {
  if (value === null || value === undefined || value === '') return null
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : null
}

export function formatPrice(value) {
  const amount = toAmount(value)
  return amount === null ? '—' : currency.format(amount)
}

export function formatPriceExact(value) {
  const amount = toAmount(value)
  return amount === null ? '—' : currencyWithCents.format(amount)
}

export function formatCompactCurrency(value) {
  const amount = toAmount(value)
  return amount === null ? '—' : compactCurrency.format(amount)
}

export function formatNumber(value) {
  const amount = toAmount(value)
  return amount === null ? '—' : amount.toLocaleString('en-US')
}

/** Totals used by the dashboard summary cards, derived from real API rows. */
export function summariseInventory(vehicles) {
  return vehicles.reduce(
    (totals, vehicle) => {
      const quantity = Number(vehicle.quantity) || 0
      const price = Number(vehicle.price) || 0
      return {
        models: totals.models + 1,
        units: totals.units + quantity,
        value: totals.value + price * quantity,
        outOfStock: totals.outOfStock + (quantity === 0 ? 1 : 0),
      }
    },
    { models: 0, units: 0, value: 0, outOfStock: 0 },
  )
}

export function stockLevel(quantity) {
  const units = Number(quantity) || 0
  if (units === 0) return 'out'
  if (units <= 3) return 'low'
  return 'in'
}

export function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}
