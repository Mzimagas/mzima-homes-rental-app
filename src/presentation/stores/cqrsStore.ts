/**
 * CQRS Store Integration
 * Connects Zustand stores with CQRS commands and queries
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { CQRSFacade } from '../../application/cqrs/CQRSFacade'
import { CommandResult, QueryResult } from '../../application/cqrs/Command'
import { usePropertyStore } from './propertyStore'
import { useTenantStore } from './tenantStore'
import { useUIStore } from './uiStore'

// CQRS operation state
export interface CQRSOperation {
  id: string
  type: 'command' | 'query'
  name: string
  status: 'pending' | 'success' | 'error'
  startTime: Date
  endTime?: Date
  duration?: number
  result?: any
  error?: string
  correlationId?: string
}

// CQRS store state
export interface CQRSStoreState {
  // CQRS facade instance
  cqrs: CQRSFacade | null
  
  // Operation tracking
  operations: Record<string, CQRSOperation>
  activeOperations: string[]
  
  // Performance metrics
  commandMetrics: {
    totalCommands: number
    averageExecutionTime: number
    successRate: number
    commandTypeStats: Record<string, any>
  } | null
  
  queryMetrics: {
    totalQueries: number
    averageExecutionTime: number
    cacheHitRate: number
    queryTypeStats: Record<string, any>
  } | null
  
  // Circuit breaker status
  circuitBreakerStatus: Array<{
    commandType: string
    state: 'closed' | 'open' | 'half-open'
  }> | null
  
  // Configuration
  config: {
    enableLogging: boolean
    enablePerformanceMonitoring: boolean
    enableCircuitBreaker: boolean
    enableRateLimit: boolean
    cacheEnabled: boolean
  }
}

// CQRS store actions
export interface CQRSStoreActions {
  // Initialization
  initializeCQRS: (cqrs: CQRSFacade) => void
  
  // Command operations
  executeCommand: <T>(
    commandName: string,
    commandData: any,
    userId?: string
  ) => Promise<CommandResult<T>>
  
  // Query operations
  executeQuery: <T>(
    queryName: string,
    queryData: any,
    userId?: string
  ) => Promise<QueryResult<T>>
  
  // Property operations (convenience methods)
  createProperty: (data: any, userId?: string) => Promise<CommandResult<{ propertyId: string }>>
  updateProperty: (propertyId: string, updates: any, userId?: string) => Promise<CommandResult<void>>
  changePropertyStatus: (propertyId: string, status: string, reason?: string, userId?: string) => Promise<CommandResult<void>>
  deleteProperty: (propertyId: string, userId?: string) => Promise<CommandResult<void>>
  
  getProperties: (criteria?: any, options?: any, userId?: string) => Promise<QueryResult>
  getPropertyById: (propertyId: string, userId?: string) => Promise<QueryResult>
  getPropertyStats: (ownerId?: string, userId?: string) => Promise<QueryResult>
  searchProperties: (searchTerm: string, filters?: any, options?: any, userId?: string) => Promise<QueryResult>
  
  // Operation management
  clearOperations: () => void
  getOperation: (operationId: string) => CQRSOperation | null
  getActiveOperations: () => CQRSOperation[]
  
  // Performance monitoring
  refreshMetrics: () => void
  getCommandMetrics: () => any
  getQueryMetrics: () => any
  getCircuitBreakerStatus: () => any
  
  // Cache management
  invalidateCache: (pattern?: string) => Promise<void>
  
  // Configuration
  updateConfig: (config: Partial<CQRSStoreState['config']>) => void
}

// Initial state
const initialState: CQRSStoreState = {
  cqrs: null,
  operations: {},
  activeOperations: [],
  commandMetrics: null,
  queryMetrics: null,
  circuitBreakerStatus: null,
  config: {
    enableLogging: true,
    enablePerformanceMonitoring: true,
    enableCircuitBreaker: true,
    enableRateLimit: true,
    cacheEnabled: true
  }
}

// Create the store
export const useCQRSStore = create<CQRSStoreState & CQRSStoreActions>()(
  devtools(
    immer((set, get) => ({
      ...initialState,
      
      // Initialization
      initializeCQRS: (cqrs) => set((draft) => {
        draft.cqrs = cqrs
        
        // Set up event listeners
        cqrs.onCommandEvent((event) => {
          const operationId = event.command.correlationId
          
          switch (event.type) {
            case 'command:started':
              draft.operations[operationId] = {
                id: operationId,
                type: 'command',
                name: event.command.type,
                status: 'pending',
                startTime: event.timestamp,
                correlationId: event.command.correlationId
              }
              draft.activeOperations.push(operationId)
              break
              
            case 'command:completed':
              if (draft.operations[operationId]) {
                draft.operations[operationId].status = event.result?.success ? 'success' : 'error'
                draft.operations[operationId].endTime = event.timestamp
                draft.operations[operationId].result = event.result
                draft.operations[operationId].duration = 
                  event.timestamp.getTime() - draft.operations[operationId].startTime.getTime()
                
                const index = draft.activeOperations.indexOf(operationId)
                if (index > -1) {
                  draft.activeOperations.splice(index, 1)
                }
              }
              break
              
            case 'command:failed':
              if (draft.operations[operationId]) {
                draft.operations[operationId].status = 'error'
                draft.operations[operationId].endTime = event.timestamp
                draft.operations[operationId].error = event.error?.message
                draft.operations[operationId].duration = 
                  event.timestamp.getTime() - draft.operations[operationId].startTime.getTime()
                
                const index = draft.activeOperations.indexOf(operationId)
                if (index > -1) {
                  draft.activeOperations.splice(index, 1)
                }
              }
              break
          }
        })
        
        cqrs.onQueryEvent((event) => {
          const operationId = event.query.correlationId
          
          switch (event.type) {
            case 'query:started':
              draft.operations[operationId] = {
                id: operationId,
                type: 'query',
                name: event.query.type,
                status: 'pending',
                startTime: event.timestamp,
                correlationId: event.query.correlationId
              }
              draft.activeOperations.push(operationId)
              break
              
            case 'query:completed':
            case 'query:cached':
              if (draft.operations[operationId]) {
                draft.operations[operationId].status = event.result?.success ? 'success' : 'error'
                draft.operations[operationId].endTime = event.timestamp
                draft.operations[operationId].result = event.result
                draft.operations[operationId].duration = 
                  event.timestamp.getTime() - draft.operations[operationId].startTime.getTime()
                
                const index = draft.activeOperations.indexOf(operationId)
                if (index > -1) {
                  draft.activeOperations.splice(index, 1)
                }
              }
              break
              
            case 'query:failed':
              if (draft.operations[operationId]) {
                draft.operations[operationId].status = 'error'
                draft.operations[operationId].endTime = event.timestamp
                draft.operations[operationId].error = event.error?.message
                draft.operations[operationId].duration = 
                  event.timestamp.getTime() - draft.operations[operationId].startTime.getTime()
                
                const index = draft.activeOperations.indexOf(operationId)
                if (index > -1) {
                  draft.activeOperations.splice(index, 1)
                }
              }
              break
          }
        })
      }),
      
      // Command operations
      executeCommand: async (commandName, commandData, userId) => {
        const { cqrs } = get()
        if (!cqrs) {
          throw new Error('CQRS not initialized')
        }
        
        // Show loading state
        useUIStore.getState().setGlobalLoading(true)
        
        try {
          let result: CommandResult
          
          switch (commandName) {
            case 'CreateProperty':
              result = await cqrs.createProperty(commandData, userId)
              break
            case 'UpdateProperty':
              result = await cqrs.updateProperty(commandData.propertyId, commandData.updates, userId)
              break
            case 'ChangePropertyStatus':
              result = await cqrs.changePropertyStatus(
                commandData.propertyId, 
                commandData.status, 
                commandData.reason, 
                userId
              )
              break
            case 'DeleteProperty':
              result = await cqrs.deleteProperty(commandData.propertyId, userId)
              break
            default:
              throw new Error(`Unknown command: ${commandName}`)
          }
          
          // Update stores based on result
          if (result.success) {
            // Refresh relevant data
            if (commandName.includes('Property')) {
              // Invalidate property cache
              await cqrs.invalidateQueryCache('properties:*')
              await cqrs.invalidateQueryCache('property:*')
            }
            
            // Show success notification
            useUIStore.getState().addNotification({
              type: 'success',
              title: 'Operation Successful',
              message: `${commandName} completed successfully`
            })
          } else {
            // Show error notification
            useUIStore.getState().addNotification({
              type: 'error',
              title: 'Operation Failed',
              message: result.errors?.join(', ') || 'Unknown error occurred'
            })
          }
          
          return result
          
        } finally {
          useUIStore.getState().setGlobalLoading(false)
        }
      },
      
      // Query operations
      executeQuery: async (queryName, queryData, userId) => {
        const { cqrs } = get()
        if (!cqrs) {
          throw new Error('CQRS not initialized')
        }
        
        let result: QueryResult
        
        switch (queryName) {
          case 'GetProperties':
            result = await cqrs.getProperties(queryData.criteria, queryData.options, userId)
            break
          case 'GetPropertyById':
            result = await cqrs.getPropertyById(queryData.propertyId, userId)
            break
          case 'GetPropertyStats':
            result = await cqrs.getPropertyStats(queryData.ownerId, userId)
            break
          case 'SearchProperties':
            result = await cqrs.searchProperties(
              queryData.searchTerm, 
              queryData.filters, 
              queryData.options, 
              userId
            )
            break
          default:
            throw new Error(`Unknown query: ${queryName}`)
        }
        
        // Update stores with query results
        if (result.success && result.data) {
          if (queryName === 'GetProperties' && Array.isArray(result.data)) {
            // Update property store with fetched properties
            usePropertyStore.getState().upsertProperties(result.data)
          }
        }
        
        return result
      },
      
      // Property convenience methods
      createProperty: async (data, userId) => {
        return get().executeCommand('CreateProperty', data, userId)
      },
      
      updateProperty: async (propertyId, updates, userId) => {
        return get().executeCommand('UpdateProperty', { propertyId, updates }, userId)
      },
      
      changePropertyStatus: async (propertyId, status, reason, userId) => {
        return get().executeCommand('ChangePropertyStatus', { propertyId, status, reason }, userId)
      },
      
      deleteProperty: async (propertyId, userId) => {
        return get().executeCommand('DeleteProperty', { propertyId }, userId)
      },
      
      getProperties: async (criteria, options, userId) => {
        return get().executeQuery('GetProperties', { criteria, options }, userId)
      },
      
      getPropertyById: async (propertyId, userId) => {
        return get().executeQuery('GetPropertyById', { propertyId }, userId)
      },
      
      getPropertyStats: async (ownerId, userId) => {
        return get().executeQuery('GetPropertyStats', { ownerId }, userId)
      },
      
      searchProperties: async (searchTerm, filters, options, userId) => {
        return get().executeQuery('SearchProperties', { searchTerm, filters, options }, userId)
      },
      
      // Operation management
      clearOperations: () => set((draft) => {
        draft.operations = {}
        draft.activeOperations = []
      }),
      
      getOperation: (operationId) => {
        const { operations } = get()
        return operations[operationId] || null
      },
      
      getActiveOperations: () => {
        const { operations, activeOperations } = get()
        return activeOperations.map(id => operations[id]).filter(Boolean)
      },
      
      // Performance monitoring
      refreshMetrics: () => set((draft) => {
        const { cqrs } = get()
        if (cqrs) {
          draft.commandMetrics = cqrs.getCommandPerformanceStats()
          draft.queryMetrics = cqrs.getQueryPerformanceStats()
          draft.circuitBreakerStatus = cqrs.getCircuitBreakerStatus()
        }
      }),
      
      getCommandMetrics: () => {
        const { cqrs } = get()
        return cqrs?.getCommandMetrics() || []
      },
      
      getQueryMetrics: () => {
        const { cqrs } = get()
        return cqrs?.getQueryMetrics() || []
      },
      
      getCircuitBreakerStatus: () => {
        const { cqrs } = get()
        return cqrs?.getCircuitBreakerStatus() || []
      },
      
      // Cache management
      invalidateCache: async (pattern) => {
        const { cqrs } = get()
        if (cqrs) {
          await cqrs.invalidateQueryCache(pattern)
        }
      },
      
      // Configuration
      updateConfig: (config) => set((draft) => {
        Object.assign(draft.config, config)
      })
    })),
    { name: 'CQRSStore' }
  )
)
