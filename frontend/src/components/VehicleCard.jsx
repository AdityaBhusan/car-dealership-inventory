import { Link } from 'react-router-dom'
import { Loader2, ShoppingCart } from 'lucide-react'

import StockBadge from './StockBadge'
import VehicleImage from './VehicleImage'
import { formatPrice } from '../utils/format'

export default function VehicleCard({ vehicle, onPurchase, isPurchasing = false }) {
  const outOfStock = Number(vehicle.quantity) === 0

  return (
    <article className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-card-hover">
      <Link
        to={`/vehicles/${vehicle.id}`}
        className="block overflow-hidden"
        aria-label={`View details for ${vehicle.make} ${vehicle.model}`}
      >
        <VehicleImage vehicle={vehicle} className="h-44 transition-transform group-hover:scale-105" />
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-slate-900">
              <Link to={`/vehicles/${vehicle.id}`} className="hover:text-blue-700">
                {vehicle.make} {vehicle.model}
              </Link>
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">
              {vehicle.category}
              {vehicle.year ? ` · ${vehicle.year}` : ''}
            </p>
          </div>
          <p className="shrink-0 text-right text-lg font-bold tracking-tight text-slate-900">
            {formatPrice(vehicle.price)}
          </p>
        </div>

        {vehicle.description && (
          <p className="mt-3 line-clamp-2 text-sm text-slate-600">{vehicle.description}</p>
        )}

        <div className="mt-4 flex items-center justify-between gap-3 pt-1">
          <StockBadge quantity={vehicle.quantity} />
        </div>

        <button
          type="button"
          onClick={() => onPurchase(vehicle)}
          disabled={outOfStock || isPurchasing}
          className="btn-dark mt-4 w-full"
          aria-label={
            outOfStock
              ? `${vehicle.make} ${vehicle.model} is out of stock`
              : `Purchase ${vehicle.make} ${vehicle.model}`
          }
        >
          {isPurchasing ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              Purchasing…
            </>
          ) : (
            <>
              <ShoppingCart size={16} aria-hidden="true" />
              {outOfStock ? 'Out of stock' : 'Purchase'}
            </>
          )}
        </button>
      </div>
    </article>
  )
}
