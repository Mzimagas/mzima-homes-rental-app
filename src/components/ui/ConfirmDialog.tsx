'use client'

import * as React from 'react'
import Modal from './Modal'

interface ConfirmDialogProps {
  isOpen: boolean
  title?: string
  children?: React.ReactNode
  confirmText?: string
  cancelText?: string
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

export default function ConfirmDialog({
  isOpen,
  title = 'Please Confirm',
  children,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [submitting, setSubmitting] = React.useState(false)

  const handleConfirm = async () => {
    try {
      setSubmitting(true)
      await onConfirm()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <div className="mt-2 text-sm text-gray-700">
        {children}
      </div>
      <div className="mt-6 flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
          disabled={submitting}
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="inline-flex justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none disabled:opacity-50"
          disabled={submitting}
        >
          {submitting ? 'Processing...' : confirmText}
        </button>
      </div>
    </Modal>
  )
}

