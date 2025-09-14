'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { formatCurrency } from '../../../lib/export-utils'

import {
  useTabState,
  TabNavigation,
  TabContent,
  HANDOVER_TABS,
  useTabNavigation,
} from '../../../components/properties/utils/tab-utils'
import HandoverDocumentsV2 from '../../../components/properties/components/HandoverDocumentsV2'
import PropertyAcquisitionFinancials from '../../../components/properties/components/PropertyAcquisitionFinancials'
import HandoverDetailsForm from '../../../components/properties/components/HandoverDetailsForm'

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
  status: 'INTERESTED' | 'IN_HANDOVER' | 'COMPLETED'
}

interface ClientPropertyCardProps {
  property: ClientProperty
  showReferralButton?: boolean
}

export default function ClientPropertyCard({ property, showReferralButton = false }: ClientPropertyCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [showStartHandoverForm, setShowStartHandoverForm] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const hasImage = property.images && property.images.length > 0

  // Tab state for the inline handover view (mirror of admin)
  const { activeTab, setActiveTab } = useTabState({
    defaultTab: 'details',
    persistKey: `client-handover-${property.id}`,
  })

  // Listen for cross-component navigation (mirror of admin)
  useTabNavigation(property.id, setActiveTab)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'INTERESTED':
        return 'bg-blue-100 text-blue-800'
      case 'IN_HANDOVER':
        return 'bg-yellow-100 text-yellow-800'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'INTERESTED':
        return 'Interest Expressed'
      case 'IN_HANDOVER':
        return 'In Progress'
      case 'COMPLETED':
        return 'Completed'
      default:
        return status
    }
  }

  // Mirror of admin handover status colors
  const getHandoverStatusColor = (status: string): string => {
    const colors = {
      COMPLETED: 'bg-green-100 text-green-800',
      CLOSING: 'bg-blue-100 text-blue-800',
      FINANCING: 'bg-yellow-100 text-yellow-800',
      DUE_DILIGENCE: 'bg-purple-100 text-purple-800',
      NEGOTIATING: 'bg-orange-100 text-orange-800',
      IDENTIFIED: 'bg-gray-100 text-gray-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
    } as const
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  // Click outside to close expanded view
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setShowDetails(false)
      }
    }

    if (showDetails) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDetails])

  const handleToggleDetails = () => {
    setShowDetails(!showDetails)
  }

  const handleStartHandover = () => {
    setShowStartHandoverForm(true)
  }

  const handleStartHandoverSubmit = async (data: any) => {
    try {
      // Call API to start handover process
      const response = await fetch(`/api/clients/start-handover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          propertyId: property.id,
          ...data,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to start handover')
      }

      // Success - refresh the page to show updated status
      window.location.reload()
    } catch (error) {
      // Error starting handover
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to start handover'}`)
    }
  }

  // Check if property can start handover (INTERESTED status with PENDING handover_status)
  // This ensures only properties that haven't started handover can be initiated by clients
  const canStartHandover =
    property.status === 'INTERESTED' &&
    (property.handover_status === 'PENDING' || !property.handover_status)

  return (
    <div
      ref={cardRef}
      className="bg-gradient-to-r from-white via-blue-50/50 to-blue-100/30 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border-2 border-blue-200 hover:border-blue-300"
    >
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
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(property.status)}`}
            >
              {getStatusLabel(property.status)}
            </span>
          </div>

          {/* Price Badge */}
          <div className="absolute bottom-3 left-3">
            <div className="bg-white/95 backdrop-blur-sm text-gray-900 px-3 py-2 rounded-lg shadow-md">
              <p className="text-lg font-semibold">{formatCurrency(property.asking_price_kes)}</p>
            </div>
          </div>

          {/* Progress Overlay for IN_HANDOVER */}
          {property.status === 'IN_HANDOVER' && (
            <div className="absolute bottom-3 right-3">
              <div className="bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 relative">
                    <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="3"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="3"
                        strokeDasharray={`${property.handover_progress}, 100`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-medium text-blue-600">
                        {property.handover_progress}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Property Details Section - Horizontal Layout */}
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
            </div>

            {/* Action Buttons and Progress Section */}
            <div className="lg:w-80 lg:pl-6">
              {/* Progress Section */}
              {property.status === 'IN_HANDOVER' && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-blue-900">Handover Progress</span>
                    <span className="text-sm font-semibold text-blue-700">
                      {property.handover_progress}%
                    </span>
                  </div>

                  <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${property.handover_progress}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-blue-700">
                    <span>Stage: {property.current_stage}</span>
                    <span>{property.handover_progress < 100 ? 'In Progress' : 'Completed'}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* View on Maps Button - Light Green Style */}
                {property.lat && property.lng && (
                  <div className="flex justify-center">
                    <button
                      onClick={() => {
                        const url = `https://www.google.com/maps?q=${property.lat},${property.lng}`
                        window.open(url, '_blank')
                      }}
                      className="w-2/3 bg-gradient-to-r from-emerald-300 to-green-400 hover:from-emerald-400 hover:to-green-500 text-white px-4 py-3 rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                      title="View on Maps"
                    >
                      <div className="flex items-center justify-center space-x-2">
                        {/* Location Pin Icon */}
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>View on Maps</span>
                      </div>
                    </button>
                  </div>
                )}

                {/* Start Handover Button - For INTERESTED properties with PENDING handover status */}
                {canStartHandover && (
                  <button
                    onClick={handleStartHandover}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-3 rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>Start Handover</span>
                    </div>
                  </button>
                )}

                {property.status === 'IN_HANDOVER' && (
                  <>
                    <button
                      onClick={() =>
                        (window.location.href = `/client-portal/property/${property.id}`)
                      }
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-colors font-medium"
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>Track Progress</span>
                      </div>
                    </button>

                    {/* Small referral button - only shows when property appears outside its home tab */}
                    {showReferralButton && (
                      <button
                        onClick={() =>
                          (window.location.href = `/client-portal?tab=purchase-pipeline`)
                        }
                        className="mt-2 text-xs bg-green-50 hover:bg-green-100 text-green-700 px-2 py-1 rounded border border-green-200 transition-colors duration-200 flex items-center gap-1"
                        title="Go to Purchase Pipeline tab to manage this property"
                      >
                        🏢 Manage in Pipeline
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Details Button - Bottom of Card */}
      <div className="border-t border-blue-200 p-4 bg-blue-50/30">
        <button
          onClick={handleToggleDetails}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-3 rounded-lg text-center transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg border-2 border-blue-700 hover:border-blue-800"
        >
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{showDetails ? 'Hide Details' : 'View Details'}</span>
          </div>
        </button>
      </div>

      {/* Enhanced Expanded Details - Full Width Mirror of InlineHandoverView */}
      {showDetails && (
        <div className="mt-8 border-t-4 border-gradient-to-r from-blue-500 to-purple-500 pt-8 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 rounded-b-2xl">
          <div className="px-8 pb-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-6a1 1 0 00-1-1H9a1 1 0 00-1 1v6a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-gray-900">Property Details</h4>
                  <p className="text-gray-600">Comprehensive property information and progress</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 text-gray-700 hover:text-gray-900 px-6 py-3 rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Close Details</span>
                </div>
              </button>
            </div>

            {/* Enhanced Tab Navigation - Full Width */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 mb-8 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-1">
                <div className="bg-white rounded-xl">
                  <TabNavigation
                    tabs={HANDOVER_TABS}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    variant="underline"
                    className="px-6 py-2"
                  />
                </div>
              </div>
            </div>

            {/* Enhanced Tab Content - Full Width */}
            <div className="space-y-8">
              <TabContent activeTab={activeTab} tabId="details">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
                  <div className="space-y-10">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2 mb-4">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <svg
                              className="w-3 h-3 text-blue-600"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-6a1 1 0 00-1-1H9a1 1 0 00-1 1v6a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <h4 className="text-lg font-semibold text-gray-900">
                            Property Information
                          </h4>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                            <div className="text-gray-400 mt-0.5">🏠</div>
                            <div>
                              <span className="text-sm font-medium text-gray-500">
                                Property Name
                              </span>
                              <p className="text-gray-900 font-medium">{property.name}</p>
                            </div>
                          </div>
                          <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                            <div className="text-gray-400 mt-0.5">🏢</div>
                            <div>
                              <span className="text-sm font-medium text-gray-500">
                                Property Type
                              </span>
                              <p className="text-gray-900 font-medium">{property.property_type}</p>
                            </div>
                          </div>
                          <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                            <div className="text-gray-400 mt-0.5">📍</div>
                            <div>
                              <span className="text-sm font-medium text-gray-500">Location</span>
                              <p className="text-gray-900 font-medium">{property.location}</p>
                            </div>
                          </div>
                          <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="text-green-500 mt-0.5">💰</div>
                            <div>
                              <span className="text-sm font-medium text-green-600">
                                Asking Price
                              </span>
                              <p className="text-green-900 font-bold text-lg">
                                {formatCurrency(property.asking_price_kes)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center space-x-2 mb-4">
                          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                            <svg
                              className="w-3 h-3 text-green-600"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <h4 className="text-lg font-semibold text-gray-900">
                            Status Information
                          </h4>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                            <span
                              className={`px-4 py-2 rounded-full text-sm font-semibold shadow-sm ${getHandoverStatusColor(
                                property.handover_status || property.status
                              )}`}
                            >
                              {property.handover_status?.replace('_', ' ') ||
                                getStatusLabel(property.status)}
                            </span>
                          </div>

                          {property.status === 'IN_HANDOVER' && (
                            <>
                              <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                                <div className="text-blue-500 mt-0.5">📊</div>
                                <div className="flex-1">
                                  <span className="text-sm font-medium text-blue-600">
                                    Progress
                                  </span>
                                  <div className="mt-2">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-blue-900 font-bold">
                                        {property.handover_progress}%
                                      </span>
                                    </div>
                                    <div className="w-full bg-blue-200 rounded-full h-2">
                                      <div
                                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${property.handover_progress}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <div className="text-gray-400 mt-0.5">🎯</div>
                                <div>
                                  <span className="text-sm font-medium text-gray-500">
                                    Current Stage
                                  </span>
                                  <p className="text-gray-900 font-medium">
                                    {property.current_stage}
                                  </p>
                                </div>
                              </div>
                            </>
                          )}

                          <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                            <div className="text-gray-400 mt-0.5">📅</div>
                            <div>
                              <span className="text-sm font-medium text-gray-500">
                                Interest Date
                              </span>
                              <p className="text-gray-900 font-medium">
                                {new Date(property.interest_date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabContent>

              <TabContent activeTab={activeTab} tabId="documents">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
                  <div className="flex items-center space-x-4 mb-8">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-6a1 1 0 00-1-1H9a1 1 0 00-1 1v6a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">Documents & Progress</h3>
                      <p className="text-gray-600">Track document submission and approval status</p>
                    </div>
                  </div>
                  <HandoverDocumentsV2
                    propertyId={property.id}
                    propertyName={property.name}
                    readOnly={true}
                  />
                </div>
              </TabContent>

              <TabContent activeTab={activeTab} tabId="financial">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
                  <div className="flex items-center space-x-4 mb-8">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">Financial Information</h3>
                      <p className="text-gray-600">View payment schedules and financial details</p>
                    </div>
                  </div>
                  <PropertyAcquisitionFinancials
                    property={
                      {
                        id: property.id,
                        name: property.name,
                        address: property.location,
                        property_type: property.property_type,
                        purchase_price_agreement_kes: property.asking_price_kes,
                        created_at: property.interest_date,
                        updated_at: new Date().toISOString(),
                      } as any
                    }
                    readOnly={true}
                  />
                </div>
              </TabContent>
            </div>
          </div>
        </div>
      )}

      {/* Start Handover Form Modal */}
      {showStartHandoverForm && (
        <HandoverDetailsForm
          isOpen={showStartHandoverForm}
          onClose={() => setShowStartHandoverForm(false)}
          onSubmit={handleStartHandoverSubmit}
          property={{
            id: property.id,
            name: property.name,
            physical_address: property.location,
            asking_price_kes: property.asking_price_kes,
          }}
          mode="start"
          context="client"
        />
      )}
    </div>
  )
}
