'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../lib/auth-context'
import { LoadingCard } from '../../../components/ui/loading'
import { ErrorCard } from '../../../components/ui/error'
import RentalManagementTabs from '../../../components/rental-management/RentalManagementTabs'
import { useDashboardActions } from '../../../hooks/useDashboardActions'

export default function RentalManagementPage() {
  const { user, loading: authLoading } = useAuth()
  const { setCurrentTab } = useDashboardActions()

  // Update current tab in dashboard context
  useEffect(() => {
    setCurrentTab('rental-management')
  }, []) // Empty dependency array - only run once on mount
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDataRefresh = () => {
    // Handle data refresh across rental management components
    console.log('Rental management data refreshed')
  }

  if (authLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Rental Management</h1>
        </div>
        <LoadingCard title="Loading..." />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Rental Management</h1>
        </div>
        <ErrorCard
          title="Authentication Required"
          message="Please log in to access rental management"
          onRetry={() => {
            window.location.href = '/auth/login'
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Rental Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Comprehensive rental property management system
          </p>
        </div>
      </div>

      {/* Rental Management System */}
      <RentalManagementTabs onDataRefresh={handleDataRefresh} />
    </div>
  )
}
