import { AlertTriangle, Loader2 } from 'lucide-react'

import Modal from './Modal'

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  busy = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal open={open} title={title} onClose={busy ? () => {} : onCancel} size="sm">
      <div className="flex gap-3">
        {destructive && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle size={18} className="text-red-600" aria-hidden="true" />
          </span>
        )}
        <p className="text-sm text-slate-600">{message}</p>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={busy} className="btn-secondary">
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={destructive ? 'btn-danger' : 'btn-primary'}
        >
          {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
