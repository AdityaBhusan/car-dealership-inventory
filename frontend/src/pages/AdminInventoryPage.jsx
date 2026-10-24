import { useCallback, useEffect, useMemo, useState } from 'react'
import { Boxes, Car, Loader2, PackagePlus, Pencil, Plus, Trash2 } from 'lucide-react'

import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import ErrorMessage from '../components/ErrorMessage'
import LoadingSpinner from '../components/LoadingSpinner'
import Modal from '../components/Modal'
import StockBadge from '../components/StockBadge'
import VehicleForm from '../components/VehicleForm'
import { useToast } from '../context/ToastContext'
import {
  createVehicle,
  deleteVehicle,
  extractErrorMessage,
  extractFieldErrors,
  fetchVehicles,
  restockVehicle,
  updateVehicle,
} from '../services/apiClient'
import { formatNumber, formatPriceExact, summariseInventory } from '../utils/format'

export default function AdminInventoryPage() {
  const { notifySuccess, notifyError } = useToast()

  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formError, setFormError] = useState(null)
  const [formFieldErrors, setFormFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [restockTarget, setRestockTarget] = useState(null)
  const [restockAmount, setRestockAmount] = useState('5')
  const [restockError, setRestockError] = useState(null)
  const [restocking, setRestocking] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setVehicles(await fetchVehicles())
      setError(null)
    } catch (requestError) {
      setError(extractErrorMessage(requestError, 'Could not load inventory.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => summariseInventory(vehicles), [vehicles])

  const openCreate = () => {
    setEditing(null)
    setFormError(null)
    setFormFieldErrors({})
    setFormOpen(true)
  }

  const openEdit = (vehicle) => {
    setEditing(vehicle)
    setFormError(null)
    setFormFieldErrors({})
    setFormOpen(true)
  }

  const handleSave = async (payload) => {
    setSaving(true)
    setFormError(null)
    setFormFieldErrors({})
    try {
      if (editing) {
        const updated = await updateVehicle(editing.id, payload)
        setVehicles((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        )
        notifySuccess(`Updated ${updated.make} ${updated.model}.`)
      } else {
        const created = await createVehicle(payload)
        setVehicles((current) => [...current, created])
        notifySuccess(`Added ${created.make} ${created.model} to inventory.`)
      }
      setFormOpen(false)
      setEditing(null)
    } catch (requestError) {
      setFormFieldErrors(extractFieldErrors(requestError))
      setFormError(extractErrorMessage(requestError, 'Could not save the vehicle.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteVehicle(deleteTarget.id)
      setVehicles((current) => current.filter((item) => item.id !== deleteTarget.id))
      notifySuccess(`Deleted ${deleteTarget.make} ${deleteTarget.model}.`)
      setDeleteTarget(null)
    } catch (requestError) {
      notifyError(extractErrorMessage(requestError, 'Could not delete the vehicle.'))
    } finally {
      setDeleting(false)
    }
  }

  const openRestock = (vehicle) => {
    setRestockTarget(vehicle)
    setRestockAmount('5')
    setRestockError(null)
  }

  const handleRestock = async (event) => {
    event.preventDefault()
    const amount = Number(restockAmount)
    if (!Number.isInteger(amount) || amount <= 0) {
      setRestockError('Enter a whole number greater than zero.')
      return
    }

    setRestocking(true)
    setRestockError(null)
    try {
      const updated = await restockVehicle(restockTarget.id, amount)
      setVehicles((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      notifySuccess(
        `Restocked ${updated.make} ${updated.model}. Now ${updated.quantity} in stock.`,
      )
      setRestockTarget(null)
    } catch (requestError) {
      setRestockError(extractErrorMessage(requestError, 'Could not restock the vehicle.'))
    } finally {
      setRestocking(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manage inventory</h1>
          <p className="mt-1 text-sm text-slate-500">
            Add, edit, restock and remove vehicles. {formatNumber(stats.models)} models ·{' '}
            {formatNumber(stats.units)} units in stock.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary">
          <Plus size={16} aria-hidden="true" />
          Add vehicle
        </button>
      </header>

      <ErrorMessage message={error} onRetry={load} />

      {loading ? (
        <div className="card flex items-center justify-center py-20">
          <LoadingSpinner label="Loading inventory…" size={24} />
        </div>
      ) : vehicles.length === 0 ? (
        <EmptyState
          icon={Car}
          title="No vehicles yet"
          message="Add your first vehicle to start building the showroom."
          action={
            <button type="button" onClick={openCreate} className="btn-primary mt-2">
              <Plus size={16} aria-hidden="true" />
              Add vehicle
            </button>
          }
        />
      ) : (
        <>
          {/* Table on larger screens */}
          <div className="card hidden overflow-hidden lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-5 py-3">Vehicle</th>
                  <th scope="col" className="px-5 py-3">Category</th>
                  <th scope="col" className="px-5 py-3">Year</th>
                  <th scope="col" className="px-5 py-3 text-right">Price</th>
                  <th scope="col" className="px-5 py-3">Stock</th>
                  <th scope="col" className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-900">
                        {vehicle.make} {vehicle.model}
                      </p>
                      <p className="text-xs text-slate-500">ID {vehicle.id}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{vehicle.category}</td>
                    <td className="px-5 py-3.5 text-slate-600">{vehicle.year ?? '—'}</td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-900">
                      {formatPriceExact(vehicle.price)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StockBadge quantity={vehicle.quantity} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openRestock(vehicle)}
                          className="btn-ghost px-2 py-1.5"
                          aria-label={`Restock ${vehicle.make} ${vehicle.model}`}
                          title="Restock"
                        >
                          <PackagePlus size={16} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(vehicle)}
                          className="btn-ghost px-2 py-1.5"
                          aria-label={`Edit ${vehicle.make} ${vehicle.model}`}
                          title="Edit"
                        >
                          <Pencil size={16} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(vehicle)}
                          className="btn-ghost px-2 py-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
                          aria-label={`Delete ${vehicle.make} ${vehicle.model}`}
                          title="Delete"
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards on small screens, so nothing overflows horizontally */}
          <div className="space-y-3 lg:hidden">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {vehicle.make} {vehicle.model}
                    </p>
                    <p className="text-xs text-slate-500">
                      {vehicle.category}
                      {vehicle.year ? ` · ${vehicle.year}` : ''} · ID {vehicle.id}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold text-slate-900">
                    {formatPriceExact(vehicle.price)}
                  </p>
                </div>
                <div className="mt-3">
                  <StockBadge quantity={vehicle.quantity} />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => openRestock(vehicle)}
                    className="btn-secondary px-2 text-xs"
                  >
                    <PackagePlus size={14} aria-hidden="true" />
                    Restock
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(vehicle)}
                    className="btn-secondary px-2 text-xs"
                  >
                    <Pencil size={14} aria-hidden="true" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(vehicle)}
                    className="btn-secondary px-2 text-xs text-red-600"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal
        open={formOpen}
        title={editing ? `Edit ${editing.make} ${editing.model}` : 'Add a vehicle'}
        description={
          editing ? 'Change any field and save.' : 'All fields marked * are required.'
        }
        onClose={() => (saving ? null : setFormOpen(false))}
        size="lg"
      >
        {/* key forces a fresh form state when switching between records */}
        <VehicleForm
          key={editing ? `edit-${editing.id}` : 'create'}
          vehicle={editing}
          onSubmit={handleSave}
          onCancel={() => setFormOpen(false)}
          submitLabel={editing ? 'Save changes' : 'Add vehicle'}
          serverError={formError}
          serverFieldErrors={formFieldErrors}
          busy={saving}
        />
      </Modal>

      <Modal
        open={Boolean(restockTarget)}
        title={restockTarget ? `Restock ${restockTarget.make} ${restockTarget.model}` : ''}
        description={
          restockTarget ? `Currently ${restockTarget.quantity} in stock.` : undefined
        }
        onClose={() => (restocking ? null : setRestockTarget(null))}
        size="sm"
      >
        <form onSubmit={handleRestock} noValidate className="space-y-4">
          <ErrorMessage message={restockError} />
          <div>
            <label htmlFor="restock-quantity" className="label">
              Units to add
            </label>
            <input
              id="restock-quantity"
              type="number"
              min="1"
              step="1"
              value={restockAmount}
              onChange={(event) => setRestockAmount(event.target.value)}
              className={`input ${restockError ? 'input-error' : ''}`}
              autoFocus
            />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setRestockTarget(null)}
              disabled={restocking}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={restocking} className="btn-primary">
              {restocking ? (
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <Boxes size={16} aria-hidden="true" />
              )}
              Add stock
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this vehicle?"
        message={
          deleteTarget
            ? `${deleteTarget.make} ${deleteTarget.model} will be removed from inventory permanently. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete vehicle"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
