import { stockLevel } from '../utils/format'

const STYLES = {
  in: 'bg-emerald-50 text-emerald-700',
  low: 'bg-amber-50 text-amber-700',
  out: 'bg-red-50 text-red-700',
}

const DOTS = {
  in: 'bg-emerald-500',
  low: 'bg-amber-500',
  out: 'bg-red-500',
}

export default function StockBadge({ quantity }) {
  const level = stockLevel(quantity)
  const units = Number(quantity) || 0
  const text =
    level === 'out' ? 'Out of stock' : level === 'low' ? `Low stock · ${units}` : `In stock · ${units}`

  return (
    <span className={`badge ${STYLES[level]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOTS[level]}`} aria-hidden="true" />
      {text}
    </span>
  )
}
