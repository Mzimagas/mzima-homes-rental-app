'use client'

import { useState, useEffect } from 'react'
import { Button } from '../ui'
import { User } from '../../types/user'

interface UserDetailsModalProps {
  user: User
  onClose: () => void
  onEdit: () => void
}

interface UserActivity {
  id: string
  action: string
  description: string
  timestamp: string
  ipAddress?: string
}

export default function UserDetailsModal({ user, onClose, onEdit }: UserDetailsModalProps) {
  const [activities, setActivities] = useState<UserActivity[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'permissions' | 'activity'>('details')

  useEffect(() => {
    if (activeTab === 'activity') {
      fetchUserActivities()
    }
  }, [activeTab, user.id])

  const fetchUserActivities = async () => {
    setLoadingActivities(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}/activities`)
      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities || [])
      }
    } catch (error) {
      console.error('Error fetching user activities:', error)
    } finally {
      setLoadingActivities(false)
    }
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            {/* Avatar */}
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
              {getInitials(user.name)}
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                {user.name || 'Unnamed User'}
              </h2>
              <p className="text-gray-600">{user.email}</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(user.isActive)}`}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}>
                  {user.role}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button onClick={onEdit} variant="outline">
              Edit User
            </Button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'details', label: 'Details' },
              { id: 'permissions', label: 'Permissions' },
              { id: 'activity', label: 'Activity' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <p className="mt-1 text-sm text-gray-900">{user.name || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email Address</label>
                    <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Member Number</label>
                    <p className="mt-1 text-sm text-gray-900">#{user.memberNumber || 'Not assigned'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                    <p className="mt-1 text-sm text-gray-900">{user.phoneNumber || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <p className="mt-1 text-sm text-gray-900 capitalize">{user.role}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <p className="mt-1 text-sm text-gray-900">{user.isActive ? 'Active' : 'Inactive'}</p>
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Created Date</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(user.createdAt)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Login</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(user.lastLogin)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Profile Status</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {user.profileComplete ? (
                        <span className="text-green-600">Complete</span>
                      ) : (
                        <span className="text-orange-600">Incomplete</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">User Permissions</h3>
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <p className="text-gray-600">Permission management integration coming soon...</p>
                <p className="text-sm text-gray-500 mt-2">
                  This will show the user's specific permissions and access levels.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
              {loadingActivities ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading activities...</span>
                </div>
              ) : activities.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <p className="text-gray-600">No recent activity found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{activity.action}</h4>
                          <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                        </div>
                        <span className="text-xs text-gray-500">{formatDate(activity.timestamp)}</span>
                      </div>
                      {activity.ipAddress && (
                        <p className="text-xs text-gray-500 mt-2">IP: {activity.ipAddress}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
