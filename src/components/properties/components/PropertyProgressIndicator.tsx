'use client'

import { useState, useEffect } from 'react'

interface PropertyProgressIndicatorProps {
  propertyId: string
  reservationStatus?: string
  handoverStatus?: string
  compact?: boolean
}

interface ClientInterest {
  id: string
  client_id: string
  status: string
  agreement_generated_at?: string
  agreement_signed_at?: string
  deposit_paid_at?: string
  payment_verified_at?: string
  client_name?: string
  client_email?: string
}

export default function PropertyProgressIndicator({ 
  propertyId, 
  reservationStatus, 
  handoverStatus,
  compact = false 
}: PropertyProgressIndicatorProps) {
  const [clientInterest, setClientInterest] = useState<ClientInterest | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (reservationStatus === 'RESERVED' && propertyId) {
      loadClientInterest()
    }
  }, [propertyId, reservationStatus])

  const loadClientInterest = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/property-client-interest/${propertyId}`)
      if (response.ok) {
        const data = await response.json()
        setClientInterest(data.interest)
      }
    } catch (error) {
      console.error('Error loading client interest:', error)
    } finally {
      setLoading(false)
    }
  }

  // Determine current stage
  const getCurrentStage = () => {
    if (handoverStatus === 'IN_PROGRESS' || handoverStatus === 'COMPLETED') {
      return 'handover'
    }
    if (clientInterest?.deposit_paid_at && clientInterest?.payment_verified_at) {
      return 'deposit_verified'
    }
    if (clientInterest?.deposit_paid_at) {
      return 'deposit_pending'
    }
    if (clientInterest?.agreement_signed_at) {
      return 'agreement_signed'
    }
    if (clientInterest?.agreement_generated_at) {
      return 'agreement_pending'
    }
    if (reservationStatus === 'RESERVED') {
      return 'reserved'
    }
    return 'available'
  }

  const currentStage = getCurrentStage()

  const stages = [
    { 
      id: 'reserved', 
      label: 'Reserved', 
      icon: '🔒', 
      color: 'orange',
      description: 'Property reserved by client'
    },
    { 
      id: 'agreement_pending', 
      label: 'Agreement Generated', 
      icon: '📄', 
      color: 'blue',
      description: 'Purchase agreement generated'
    },
    { 
      id: 'agreement_signed', 
      label: 'Agreement Signed', 
      icon: '✍️', 
      color: 'purple',
      description: 'Agreement digitally signed'
    },
    { 
      id: 'deposit_pending', 
      label: 'Deposit Paid', 
      icon: '💳', 
      color: 'yellow',
      description: 'Deposit payment submitted'
    },
    { 
      id: 'deposit_verified', 
      label: 'Deposit Verified', 
      icon: '✅', 
      color: 'green',
      description: 'Deposit payment verified'
    },
    { 
      id: 'handover', 
      label: 'Handover Active', 
      icon: '🏠', 
      color: 'teal',
      description: 'Handover pipeline started'
    }
  ]

  const getStageIndex = (stageId: string) => stages.findIndex(s => s.id === stageId)
  const currentStageIndex = getStageIndex(currentStage)

  const getStageColor = (stage: any, index: number) => {
    if (index < currentStageIndex) return 'completed'
    if (index === currentStageIndex) return stage.color
    return 'pending'
  }

  const getColorClasses = (colorType: string) => {
    switch (colorType) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'orange':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'blue':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'purple':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'green':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'teal':
        return 'bg-teal-100 text-teal-800 border-teal-200'
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  if (reservationStatus !== 'RESERVED' && handoverStatus !== 'IN_PROGRESS' && handoverStatus !== 'COMPLETED') {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
        Available
      </span>
    )
  }

  if (loading) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
        Loading...
      </span>
    )
  }

  if (compact) {
    const currentStageData = stages[currentStageIndex]
    return (
      <div className="flex items-center space-x-2">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getColorClasses(getStageColor(currentStageData, currentStageIndex))}`}>
          <span className="mr-1">{currentStageData?.icon}</span>
          {currentStageData?.label}
        </span>
        {clientInterest && (
          <span className="text-xs text-gray-500">
            {clientInterest.client_name || clientInterest.client_email}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">Property Progress</h4>
        {clientInterest && (
          <span className="text-xs text-gray-500">
            Client: {clientInterest.client_name || clientInterest.client_email}
          </span>
        )}
      </div>
      
      <div className="space-y-2">
        {stages.map((stage, index) => {
          const colorType = getStageColor(stage, index)
          const isCompleted = index < currentStageIndex
          const isCurrent = index === currentStageIndex
          const isPending = index > currentStageIndex
          
          return (
            <div key={stage.id} className="flex items-center space-x-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                isCompleted ? 'bg-green-500 text-white' :
                isCurrent ? 'bg-blue-500 text-white' :
                'bg-gray-200 text-gray-400'
              }`}>
                {isCompleted ? '✓' : index + 1}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getColorClasses(colorType)}`}>
                    <span className="mr-1">{stage.icon}</span>
                    {stage.label}
                  </span>
                  {isCurrent && (
                    <span className="text-xs text-blue-600 font-medium">Current</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">{stage.description}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Action buttons for admin */}
      {currentStage === 'deposit_pending' && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800 mb-2">
            Deposit payment requires verification
          </p>
          <button
            onClick={() => {/* TODO: Implement payment verification */}}
            className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded transition-colors"
          >
            Verify Payment
          </button>
        </div>
      )}

      {currentStage === 'deposit_verified' && handoverStatus !== 'IN_PROGRESS' && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs text-green-800 mb-2">
            Ready to start handover process
          </p>
          <button
            onClick={() => {/* TODO: Implement handover start */}}
            className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition-colors"
          >
            Start Handover
          </button>
        </div>
      )}
    </div>
  )
}
