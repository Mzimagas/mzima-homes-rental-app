'use client'

import { useState, useEffect } from 'react'
import { FieldSecurityService, AuditLogEntry } from '../../../lib/security/field-security.service'
import { Button } from '../../ui'
import supabase from '../../../lib/supabase-client'

interface AuditTrailDashboardProps {
  purchaseId?: string
  userRole: string
}

export default function AuditTrailDashboard({ purchaseId, userRole }: AuditTrailDashboardProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'audit' | 'approvals' | 'analytics'>('audit')
  const [filters, setFilters] = useState({
    dateRange: '7d',
    operationType: 'all',
    userId: 'all',
    requiresApproval: 'all',
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [realTimeEnabled, setRealTimeEnabled] = useState(false)
  const [analytics, setAnalytics] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [purchaseId, userRole])

  const loadData = async () => {
    setLoading(true)
    try {
      if (purchaseId) {
        const logs = await FieldSecurityService.getAuditTrail(purchaseId)
        setAuditLogs(logs)
      }

      const approvals = await FieldSecurityService.getPendingApprovals(userRole)
      setPendingApprovals(approvals)
    } catch (error) {
          } finally {
      setLoading(false)
    }
  }

  const handleApproval = async (
    approvalId: string,
    action: 'APPROVED' | 'REJECTED',
    notes?: string
  ) => {
    try {
      await FieldSecurityService.processApproval(approvalId, action, notes)
      await loadData() // Refresh data
      alert(`Change request ${action.toLowerCase()} successfully`)
    } catch (error) {
            alert('Failed to process approval')
    }
  }

  const loadAnalytics = async () => {
    try {
      const { data: logs } = await supabase
        .from('purchase_pipeline_audit_log')
        .select('*')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      if (logs) {
        const analytics = {
          totalOperations: logs.length,
          operationsByType: logs.reduce((acc: any, log: any) => {
            acc[log.operation_type] = (acc[log.operation_type] || 0) + 1
            return acc
          }, {}),
          operationsByDay: logs.reduce((acc: any, log: any) => {
            const day = new Date(log.created_at).toDateString()
            acc[day] = (acc[day] || 0) + 1
            return acc
          }, {}),
          requiresApprovalCount: logs.filter((log: any) => log.requires_approval).length,
          uniqueUsers: new Set(logs.map((log: any) => log.changed_by)).size,
        }
        setAnalytics(analytics)
      }
    } catch (error) {
          }
  }

  const exportAuditLogs = () => {
    const csvContent = [
      ['Timestamp', 'Purchase ID', 'Operation', 'Changed Fields', 'User', 'Requires Approval'],
      ...auditLogs.map((log) => [
        new Date(log.created_at).toLocaleString(),
        log.purchase_id,
        log.operation_type,
        Array.isArray(log.changed_fields)
          ? log.changed_fields.join(', ')
          : JSON.stringify(log.changed_fields),
        log.changed_by,
        log.requires_approval ? 'Yes' : 'No',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit_trail_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const enableRealTimeMonitoring = () => {
    setRealTimeEnabled(true)

    const subscription = supabase
      .channel('audit_trail_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'purchase_pipeline_audit_log' },
        (payload: any) => {
                    loadData() // Refresh data when changes occur

          // Show notification
          if (payload.eventType === 'INSERT') {
            alert(
              `🔒 New audit log: ${payload.new.operation_type} operation on purchase ${payload.new.purchase_id}`
            )
          }
        }
      )
      .subscribe()

    alert('Real-time monitoring enabled! You will receive notifications for all audit events.')
  }

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A'
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case 'INSERT':
        return '➕'
      case 'UPDATE':
        return '✏️'
      case 'DELETE':
        return '🗑️'
      case 'STATUS_CHANGE':
        return '🔄'
      case 'STAGE_UPDATE':
        return '📈'
      default:
        return '📝'
    }
  }

  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case 'PUBLIC':
        return 'bg-green-100 text-green-800'
      case 'RESTRICTED':
        return 'bg-yellow-100 text-yellow-800'
      case 'CONFIDENTIAL':
        return 'bg-orange-100 text-orange-800'
      case 'LOCKED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <div className="p-4">Loading audit data...</div>
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Enhanced Header with Controls */}
      <div className="p-6 border-b bg-gray-50">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Security & Audit Management</h3>
            <p className="text-sm text-gray-600">
              Monitor, analyze, and manage all security events
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={exportAuditLogs}
              variant="outline"
              className="bg-green-50 hover:bg-green-100 border-green-200"
            >
              📊 Export CSV
            </Button>
            <Button
              onClick={enableRealTimeMonitoring}
              variant="outline"
              disabled={realTimeEnabled}
              className={
                realTimeEnabled
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-red-50 hover:bg-red-100 border-red-200'
              }
            >
              {realTimeEnabled ? '📡 Monitoring Active' : '📡 Enable Real-time'}
            </Button>
            <Button
              onClick={loadAnalytics}
              variant="outline"
              className="bg-blue-50 hover:bg-blue-100 border-blue-200"
            >
              🔄 Refresh Data
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'audit'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            🔍 Audit Trail ({auditLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'approvals'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            ⏳ Pending Approvals ({pendingApprovals.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📈 Analytics & Insights
          </button>
        </nav>
      </div>

      {/* Audit Trail Tab */}
      {activeTab === 'audit' && (
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Change History</h3>

          {auditLogs.length === 0 ? (
            <p className="text-gray-500">No changes recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {auditLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getOperationIcon(log.operation_type)}</span>
                      <div>
                        <div className="font-medium">
                          {log.operation_type} - {log.changed_fields.join(', ')}
                        </div>
                        <div className="text-sm text-gray-600">
                          by {log.changed_by} • {new Date(log.created_at).toLocaleString()}
                        </div>
                        {log.change_reason && (
                          <div className="text-sm text-blue-600 mt-1">
                            Reason: {log.change_reason}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {log.requires_approval && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                          Requires Approval
                        </span>
                      )}
                      {log.approved_by && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                          ✓ Approved
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Show field changes */}
                  {log.operation_type === 'UPDATE' && log.old_values && log.new_values && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {log.changed_fields.map((field) => (
                        <div key={field} className="bg-white rounded p-3 border">
                          <div className="font-medium text-sm text-gray-700 mb-1">{field}</div>
                          <div className="text-xs space-y-1">
                            <div className="text-red-600">
                              <span className="font-medium">Before:</span>{' '}
                              {formatValue(log.old_values[field])}
                            </div>
                            <div className="text-green-600">
                              <span className="font-medium">After:</span>{' '}
                              {formatValue(log.new_values[field])}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pending Approvals Tab */}
      {activeTab === 'approvals' && (
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Pending Change Approvals</h3>

          {pendingApprovals.length === 0 ? (
            <p className="text-gray-500">No pending approvals.</p>
          ) : (
            <div className="space-y-4">
              {pendingApprovals.map((approval) => (
                <div key={approval.id} className="border rounded-lg p-4 bg-yellow-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">
                        {approval.purchase?.property_name || 'Unknown Property'}
                      </div>
                      <div className="text-sm text-gray-600">
                        Requested by {approval.requested_by_user?.email} •
                        {new Date(approval.requested_at).toLocaleString()}
                      </div>
                      <div className="text-sm mt-2">
                        <strong>Changes:</strong> {approval.change_summary}
                      </div>
                      <div className="text-sm mt-1">
                        <strong>Justification:</strong> {approval.business_justification}
                      </div>
                      {approval.risk_assessment && (
                        <div className="text-sm mt-1">
                          <strong>Risk Assessment:</strong> {approval.risk_assessment}
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const notes = prompt('Approval notes (optional):')
                          handleApproval(approval.id, 'APPROVED', notes || undefined)
                        }}
                        className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                      >
                        ✓ Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const notes = prompt('Rejection reason (required):')
                          if (notes) {
                            handleApproval(approval.id, 'REJECTED', notes)
                          }
                        }}
                        className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                      >
                        ✗ Reject
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-gray-500">
                    Expires: {new Date(approval.expires_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="p-6">
          <div className="mb-6">
            <Button onClick={loadAnalytics} variant="outline" className="mb-4">
              🔄 Refresh Analytics
            </Button>
          </div>

          {analytics ? (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-800">
                    {analytics.totalOperations}
                  </div>
                  <div className="text-sm text-blue-600">Total Operations (30 days)</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-800">{analytics.uniqueUsers}</div>
                  <div className="text-sm text-green-600">Active Users</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <div className="text-2xl font-bold text-orange-800">
                    {analytics.requiresApprovalCount}
                  </div>
                  <div className="text-sm text-orange-600">Required Approvals</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="text-2xl font-bold text-purple-800">
                    {Math.round(
                      (analytics.requiresApprovalCount / analytics.totalOperations) * 100
                    )}
                    %
                  </div>
                  <div className="text-sm text-purple-600">Approval Rate</div>
                </div>
              </div>

              {/* Operations by Type */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">📊 Operations by Type</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(analytics.operationsByType).map(([type, count]) => (
                    <div key={type} className="bg-white p-3 rounded border">
                      <div className="text-lg font-semibold">{count as number}</div>
                      <div className="text-sm text-gray-600">{type}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">📈 Daily Activity (Last 7 Days)</h4>
                <div className="space-y-2">
                  {Object.entries(analytics.operationsByDay)
                    .slice(-7)
                    .map(([day, count]) => (
                      <div
                        key={day}
                        className="flex items-center justify-between bg-white p-2 rounded"
                      >
                        <span className="text-sm">{new Date(day).toLocaleDateString()}</span>
                        <div className="flex items-center space-x-2">
                          <div
                            className="bg-blue-500 h-2 rounded"
                            style={{ width: `${Math.max(10, (count as number) * 10)}px` }}
                          />
                          <span className="text-sm font-medium">{count as number}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Security Insights */}
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-yellow-900 mb-3">🔒 Security Insights</h4>
                <div className="space-y-2 text-sm text-yellow-800">
                  <p>
                    • {analytics.requiresApprovalCount} operations required approval in the last 30
                    days
                  </p>
                  <p>• {analytics.uniqueUsers} unique users have made changes</p>
                  <p>
                    • Most common operation:{' '}
                    {Object.entries(analytics.operationsByType).sort(
                      ([, a], [, b]) => (b as number) - (a as number)
                    )[0]?.[0] || 'N/A'}
                  </p>
                  <p>• Average operations per day: {Math.round(analytics.totalOperations / 30)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Click &quot;Refresh Analytics&quot; to load security insights</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
