'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../components/auth/AuthProvider'
import { LoadingCard } from '../../components/ui/loading'
import { ErrorCard } from '../../components/ui/error'
import ClientPropertyCard from '../../components/marketplace/ClientPropertyCard'
import InlineHandoverView from '../../components/properties/components/InlineHandoverView'
import ClientWelcomeModal from './components/ClientWelcomeModal'
import ClientNavigation from './components/ClientNavigation'
import supabase from '../../lib/supabase-client'

interface ClientProperty {
  id: string
  name: string
  location: string
  property_type: string
  asking_price_kes: number
  handover_status: string
  handover_progress: number
  current_stage: string
  images: string[]
  interest_date: string
  status: 'INTERESTED' | 'IN_HANDOVER' | 'COMPLETED'
}

interface ClientData {
  id: string
  full_name: string
  email: string
  phone?: string
  registration_date: string
  properties: ClientProperty[]
}

export default function ClientPortalPage() {
  const [clientData, setClientData] = useState<ClientData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'properties' | 'documents' | 'profile'>('overview')
  const [authRetryCount, setAuthRetryCount] = useState(0)

  const { user, signOut } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    console.log('🔍 Client Portal - Loading user data')

    // Check if this is a welcome redirect
    if (searchParams.get('welcome') === 'true') {
      setShowWelcome(true)
    }

    // Load real user data if authenticated, otherwise demo data
    if (user) {
      loadUserData()
    } else {
      loadDemoData()
    }
  }, [user, router, searchParams])

  const loadUserData = async () => {
    console.log('🔍 Client Portal - Loading real user data')
    console.log('🔍 User object:', user)
    console.log('🔍 User metadata:', user?.user_metadata)

    try {
      setLoading(true)
      setError(null)

      // Load client data from API
      const response = await fetch('/api/clients/dashboard', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('🚫 Client Portal - Authentication required')
          // Fall back to basic user data
          setClientData({
            id: user?.id || 'unknown',
            full_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
            email: user?.email || 'unknown@example.com',
            phone: user?.user_metadata?.phone || null,
            registration_date: user?.created_at || new Date().toISOString(),
            properties: []
          })
          setLoading(false)
          return
        }
        throw new Error('Failed to load client data')
      }

      const data = await response.json()

      if (data.success) {
        console.log('✅ Client Portal - Data loaded successfully:', data.client)
        setClientData(data.client)
      } else {
        throw new Error(data.error || 'Failed to load client data')
      }

    } catch (error) {
      console.error('❌ Client Portal - Error loading data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load client data')

      // Fall back to basic user data
      const fullName = typeof user?.user_metadata?.full_name === 'object'
        ? user?.user_metadata?.full_name?.full_name
        : user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'

      setClientData({
        id: user?.id || 'unknown',
        full_name: fullName,
        email: user?.email || 'unknown@example.com',
        phone: user?.user_metadata?.phone || null,
        registration_date: user?.created_at || new Date().toISOString(),
        properties: []
      })
    } finally {
      setLoading(false)
    }
  }

  const loadDemoData = () => {
    console.log('🔍 Client Portal - Loading demo data')
    setLoading(false)
    setClientData({
      id: 'demo-user',
      full_name: 'Demo User',
      email: 'demo@example.com',
      phone: '+254700000000',
      registration_date: new Date().toISOString(),
      properties: []
    })
  }

  // Removed the problematic API call for now

  const handleSignOut = async () => {
    try {
      const { error } = await signOut()
      if (error) {
        console.error('❌ Logout failed:', error)
        alert(`Logout failed: ${error}`)
      }
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <LoadingCard message="Loading your dashboard..." />
        </div>
      </div>
    )
  }

  if (error || !clientData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <ErrorCard message={error || 'Failed to load client data'} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome, {typeof clientData.full_name === 'string' ? clientData.full_name : 'User'}
              </h1>
              <p className="text-gray-600">Your Property Journey Dashboard</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/marketplace')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Browse Properties
              </button>
              <button
                onClick={handleSignOut}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <ClientNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Content */}
        <div className="mt-8">
          {activeTab === 'overview' && (
            <OverviewTab clientData={clientData} />
          )}
          
          {activeTab === 'properties' && (
            <PropertiesTab properties={clientData.properties} clientData={clientData} />
          )}
          
          {activeTab === 'documents' && (
            <DocumentsTab properties={clientData.properties} />
          )}
          
          {activeTab === 'profile' && (
            <ProfileTab clientData={clientData} onUpdate={() => {}} />
          )}
        </div>
      </div>

      {/* Welcome Modal */}
      {showWelcome && (
        <ClientWelcomeModal
          clientName={typeof clientData.full_name === 'string' ? clientData.full_name : 'User'}
          onClose={() => setShowWelcome(false)}
          propertyId={searchParams.get('property')}
        />
      )}
    </div>
  )
}

function OverviewTab({ clientData }: { clientData: ClientData }) {
  const totalProperties = clientData.properties.length
  const inHandoverProperties = clientData.properties.filter(p => p.status === 'IN_HANDOVER').length
  const completedProperties = clientData.properties.filter(p => p.status === 'COMPLETED').length

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">🏠</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Properties</p>
              <p className="text-2xl font-bold text-gray-900">{totalProperties}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">⏳</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{inHandoverProperties}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{completedProperties}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        {clientData.properties.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-4">🏠</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Properties Yet</h4>
            <p className="text-gray-600 mb-4">Start by expressing interest in a property</p>
            <button
              onClick={() => window.location.href = '/marketplace'}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Properties
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {clientData.properties.slice(0, 3).map((property) => (
              <div key={property.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">{property.name}</h4>
                  <p className="text-sm text-gray-600">{property.current_stage}</p>
                </div>
                <div className="text-right">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${property.handover_progress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{property.handover_progress}% complete</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PropertiesTab({ properties, clientData }: { properties: ClientProperty[]; clientData: ClientData | null }) {
  // The properties parameter already contains the client's interested properties
  // No need to load marketplace properties here - this should show only client's interests
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Click outside to close expanded property
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setExpandedProperty(null)
      }
    }

    if (expandedProperty) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [expandedProperty])

  const handleViewDetails = (propertyId: string) => {
    // Navigate to property details in client context
    window.location.href = `/marketplace/property/${propertyId}`
  }

  const handleToggleExpanded = (propertyId: string) => {
    setExpandedProperty(expandedProperty === propertyId ? null : propertyId)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">My Properties</h2>
          <p className="text-gray-600 text-sm">Properties you have expressed interest in</p>
        </div>
        <button
          onClick={() => window.location.href = '/marketplace'}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Browse Properties
        </button>
      </div>

      {properties.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">🏠</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">No Properties Yet</h3>
          <p className="text-gray-600 mb-4">You haven't expressed interest in any properties yet</p>
          <button
            onClick={() => window.location.href = '/marketplace'}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Marketplace
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {properties.map((property) => {
            // Transform client property to handover format for InlineHandoverView
            const handoverData = {
              id: String(property.id),
              property_id: String(property.id),
              property_name: String(property.name || 'Unknown Property'),
              property_type: String(property.property_type || 'Unknown'),
              property_address: String(property.address || 'Address not specified'),
              handover_status: String(property.current_stage || 'IN_PROGRESS'),
              buyer_name: String(clientData?.full_name || 'You'),
              buyer_contact: String(clientData?.phone || ''),
              buyer_email: String(clientData?.email || ''),
              buyer_address: '',
              asking_price_kes: Number(property.asking_price) || 0,
              negotiated_price_kes: Number(property.negotiated_price || property.asking_price) || 0,
              current_stage: 1,
              overall_progress: Number(property.progress) || 0,
              pipeline_stages: [],
              created_at: String(property.created_at || new Date().toISOString()),
              updated_at: String(property.updated_at || new Date().toISOString())
            }

            return (
              <div key={property.id} ref={expandedProperty === property.id ? containerRef : null} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Property Card Header */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">🏠</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{handoverData.property_name}</h3>
                        <p className="text-sm text-gray-600">{handoverData.property_address}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {handoverData.handover_status}
                          </span>
                          <span className="text-sm text-gray-500">
                            Progress: {handoverData.overall_progress}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleExpanded(property.id)}
                      className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <span>{expandedProperty === property.id ? 'Hide Details' : 'View Details'}</span>
                      <svg
                        className={`w-4 h-4 transition-transform ${expandedProperty === property.id ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Expandable Content */}
                {expandedProperty === property.id && (
                  <div className="p-6 bg-gray-50">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm text-blue-800 font-medium">
                            📖 Read-Only View - This is your property progress dashboard
                          </p>
                        </div>
                      </div>
                      <InlineHandoverView
                        handover={handoverData}
                        onClose={() => {}} // No close action needed in client view
                        onStageClick={() => {}} // Read-only - no stage interaction
                        onStageUpdate={async () => {}} // Read-only - no updates allowed
                        readOnly={true} // Client view is read-only
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DocumentsTab({ properties }: { properties: ClientProperty[] }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Documents & Progress</h2>
      
      {properties.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">📄</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">No Documents Yet</h3>
          <p className="text-gray-600">Documents will appear here once you have properties in progress</p>
        </div>
      ) : (
        <div className="space-y-6">
          {properties.map((property) => (
            <div key={property.id} className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{property.name}</h3>
              <div className="text-gray-600">
                <p>Document tracking will be implemented here</p>
                <p className="text-sm mt-2">Current Stage: {property.current_stage}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProfileTab({ clientData, onUpdate }: { clientData: ClientData; onUpdate: () => void }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Profile Settings</h2>
      
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <p className="mt-1 text-gray-900">{typeof clientData.full_name === 'string' ? clientData.full_name : 'User'}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1 text-gray-900">{clientData.email}</p>
          </div>
          
          {clientData.phone && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <p className="mt-1 text-gray-900">{clientData.phone}</p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Member Since</label>
            <p className="mt-1 text-gray-900">
              {new Date(clientData.registration_date).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
