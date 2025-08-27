'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../lib/auth-context'
import { PropertyCleanupService } from '../../../lib/services/property-cleanup.service'
import { Button } from '../../ui'

interface LandPropertyCleanupProps {
  onCleanupComplete?: () => void
}

export default function LandPropertyCleanup({ onCleanupComplete }: LandPropertyCleanupProps) {
  const { user } = useAuth()
  const [landPropertiesCount, setLandPropertiesCount] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Check for land properties on component mount
  useEffect(() => {
    const checkLandProperties = async () => {
      if (!user?.id) return

      setChecking(true)
      setError(null)

      const result = await PropertyCleanupService.getLandPropertiesCount(user.id)

      if (result.success) {
        setLandPropertiesCount(result.count)
      } else {
        setError(result.error || 'Failed to check land properties')
      }

      setChecking(false)
    }

    checkLandProperties()
  }, [user?.id])

  const handleCleanup = async () => {
    if (!user?.id) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    const result = await PropertyCleanupService.softDeleteLandProperties(user.id)

    if (result.success) {
      setSuccess(
        `Successfully removed ${result.deletedCount} land properties from Rentals Overview`
      )
      setLandPropertiesCount(0)
      setShowConfirmation(false)
      onCleanupComplete?.()
    } else {
      setError(result.error || 'Failed to remove land properties')
    }

    setLoading(false)
  }

  // Don't show anything if there are no land properties
  if (checking) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-sm text-blue-800">Checking for land properties...</span>
        </div>
      </div>
    )
  }

  if (landPropertiesCount === 0 && !success) {
    return null // Don't show the component if there are no land properties
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-amber-800">
            Land Properties Detected in Rentals Overview
          </h3>
          <div className="mt-2 text-sm text-amber-700">
            {success ? (
              <p className="text-green-700">{success}</p>
            ) : (
              <>
                <p>
                  We found {landPropertiesCount} land{' '}
                  {landPropertiesCount === 1 ? 'property' : 'properties'} in your Rentals Overview.
                  Since this tab is designed for rental properties only, you can safely remove{' '}
                  {landPropertiesCount === 1 ? 'it' : 'them'} from this view.
                </p>
                <p className="mt-1 text-xs">
                  <strong>Note:</strong> This will not delete your land properties permanently. They
                  will be preserved in the database and can be restored if needed.
                </p>
              </>
            )}
          </div>
          {error && (
            <div className="mt-2 text-sm text-red-600">
              <p>{error}</p>
            </div>
          )}
          {!success && (
            <div className="mt-3">
              {!showConfirmation ? (
                <Button
                  onClick={() => setShowConfirmation(true)}
                  variant="secondary"
                  size="sm"
                  className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200"
                >
                  Remove Land Properties from Rentals View
                </Button>
              ) : (
                <div className="flex space-x-2">
                  <Button
                    onClick={handleCleanup}
                    variant="primary"
                    size="sm"
                    disabled={loading}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {loading ? 'Removing...' : 'Confirm Removal'}
                  </Button>
                  <Button
                    onClick={() => setShowConfirmation(false)}
                    variant="secondary"
                    size="sm"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
