/**
 * CQRS Integration Hook
 * Custom hook for integrating components with CQRS pattern
 */

import { useCallback, useEffect, useState } from 'react'
import { useCQRSStore } from '../stores/cqrsStore'
import { useUIStore } from '../stores/uiStore'
import { CommandResult, QueryResult } from '../../application/cqrs/Command'

// Hook options
interface CQRSHookOptions {
  showNotifications?: boolean
  showLoading?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
  onSuccess?: (result: any) => void
  onError?: (error: string) => void
}

// Command hook
export function useCommand<TData = any, TResult = any>(
  commandName: string,
  options: CQRSHookOptions = {}
) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TResult | null>(null)
  
  const { executeCommand } = useCQRSStore()
  const { addNotification, setGlobalLoading } = useUIStore()

  const execute = useCallback(async (data: TData, userId?: string): Promise<CommandResult<TResult>> => {
    setIsLoading(true)
    setError(null)
    
    if (options.showLoading) {
      setGlobalLoading(true)
    }

    try {
      const commandResult = await executeCommand<TResult>(commandName, data, userId)
      
      if (commandResult.success) {
        setResult(commandResult.data || null)
        
        if (options.showNotifications) {
          addNotification({
            type: 'success',
            title: 'Operation Successful',
            message: `${commandName} completed successfully`
          })
        }
        
        if (options.onSuccess) {
          options.onSuccess(commandResult.data)
        }
      } else {
        const errorMessage = commandResult.errors?.join(', ') || 'Unknown error occurred'
        setError(errorMessage)
        
        if (options.showNotifications) {
          addNotification({
            type: 'error',
            title: 'Operation Failed',
            message: errorMessage
          })
        }
        
        if (options.onError) {
          options.onError(errorMessage)
        }
      }
      
      return commandResult
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      
      if (options.showNotifications) {
        addNotification({
          type: 'error',
          title: 'Operation Failed',
          message: errorMessage
        })
      }
      
      if (options.onError) {
        options.onError(errorMessage)
      }
      
      return {
        success: false,
        errors: [errorMessage]
      }
      
    } finally {
      setIsLoading(false)
      
      if (options.showLoading) {
        setGlobalLoading(false)
      }
    }
  }, [commandName, executeCommand, options, addNotification, setGlobalLoading])

  const reset = useCallback(() => {
    setError(null)
    setResult(null)
  }, [])

  return {
    execute,
    isLoading,
    error,
    result,
    reset
  }
}

// Query hook
export function useQuery<TData = any, TResult = any>(
  queryName: string,
  queryData: TData,
  options: CQRSHookOptions & {
    enabled?: boolean
    staleTime?: number
    cacheTime?: number
  } = {}
) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<TResult | null>(null)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)
  
  const { executeQuery } = useCQRSStore()
  const { addNotification } = useUIStore()

  const execute = useCallback(async (userId?: string): Promise<QueryResult<TResult>> => {
    setIsLoading(true)
    setError(null)

    try {
      const queryResult = await executeQuery<TResult>(queryName, queryData, userId)
      
      if (queryResult.success) {
        setData(queryResult.data || null)
        setLastFetch(new Date())
        
        if (options.onSuccess) {
          options.onSuccess(queryResult.data)
        }
      } else {
        const errorMessage = queryResult.errors?.join(', ') || 'Unknown error occurred'
        setError(errorMessage)
        
        if (options.showNotifications) {
          addNotification({
            type: 'error',
            title: 'Query Failed',
            message: errorMessage
          })
        }
        
        if (options.onError) {
          options.onError(errorMessage)
        }
      }
      
      return queryResult
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      
      if (options.showNotifications) {
        addNotification({
          type: 'error',
          title: 'Query Failed',
          message: errorMessage
        })
      }
      
      if (options.onError) {
        options.onError(errorMessage)
      }
      
      return {
        success: false,
        errors: [errorMessage]
      }
      
    } finally {
      setIsLoading(false)
    }
  }, [queryName, queryData, executeQuery, options, addNotification])

  const refetch = useCallback(() => {
    return execute()
  }, [execute])

  const isStale = useCallback(() => {
    if (!lastFetch || !options.staleTime) return false
    return Date.now() - lastFetch.getTime() > options.staleTime
  }, [lastFetch, options.staleTime])

  // Auto-execute query
  useEffect(() => {
    if (options.enabled !== false) {
      execute()
    }
  }, [execute, options.enabled])

  // Auto-refresh
  useEffect(() => {
    if (options.autoRefresh && options.refreshInterval) {
      const interval = setInterval(() => {
        if (options.enabled !== false) {
          execute()
        }
      }, options.refreshInterval)

      return () => clearInterval(interval)
    }
  }, [execute, options.autoRefresh, options.refreshInterval, options.enabled])

  return {
    data,
    isLoading,
    error,
    lastFetch,
    refetch,
    isStale: isStale()
  }
}

// Property-specific hooks
export function useCreateProperty(options: CQRSHookOptions = {}) {
  return useCommand('CreateProperty', {
    showNotifications: true,
    showLoading: true,
    ...options
  })
}

export function useUpdateProperty(options: CQRSHookOptions = {}) {
  return useCommand('UpdateProperty', {
    showNotifications: true,
    showLoading: true,
    ...options
  })
}

export function useDeleteProperty(options: CQRSHookOptions = {}) {
  return useCommand('DeleteProperty', {
    showNotifications: true,
    showLoading: true,
    ...options
  })
}

export function useChangePropertyStatus(options: CQRSHookOptions = {}) {
  return useCommand('ChangePropertyStatus', {
    showNotifications: true,
    showLoading: true,
    ...options
  })
}

export function useProperties(
  criteria: any = {},
  options: any = {},
  hookOptions: CQRSHookOptions & { enabled?: boolean } = {}
) {
  return useQuery('GetProperties', { criteria, options }, {
    enabled: true,
    staleTime: 300000, // 5 minutes
    autoRefresh: true,
    refreshInterval: 60000, // 1 minute
    ...hookOptions
  })
}

export function useProperty(
  propertyId: string,
  hookOptions: CQRSHookOptions & { enabled?: boolean } = {}
) {
  return useQuery('GetPropertyById', { propertyId }, {
    enabled: !!propertyId,
    staleTime: 600000, // 10 minutes
    ...hookOptions
  })
}

export function usePropertyStats(
  ownerId?: string,
  hookOptions: CQRSHookOptions & { enabled?: boolean } = {}
) {
  return useQuery('GetPropertyStats', { ownerId }, {
    enabled: true,
    staleTime: 180000, // 3 minutes
    autoRefresh: true,
    refreshInterval: 300000, // 5 minutes
    ...hookOptions
  })
}

export function useSearchProperties(
  searchTerm: string,
  filters: any = {},
  options: any = {},
  hookOptions: CQRSHookOptions & { enabled?: boolean } = {}
) {
  return useQuery('SearchProperties', { searchTerm, filters, options }, {
    enabled: !!searchTerm.trim(),
    staleTime: 60000, // 1 minute
    ...hookOptions
  })
}

// Bulk operations hook
export function useBulkOperations() {
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  
  const { executeCommand } = useCQRSStore()
  const { addNotification } = useUIStore()

  const selectItem = useCallback((id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }, [])

  const selectAll = useCallback((ids: string[]) => {
    setSelectedItems(ids)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedItems([])
  }, [])

  const executeBulkCommand = useCallback(async (
    commandName: string,
    commandData: any,
    userId?: string
  ) => {
    if (selectedItems.length === 0) {
      addNotification({
        type: 'warning',
        title: 'No Items Selected',
        message: 'Please select items to perform bulk operation'
      })
      return
    }

    setIsExecuting(true)

    try {
      const result = await executeCommand(commandName, {
        ...commandData,
        ids: selectedItems
      }, userId)

      if (result.success) {
        addNotification({
          type: 'success',
          title: 'Bulk Operation Successful',
          message: `Operation completed for ${selectedItems.length} items`
        })
        clearSelection()
      } else {
        addNotification({
          type: 'error',
          title: 'Bulk Operation Failed',
          message: result.errors?.join(', ') || 'Unknown error occurred'
        })
      }

      return result
    } finally {
      setIsExecuting(false)
    }
  }, [selectedItems, executeCommand, addNotification, clearSelection])

  return {
    selectedItems,
    selectItem,
    selectAll,
    clearSelection,
    executeBulkCommand,
    isExecuting,
    hasSelection: selectedItems.length > 0,
    selectionCount: selectedItems.length
  }
}

// Performance monitoring hook
export function useCQRSPerformance() {
  const { 
    getCommandMetrics, 
    getQueryMetrics, 
    getCircuitBreakerStatus,
    refreshMetrics 
  } = useCQRSStore()

  const [metrics, setMetrics] = useState({
    commands: null as any,
    queries: null as any,
    circuitBreaker: null as any
  })

  const updateMetrics = useCallback(() => {
    refreshMetrics()
    setMetrics({
      commands: getCommandMetrics(),
      queries: getQueryMetrics(),
      circuitBreaker: getCircuitBreakerStatus()
    })
  }, [refreshMetrics, getCommandMetrics, getQueryMetrics, getCircuitBreakerStatus])

  useEffect(() => {
    updateMetrics()
    
    // Update metrics every 30 seconds
    const interval = setInterval(updateMetrics, 30000)
    return () => clearInterval(interval)
  }, [updateMetrics])

  return {
    ...metrics,
    refresh: updateMetrics
  }
}
