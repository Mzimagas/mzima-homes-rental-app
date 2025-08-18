'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth-context'
import supabase from '../../lib/supabase-client'
import { Property } from '../../lib/types/database'
import EnhancedPropertyForm from './EnhancedPropertyForm'
import PurchasePipelineManager from './PurchasePipelineManager'
import SubdivisionProcessManager from './SubdivisionProcessManager'
import { Button } from '../ui'

interface PropertyWithLifecycle extends Property {
  property_source?: string
  lifecycle_status?: string
  subdivision_status?: 'NOT_STARTED' | 'SUB_DIVISION_STARTED' | 'SUBDIVIDED'
  source_reference_id?: string
  parent_property_id?: string
  purchase_completion_date?: string
  subdivision_date?: string
  handover_status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  handover_date?: string
  acquisition_notes?: string
  expected_rental_income_kes?: number
  sale_price_kes?: number
  estimated_value_kes?: number
  total_area_sqm?: number
  total_area_acres?: number
}

interface PropertyManagementTabsProps {
  onPropertyCreated?: (propertyId: string) => void
  onRefreshProperties?: () => void
}

export default function PropertyManagementTabs({
  onPropertyCreated,
  onRefreshProperties
}: PropertyManagementTabsProps) {
  useAuth() // Keep auth context active
  const [activeTab, setActiveTab] = useState<'properties' | 'purchase' | 'subdivision' | 'handover'>('properties')
  const [properties, setProperties] = useState<PropertyWithLifecycle[]>([])
  const [handoverProperties, setHandoverProperties] = useState<PropertyWithLifecycle[]>([])
  const [loading, setLoading] = useState(true)
  const [handoverLoading, setHandoverLoading] = useState(false)
  const [showPropertyForm, setShowPropertyForm] = useState(false)
  const [editingProperty, setEditingProperty] = useState<PropertyWithLifecycle | null>(null)

  // State for managing pending changes
  const [pendingChanges, setPendingChanges] = useState<{[propertyId: string]: {
    subdivision?: string
    handover?: string
  }}>({})
  const [savingChanges, setSavingChanges] = useState<{[propertyId: string]: boolean}>({})

  useEffect(() => {
    loadProperties()
  }, [])

  useEffect(() => {
    if (activeTab === 'handover') {
      loadHandoverProperties()
    }
  }, [activeTab])

  const loadProperties = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          property_source,
          lifecycle_status,
          subdivision_status,
          handover_status,
          handover_date,
          source_reference_id,
          parent_property_id,
          purchase_completion_date,
          subdivision_date,
          acquisition_notes,
          expected_rental_income_kes,
          sale_price_kes,
          estimated_value_kes,
          total_area_sqm,
          total_area_acres
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProperties(data || [])
    } catch (error) {
      console.error('Error loading properties:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadHandoverProperties = async () => {
    try {
      setHandoverLoading(true)
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          property_source,
          lifecycle_status,
          subdivision_status,
          handover_status,
          handover_date,
          source_reference_id,
          parent_property_id,
          purchase_completion_date,
          subdivision_date,
          acquisition_notes,
          expected_rental_income_kes,
          sale_price_kes,
          estimated_value_kes,
          total_area_sqm,
          total_area_acres
        `)
        .eq('handover_status', 'IN_PROGRESS')
        .order('created_at', { ascending: false })

      if (error) throw error
      setHandoverProperties(data || [])
    } catch (error) {
      console.error('Error loading handover properties:', error)
    } finally {
      setHandoverLoading(false)
    }
  }

  const handlePropertyCreated = (propertyId: string) => {
    loadProperties()
    onPropertyCreated?.(propertyId)
    onRefreshProperties?.()
    setShowPropertyForm(false)
    setEditingProperty(null)
  }

  const handlePropertyTransferred = (propertyId: string) => {
    loadProperties()
    onPropertyCreated?.(propertyId)
    onRefreshProperties?.()
  }

  // Helper functions for managing pending changes
  const hasPendingChanges = (propertyId: string) => {
    const changes = pendingChanges[propertyId]
    const hasChanges = changes &&
           (changes.subdivision !== undefined ||
            changes.handover !== undefined)
    console.log('Checking pending changes for', propertyId, ':', { changes, hasChanges })
    return hasChanges
  }

  const getPendingSubdivisionValue = (property: PropertyWithLifecycle) => {
    const pending = pendingChanges[property.id]?.subdivision
    if (pending !== undefined) return pending

    // Map database subdivision_status to display values
    switch (property.subdivision_status) {
      case 'SUBDIVIDED':
        return 'Subdivided'
      case 'SUB_DIVISION_STARTED':
        return 'Sub-Division Started'
      case 'NOT_STARTED':
      default:
        return 'Not Started'
    }
  }

  const getPendingHandoverValue = (property: PropertyWithLifecycle) => {
    const pending = pendingChanges[property.id]?.handover
    if (pending !== undefined) return pending
    return property.handover_status === 'COMPLETED' ? 'Handed Over' :
           property.handover_status === 'IN_PROGRESS' ? 'In Progress' :
           'Not Started'
  }

  const handleSubdivisionChange = (propertyId: string, value: string) => {
    setPendingChanges(prev => ({
      ...prev,
      [propertyId]: {
        ...prev[propertyId],
        subdivision: value
      }
    }))
  }

  const handleHandoverChange = (propertyId: string, value: string) => {
    console.log('Handover change:', { propertyId, value })
    setPendingChanges(prev => {
      const newChanges = {
        ...prev,
        [propertyId]: {
          ...prev[propertyId],
          handover: value
        }
      }
      console.log('Updated pending changes:', newChanges)
      return newChanges
    })
  }

  const cancelChanges = (propertyId: string) => {
    setPendingChanges(prev => {
      const newChanges = { ...prev }
      delete newChanges[propertyId]
      return newChanges
    })
  }

  const saveChanges = async (propertyId: string) => {
    const changes = pendingChanges[propertyId]
    if (!changes) {
      console.log('No pending changes for property:', propertyId)
      return
    }

    console.log('Pending changes:', changes)
    setSavingChanges(prev => ({ ...prev, [propertyId]: true }))

    try {
      const updateData: any = {}

      // Handle subdivision status changes
      if (changes.subdivision !== undefined) {
        if (changes.subdivision === 'Subdivided') {
          const property = properties.find(p => p.id === propertyId)
          if (property?.lifecycle_status !== 'ACTIVE') {
            alert('Only ACTIVE properties can be marked as subdivided')
            setSavingChanges(prev => ({ ...prev, [propertyId]: false }))
            return
          }
          updateData.lifecycle_status = 'SUBDIVIDED'
          // For now, don't use subdivision_status until we confirm the column exists
        } else {
          // For "Not Started" or "Sub-Division Started", just keep lifecycle_status as ACTIVE
          // We'll implement subdivision_status tracking later
        }
      }

      // Handle handover status changes
      if (changes.handover !== undefined) {
        console.log('Processing handover change:', changes.handover)
        let newStatus: string
        let shouldSetDate = false

        if (changes.handover === 'Handed Over') {
          newStatus = 'COMPLETED'
          shouldSetDate = true
        } else if (changes.handover === 'In Progress') {
          newStatus = 'IN_PROGRESS'
        } else {
          newStatus = 'PENDING'
        }

        updateData.handover_status = newStatus
        if (shouldSetDate) {
          updateData.handover_date = new Date().toISOString().split('T')[0]
        } else if (newStatus !== 'COMPLETED') {
          updateData.handover_date = null
        }

        console.log('Handover update data:', { handover_status: newStatus, handover_date: updateData.handover_date })
      }

      // Check if we have any data to update
      if (Object.keys(updateData).length === 0) {
        console.error('No update data generated from changes:', changes)
        alert('No changes detected. Please try again.')
        setSavingChanges(prev => ({ ...prev, [propertyId]: false }))
        return
      }

      // Get CSRF token from cookie
      const getCsrfToken = () => {
        try {
          const match = document.cookie.split(';').map(p => p.trim()).find(p => p.startsWith('csrf-token='))
          if (!match) return null
          return decodeURIComponent(match.split('=')[1])
        } catch {
          return null
        }
      }

      const csrfToken = getCsrfToken()
      if (!csrfToken) {
        throw new Error('CSRF token not found. Please refresh the page and try again.')
      }

      // Get authentication session
      const { data: { session } } = await supabase.auth.getSession()

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
      }

      // Add auth token if available
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      // Log what we're about to send
      console.log('Sending update data:', updateData)
      console.log('Headers:', headers)

      // Make the API call
      const response = await fetch(`/api/properties/${propertyId}`, {
        method: 'PATCH',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error('API Error Response:', errorData)
        console.error('Update data that failed:', updateData)
        throw new Error(`Failed to update property: ${response.status} ${response.statusText}`)
      }

      const responseData = await response.json()
      console.log('API Success Response:', responseData)

      // Clear pending changes and reload properties
      cancelChanges(propertyId)
      await loadProperties()

      // Also reload handover properties if handover tab is active or if handover status was changed
      if (activeTab === 'handover' || changes.handover !== undefined) {
        await loadHandoverProperties()
      }

    } catch (err) {
      console.error('Error saving changes:', err)
      alert('Failed to save changes. Please try again.')
    } finally {
      setSavingChanges(prev => ({ ...prev, [propertyId]: false }))
    }
  }

  const getSourceIcon = (source?: string) => {
    switch (source) {
      case 'PURCHASE_PIPELINE': return '🏢'
      case 'SUBDIVISION_PROCESS': return '🏗️'
      case 'DIRECT_ADDITION':
      default: return '🏠'
    }
  }

  const getSourceLabel = (source?: string) => {
    switch (source) {
      case 'PURCHASE_PIPELINE': return 'Purchased'
      case 'SUBDIVISION_PROCESS': return 'From Subdivision'
      case 'DIRECT_ADDITION':
      default: return 'Direct Addition'
    }
  }

  const getLifecycleStatusColor = (status?: string) => {
    const colors = {
      'ACTIVE': 'bg-green-100 text-green-800',
      'SUBDIVIDED': 'bg-purple-100 text-purple-800',
      'PURCHASED': 'bg-blue-100 text-blue-800',
      'UNDER_DEVELOPMENT': 'bg-yellow-100 text-yellow-800',
      'INACTIVE': 'bg-gray-100 text-gray-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const tabs = [
    {
      id: 'properties',
      label: 'Properties',
      icon: '🏠',
      description: 'Manage all properties'
    },
    {
      id: 'purchase',
      label: 'Purchase Pipeline',
      icon: '🏢',
      description: 'Track property acquisitions'
    },
    {
      id: 'subdivision',
      label: 'Subdivision Process',
      icon: '🏗️',
      description: 'Manage property subdivisions'
    },
    {
      id: 'handover',
      label: 'Property Financials and Handover',
      icon: '📋',
      description: 'Manage properties in handover process'
    },

  ]

  return (
    <div className="space-y-6">
      {/* Header with Pathway Explanation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-blue-900 mb-3">Property Management Workflows</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 text-2xl">🏠</div>
            <div>
              <h3 className="font-semibold text-blue-800">Direct Addition</h3>
              <p className="text-sm text-blue-600">Manually create properties with full details and coordinates</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 text-2xl">🏢</div>
            <div>
              <h3 className="font-semibold text-blue-800">Purchase Pipeline</h3>
              <p className="text-sm text-blue-600">Track acquisitions and transfer completed purchases to properties</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 text-2xl">🏗️</div>
            <div>
              <h3 className="font-semibold text-blue-800">Subdivision Process</h3>
              <p className="text-sm text-blue-600">Subdivide existing properties into individual manageable plots</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 text-2xl">📋</div>
            <div>
              <h3 className="font-semibold text-blue-800">Property Handover</h3>
              <p className="text-sm text-blue-600">Manage financial settlements and property handover processes</p>
            </div>
          </div>

        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <div className="flex flex-col items-center space-y-1">
              <span className="text-lg">{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
              <span className="text-xs text-gray-500">{tab.description}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'properties' && (
          <div className="space-y-6">
            {/* Properties Header */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Properties Management</h3>
                <p className="text-gray-600">All properties from all creation pathways</p>
              </div>
              <Button
                onClick={() => {
                  setEditingProperty(null)
                  setShowPropertyForm(true)
                }}
                variant="primary"
              >
                <span className="mr-2">🏠</span>
                Add Property Directly
              </Button>
            </div>

            {/* Properties List */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading properties...</p>
              </div>
            ) : properties.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <div className="text-4xl mb-4">🏠</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Properties Yet</h3>
                <p className="text-gray-600 mb-6">Start by adding properties through any of the three pathways above.</p>
                <div className="flex justify-center space-x-3">
                  <Button
                    onClick={() => {
                      setEditingProperty(null)
                      setShowPropertyForm(true)
                    }}
                    variant="primary"
                  >
                    Add Property Directly
                  </Button>
                  <Button
                    onClick={() => setActiveTab('purchase')}
                    variant="secondary"
                  >
                    Start Purchase Process
                  </Button>
                  <Button
                    onClick={() => setActiveTab('subdivision')}
                    variant="secondary"
                  >
                    Subdivide Property
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-6">
                {properties.map((property) => (
                  <div key={property.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{property.name}</h3>
                          <span className="text-lg">{getSourceIcon(property.property_source)}</span>
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                            {getSourceLabel(property.property_source)}
                          </span>
                          {property.lifecycle_status && (
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getLifecycleStatusColor(property.lifecycle_status)}`}>
                              {property.lifecycle_status.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-2">{property.physical_address}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          <span>Type: {property.property_type?.replace('_', ' ') || 'Unknown'}</span>
                          {property.total_area_acres && (
                            <span>Area: {property.total_area_acres} acres</span>
                          )}
                          {property.expected_rental_income_kes && (
                            <span>Expected Rent: KES {property.expected_rental_income_kes.toLocaleString()}/month</span>
                          )}
                          {property.purchase_completion_date && (
                            <span>Purchased: {new Date(property.purchase_completion_date).toLocaleDateString()}</span>
                          )}
                          {property.subdivision_date && (
                            <span>Subdivided: {new Date(property.subdivision_date).toLocaleDateString()}</span>
                          )}
                        </div>
                        {/* Status Dropdowns */}
                        <div className="mt-4 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Subdivision Status Dropdown */}
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Subdivision Status</label>
                              <select
                                className="text-sm border rounded px-2 py-1 w-full"
                                value={getPendingSubdivisionValue(property)}
                                onChange={(e) => handleSubdivisionChange(property.id, e.target.value)}
                                disabled={savingChanges[property.id]}
                              >
                                <option>Not Started</option>
                                <option>Sub-Division Started</option>
                                <option>Subdivided</option>
                              </select>
                              {property.subdivision_date && (
                                <div className="text-xs text-gray-500 mt-1">on {new Date(property.subdivision_date).toLocaleDateString()}</div>
                              )}
                            </div>

                            {/* Handover Status Dropdown */}
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Handover Status</label>
                              <select
                                className="text-sm border rounded px-2 py-1 w-full"
                                value={getPendingHandoverValue(property)}
                                onChange={(e) => handleHandoverChange(property.id, e.target.value)}
                                disabled={savingChanges[property.id]}
                              >
                                <option>Not Started</option>
                                <option>In Progress</option>
                                <option>Handed Over</option>
                              </select>
                              {property.handover_date && (
                                <div className="text-xs text-gray-500 mt-1">on {new Date(property.handover_date).toLocaleDateString()}</div>
                              )}
                            </div>
                          </div>

                          {/* Save/Cancel Buttons */}
                          {hasPendingChanges(property.id) && (
                            <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
                              <Button
                                onClick={() => saveChanges(property.id)}
                                disabled={savingChanges[property.id]}
                                variant="primary"
                                size="sm"
                              >
                                {savingChanges[property.id] ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                    Saving...
                                  </>
                                ) : (
                                  'Save Changes'
                                )}
                              </Button>
                              <Button
                                onClick={() => cancelChanges(property.id)}
                                disabled={savingChanges[property.id]}
                                variant="secondary"
                                size="sm"
                              >
                                Cancel
                              </Button>
                              <div className="text-xs text-amber-600">
                                You have unsaved changes
                              </div>
                            </div>
                          )}
                        </div>

                        {property.acquisition_notes && (
                          <p className="text-sm text-gray-600 mt-2 italic">{property.acquisition_notes}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setEditingProperty(property)
                            setShowPropertyForm(true)
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            // Navigate to property details
                            window.location.href = `/dashboard/properties/${property.id}`
                          }}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>

                    {/* Property Metrics */}
                    {(property.sale_price_kes || property.estimated_value_kes) && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                        {property.sale_price_kes && (
                          <div>
                            <p className="text-xs text-gray-500">Purchase/Sale Price</p>
                            <p className="font-semibold text-green-600">KES {property.sale_price_kes.toLocaleString()}</p>
                          </div>
                        )}
                        {property.estimated_value_kes && (
                          <div>
                            <p className="text-xs text-gray-500">Estimated Value</p>
                            <p className="font-semibold">KES {property.estimated_value_kes.toLocaleString()}</p>
                          </div>
                        )}
                        {property.expected_rental_income_kes && (
                          <div>
                            <p className="text-xs text-gray-500">Monthly Rental Potential</p>
                            <p className="font-semibold text-blue-600">KES {property.expected_rental_income_kes.toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'purchase' && (
          <PurchasePipelineManager onPropertyTransferred={handlePropertyTransferred} />
        )}

        {activeTab === 'subdivision' && (
          <SubdivisionProcessManager onPropertyCreated={handlePropertyCreated} />
        )}

        {activeTab === 'handover' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Properties Financials and Handover</h3>
              <p className="text-sm text-gray-600 mt-1">
                Showing properties where handover status is "In Progress"
              </p>
            </div>

            {handoverLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading handover properties...</span>
              </div>
            ) : handoverProperties.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <div className="text-4xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Properties with Handover in Progress</h3>
                <p className="text-gray-600 mb-4">
                  Properties will appear here when their handover status is set to "In Progress" in the Properties tab.
                </p>
                <p className="text-sm text-gray-500">
                  To start handover on a property, go to Properties → change handover status to "In Progress" → Save Changes
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {handoverProperties.map((property) => (
                  <div key={property.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{property.name}</h4>
                        <p className="text-sm text-gray-600">{property.physical_address}</p>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        Handover In Progress
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Property Type:</span>
                          <div className="font-medium">{property.property_type?.replace('_', ' ')}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Area:</span>
                          <div className="font-medium">
                            {property.total_area_acres ? `${property.total_area_acres} acres` :
                             property.total_area_sqm ? `${property.total_area_sqm} sqm` : 'Not specified'}
                          </div>
                        </div>
                      </div>

                      {property.expected_rental_income_kes && (
                        <div className="text-sm">
                          <span className="text-gray-500">Expected Rental Income:</span>
                          <div className="font-medium text-green-600">KES {property.expected_rental_income_kes.toLocaleString()}</div>
                        </div>
                      )}

                      {property.sale_price_kes && (
                        <div className="text-sm">
                          <span className="text-gray-500">Sale Price:</span>
                          <div className="font-medium text-blue-600">KES {property.sale_price_kes.toLocaleString()}</div>
                        </div>
                      )}

                      <div className="pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-500">
                            Handover started: {property.handover_date ? new Date(property.handover_date).toLocaleDateString() : 'Date not set'}
                          </div>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              // TODO: Implement handover management functionality
                              alert('Handover management functionality coming soon!')
                            }}
                          >
                            Manage Handover
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Enhanced Property Form Modal */}
      <EnhancedPropertyForm
        isOpen={showPropertyForm}
        onSuccess={handlePropertyCreated}
        onCancel={() => {
          setShowPropertyForm(false)
          setEditingProperty(null)
        }}
        property={editingProperty}
        sourceType="DIRECT_ADDITION"
      />
    </div>
  )
}
