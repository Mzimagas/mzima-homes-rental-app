import getSupabaseClient from '../lib/supabase-client'

const supabase = getSupabaseClient()

export interface AuditLogEntry {
  id: string
  table_name: string
  record_id: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'EXPORT' | 'IMPORT'
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  changed_fields?: string[]
  user_id: string
  user_email?: string
  user_role?: string
  ip_address?: string
  user_agent?: string
  session_id?: string
  timestamp: string
  context?: {
    source?: 'WEB' | 'API' | 'MOBILE' | 'SYSTEM'
    workflow?: 'DIRECT_ADDITION' | 'PURCHASE_PIPELINE' | 'SUBDIVISION' | 'HANDOVER' | 'RENTAL'
    component?: string
    reason?: string
    batch_id?: string
  }
  metadata?: Record<string, any>
}

export interface AuditQueryOptions {
  tableName?: string
  recordId?: string
  userId?: string
  action?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
  includeSystemActions?: boolean
}

export interface AuditSummary {
  totalActions: number
  actionsByType: Record<string, number>
  actionsByUser: Record<string, number>
  actionsByTable: Record<string, number>
  recentActivity: AuditLogEntry[]
  topUsers: Array<{ userId: string; userEmail: string; actionCount: number }>
}

class AuditTrailService {
  private static readonly MAX_BATCH_SIZE = 100
  private static readonly RETENTION_DAYS = 2555 // 7 years for compliance

  /**
   * Log an audit entry
   */
  static async logAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'user_id' | 'user_email'>): Promise<boolean> {
    try {
      // Get current user info
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error('Error getting user for audit log:', userError)
        return false
      }

      // Get additional user context
      const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : 'Server'
      const sessionId = user.id + '_' + Date.now()

      const auditEntry: AuditLogEntry = {
        ...entry,
        id: crypto.randomUUID(),
        user_id: user.id,
        user_email: user.email,
        user_agent: userAgent,
        session_id: sessionId,
        timestamp: new Date().toISOString()
      }

      // Store in audit_logs table
      const { error } = await supabase
        .from('audit_logs')
        .insert(auditEntry)

      if (error) {
        console.error('Error storing audit log:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error logging audit action:', error)
      return false
    }
  }

  /**
   * Log a property update with detailed change tracking
   */
  static async logPropertyUpdate(
    tableName: string,
    recordId: string,
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
    context?: AuditLogEntry['context']
  ): Promise<boolean> {
    // Calculate changed fields
    const changedFields: string[] = []
    const filteredOldValues: Record<string, any> = {}
    const filteredNewValues: Record<string, any> = {}

    for (const [key, newValue] of Object.entries(newValues)) {
      if (key === 'updated_at' || key === 'created_at') continue
      
      const oldValue = oldValues[key]
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changedFields.push(key)
        filteredOldValues[key] = oldValue
        filteredNewValues[key] = newValue
      }
    }

    // Only log if there are actual changes
    if (changedFields.length === 0) {
      return true
    }

    return this.logAction({
      table_name: tableName,
      record_id: recordId,
      action: 'UPDATE',
      old_values: filteredOldValues,
      new_values: filteredNewValues,
      changed_fields: changedFields,
      context: {
        source: 'WEB',
        ...context
      }
    })
  }

  /**
   * Log a batch of operations
   */
  static async logBatchOperations(
    operations: Array<Omit<AuditLogEntry, 'id' | 'timestamp' | 'user_id' | 'user_email'>>,
    batchId?: string
  ): Promise<boolean> {
    try {
      const batchIdToUse = batchId || crypto.randomUUID()
      
      // Process in chunks to avoid overwhelming the database
      for (let i = 0; i < operations.length; i += this.MAX_BATCH_SIZE) {
        const chunk = operations.slice(i, i + this.MAX_BATCH_SIZE)
        
        for (const operation of chunk) {
          await this.logAction({
            ...operation,
            context: {
              ...operation.context,
              batch_id: batchIdToUse
            }
          })
        }
      }

      return true
    } catch (error) {
      console.error('Error logging batch operations:', error)
      return false
    }
  }

  /**
   * Query audit logs with filtering
   */
  static async queryAuditLogs(options: AuditQueryOptions = {}): Promise<AuditLogEntry[]> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })

      // Apply filters
      if (options.tableName) {
        query = query.eq('table_name', options.tableName)
      }

      if (options.recordId) {
        query = query.eq('record_id', options.recordId)
      }

      if (options.userId) {
        query = query.eq('user_id', options.userId)
      }

      if (options.action) {
        query = query.eq('action', options.action)
      }

      if (options.startDate) {
        query = query.gte('timestamp', options.startDate.toISOString())
      }

      if (options.endDate) {
        query = query.lte('timestamp', options.endDate.toISOString())
      }

      if (!options.includeSystemActions) {
        query = query.neq('user_id', 'system')
      }

      if (options.limit) {
        query = query.limit(options.limit)
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error querying audit logs:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error querying audit logs:', error)
      return []
    }
  }

  /**
   * Get audit summary for dashboard
   */
  static async getAuditSummary(days: number = 30): Promise<AuditSummary> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const logs = await this.queryAuditLogs({
        startDate,
        limit: 1000,
        includeSystemActions: false
      })

      // Calculate summary statistics
      const actionsByType: Record<string, number> = {}
      const actionsByUser: Record<string, number> = {}
      const actionsByTable: Record<string, number> = {}
      const userEmails: Record<string, string> = {}

      logs.forEach(log => {
        // Actions by type
        actionsByType[log.action] = (actionsByType[log.action] || 0) + 1

        // Actions by user
        actionsByUser[log.user_id] = (actionsByUser[log.user_id] || 0) + 1
        if (log.user_email) {
          userEmails[log.user_id] = log.user_email
        }

        // Actions by table
        actionsByTable[log.table_name] = (actionsByTable[log.table_name] || 0) + 1
      })

      // Top users
      const topUsers = Object.entries(actionsByUser)
        .map(([userId, actionCount]) => ({
          userId,
          userEmail: userEmails[userId] || 'Unknown',
          actionCount
        }))
        .sort((a, b) => b.actionCount - a.actionCount)
        .slice(0, 10)

      return {
        totalActions: logs.length,
        actionsByType,
        actionsByUser,
        actionsByTable,
        recentActivity: logs.slice(0, 20),
        topUsers
      }
    } catch (error) {
      console.error('Error getting audit summary:', error)
      return {
        totalActions: 0,
        actionsByType: {},
        actionsByUser: {},
        actionsByTable: {},
        recentActivity: [],
        topUsers: []
      }
    }
  }

  /**
   * Get change history for a specific record
   */
  static async getRecordHistory(tableName: string, recordId: string): Promise<AuditLogEntry[]> {
    return this.queryAuditLogs({
      tableName,
      recordId,
      includeSystemActions: true
    })
  }

  /**
   * Export audit logs for compliance
   */
  static async exportAuditLogs(
    options: AuditQueryOptions & { format?: 'JSON' | 'CSV' }
  ): Promise<string> {
    try {
      const logs = await this.queryAuditLogs(options)
      
      if (options.format === 'CSV') {
        return this.convertToCSV(logs)
      }
      
      return JSON.stringify(logs, null, 2)
    } catch (error) {
      console.error('Error exporting audit logs:', error)
      return ''
    }
  }

  /**
   * Convert audit logs to CSV format
   */
  private static convertToCSV(logs: AuditLogEntry[]): string {
    if (logs.length === 0) return ''

    const headers = [
      'Timestamp',
      'Table',
      'Record ID',
      'Action',
      'User Email',
      'Changed Fields',
      'Context',
      'IP Address'
    ]

    const rows = logs.map(log => [
      log.timestamp,
      log.table_name,
      log.record_id,
      log.action,
      log.user_email || '',
      log.changed_fields?.join(', ') || '',
      JSON.stringify(log.context || {}),
      log.ip_address || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n')

    return csvContent
  }

  /**
   * Clean up old audit logs based on retention policy
   */
  static async cleanupOldLogs(): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS)

      const { data, error } = await supabase
        .from('audit_logs')
        .delete()
        .lt('timestamp', cutoffDate.toISOString())

      if (error) {
        console.error('Error cleaning up old audit logs:', error)
        return 0
      }

      return data?.length || 0
    } catch (error) {
      console.error('Error cleaning up old audit logs:', error)
      return 0
    }
  }

  /**
   * Log user access to sensitive data
   */
  static async logDataAccess(
    tableName: string,
    recordId: string,
    accessType: 'VIEW' | 'EXPORT' | 'PRINT',
    context?: string
  ): Promise<boolean> {
    return this.logAction({
      table_name: tableName,
      record_id: recordId,
      action: 'VIEW',
      context: {
        source: 'WEB',
        reason: `Data ${accessType.toLowerCase()}: ${context || 'User accessed data'}`
      }
    })
  }
}

export default AuditTrailService

// Hook for using audit trail in React components
export const useAuditTrail = () => {
  const logAction = async (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'user_id' | 'user_email'>) => {
    return AuditTrailService.logAction(entry)
  }

  const logPropertyUpdate = async (
    tableName: string,
    recordId: string,
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
    context?: AuditLogEntry['context']
  ) => {
    return AuditTrailService.logPropertyUpdate(tableName, recordId, oldValues, newValues, context)
  }

  const logDataAccess = async (
    tableName: string,
    recordId: string,
    accessType: 'VIEW' | 'EXPORT' | 'PRINT',
    context?: string
  ) => {
    return AuditTrailService.logDataAccess(tableName, recordId, accessType, context)
  }

  return {
    logAction,
    logPropertyUpdate,
    logDataAccess,
    queryAuditLogs: AuditTrailService.queryAuditLogs,
    getAuditSummary: AuditTrailService.getAuditSummary,
    getRecordHistory: AuditTrailService.getRecordHistory,
    exportAuditLogs: AuditTrailService.exportAuditLogs
  }
}
