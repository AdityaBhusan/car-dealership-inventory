import { Search, SlidersHorizontal, X } from 'lucide-react'

/**
 * Filter bar. Values are controlled by the dashboard, which sends them to
 * GET /api/vehicles/search — the filtering happens in PostgreSQL, not here.
 */
export default function SearchFilters({ filters, makes, categories, onChange, onReset }) {
  const update = (field) => (event) => onChange({ ...filters, [field]: event.target.value })

  const hasActiveFilter = Object.values(filters).some((value) => value !== '')

  return (
    <section className="card p-4 sm:p-5" aria-label="Inventory filters">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <SlidersHorizontal size={16} className="text-slate-500" aria-hidden="true" />
          Filter inventory
        </h2>
        {hasActiveFilter && (
          <button type="button" onClick={onReset} className="btn-ghost -mr-2 px-2 py-1 text-xs">
            <X size={14} aria-hidden="true" />
            Clear all
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="sm:col-span-2 lg:col-span-1">
          <label htmlFor="filter-q" className="label">
            Search
          </label>
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="filter-q"
              type="search"
              value={filters.q}
              onChange={update('q')}
              placeholder="Make or model"
              className="input pl-9"
            />
          </div>
        </div>

        <div>
          <label htmlFor="filter-make" className="label">
            Make
          </label>
          <select id="filter-make" value={filters.make} onChange={update('make')} className="input">
            <option value="">All makes</option>
            {makes.map((make) => (
              <option key={make} value={make}>
                {make}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-category" className="label">
            Category
          </label>
          <select
            id="filter-category"
            value={filters.category}
            onChange={update('category')}
            className="input"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-min-price" className="label">
            Min price
          </label>
          <input
            id="filter-min-price"
            type="number"
            min="0"
            step="500"
            inputMode="numeric"
            value={filters.min_price}
            onChange={update('min_price')}
            placeholder="0"
            className="input"
          />
        </div>

        <div>
          <label htmlFor="filter-max-price" className="label">
            Max price
          </label>
          <input
            id="filter-max-price"
            type="number"
            min="0"
            step="500"
            inputMode="numeric"
            value={filters.max_price}
            onChange={update('max_price')}
            placeholder="Any"
            className="input"
          />
        </div>
      </div>
    </section>
  )
}
