/**
 * Hook for centralized error handling
 */

import { useState, useCallback } from 'react'
import { SubdivisionError } from '../types/subdivision'

interface UseErrorHandlerReturn {
  error: SubdivisionError | null
  setError: (error: SubdivisionError | null) => void
  clearError: () => void
  handleError: (error: any, context?: string) => void
}

export const useErrorHandler = (): UseErrorHandlerReturn => {
  const [error, setError] = useState<SubdivisionError | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const handleError = useCallback((error: any, context?: string) => {
    console.error(`Error${context ? ` in ${context}` : ''}:`, error)
    
    let errorMessage = 'An unexpected error occurred'
    let errorCode: string | undefined

    if (error?.message) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    }

    if (error?.code) {
      errorCode = error.code
    }

    // Add context to error message if provided
    if (context) {
      errorMessage = `${context}: ${errorMessage}`
    }

    setError({
      message: errorMessage,
      code: errorCode,
      details: error
    })
  }, [])

  return {
    error,
    setError,
    clearError,
    handleError
  }
}

/**
 * Hook for managing multiple error states
 */
interface UseMultipleErrorsReturn {
  errors: Record<string, SubdivisionError | null>
  setError: (key: string, error: SubdivisionError | null) => void
  clearError: (key: string) => void
  clearAllErrors: () => void
  hasErrors: boolean
}

export const useMultipleErrors = (keys: string[]): UseMultipleErrorsReturn => {
  const [errors, setErrors] = useState<Record<string, SubdivisionError | null>>(
    keys.reduce((acc, key) => ({ ...acc, [key]: null }), {})
  )

  const setError = useCallback((key: string, error: SubdivisionError | null) => {
    setErrors(prev => ({ ...prev, [key]: error }))
  }, [])

  const clearError = useCallback((key: string) => {
    setErrors(prev => ({ ...prev, [key]: null }))
  }, [])

  const clearAllErrors = useCallback(() => {
    setErrors(keys.reduce((acc, key) => ({ ...acc, [key]: null }), {}))
  }, [keys])

  const hasErrors = Object.values(errors).some(error => error !== null)

  return {
    errors,
    setError,
    clearError,
    clearAllErrors,
    hasErrors
  }
}
