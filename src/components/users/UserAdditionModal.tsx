'use client'

import { Modal } from '../ui'
import UserAddition from './UserAddition'

interface UserAdditionModalProps {
  isOpen: boolean
  onClose: () => void
  onUserAdded?: () => void
}

export default function UserAdditionModal({ isOpen, onClose, onUserAdded }: UserAdditionModalProps) {
  const handleUserAdded = () => {
    // Call the parent's onUserAdded callback
    if (onUserAdded) {
      onUserAdded()
    }
    // Close the modal
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="✨ Quick Add User"
    >
      <div className="p-6">
        {/* Enhanced Header */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Quick User Registration</h3>
              <p className="text-sm text-gray-600">
                Create a new user account with initial role assignment
              </p>
            </div>
          </div>
        </div>

        {/* User Addition Form */}
        <div className="mb-6">
          <UserAddition onUserAdded={handleUserAdded} />
        </div>

        {/* Footer Info */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-sm text-gray-600">
              <p className="font-medium text-gray-700 mb-1">Quick Add Tips:</p>
              <ul className="space-y-1 text-xs">
                <li>• Member numbers must be unique (3-10 characters)</li>
                <li>• Default password will be generated automatically</li>
                <li>• User will be created with the selected initial role</li>
                <li>• Email notifications can be sent after creation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
