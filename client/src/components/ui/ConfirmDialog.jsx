import { Modal } from './Modal'

export const ConfirmDialog = ({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', loading }) => (
  <Modal open={open} onClose={onClose} title={title} size="sm">
    <p className="text-sm text-gray-600 mb-6">{message}</p>
    <div className="flex gap-3 justify-end">
      <button className="btn-secondary btn-md" onClick={onClose} disabled={loading}>Cancel</button>
      <button className="btn-danger btn-md" onClick={onConfirm} disabled={loading}>
        {loading ? 'Deleting…' : confirmLabel}
      </button>
    </div>
  </Modal>
)
