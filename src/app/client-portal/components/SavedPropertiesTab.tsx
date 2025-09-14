'use client'

import { useState } from 'react'
import SavedPropertyCard from './SavedPropertyCard'

interface ClientProperty {
  id: string
  name: string
  location: string
  physical_address?: string
  lat?: number | null
  lng?: number | null
  property_type: string
  property_type_display?: string
  asking_price_kes: number
  description?: string
  total_area_acres?: number
  total_area_sqm?: number
  bedrooms?: number
  bathrooms?: number
  parking_spaces?: number
  handover_status: string
  handover_status_display?: string
  handover_progress: number
  current_stage: string
  images: string[]
  main_image?: string
  interest_date: string
  status: 'INTERESTED' | 'RESERVED' | 'COMMITTED' | 'IN_HANDOVER' | 'COMPLETED'
}

interface SavedPropertiesTabProps {
  properties: ClientProperty[]
  onRefresh: () => void
  onTabChange?: (tab: 'my-properties' | 'purchase-pipeline' | 'saved-properties' | 'reserved') => void
}

export default function SavedPropertiesTab({ properties, onRefresh, onTabChange }: SavedPropertiesTabProps) {
  const [loading, setLoading] = useState(false)

  const handleMoveToMyProperties = async (propertyId: string) => {
    try {
      setLoading(true)

      // Add a small delay to ensure session is synced
      await new Promise((resolve) => setTimeout(resolve, 100))

      const response = await fetch('/api/clients/commit-property', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ propertyId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))

        // If authentication error, try to refresh and retry once
        if (response.status === 401) {
          console.log('Authentication error, attempting to refresh session...')

          // Wait a bit longer and try again
          await new Promise((resolve) => setTimeout(resolve, 500))

          const retryResponse = await fetch('/api/clients/commit-property', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ propertyId }),
          })

          if (!retryResponse.ok) {
            const retryErrorData = await retryResponse
              .json()
              .catch(() => ({ error: 'Unknown error' }))
            throw new Error(retryErrorData.error || 'Failed to commit to property after retry')
          }

          // Retry succeeded
          onRefresh()
          alert('Property reserved and moved to Reserved successfully!')
          return
        }

        throw new Error(errorData.error || 'Failed to commit to property')
      }

      // Refresh the data to show updated status
      onRefresh()

      // Show success message and auto-switch to Reserved tab
      alert('Property reserved and moved to Reserved successfully!')

      // Automatically switch to Reserved tab to show the moved property
      if (onTabChange) {
        setTimeout(() => {
          onTabChange('reserved')
        }, 500) // Small delay to allow data refresh
      }
    } catch (error) {
      console.error('Error committing to property:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to commit to property'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFromSaved = async (propertyId: string) => {
    if (!confirm('Are you sure you want to remove this property from your saved properties?')) {
      return
    }

    try {
      setLoading(true)

      // Add a small delay to ensure session is synced
      await new Promise((resolve) => setTimeout(resolve, 100))

      const response = await fetch('/api/clients/remove-interest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ propertyId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))

        // If authentication error, try to refresh and retry once
        if (response.status === 401) {
          console.log('Authentication error, attempting to refresh session...')

          // Wait a bit longer and try again
          await new Promise((resolve) => setTimeout(resolve, 500))

          const retryResponse = await fetch('/api/clients/remove-interest', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ propertyId }),
          })

          if (!retryResponse.ok) {
            const retryErrorData = await retryResponse
              .json()
              .catch(() => ({ error: 'Unknown error' }))
            throw new Error(retryErrorData.error || 'Failed to remove property after retry')
          }

          // Retry succeeded
          onRefresh()
          alert('Property removed from saved properties successfully!')
          return
        }

        throw new Error(errorData.error || 'Failed to remove property')
      }

      // Refresh the data to show updated status
      onRefresh()

      // Show success message
      alert('Property removed from saved properties successfully!')
    } catch (error) {
      console.error('Error removing property:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to remove property'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Saved Properties</h2>
          <p className="text-gray-600 text-sm">
            Properties you have expressed interest in from the marketplace
          </p>
        </div>
        <button
          onClick={() => (window.location.href = '/marketplace')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Browse Properties
        </button>
      </div>

      {properties.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">💾</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">No Saved Properties</h3>
          <p className="text-gray-600 mb-4">
            You haven&apos;t saved any properties yet. Browse the marketplace to find properties
            you&apos;re interested in.
          </p>
          <button
            onClick={() => (window.location.href = '/marketplace')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Marketplace
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {properties.map((property) => (
            <SavedPropertyCard
              key={property.id}
              property={property}
              onMoveToMyProperties={handleMoveToMyProperties}
              onRemoveFromSaved={handleRemoveFromSaved}
              loading={loading}
            />
          ))}
        </div>
      )}
    </div>
  )
}
