'use client'

import { useState } from 'react'
import ReservedPropertyCard from './ReservedPropertyCard'

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

interface ReservedPropertiesTabProps {
  properties: ClientProperty[]
  onRefresh: () => void
}

export default function ReservedPropertiesTab({ properties, onRefresh }: ReservedPropertiesTabProps) {
  const [loading, setLoading] = useState(false)

  const handleMakeDeposit = async (propertyId: string, depositAmount: number) => {
    try {
      setLoading(true)

      const response = await fetch('/api/clients/make-deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ propertyId, depositAmount }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to process deposit')
      }

      onRefresh()
      alert('Deposit processed successfully! Property moved to My Properties.')
    } catch (error) {
      console.error('Error processing deposit:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to process deposit'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelReservation = async (propertyId: string) => {
    if (!confirm('Are you sure you want to cancel this reservation? The property will be returned to the marketplace.')) {
      return
    }

    try {
      setLoading(true)

      const response = await fetch('/api/clients/cancel-reservation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ propertyId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to cancel reservation')
      }

      onRefresh()
      alert('Reservation cancelled successfully!')
    } catch (error) {
      console.error('Error cancelling reservation:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to cancel reservation'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Reserved Properties</h2>
          <p className="text-gray-600 text-sm">
            Properties you have reserved. Make a deposit to secure your commitment.
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {properties.length} {properties.length === 1 ? 'property' : 'properties'} reserved
        </div>
      </div>

      {properties.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">🏠</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">No Reserved Properties</h3>
          <p className="text-gray-600 mb-4">
            You haven&apos;t reserved any properties yet. Browse saved properties to reserve one.
          </p>
          <button
            onClick={() => (window.location.href = '/client-portal')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Saved Properties
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {properties.map((property) => (
            <ReservedPropertyCard
              key={property.id}
              property={property}
              onMakeDeposit={handleMakeDeposit}
              onCancelReservation={handleCancelReservation}
              loading={loading}
            />
          ))}
        </div>
      )}
    </div>
  )
}
