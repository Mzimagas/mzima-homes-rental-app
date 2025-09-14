'use client'

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../components/auth/AuthProvider'
import { LoadingCard } from '../../components/ui/loading'
import { ErrorCard } from '../../components/ui/error'
import ClientWelcomeModal from './components/ClientWelcomeModal'
import ClientNavigation from './components/ClientNavigation'

// Lazy load tab components for better performance
const ProfileTab = lazy(() => import('./components/ProfileTab'))
const SavedPropertiesTab = lazy(() => import('./components/SavedPropertiesTab'))
const ReservedPropertiesTab = lazy(() => import('./components/ReservedPropertiesTab'))
const MyPropertiesRepositoryTab = lazy(() => import('./components/PropertiesTab'))
const InProgressTab = lazy(() => import('./components/InProgressTab'))

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
  const [activeTab, setActiveTab] = useState<
    'my-properties' | 'purchase-pipeline' | 'saved-properties' | 'reserved'
  >('my-properties')
  const [showProfile, setShowProfile] = useState(false)
  const [dataFetched, setDataFetched] = useState(false)

  const { user, signOut } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const loadUserData = useCallback(async () => {
    // Prevent duplicate API calls
    if (dataFetched) return
    // Loading real user data

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
          // Authentication required
          // Fall back to basic user data
          setClientData({
            id: user?.id || 'unknown',
            full_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
            email: user?.email || 'unknown@example.com',
            phone: user?.user_metadata?.phone || null,
            registration_date: user?.created_at || new Date().toISOString(),
            properties: [],
          })
          setLoading(false)
          return
        }
        throw new Error('Failed to load client data')
      }

      const data = await response.json()

      if (data.success) {
        // Data loaded successfully
        setClientData(data.client)
      } else {
        throw new Error(data.error || 'Failed to load client data')
      }
    } catch (error) {
      // Error loading data
      setError(error instanceof Error ? error.message : 'Failed to load client data')

      // Fall back to basic user data
      const fullName =
        typeof user?.user_metadata?.full_name === 'object'
          ? user?.user_metadata?.full_name?.full_name
          : user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'

      setClientData({
        id: user?.id || 'unknown',
        full_name: fullName,
        email: user?.email || 'unknown@example.com',
        phone: user?.user_metadata?.phone || null,
        registration_date: user?.created_at || new Date().toISOString(),
        properties: [],
      })
    } finally {
      setLoading(false)
      setDataFetched(true)
    }
  }, [user, dataFetched])

  useEffect(() => {
    // Loading user data

    // Check if this is a welcome redirect
    if (searchParams.get('welcome') === 'true') {
      setShowWelcome(true)
    }

    // Handle tab parameter from URL
    const tabParam = searchParams.get('tab')
    if (
      tabParam &&
      ['my-properties', 'purchase-pipeline', 'saved-properties', 'reserved'].includes(tabParam)
    ) {
      setActiveTab(
        tabParam as 'my-properties' | 'purchase-pipeline' | 'saved-properties' | 'reserved'
      )
    }

    // Load real user data if authenticated, otherwise demo data
    if (user) {
      // Loading authenticated user data
      loadUserData()
    } else {
      // Loading demo data (no user)
      loadDemoData()
    }
  }, [user, router, searchParams, loadUserData])

  const loadClientData = async () => {
    if (user) {
      await loadUserData()
    } else {
      loadDemoData()
    }
  }

  // Memoized property filters for better performance
  const savedProperties = useMemo(() =>
    clientData?.properties.filter((p) => p.status === 'INTERESTED') || [],
    [clientData?.properties]
  )

  const reservedProperties = useMemo(() =>
    clientData?.properties.filter((p) => p.status === 'RESERVED') || [],
    [clientData?.properties]
  )

  const myProperties = useMemo(() =>
    clientData?.properties.filter((p) => p.status === 'COMMITTED' || p.status === 'IN_HANDOVER') || [],
    [clientData?.properties]
  )

  const completedProperties = useMemo(() =>
    clientData?.properties.filter((p) => p.status === 'COMPLETED') || [],
    [clientData?.properties]
  )

  const loadDemoData = () => {
    // Loading demo data
    setLoading(false)
    setClientData({
      id: 'demo-user',
      full_name: 'Demo User',
      email: 'demo@example.com',
      phone: '+254700000000',
      registration_date: new Date().toISOString(),
      properties: [],
    })
  }

  // Removed the problematic API call for now

  const handleSignOut = async () => {
    try {
      const { error } = await signOut()
      if (error) {
        // Logout failed
        alert(`Logout failed: ${error}`)
      } else {
        // Successful logout - redirect to home page
        router.push('/')
      }
    } catch (error) {
      // Error signing out
      console.error('Sign out error:', error)
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
                onClick={() => setShowProfile(true)}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-700 font-medium"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Profile</span>
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
        <ClientNavigation
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab)
            // Update URL parameter
            const newSearchParams = new URLSearchParams(searchParams.toString())
            newSearchParams.set('tab', tab)
            router.replace(`/client-portal?${newSearchParams.toString()}`)
          }}
        />

        {/* Content */}
        <div className="mt-8">
          <Suspense fallback={<LoadingCard />}>
            {activeTab === 'my-properties' && (
              <MyPropertiesRepositoryTab
                savedProperties={savedProperties}
                reservedProperties={reservedProperties}
                myProperties={myProperties}
                completedProperties={completedProperties}
              onRemoveFromSaved={(propertyId) => {
                // Handle remove from saved
                // TODO: Implement remove from saved functionality
              }}
              onMoveToMyProperties={(propertyId) => {
                // Handle move to my properties
                // TODO: Implement move to my properties functionality
              }}
              onDueDiligence={(propertyId) => {
                // Handle due diligence
                // TODO: Implement due diligence functionality
              }}
              onViewMaps={(propertyId) => {
                // Handle view maps
                // TODO: Implement view maps functionality
              }}
              onPinLocation={(propertyId) => {
                // Handle pin location
                // TODO: Implement pin location functionality
              }}
              onCancelReservation={(propertyId) => {
                // Handle cancel reservation
                // TODO: Implement cancel reservation functionality
              }}
            />
          )}

          {activeTab === 'purchase-pipeline' && (
            <InProgressTab
              properties={[...myProperties, ...completedProperties]}
              onRefresh={loadClientData}
            />
          )}

          {activeTab === 'saved-properties' && (
            <SavedPropertiesTab
              properties={savedProperties}
              onRefresh={loadClientData}
              onTabChange={(tab) => {
                setActiveTab(tab)
                // Update URL parameter
                const newSearchParams = new URLSearchParams(searchParams.toString())
                newSearchParams.set('tab', tab)
                router.replace(`/client-portal?${newSearchParams.toString()}`)
              }}
            />
          )}

          {activeTab === 'reserved' && (
            <ReservedPropertiesTab
              properties={reservedProperties}
              onRefresh={loadClientData}
            />
          )}
          </Suspense>
        </div>

        {/* Profile Modal */}
        {showProfile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">Profile Settings</h2>
                <button
                  onClick={() => setShowProfile(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <ProfileTab clientData={clientData} onUpdate={loadClientData} />
              </div>
            </div>
          </div>
        )}
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
