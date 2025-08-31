/**
 * Hook for managing loading states
 */

import { useState, useCallback } from 'react'

interface UseLoadingStateReturn {
  loading: boolean
  setLoading: (loading: boolean) => void
  withLoading: <T>(asyncFn: () => Promise<T>) => Promise<T>
}

export const useLoadingState = (initialState = false): UseLoadingStateReturn => {
  const [loading, setLoading] = useState(initialState)

  const withLoading = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T> => {
    setLoading(true)
    try {
      const result = await asyncFn()
      return result
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    setLoading,
    withLoading
  }
}

/**
 * Hook for managing multiple loading states
 */
interface UseMultipleLoadingReturn {
  loadingStates: Record<string, boolean>
  setLoading: (key: string, loading: boolean) => void
  withLoading: <T>(key: string, asyncFn: () => Promise<T>) => Promise<T>
  isAnyLoading: boolean
}

export const useMultipleLoading = (keys: string[]): UseMultipleLoadingReturn => {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    keys.reduce((acc, key) => ({ ...acc, [key]: false }), {})
  )

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }))
  }, [])

  const withLoading = useCallback(async <T>(
    key: string, 
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    setLoading(key, true)
    try {
      const result = await asyncFn()
      return result
    } finally {
      setLoading(key, false)
    }
  }, [setLoading])

  const isAnyLoading = Object.values(loadingStates).some(loading => loading)

  return {
    loadingStates,
    setLoading,
    withLoading,
    isAnyLoading
  }
}
