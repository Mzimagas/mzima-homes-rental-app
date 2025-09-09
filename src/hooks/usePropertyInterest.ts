import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../lib/auth-context'

interface PropertyInterest {
  hasInterest: boolean
  interestType: string | null
  createdAt: string | null
}

interface UsePropertyInterestReturn {
  interests: Record<string, PropertyInterest>
  loading: boolean
  error: string | null
  expressInterest: (propertyId: string, interestType?: string) => Promise<boolean>
  removeInterest: (propertyId: string) => Promise<boolean>
  checkInterest: (propertyId: string) => Promise<PropertyInterest | null>
  refreshInterests: (propertyIds: string[]) => Promise<void>
}

export function usePropertyInterest(): UsePropertyInterestReturn {
  const { user } = useAuth()
  const [interests, setInterests] = useState<Record<string, PropertyInterest>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const expressInterest = useCallback(async (
    propertyId: string, 
    interestType: string = 'express-interest'
  ): Promise<boolean> => {
    if (!user) {
      setError('Authentication required')
      return false
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/clients/express-interest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId,
          interestType,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to express interest')
      }

      // Update local state
      setInterests(prev => ({
        ...prev,
        [propertyId]: {
          hasInterest: true,
          interestType,
          createdAt: new Date().toISOString()
        }
      }))

      return true
    } catch (err) {
      console.error('Error expressing interest:', err)
      setError(err instanceof Error ? err.message : 'Failed to express interest')
      return false
    } finally {
      setLoading(false)
    }
  }, [user])

  const removeInterest = useCallback(async (propertyId: string): Promise<boolean> => {
    if (!user) {
      setError('Authentication required')
      return false
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/clients/remove-interest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove interest')
      }

      // Update local state
      setInterests(prev => ({
        ...prev,
        [propertyId]: {
          hasInterest: false,
          interestType: null,
          createdAt: null
        }
      }))

      return true
    } catch (err) {
      console.error('Error removing interest:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove interest')
      return false
    } finally {
      setLoading(false)
    }
  }, [user])

  const checkInterest = useCallback(async (propertyId: string): Promise<PropertyInterest | null> => {
    if (!user) {
      return null
    }

    try {
      const response = await fetch(`/api/clients/interest-status?propertyId=${propertyId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to check interest status')
      }

      const data = await response.json()
      const interest: PropertyInterest = {
        hasInterest: data.hasInterest,
        interestType: data.interestType,
        createdAt: data.createdAt
      }

      // Update local state
      setInterests(prev => ({
        ...prev,
        [propertyId]: interest
      }))

      return interest
    } catch (err) {
      console.error('Error checking interest:', err)
      return null
    }
  }, [user])

  const refreshInterests = useCallback(async (propertyIds: string[]): Promise<void> => {
    if (!user || propertyIds.length === 0) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/clients/interest-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyIds,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to refresh interest status')
      }

      const data = await response.json()
      setInterests(prev => ({
        ...prev,
        ...data.interests
      }))
    } catch (err) {
      console.error('Error refreshing interests:', err)
      setError(err instanceof Error ? err.message : 'Failed to refresh interests')
    } finally {
      setLoading(false)
    }
  }, [user])

  // Clear interests when user logs out
  useEffect(() => {
    if (!user) {
      setInterests({})
      setError(null)
    }
  }, [user])

  return {
    interests,
    loading,
    error,
    expressInterest,
    removeInterest,
    checkInterest,
    refreshInterests,
  }
}
