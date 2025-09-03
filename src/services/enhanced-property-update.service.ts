import getSupabaseClient from '../lib/supabase-client'

const supabase = getSupabaseClient()
import AuditTrailService from './audit-trail.service'
import ConflictResolutionService from './conflict-resolution.service'

interface EnhancedUpdateOptions {
  enableConflictDetection?: boolean
  enableAuditLogging?: boolean
  enableOfflineSupport?: boolean
  lastKnownTimestamp?: Date
  context?: {
    workflow?: 'DIRECT_ADDITION' | 'PURCHASE_PIPELINE' | 'SUBDIVISION' | 'HANDOVER' | 'RENTAL'
    component?: string
    reason?: string
  }
}

interface UpdateResult {
  success: boolean
  data?: any
  conflicts?: any[]
  error?: string
  queued?: boolean
}

class EnhancedPropertyUpdateService {
  /**
   * Enhanced property update with conflict detection, audit logging, and offline support
   */
  static async updateProperty(
    tableName: string,
    recordId: string,
    updates: Record<string, any>,
    options: EnhancedUpdateOptions = {}
  ): Promise<UpdateResult> {
    const {
      enableConflictDetection = true,
      enableAuditLogging = true,
      enableOfflineSupport = true,
      lastKnownTimestamp,
      context
    } = options

    try {
      // Check if we're online
      const isOnline = navigator.onLine

      // If offline and offline support is enabled, queue the operation
      if (!isOnline && enableOfflineSupport) {
        return this.queueOfflineUpdate(tableName, recordId, updates, context)
      }

      // Get current data for conflict detection and audit logging
      const { data: currentData, error: fetchError } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', recordId)
        .single()

      if (fetchError) {
        return { success: false, error: fetchError.message }
      }

      // Conflict detection
      if (enableConflictDetection && lastKnownTimestamp) {
        const conflicts = await ConflictResolutionService.detectConflicts(
          tableName,
          recordId,
          updates,
          lastKnownTimestamp
        )

        if (conflicts.length > 0) {
          // Store conflicts for resolution
          for (const conflict of conflicts) {
            await ConflictResolutionService.storeConflict(conflict)
          }

          return {
            success: false,
            conflicts,
            error: 'Conflicts detected. Please resolve before proceeding.'
          }
        }
      }

      // Perform the update
      const { data, error } = await supabase
        .from(tableName)
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      // Audit logging
      if (enableAuditLogging && currentData) {
        await AuditTrailService.logPropertyUpdate(
          tableName,
          recordId,
          currentData,
          { ...currentData, ...updates },
          context
        )
      }

      return { success: true, data }
    } catch (error) {
      console.error('Enhanced property update failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Batch update multiple properties with enhanced features
   */
  static async batchUpdateProperties(
    updates: Array<{
      tableName: string
      recordId: string
      updates: Record<string, any>
      lastKnownTimestamp?: Date
    }>,
    options: EnhancedUpdateOptions = {}
  ): Promise<{ successful: number; failed: number; conflicts: any[] }> {
    let successful = 0
    let failed = 0
    const allConflicts: any[] = []

    const batchId = crypto.randomUUID()

    for (const update of updates) {
      const result = await this.updateProperty(
        update.tableName,
        update.recordId,
        update.updates,
        {
          ...options,
          lastKnownTimestamp: update.lastKnownTimestamp,
          context: {
            ...options.context,
            batch_id: batchId
          }
        }
      )

      if (result.success) {
        successful++
      } else {
        failed++
        if (result.conflicts) {
          allConflicts.push(...result.conflicts)
        }
      }
    }

    return { successful, failed, conflicts: allConflicts }
  }

  /**
   * Queue update for offline processing
   */
  private static async queueOfflineUpdate(
    tableName: string,
    recordId: string,
    updates: Record<string, any>,
    context?: any
  ): Promise<UpdateResult> {
    try {
      // Store in IndexedDB for offline processing
      const operation = {
        id: crypto.randomUUID(),
        type: 'UPDATE',
        tableName,
        recordId,
        updates,
        context,
        timestamp: Date.now()
      }

      // Use IndexedDB to store the operation
      const db = await this.openOfflineDB()
      const transaction = db.transaction(['operations'], 'readwrite')
      const store = transaction.objectStore('operations')
      await store.add(operation)

      return {
        success: true,
        queued: true,
        data: { message: 'Update queued for when connection is restored' }
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to queue offline update'
      }
    }
  }

  /**
   * Open IndexedDB for offline operations
   */
  private static openOfflineDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('MzimaOfflineDB', 1)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        if (!db.objectStoreNames.contains('operations')) {
          const store = db.createObjectStore('operations', { keyPath: 'id' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('tableName', 'tableName', { unique: false })
        }
      }
    })
  }

  /**
   * Create a new property with enhanced features
   */
  static async createProperty(
    tableName: string,
    propertyData: Record<string, any>,
    options: EnhancedUpdateOptions = {}
  ): Promise<UpdateResult> {
    const { enableAuditLogging = true, enableOfflineSupport = true, context } = options

    try {
      const isOnline = navigator.onLine

      if (!isOnline && enableOfflineSupport) {
        return this.queueOfflineCreate(tableName, propertyData, context)
      }

      const { data, error } = await supabase
        .from(tableName)
        .insert({
          ...propertyData,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      // Audit logging
      if (enableAuditLogging) {
        await AuditTrailService.logAction({
          table_name: tableName,
          record_id: data.id,
          action: 'CREATE',
          new_values: data,
          context: {
            source: 'WEB',
            ...context
          }
        })
      }

      return { success: true, data }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Queue create operation for offline processing
   */
  private static async queueOfflineCreate(
    tableName: string,
    propertyData: Record<string, any>,
    context?: any
  ): Promise<UpdateResult> {
    try {
      const operation = {
        id: crypto.randomUUID(),
        type: 'CREATE',
        tableName,
        propertyData,
        context,
        timestamp: Date.now()
      }

      const db = await this.openOfflineDB()
      const transaction = db.transaction(['operations'], 'readwrite')
      const store = transaction.objectStore('operations')
      await store.add(operation)

      return {
        success: true,
        queued: true,
        data: { message: 'Create operation queued for when connection is restored' }
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to queue offline create operation'
      }
    }
  }

  /**
   * Delete a property with enhanced features
   */
  static async deleteProperty(
    tableName: string,
    recordId: string,
    options: EnhancedUpdateOptions = {}
  ): Promise<UpdateResult> {
    const { enableAuditLogging = true, enableOfflineSupport = true, context } = options

    try {
      const isOnline = navigator.onLine

      if (!isOnline && enableOfflineSupport) {
        return this.queueOfflineDelete(tableName, recordId, context)
      }

      // Get current data for audit logging
      let currentData = null
      if (enableAuditLogging) {
        const { data } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', recordId)
          .single()
        currentData = data
      }

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', recordId)

      if (error) {
        return { success: false, error: error.message }
      }

      // Audit logging
      if (enableAuditLogging && currentData) {
        await AuditTrailService.logAction({
          table_name: tableName,
          record_id: recordId,
          action: 'DELETE',
          old_values: currentData,
          context: {
            source: 'WEB',
            ...context
          }
        })
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Queue delete operation for offline processing
   */
  private static async queueOfflineDelete(
    tableName: string,
    recordId: string,
    context?: any
  ): Promise<UpdateResult> {
    try {
      const operation = {
        id: crypto.randomUUID(),
        type: 'DELETE',
        tableName,
        recordId,
        context,
        timestamp: Date.now()
      }

      const db = await this.openOfflineDB()
      const transaction = db.transaction(['operations'], 'readwrite')
      const store = transaction.objectStore('operations')
      await store.add(operation)

      return {
        success: true,
        queued: true,
        data: { message: 'Delete operation queued for when connection is restored' }
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to queue offline delete operation'
      }
    }
  }
}

export default EnhancedPropertyUpdateService
