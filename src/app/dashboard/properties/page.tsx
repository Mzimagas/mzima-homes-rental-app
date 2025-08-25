'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../lib/auth-context'
import { LoadingCard } from '../../../components/ui/loading'
import { ErrorCard } from '../../../components/ui/error'
import PropertyManagementTabs from '../../../components/properties/PropertyManagementTabs'
import { useDashboardActions } from '../../../hooks/useDashboardActions'



export default function PropertiesPage() {
  const { user, loading: authLoading } = useAuth()
  const { setCurrentTab } = useDashboardActions()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update current tab in dashboard context
  useEffect(() => {
    setCurrentTab('properties')
  }, [setCurrentTab])

  const handlePropertyCreated = () => {
    // Property creation is handled within the workflow components
    console.log('Property created successfully')
  }



  if (authLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Properties</h1>
        </div>
        <LoadingCard title="Loading..." />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Properties</h1>
        </div>
        <ErrorCard
          title="Authentication Required"
          message="Please log in to view your properties"
          onRetry={() => { window.location.href = '/auth/login' }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Properties</h1>
          <p className="mt-1 text-sm text-gray-500">
            Property creation and management workflows
          </p>
        </div>
      </div>

      {/* Property Management Workflows */}
      <PropertyManagementTabs
        onPropertyCreated={handlePropertyCreated}
        onRefreshProperties={handlePropertyCreated}
      />
    </div>
  )
}
