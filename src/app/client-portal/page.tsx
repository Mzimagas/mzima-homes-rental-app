'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../components/auth/AuthProvider'
import { LoadingCard } from '../../components/ui/loading'
import { ErrorCard } from '../../components/ui/error'
import ClientWelcomeModal from './components/ClientWelcomeModal'
import ClientNavigation from './components/ClientNavigation'
import ProfileTab from './components/ProfileTab'
import ClientPropertyCard from './components/ClientPropertyCard'
import CompletedProjectsTab from './components/CompletedProjectsTab'

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
  const [activeTab, setActiveTab] = useState<'profile' | 'properties' | 'completed'>('properties')
  const [authRetryCount, setAuthRetryCount] = useState(0)

  const { user, signOut } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    console.log('🔍 Client Portal - Loading user data')
    console.log('🔍 Client Portal - User authenticated:', !!user)
    console.log('🔍 Client Portal - User ID:', user?.id)

    // Check if this is a welcome redirect
    if (searchParams.get('welcome') === 'true') {
      setShowWelcome(true)
    }

    // Load real user data if authenticated, otherwise demo data
    if (user) {
      console.log('🔍 Client Portal - Loading authenticated user data')
      loadUserData()
    } else {
      console.log('🔍 Client Portal - Loading demo data (no user)')
      loadDemoData()
    }
  }, [user, router, searchParams])

  const loadClientData = async () => {
    if (user) {
      await loadUserData()
    } else {
      loadDemoData()
    }
  }

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
        console.log('✅ Client Portal - Properties count:', data.client.properties?.length || 0)
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
          <LoadingCard />
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
          {activeTab === 'properties' && (
            <PropertiesTab
              properties={clientData.properties}
            />
          )}

          {activeTab === 'completed' && (
            <CompletedProjectsTab properties={clientData.properties} />
          )}

          {activeTab === 'profile' && (
            <ProfileTab clientData={clientData} onUpdate={loadClientData} />
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

function PropertiesTab({
  properties
}: {
  properties: ClientProperty[]
}) {
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
          {properties.map((property) => (
            <ClientPropertyCard
              key={property.id}
              property={property}
            />
          ))}
        </div>
      )}
    </div>
  )
}
