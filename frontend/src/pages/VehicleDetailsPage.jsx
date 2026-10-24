import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, Loader2, ShoppingCart, Tag } from 'lucide-react'

import ErrorMessage from '../components/ErrorMessage'
import LoadingSpinner from '../components/LoadingSpinner'
import StockBadge from '../components/StockBadge'
import VehicleImage from '../components/VehicleImage'
import { useToast } from '../context/ToastContext'
import { extractErrorMessage, fetchVehicle, purchaseVehicle } from '../services/apiClient'
import { formatPriceExact } from '../utils/format'

export default function VehicleDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { notifySuccess, notifyError } = useToast()

  const [vehicle, setVehicle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [purchasing, setPurchasing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setVehicle(await fetchVehicle(id))
      setError(null)
    } catch (requestError) {
      setError(extractErrorMessage(requestError, 'Could not load this vehicle.'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const handlePurchase = async () => {
    setPurchasing(true)
    try {
      const updated = await purchaseVehicle(vehicle.id)
      setVehicle(updated)
      notifySuccess(`Purchased ${updated.make} ${updated.model}. ${updated.quantity} left in stock.`)
    } catch (requestError) {
      notifyError(extractErrorMessage(requestError, 'Could not complete the purchase.'))
      load()
    } finally {
      setPurchasing(false)
    }
  }

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-20">
        <LoadingSpinner label="Loading vehicle…" size={24} />
      </div>
    )
  }

  if (error || !vehicle) {
    return (
      <div className="space-y-4">
        <ErrorMessage message={error || 'Vehicle not found.'} onRetry={load} />
        <button type="button" onClick={() => navigate('/')} className="btn-secondary">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to inventory
        </button>
      </div>
    )
  }

  const outOfStock = Number(vehicle.quantity) === 0

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to inventory
      </Link>

      <div className="card overflow-hidden">
        <VehicleImage vehicle={vehicle} className="h-56 sm:h-72" />

        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {vehicle.make} {vehicle.model}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Tag size={14} aria-hidden="true" />
                  {vehicle.category}
                </span>
                {vehicle.year && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar size={14} aria-hidden="true" />
                    {vehicle.year}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold tracking-tight text-slate-900">
                {formatPriceExact(vehicle.price)}
              </p>
              <div className="mt-2 flex justify-end">
                <StockBadge quantity={vehicle.quantity} />
              </div>
            </div>
          </div>

          {vehicle.description && (
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-slate-600">
              {vehicle.description}
            </p>
          )}

          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-200 pt-6 sm:grid-cols-4">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Stock
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                {vehicle.quantity} units
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Listing ID
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{vehicle.id}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Last updated
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                {new Date(vehicle.updated_at).toLocaleString()}
              </dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={handlePurchase}
            disabled={outOfStock || purchasing}
            className="btn-dark mt-7 w-full sm:w-auto sm:px-8"
          >
            {purchasing ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                Purchasing…
              </>
            ) : (
              <>
                <ShoppingCart size={16} aria-hidden="true" />
                {outOfStock ? 'Out of stock' : 'Purchase this vehicle'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
