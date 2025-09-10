'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '../../../../components/auth/AuthProvider'
import { LoadingCard } from '../../../../components/ui/loading'
import { ErrorCard } from '../../../../components/ui/error'
import { formatCurrency } from '../../../../lib/export-utils'
import HandoverProgressTracker from '../components/HandoverProgressTracker'
import PropertyDocumentsView from '../components/PropertyDocumentsView'
import PropertyFinancialsView from '../components/PropertyFinancialsView'

interface PropertyHandoverData {
  id: string
  property: {
    id: string
    name: string
    location: string
    property_type: string
    asking_price_kes: number
    description?: string
    images: string[]
  }
  handover: {
    id: string
    handover_status: string
    current_stage: string
    overall_progress: number
    pipeline_stages: any[]
    created_at: string
    expected_completion_date?: string
  }
  client_access: {
    can_view_documents: boolean
    can_view_financials: boolean
    can_download_reports: boolean
  }
}

export default function ClientPropertyDetailPage() {
  const [propertyData, setPropertyData] = useState<PropertyHandoverData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'progress' | 'documents' | 'financials'>('progress')

  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const propertyId = params.id as string

  useEffect(() => {
    if (!user) {
      router.push('/auth/login?redirectTo=/client-portal')
      return
    }

    if (propertyId) {
      loadPropertyData()
    }
  }, [user, propertyId, router])

  const loadPropertyData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/clients/property/${propertyId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/login?redirectTo=/client-portal')
          return
        }
        if (response.status === 403) {
          throw new Error('You do not have access to this property')
        }
        if (response.status === 404) {
          throw new Error('Property not found')
        }
        throw new Error('Failed to load property data')
      }

      const data = await response.json()
      setPropertyData(data.property)
    } catch (err) {
      console.error('Error loading property data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load property data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <LoadingCard message="Loading property details..." />
        </div>
      </div>
    )
  }

  if (error || !propertyData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <ErrorCard message={error || 'Property not found'} />
          <div className="mt-4">
            <button
              onClick={() => router.push('/client-portal')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  const { property, handover, client_access } = propertyData

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/client-portal')}
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center"
            >
              ← Back to Dashboard
            </button>
            <div className="flex items-center space-x-4">
              {client_access.can_download_reports && (
                <button
                  onClick={() => downloadProgressReport()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Download Report
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Property Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.name}</h1>
              <p className="text-gray-600 mb-4 flex items-center">
                <span className="mr-2">📍</span>
                {property.location}
              </p>
              <div className="flex items-center space-x-6">
                <div>
                  <p className="text-sm text-gray-600">Property Type</p>
                  <p className="font-medium">{property.property_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Purchase Price</p>
                  <p className="font-medium text-green-600">{formatCurrency(property.asking_price_kes)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-medium">{handover.handover_status}</p>
                </div>
              </div>
            </div>
            
            {/* Progress Circle */}
            <div className="text-center">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-gray-200"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - handover.overall_progress / 100)}`}
                    className="text-blue-600 transition-all duration-300"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-gray-900">{handover.overall_progress}%</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">Complete</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('progress')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'progress'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 Progress Tracking
            </button>
            
            {client_access.can_view_documents && (
              <button
                onClick={() => setActiveTab('documents')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'documents'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📄 Documents
              </button>
            )}
            
            {client_access.can_view_financials && (
              <button
                onClick={() => setActiveTab('financials')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'financials'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                💰 Financials
              </button>
            )}
          </nav>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'progress' && (
            <HandoverProgressTracker
              handover={handover}
              property={property}
              onRefresh={loadPropertyData}
            />
          )}
          
          {activeTab === 'documents' && client_access.can_view_documents && (
            <PropertyDocumentsView
              propertyId={property.id}
              handoverId={handover.id}
            />
          )}
          
          {activeTab === 'financials' && client_access.can_view_financials && (
            <PropertyFinancialsView
              propertyId={property.id}
              handoverId={handover.id}
            />
          )}
        </div>
      </div>
    </div>
  )

  async function downloadProgressReport() {
    try {
      const response = await fetch(`/api/clients/property/${propertyId}/report`, {
        method: 'GET',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to generate report')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `${property.name}-progress-report.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading report:', error)
      alert('Failed to download progress report')
    }
  }
}
