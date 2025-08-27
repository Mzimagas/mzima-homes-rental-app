'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../lib/auth-context'
import MobileMenuButton from './MobileMenuButton'
import EnhancedGlobalSearch from '../dashboard/EnhancedGlobalSearch'
import {
  BellIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'

interface MobileHeaderProps {
  onMenuToggle: () => void
  isMenuOpen: boolean
}

export default function MobileHeader({ onMenuToggle, isMenuOpen }: MobileHeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const { user, signOut } = useAuth()
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

  const handleSignOut = async () => {
    try {
      const { error } = await signOut()
      if (error) {
        console.error('❌ Logout failed:', error)
        alert(`Logout failed: ${error}`)
      } else {
        console.log('✅ Logout successful')
      }
    } catch (err) {
      console.error('❌ Logout exception:', err)
      alert('An unexpected error occurred during logout')
    }
  }

  return (
    <div className="md:hidden bg-white shadow-sm border-b border-gray-200">
      {/* Main Header */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Menu Button */}
          <MobileMenuButton onClick={onMenuToggle} isOpen={isMenuOpen} />

          {/* Center: Logo */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">MH</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900">Mzima Homes</h1>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-2">
            {/* Search Toggle */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-target"
              aria-label="Toggle search"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>

            {/* Notifications */}
            <button
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-target relative"
              aria-label="Notifications"
            >
              <BellIcon className="h-5 w-5" />
              {/* Notification badge */}
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-target"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <span className="sr-only">Open user menu</span>
                <div className="h-6 w-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-white">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              </button>

              {/* User Menu Dropdown */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                  <div className="py-1">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.user_metadata?.full_name || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>

                    <button
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center touch-target"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <UserIcon className="h-4 w-4 mr-3" />
                      Profile
                    </button>

                    <button
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center touch-target"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Cog6ToothIcon className="h-4 w-4 mr-3" />
                      Settings
                    </button>

                    <div className="border-t border-gray-100">
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center touch-target"
                      >
                        <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar (when toggled) */}
      {showSearch && (
        <div className="px-4 pb-3 border-t border-gray-100">
          <EnhancedGlobalSearch
            className="w-full"
            placeholder="Search properties, tenants, payments..."
            qualityThreshold="moderate"
            maxResults={8}
          />
        </div>
      )}
    </div>
  )
}
