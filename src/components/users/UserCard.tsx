'use client'

import React, { useState } from 'react'
import { Button } from '../ui'
import { User } from '../../types/user'

interface UserCardProps {
  user: User
  onEdit: () => void
  onView: () => void
  onDelete: () => void
  onToggleStatus: (newStatus: boolean) => void
}

const UserCard = React.memo(function UserCard({ user, onEdit, onView, onDelete, onToggleStatus }: UserCardProps) {
  const [isToggling, setIsToggling] = useState(false)

  const handleStatusToggle = async () => {
    setIsToggling(true)
    try {
      await onToggleStatus(!user.isActive)
    } finally {
      setIsToggling(false)
    }
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getInitials = (name?: string) => {
    if (!name) return '??'
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-red-100 text-red-800 border-red-200'
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'supervisor':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'staff':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header with Avatar and Status */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {/* Avatar */}
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {getInitials(user.name)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {user.name || 'Unnamed User'}
              </h3>
              <p className="text-sm text-gray-600 truncate">
                {user.email}
              </p>
            </div>
          </div>
          
          {/* Status Badge */}
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(user.isActive)}`}>
            {user.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Member Number and Role */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">
              #{user.memberNumber}
            </span>
            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getRoleColor(user.role)}`}>
              {user.role}
            </span>
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-2 mb-4">
          {user.phoneNumber && (
            <div className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {user.phoneNumber}
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="space-y-1 text-xs text-gray-500 border-t border-gray-100 pt-3">
          <div className="flex justify-between">
            <span>Created:</span>
            <span>{formatDate(user.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span>Last Login:</span>
            <span>{formatDate(user.lastLogin)}</span>
          </div>
          {user.profileComplete !== undefined && (
            <div className="flex justify-between">
              <span>Profile:</span>
              <span className={user.profileComplete ? 'text-green-600' : 'text-orange-600'}>
                {user.profileComplete ? 'Complete' : 'Incomplete'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 rounded-b-lg">
        <div className="flex items-center justify-between">
          {/* Primary Actions */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onView}
              className="text-xs"
            >
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="text-xs"
            >
              Edit
            </Button>
          </div>

          {/* Secondary Actions */}
          <div className="flex items-center space-x-2">
            {/* Status Toggle */}
            <button
              onClick={handleStatusToggle}
              disabled={isToggling}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                user.isActive ? 'bg-green-600' : 'bg-gray-200'
              } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={`${user.isActive ? 'Deactivate' : 'Activate'} user`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  user.isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>

            {/* Delete Button */}
            <button
              onClick={onDelete}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete user"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

export default UserCard
