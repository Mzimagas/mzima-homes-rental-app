'use client'

import { useState, useEffect } from 'react'
import { LoadingCard } from '../../../components/ui/loading'
import { ErrorCard } from '../../../components/ui/error'
import { formatCurrency } from '../../../lib/export-utils'

interface ClientInterest {
  id: string
  client_id: string
  property_id: string
  interest_type: string
  status: string
  message?: string
  contact_preference: string
  created_at: string
  client: {
    full_name: string
    email: string
    phone?: string
  }
  property: {
    name: string
    location: string
    asking_price_kes: number
    handover_status: string
  }
}

interface HandoverRequest {
  id: string
  property_id: string
  client_id: string
  status: string
  requested_at: string
  notes?: string
  client: {
    full_name: string
    email: string
  }
  property: {
    name: string
    location: string
  }
}

export default function ClientManagementPage() {
  const [interests, setInterests] = useState<ClientInterest[]>([])
  const [handoverRequests, setHandoverRequests] = useState<HandoverRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'interests' | 'handover-requests'>('interests')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [interestsResponse, requestsResponse] = await Promise.all([
        fetch('/api/admin/client-interests'),
        fetch('/api/admin/handover-requests')
      ])

      if (interestsResponse.ok) {
        const interestsData = await interestsResponse.json()
        setInterests(interestsData.interests || [])
      }

      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json()
        setHandoverRequests(requestsData.requests || [])
      }

    } catch (err) {
      console.error('Error loading client management data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleTransitionToHandover = async (interestId: string, propertyId: string, clientId: string) => {
    try {
      const response = await fetch('/api/admin/transition-to-handover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interestId,
          propertyId,
          clientId
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to transition to handover')
      }

      // Reload data to reflect changes
      await loadData()
      
      alert('Property successfully transitioned to handover pipeline!')
    } catch (error) {
      console.error('Error transitioning to handover:', error)
      alert('Failed to transition property to handover pipeline')
    }
  }

  const handleApproveHandoverRequest = async (requestId: string) => {
    try {
      const response = await fetch(`/api/admin/handover-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to approve handover request')
      }

      await loadData()
      alert('Handover request approved!')
    } catch (error) {
      console.error('Error approving handover request:', error)
      alert('Failed to approve handover request')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingCard message="Loading client management data..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorCard message={error} />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Client Management</h1>
        <p className="text-gray-600 mt-2">Manage client interests and handover transitions</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('interests')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'interests'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Client Interests ({interests.length})
          </button>
          <button
            onClick={() => setActiveTab('handover-requests')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'handover-requests'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Handover Requests ({handoverRequests.length})
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'interests' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Client Property Interests</h2>
            <button
              onClick={loadData}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>

          {interests.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="text-gray-400 text-6xl mb-4">👥</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No Client Interests</h3>
              <p className="text-gray-600">Client interests will appear here when clients express interest in properties</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {interests.map((interest) => (
                <InterestCard
                  key={interest.id}
                  interest={interest}
                  onTransitionToHandover={handleTransitionToHandover}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'handover-requests' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Handover Requests</h2>
            <button
              onClick={loadData}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>

          {handoverRequests.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No Handover Requests</h3>
              <p className="text-gray-600">Handover requests will appear here when clients request property transitions</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {handoverRequests.map((request) => (
                <HandoverRequestCard
                  key={request.id}
                  request={request}
                  onApprove={handleApproveHandoverRequest}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InterestCard({ 
  interest, 
  onTransitionToHandover 
}: { 
  interest: ClientInterest
  onTransitionToHandover: (interestId: string, propertyId: string, clientId: string) => void
}) {
  const getInterestTypeColor = (type: string) => {
    switch (type) {
      case 'purchase-inquiry':
        return 'bg-red-100 text-red-800'
      case 'express-interest':
        return 'bg-blue-100 text-blue-800'
      case 'contact':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-3">
            <h3 className="text-lg font-semibold text-gray-900">{interest.property.name}</h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getInterestTypeColor(interest.interest_type)}`}>
              {interest.interest_type.replace('-', ' ').toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Client Information</h4>
              <p className="text-sm text-gray-600">Name: {interest.client.full_name}</p>
              <p className="text-sm text-gray-600">Email: {interest.client.email}</p>
              {interest.client.phone && (
                <p className="text-sm text-gray-600">Phone: {interest.client.phone}</p>
              )}
              <p className="text-sm text-gray-600">
                Preferred Contact: {interest.contact_preference}
              </p>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Property Information</h4>
              <p className="text-sm text-gray-600">Location: {interest.property.location}</p>
              <p className="text-sm text-gray-600">
                Price: {formatCurrency(interest.property.asking_price_kes)}
              </p>
              <p className="text-sm text-gray-600">
                Status: {interest.property.handover_status}
              </p>
            </div>
          </div>

          {interest.message && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-1">Message</h4>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{interest.message}</p>
            </div>
          )}

          <p className="text-xs text-gray-500">
            Interest expressed on {new Date(interest.created_at).toLocaleDateString()}
          </p>
        </div>

        <div className="ml-4 space-y-2">
          <button
            onClick={() => onTransitionToHandover(interest.id, interest.property_id, interest.client_id)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            Start Handover
          </button>
          
          <button
            onClick={() => window.open(`mailto:${interest.client.email}`, '_blank')}
            className="block w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Contact Client
          </button>
        </div>
      </div>
    </div>
  )
}

function HandoverRequestCard({ 
  request, 
  onApprove 
}: { 
  request: HandoverRequest
  onApprove: (requestId: string) => void
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">{request.property.name}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Client</h4>
              <p className="text-sm text-gray-600">Name: {request.client.full_name}</p>
              <p className="text-sm text-gray-600">Email: {request.client.email}</p>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Property</h4>
              <p className="text-sm text-gray-600">Location: {request.property.location}</p>
              <p className="text-sm text-gray-600">Status: {request.status}</p>
            </div>
          </div>

          {request.notes && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-1">Notes</h4>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{request.notes}</p>
            </div>
          )}

          <p className="text-xs text-gray-500">
            Requested on {new Date(request.requested_at).toLocaleDateString()}
          </p>
        </div>

        <div className="ml-4">
          {request.status === 'PENDING_APPROVAL' && (
            <button
              onClick={() => onApprove(request.id)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Approve Handover
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
