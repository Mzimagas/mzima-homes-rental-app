'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '../../../ui'
import { useUserSelection } from '../hooks/useUserSelection'
import { FeedbackMessage } from '../types'

interface UserSelectorProps {
  onSelectionChange?: (selectedUserIds: string[]) => void
  onFeedback?: (feedback: FeedbackMessage | null) => void
  selectedProperty?: string
  className?: string
}

export default function UserSelector({
  onSelectionChange,
  onFeedback,
  selectedProperty = 'global',
  className = '',
}: UserSelectorProps) {
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null)
  const [focusedChipIndex, setFocusedChipIndex] = useState<number>(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    selectedUsers,
    showDropdown,
    searchTerm,
    availableUsers,
    loadingUsers,
    handleUserSearch,
    toggleUserSelection,
    selectAllUsers,
    clearAllUsers,
    toggleDropdown,
    handleKeyPress,
    getSelectedUserDetails,
    isUserSelected,
  } = useUserSelection()

  // Notify parent of selection changes
  React.useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedUsers)
    }
  }, [selectedUsers, onSelectionChange])

  // Notify parent of feedback changes
  React.useEffect(() => {
    if (onFeedback) {
      onFeedback(feedback)
    }
  }, [feedback, onFeedback])

  // Clear feedback after 3 seconds
  React.useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (showDropdown) {
          toggleDropdown()
        }
      }
    }

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showDropdown) {
        toggleDropdown()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscapeKey)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [showDropdown, toggleDropdown])

  // Get property scope display text
  const getPropertyScopeDisplay = () => {
    switch (selectedProperty) {
      case 'global':
        return '🌐 Global Permissions (All Properties)'
      case 'purchase_pipeline':
        return '🏗️ Purchase Pipeline Properties'
      case 'subdivision':
        return '📐 Subdivision Properties'
      case 'handover':
        return '🤝 Handover Properties'
      default:
        return '🏠 Specific Property'
    }
  }

  // Enhanced user selection with validation and auto-close
  const handleEnhancedUserSelection = (userId: string) => {
    const user = availableUsers.find((u) => u.id === userId)
    if (!user) return

    // Check if user is already selected
    if (selectedUsers.includes(userId)) {
      toggleUserSelection(userId)
      setFeedback({
        type: 'success',
        message: `Removed ${user.email} from selection`,
      })
    } else {
      // Check for maximum selection limit
      if (selectedUsers.length >= 10) {
        setFeedback({
          type: 'warning',
          message: 'Maximum 10 users can be selected at once',
        })
        return
      }

      // Check if user is active
      if (!user.isActive) {
        setFeedback({
          type: 'warning',
          message: `${user.email} is inactive. Are you sure you want to select them?`,
        })
      }

      toggleUserSelection(userId)
      setFeedback({
        type: 'success',
        message: `Added ${user.email} to selection`,
      })
    }

    // Clear search term but keep dropdown open for multiple selections
    handleUserSearch('')
    // Don't auto-close dropdown - let user continue selecting or close manually

    // Refocus the input field to allow immediate typing for next selection
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 0)

    // Focus back to input for continued typing
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  // Enhanced keyboard navigation for chips and input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const selectedUserDetails = getSelectedUserDetails()

    // Handle backspace to remove last chip when input is empty
    if (e.key === 'Backspace' && searchTerm === '' && selectedUserDetails.length > 0) {
      if (focusedChipIndex === -1) {
        // Focus on last chip
        setFocusedChipIndex(selectedUserDetails.length - 1)
      } else {
        // Remove focused chip
        const userToRemove = selectedUserDetails[focusedChipIndex]
        toggleUserSelection(userToRemove.id)
        setFocusedChipIndex(-1)
        setFeedback({
          type: 'success',
          message: `Removed ${userToRemove.email} from selection`,
        })
      }
      e.preventDefault()
      return
    }

    // Handle arrow navigation between chips
    if (e.key === 'ArrowLeft' && searchTerm === '') {
      if (focusedChipIndex === -1 && selectedUserDetails.length > 0) {
        setFocusedChipIndex(selectedUserDetails.length - 1)
      } else if (focusedChipIndex > 0) {
        setFocusedChipIndex(focusedChipIndex - 1)
      }
      e.preventDefault()
      return
    }

    if (e.key === 'ArrowRight' && focusedChipIndex !== -1) {
      if (focusedChipIndex < selectedUserDetails.length - 1) {
        setFocusedChipIndex(focusedChipIndex + 1)
      } else {
        setFocusedChipIndex(-1)
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }
      e.preventDefault()
      return
    }

    // Clear chip focus when typing
    if (e.key.length === 1) {
      setFocusedChipIndex(-1)
    }

    // Handle original key press logic
    handleKeyPress(e)
  }

  // Enhanced select all with validation
  const handleEnhancedSelectAll = () => {
    const activeUsers = availableUsers.filter((user) => user.isActive)
    if (activeUsers.length > 10) {
      setFeedback({
        type: 'warning',
        message: `Only selecting first 10 active users (${activeUsers.length} available)`,
      })
      // Select only first 10 active users
      const limitedUsers = activeUsers.slice(0, 10)
      limitedUsers.forEach((user) => {
        if (!selectedUsers.includes(user.id)) {
          toggleUserSelection(user.id)
        }
      })
    } else {
      selectAllUsers()
      setFeedback({
        type: 'success',
        message: `Selected all ${activeUsers.length} active users`,
      })
    }
  }

  return (
    <div className={`p-4 bg-gray-50 rounded-lg ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-medium text-gray-900">User Selection</h4>
          <p className="text-xs text-gray-600 mt-1">
            Assigning permissions for:{' '}
            <span className="font-medium">{getPropertyScopeDisplay()}</span>
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">{selectedUsers.length}/10 selected</span>
          {selectedUsers.length > 0 && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              {selectedUsers.length}
            </span>
          )}
        </div>
      </div>

      {/* Feedback Messages */}
      {feedback && (
        <div
          className={`mb-3 px-3 py-2 rounded-md text-xs border ${
            feedback.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : feedback.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-yellow-50 border-yellow-200 text-yellow-800'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Gmail-Style Multi-Select Input */}
      <div className="relative" ref={dropdownRef}>
        <div
          className={`min-h-[48px] w-full px-3 py-2 border rounded-lg bg-white transition-all ${
            selectedUsers.length >= 10
              ? 'border-orange-300 bg-orange-50'
              : 'border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500'
          }`}
        >
          <div className="flex flex-wrap items-center gap-1">
            {/* Selected User Chips */}
            {getSelectedUserDetails().map((user, index) => (
              <div
                key={user.id}
                className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                  focusedChipIndex === index
                    ? 'bg-blue-200 border-2 border-blue-400 text-blue-900'
                    : 'bg-blue-100 border border-blue-200 text-blue-800'
                }`}
              >
                <span className="max-w-[120px] truncate">
                  {user.name || user.email.split('@')[0]}
                </span>
                {user.role && (
                  <span className="px-1 py-0.5 bg-blue-200 text-blue-700 rounded text-xs">
                    {user.role}
                  </span>
                )}
                {!user.isActive && (
                  <span className="px-1 py-0.5 bg-red-200 text-red-700 rounded text-xs">!</span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleUserSelection(user.id)
                    setFeedback({
                      type: 'success',
                      message: `Removed ${user.email} from selection`,
                    })
                    setFocusedChipIndex(-1)
                  }}
                  className="ml-1 text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                  title={`Remove ${user.email}`}
                >
                  ✕
                </button>
              </div>
            ))}

            {/* Search Input */}
            <input
              ref={inputRef}
              type="text"
              placeholder={
                selectedUsers.length >= 10
                  ? 'Maximum 10 users selected'
                  : getSelectedUserDetails().length === 0
                    ? 'Search users or add new email...'
                    : 'Add more users...'
              }
              value={searchTerm}
              onChange={(e) => {
                handleUserSearch(e.target.value)
                // Open dropdown when user starts typing (if not already open)
                if (!showDropdown && selectedUsers.length < 10) {
                  toggleDropdown()
                }
              }}
              onKeyDown={handleKeyDown}
              onClick={() => {
                // Open dropdown when input is clicked (if not already open)
                if (!showDropdown && selectedUsers.length < 10) {
                  toggleDropdown()
                }
              }}
              onFocus={() => {
                setFocusedChipIndex(-1)
                // Open dropdown when input is focused (if not already open)
                if (!showDropdown && selectedUsers.length < 10) {
                  toggleDropdown()
                }
              }}
              className={`flex-1 min-w-[120px] outline-none text-sm py-1 bg-transparent ${
                selectedUsers.length >= 10 ? 'text-gray-400 cursor-not-allowed' : ''
              }`}
              disabled={selectedUsers.length >= 10}
            />

            {/* Dropdown Toggle/Close Button */}
            {showDropdown && (
              <button
                type="button"
                onClick={toggleDropdown}
                className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* User Dropdown */}
        {showDropdown && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {loadingUsers ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Loading users...</span>
                </div>
              </div>
            ) : availableUsers.length > 0 ? (
              availableUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleEnhancedUserSelection(user.id)}
                  disabled={!user.isActive && !isUserSelected(user.id)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                    isUserSelected(user.id)
                      ? 'bg-blue-50 text-blue-900'
                      : !user.isActive
                        ? 'text-gray-400 bg-gray-50'
                        : 'text-gray-900'
                  } ${!user.isActive && !isUserSelected(user.id) ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{user.email}</span>
                        {user.role && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            {user.role}
                          </span>
                        )}
                        {!user.isActive && (
                          <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs">
                            Inactive
                          </span>
                        )}
                      </div>
                      {user.name && user.name !== user.email && (
                        <p className="text-xs text-gray-500 mt-1">{user.name}</p>
                      )}
                    </div>
                    {isUserSelected(user.id) && <span className="text-blue-600 text-sm">✓</span>}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                {searchTerm ? (
                  <>
                    No users found matching "{searchTerm}"
                    <p className="text-xs text-gray-400 mt-1">Press Enter to add as new user</p>
                  </>
                ) : (
                  'No users available'
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bulk Actions for Selected Users */}
      {getSelectedUserDetails().length > 0 && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-gray-600">
            {getSelectedUserDetails().length} user{getSelectedUserDetails().length === 1 ? '' : 's'}{' '}
            selected
          </span>
          <div className="flex gap-2">
            <Button
              onClick={handleEnhancedSelectAll}
              disabled={availableUsers.filter((u) => u.isActive).length === 0}
              variant="secondary"
              className="text-green-700 border-green-300 hover:bg-green-50 hover:text-green-800 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-400"
            >
              ✓ Select All Active ({availableUsers.filter((u) => u.isActive).length})
            </Button>
            <Button
              onClick={() => {
                clearAllUsers()
                setFeedback({
                  type: 'success',
                  message: 'Cleared all user selections',
                })
                setFocusedChipIndex(-1)
              }}
              variant="secondary"
              className="text-red-700 border-red-300 hover:bg-red-50 hover:text-red-800 text-xs font-medium"
            >
              ✗ Clear All
            </Button>
          </div>
        </div>
      )}

      {/* User Selection Summary */}
      {getSelectedUserDetails().length === 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            👤 Start typing to search and select users for permission assignment
          </p>
          <div className="mt-2 text-xs text-blue-700">
            💡 Tips: Use ← → arrows to navigate chips, Backspace to remove, up to 10 users max
          </div>
        </div>
      )}

      {/* Selection Limit Warning */}
      {getSelectedUserDetails().length >= 10 && (
        <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-md">
          <p className="text-xs text-orange-800">
            ⚠️ Maximum selection limit reached (10 users). Remove some users to add more.
          </p>
        </div>
      )}
    </div>
  )
}
