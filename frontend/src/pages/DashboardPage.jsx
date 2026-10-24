import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Boxes, Car, DollarSign, SearchX } from 'lucide-react'

import EmptyState from '../components/EmptyState'
import ErrorMessage from '../components/ErrorMessage'
import LoadingSpinner from '../components/LoadingSpinner'
import SearchFilters from '../components/SearchFilters'
import StatsCard from '../components/StatsCard'
import VehicleGrid from '../components/VehicleGrid'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import {
  extractErrorMessage,
  fetchVehicles,
  purchaseVehicle,
  searchVehicles,
} from '../services/apiClient'
import {
  formatCompactCurrency,
  formatNumber,
  summariseInventory,
  uniqueSorted,
} from '../utils/format'

const EMPTY_FILTERS = { q: '', make: '', category: '', min_price: '', max_price: '' }

export default function DashboardPage() {
  const { user } = useAuth()
  const { notifySuccess, notifyError } = useToast()

  // Full inventory backs the summary cards and the filter dropdowns.
  const [allVehicles, setAllVehicles] = useState([])
  const [visibleVehicles, setVisibleVehicles] = useState([])
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [loading, setLoading] = useState(true)
  const [filtering, setFiltering] = useState(false)
  const [error, setError] = useState(null)
  const [purchasingId, setPurchasingId] = useState(null)

  const isFirstLoad = useRef(true)

  const loadInventory = useCallback(async () => {
    const vehicles = await fetchVehicles()
    setAllVehicles(vehicles)
    return vehicles
  }, [])

  // Initial load: one request serves both the stats and the grid.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadInventory()
      .then((vehicles) => {
        if (cancelled) return
        setVisibleVehicles(vehicles)
        setError(null)
      })
      .catch((requestError) => {
        if (!cancelled) setError(extractErrorMessage(requestError, 'Could not load inventory.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [loadInventory])

  // Filtering is done by PostgreSQL via /api/vehicles/search, debounced.
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false
      return
    }

    let cancelled = false
    setFiltering(true)
    const timer = window.setTimeout(() => {
      searchVehicles(filters)
        .then((vehicles) => {
          if (cancelled) return
          setVisibleVehicles(vehicles)
          setError(null)
        })
        .catch((requestError) => {
          if (!cancelled) setError(extractErrorMessage(requestError, 'Could not apply filters.'))
        })
        .finally(() => {
          if (!cancelled) setFiltering(false)
        })
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [filters])

  const stats = useMemo(() => summariseInventory(allVehicles), [allVehicles])
  const makes = useMemo(() => uniqueSorted(allVehicles.map((v) => v.make)), [allVehicles])
  const categories = useMemo(() => uniqueSorted(allVehicles.map((v) => v.category)), [allVehicles])

  const hasActiveFilter = Object.values(filters).some((value) => value !== '')

  const handlePurchase = async (vehicle) => {
    setPurchasingId(vehicle.id)
    try {
      const updated = await purchaseVehicle(vehicle.id)
      // Trust the server's returned state rather than guessing locally.
      const replace = (list) => list.map((item) => (item.id === updated.id ? updated : item))
      setVisibleVehicles(replace)
      setAllVehicles(replace)
      notifySuccess(
        `Purchased ${updated.make} ${updated.model}. ${updated.quantity} left in stock.`,
      )
    } catch (requestError) {
      notifyError(extractErrorMessage(requestError, 'Could not complete the purchase.'))
      // The failure may be stale stock, so resynchronise from the backend.
      try {
        const vehicles = await loadInventory()
        setVisibleVehicles((current) =>
          current.map((item) => vehicles.find((fresh) => fresh.id === item.id) ?? item),
        )
      } catch {
        // Leave the current view in place; the toast already explained.
      }
    } finally {
      setPurchasingId(null)
    }
  }

  const firstName = user?.name?.split(' ')[0] || 'there'

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Browse the showroom floor and reserve a vehicle.
          </p>
        </div>
        {filtering && <LoadingSpinner label="Updating results…" size={16} />}
      </header>

      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Inventory summary"
      >
        <StatsCard
          label="Vehicle models"
          value={formatNumber(stats.models)}
          icon={Car}
          tone="blue"
          hint="Distinct listings"
        />
        <StatsCard
          label="Units in stock"
          value={formatNumber(stats.units)}
          icon={Boxes}
          tone="emerald"
          hint="Across all models"
        />
        <StatsCard
          label="Inventory value"
          value={formatCompactCurrency(stats.value)}
          icon={DollarSign}
          tone="slate"
          hint="Price x units in stock"
        />
        <StatsCard
          label="Out of stock"
          value={formatNumber(stats.outOfStock)}
          icon={AlertTriangle}
          tone="amber"
          hint="Models needing restock"
        />
      </section>

      <SearchFilters
        filters={filters}
        makes={makes}
        categories={categories}
        onChange={setFilters}
        onReset={() => setFilters(EMPTY_FILTERS)}
      />

      <ErrorMessage message={error} onRetry={() => window.location.reload()} />

      {loading ? (
        <div className="card flex items-center justify-center py-20">
          <LoadingSpinner label="Loading inventory…" size={24} />
        </div>
      ) : visibleVehicles.length === 0 ? (
        <EmptyState
          icon={hasActiveFilter ? SearchX : Car}
          title={hasActiveFilter ? 'No vehicles match those filters' : 'The showroom is empty'}
          message={
            hasActiveFilter
              ? 'Try widening the price range or clearing a filter.'
              : 'Once an administrator adds vehicles, they will appear here.'
          }
          action={
            hasActiveFilter ? (
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="btn-secondary mt-2"
              >
                Clear filters
              </button>
            ) : null
          }
        />
      ) : (
        <>
          <p className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-700">{visibleVehicles.length}</span>
            {hasActiveFilter ? ` of ${allVehicles.length}` : ''}{' '}
            {visibleVehicles.length === 1 ? 'vehicle' : 'vehicles'}
          </p>
          <VehicleGrid
            vehicles={visibleVehicles}
            onPurchase={handlePurchase}
            purchasingId={purchasingId}
          />
        </>
      )}
    </div>
  )
}
