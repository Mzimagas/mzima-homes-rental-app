'use client'

import { useState, useEffect } from 'react'

interface ClientWelcomeModalProps {
  clientName: string
  onClose: () => void
  propertyId?: string | null
}

export default function ClientWelcomeModal({ clientName, onClose, propertyId }: ClientWelcomeModalProps) {
  const [propertyName, setPropertyName] = useState<string | null>(null)

  useEffect(() => {
    if (propertyId) {
      loadPropertyName()
    }
  }, [propertyId])

  const loadPropertyName = async () => {
    try {
      const response = await fetch(`/api/public/properties/${propertyId}`)
      if (response.ok) {
        const data = await response.json()
        setPropertyName(data.property?.name || 'Selected Property')
      }
    } catch (error) {
      console.warn('Failed to load property name:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center">
          {/* Welcome Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <span className="text-3xl">🎉</span>
          </div>

          {/* Welcome Message */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to Mzima Homes!
          </h2>
          
          <p className="text-gray-600 mb-4">
            Hi {clientName}, your account has been created successfully.
          </p>

          {/* Property Context */}
          {propertyId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center mb-2">
                <span className="text-2xl mr-2">🏠</span>
                <h3 className="font-semibold text-blue-900">Property Interest Recorded</h3>
              </div>
              <p className="text-blue-700 text-sm">
                We&apos;ve recorded your interest in{' '}
                <span className="font-medium">
                  {propertyName || 'the selected property'}
                </span>
                . Our team will contact you soon with next steps.
              </p>
            </div>
          )}

          {/* What's Next */}
          <div className="text-left mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">What happens next?</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-green-500 mr-2 mt-0.5">✓</span>
                Our property specialist will contact you within 24 hours
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2 mt-0.5">✓</span>
                You&apos;ll receive detailed property information and documentation
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2 mt-0.5">✓</span>
                Track your property journey through this dashboard
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2 mt-0.5">✓</span>
                Get real-time updates on handover progress
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={onClose}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Explore Dashboard
            </button>
            
            <button
              onClick={() => window.location.href = '/marketplace'}
              className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Browse More Properties
            </button>
          </div>

          {/* Contact Info */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Need help? Contact us at{' '}
              <a href="mailto:support@mzimahomes.com" className="text-blue-600 hover:text-blue-700">
                support@mzimahomes.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
