import { describe, expect, it } from 'vitest'

import {
  formatNumber,
  formatPrice,
  formatPriceExact,
  stockLevel,
  summariseInventory,
  uniqueSorted,
} from './format'

describe('formatPrice', () => {
  it('formats a decimal string from the API as currency', () => {
    expect(formatPrice('25999.00')).toBe('$25,999')
  })

  it('keeps cents when asked for the exact amount', () => {
    expect(formatPriceExact('22150.50')).toBe('$22,150.50')
  })

  it('returns a dash for a missing or unparsable price', () => {
    expect(formatPrice(null)).toBe('—')
    expect(formatPrice('not-a-number')).toBe('—')
  })
})

describe('formatNumber', () => {
  it('groups thousands', () => {
    expect(formatNumber(1234)).toBe('1,234')
  })
})

describe('stockLevel', () => {
  it('reports out of stock at zero', () => {
    expect(stockLevel(0)).toBe('out')
  })

  it('reports low stock at or below three units', () => {
    expect(stockLevel(1)).toBe('low')
    expect(stockLevel(3)).toBe('low')
  })

  it('reports in stock above three units', () => {
    expect(stockLevel(4)).toBe('in')
  })
})

describe('summariseInventory', () => {
  const inventory = [
    { price: '10000.00', quantity: 2 },
    { price: '25000.50', quantity: 1 },
    { price: '50000.00', quantity: 0 },
  ]

  it('counts every model', () => {
    expect(summariseInventory(inventory).models).toBe(3)
  })

  it('sums the units in stock', () => {
    expect(summariseInventory(inventory).units).toBe(3)
  })

  it('values inventory as price times units in stock', () => {
    expect(summariseInventory(inventory).value).toBeCloseTo(45000.5, 2)
  })

  it('counts models that are out of stock', () => {
    expect(summariseInventory(inventory).outOfStock).toBe(1)
  })

  it('handles an empty inventory', () => {
    expect(summariseInventory([])).toEqual({ models: 0, units: 0, value: 0, outOfStock: 0 })
  })
})

describe('uniqueSorted', () => {
  it('de-duplicates and sorts, dropping empty values', () => {
    expect(uniqueSorted(['Toyota', 'Audi', 'Toyota', null, '', 'BMW'])).toEqual([
      'Audi',
      'BMW',
      'Toyota',
    ])
  })
})
