'use client'

import { useState } from 'react'
import Image from 'next/image'
import { formatCurrency } from '../../../lib/export-utils'

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

interface ReservedPropertyCardProps {
  property: ClientProperty
  onMakeDeposit: (propertyId: string, depositAmount: number) => void
  onCancelReservation: (propertyId: string) => void
  loading: boolean
}

export default function ReservedPropertyCard({
  property,
  onMakeDeposit,
  onCancelReservation,
  loading,
}: ReservedPropertyCardProps) {
  const [imageError, setImageError] = useState(false)
  const [showDepositForm, setShowDepositForm] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const hasImage = property.images && property.images.length > 0

  // Calculate suggested deposit (10% of asking price)
  const suggestedDeposit = Math.round(property.asking_price_kes * 0.1)
  const minimumDeposit = Math.round(property.asking_price_kes * 0.05) // 5% minimum

  const handleDepositSubmit = () => {
    const amount = parseFloat(depositAmount)
    if (isNaN(amount) || amount < minimumDeposit) {
      alert(`Minimum deposit is ${formatCurrency(minimumDeposit)}`)
      return
    }
    if (amount > property.asking_price_kes) {
      alert('Deposit cannot exceed the property price')
      return
    }
    onMakeDeposit(property.id, amount)
    setShowDepositForm(false)
    setDepositAmount('')
  }

  return (
    <div className="bg-gradient-to-r from-white via-orange-50/50 to-orange-100/30 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border-2 border-orange-200 hover:border-orange-300">
      {/* Horizontal Layout Container */}
      <div className="flex flex-col lg:flex-row">
        {/* Property Image Section */}
        <div className="relative lg:w-80 h-64 lg:h-auto bg-gray-100 flex items-center justify-center">
          {hasImage && !imageError ? (
            <Image
              src={property.images?.[0] || ''}
              alt={property.name}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400">
              <div className="text-4xl mb-2">🏠</div>
              <span className="text-sm font-medium">No Image Available</span>
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              Reserved
            </span>
          </div>

          {/* Price Badge */}
          <div className="absolute bottom-3 left-3">
            <div className="bg-white/95 backdrop-blur-sm text-gray-900 px-3 py-2 rounded-lg shadow-md">
              <p className="text-lg font-semibold">{formatCurrency(property.asking_price_kes)}</p>
            </div>
          </div>
        </div>

        {/* Property Details Section */}
        <div className="flex-1 p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-6">
            {/* Property Info */}
            <div className="flex-1 mb-4 lg:mb-0">
              <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
                {property.name}
              </h3>

              <div className="flex items-center text-gray-600 mb-3">
                <svg className="w-4 h-4 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm">{property.location}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  {property.property_type}
                </span>
              </div>

              <div className="text-sm text-gray-600 mb-4">
                <p className="mb-2">
                  Reserved on:{' '}
                  {new Date(property.interest_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-orange-800 font-medium text-sm">
                    ⏰ Reservation expires in 72 hours
                  </p>
                  <p className="text-orange-600 text-xs mt-1">
                    Make a deposit to secure this property permanently
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons Section */}
            <div className="lg:w-80 lg:pl-6">
              <div className="space-y-4">
                {!showDepositForm ? (
                  <>
                    {/* Make Deposit Button */}
                    <button
                      onClick={() => setShowDepositForm(true)}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-4 rounded-lg transition-all duration-200 font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-center space-x-3">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                          <path
                            fillRule="evenodd"
                            d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>Make Deposit</span>
                      </div>
                    </button>

                    {/* Secondary Actions */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* View Maps */}
                      <button
                        onClick={() => {
                          if (property.lat && property.lng) {
                            const url = `https://www.google.com/maps?q=${property.lat},${property.lng}`
                            window.open(url, '_blank')
                          } else {
                            alert('Location coordinates not available for this property')
                          }
                        }}
                        className="bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-700 px-4 py-3 rounded-lg transition-all duration-200 font-medium border border-blue-200 hover:border-blue-300"
                      >
                        <div className="flex items-center justify-center space-x-2">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-sm">View Maps</span>
                        </div>
                      </button>

                      {/* Cancel Reservation */}
                      <button
                        onClick={() => onCancelReservation(property.id)}
                        disabled={loading}
                        className="bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 text-red-700 px-4 py-3 rounded-lg transition-all duration-200 font-medium border border-red-200 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center justify-center space-x-2">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-sm">Cancel</span>
                        </div>
                      </button>
                    </div>
                  </>
                ) : (
                  /* Deposit Form */
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Make Initial Deposit</h4>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Deposit Amount (KES)
                      </label>
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder={`Minimum: ${formatCurrency(minimumDeposit)}`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      <div className="mt-2 text-xs text-gray-500">
                        <p>Suggested: {formatCurrency(suggestedDeposit)} (10%)</p>
                        <p>Minimum: {formatCurrency(minimumDeposit)} (5%)</p>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={handleDepositSubmit}
                        disabled={loading || !depositAmount}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Processing...' : 'Confirm Deposit'}
                      </button>
                      <button
                        onClick={() => {
                          setShowDepositForm(false)
                          setDepositAmount('')
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
