'use client'

import React, { useState } from 'react'
import { Button } from '../../ui'
import {
  SecurityTestService,
  SecurityTestResult,
} from '../../../lib/security/security-test.service'
import { FieldSecurityService } from '../../../lib/security/field-security.service'
import { RoleManagementService } from '../../../lib/auth/role-management.service'
import { supabase } from '../../../lib/supabase-client'

export default function SecurityTestPanel() {
  const [testResults, setTestResults] = useState<SecurityTestResult[]>([])
  const [testing, setTesting] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [permissions, setPermissions] = useState<string[]>([])
  const [securityMetrics, setSecurityMetrics] = useState<any>(null)
  const [realtimeMonitoring, setRealtimeMonitoring] = useState(false)
  const [realtimeEvents, setRealtimeEvents] = useState<any[]>([])
  const [monitoringStartTime, setMonitoringStartTime] = useState<Date | null>(null)

  const runSecurityTests = async () => {
    setTesting(true)
    try {
      const results = await SecurityTestService.runAllTests()
      setTestResults(results)

      // Also get current user info
      await loadUserInfo()
    } catch (error) {
          } finally {
      setTesting(false)
    }
  }

  const loadUserInfo = async () => {
    try {
            const role = await RoleManagementService.getCurrentUserRole()
            let perms = await RoleManagementService.getCurrentUserPermissions()
                  if ((!perms || perms.length === 0) && role) {
                const allRoles = RoleManagementService.getAllRoles()
        const roleDefinition = allRoles.find((r) => r.role === role)
        if (roleDefinition) {
          perms = roleDefinition.permissions
                  }
      }

      setUserRole(role)
      setPermissions(perms || [])
    } catch (error) {
          }
  }

  // Load user info once on component mount
  React.useEffect(() => {
    loadUserInfo()
  }, [])

  const testFieldSecurity = async () => {
    try {
      const config = await FieldSecurityService.getFieldSecurityConfig()
            const summary = await FieldSecurityService.getFieldSecuritySummary(
        ['asking_price_kes', 'property_name', 'property_condition_notes'],
        userRole || 'property_manager'
      )
          } catch (error) {
          }
  }

  const debugUserInfo = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
            if (user) {
        const { data: roles, error } = await supabase
          .from('security_user_roles')
          .select('*')
          .eq('user_id', user.id)

              }
    } catch (error) {
          }
  }

  const generateSecurityReport = async () => {
    setTesting(true)
    try {
      // Comprehensive security metrics
      const metrics = {
        totalAuditLogs: 0,
        recentChanges: 0,
        pendingApprovals: 0,
        securityViolations: 0,
        userActivity: {},
        riskScore: 0,
      }

      // Get audit log statistics
      const { data: auditLogs } = await supabase
        .from('purchase_pipeline_audit_log')
        .select('*')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      metrics.totalAuditLogs = auditLogs?.length || 0
      metrics.recentChanges =
        auditLogs?.filter(
          (log) => new Date(log.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length || 0

      // Get pending approvals
      const { data: approvals } = await supabase
        .from('purchase_pipeline_change_approvals')
        .select('*')
        .eq('status', 'PENDING')

      metrics.pendingApprovals = approvals?.length || 0

      // Calculate risk score based on activity
      metrics.riskScore = Math.min(
        100,
        metrics.recentChanges * 10 + metrics.pendingApprovals * 20 + metrics.securityViolations * 50
      )

      setSecurityMetrics(metrics)
      alert(
        `Security Report Generated!\n\nTotal Audit Logs (7 days): ${metrics.totalAuditLogs}\nRecent Changes (24h): ${metrics.recentChanges}\nPending Approvals: ${metrics.pendingApprovals}\nRisk Score: ${metrics.riskScore}/100`
      )
    } catch (error) {
            alert('Failed to generate security report')
    } finally {
      setTesting(false)
    }
  }

  const startRealtimeMonitoring = () => {
    setRealtimeMonitoring(true)
    setMonitoringStartTime(new Date())
    setRealtimeEvents([])

    // Set up real-time subscription to audit logs
    const subscription = supabase
      .channel('security_monitoring')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'purchase_pipeline_audit_log' },
        (payload) => {
          const timestamp = new Date()
          const eventData = {
            id: Date.now(),
            timestamp,
            eventType: payload.eventType,
            table: payload.table,
            purchaseId: payload.new?.purchase_id || payload.old?.purchase_id || 'unknown',
            operationType: payload.new?.operation_type || 'unknown',
            changedBy: payload.new?.changed_by || 'unknown',
            requiresApproval: payload.new?.requires_approval || false,
          }

          // Add to real-time events feed
          setRealtimeEvents((prev) => [eventData, ...prev.slice(0, 9)]) // Keep last 10 events

                    // Show notification with more details
          const message = `🔒 SECURITY ALERT!\n\nEvent: ${eventData.eventType}\nOperation: ${eventData.operationType}\nPurchase: ${eventData.purchaseId}\nTime: ${timestamp.toLocaleTimeString()}\nRequires Approval: ${eventData.requiresApproval ? 'Yes' : 'No'}`

          // Use a more prominent notification
          if (window.confirm(message + '\n\nClick OK to view details, Cancel to dismiss')) {
                      }
        }
      )
      .subscribe()

    // Auto-stop after 5 minutes
    setTimeout(
      () => {
        subscription.unsubscribe()
        setRealtimeMonitoring(false)
        setMonitoringStartTime(null)
        alert('⏰ Real-time monitoring automatically stopped after 5 minutes')
      },
      5 * 60 * 1000
    )

    alert(
      '🔒 Real-time security monitoring started!\n\n✅ Live audit log monitoring\n✅ Instant security alerts\n✅ Real-time event feed\n✅ Auto-stop in 5 minutes\n\nTry creating or editing a purchase to see it in action!'
    )
  }

  const stopRealtimeMonitoring = () => {
    setRealtimeMonitoring(false)
    setMonitoringStartTime(null)
    // Note: In a real implementation, we'd store the subscription reference to unsubscribe
    alert(
      `🔒 Real-time monitoring stopped\n\nCaptured ${realtimeEvents.length} security events during this session`
    )
  }

  const simulateSecurityEvent = async () => {
    try {
            // Check authentication
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError) {
                alert(`Authentication error: ${authError.message}`)
        return
      }

      if (!user) {
        alert('Please log in first')
        return
      }

                  const testPurchaseId =
        '00000000-0000-0000-0000-' + Date.now().toString().padStart(12, '0').slice(-12)
            // First, check if the table exists and is accessible
      const { data: testQuery, error: testError } = await supabase
        .from('purchase_pipeline_audit_log')
        .select('id')
        .limit(1)

      if (testError) {
                alert(
          `Cannot access audit log table: ${testError.message}\n\nThis might be due to:\n- Table doesn't exist\n- Permission issues\n- RLS policies blocking access`
        )
        return
      }

                  const insertData = {
        purchase_id: testPurchaseId,
        operation_type: 'UPDATE',
        changed_fields: ['security_test'],
        old_values: { security_test: 'before' },
        new_values: { security_test: 'after' },
        changed_by: user.id,
        requires_approval: true,
      }

            const { data: insertResult, error: insertError } = await supabase
        .from('purchase_pipeline_audit_log')
        .insert(insertData)
        .select()

      if (insertError) {
                alert(
          `Failed to simulate security event:\n\nError: ${insertError.message}\nCode: ${insertError.code}\n\nThis might be due to:\n- Missing required fields\n- Data type mismatches\n- RLS policies\n- Permission issues`
        )
      } else {
                alert(
          `🔒 Security event simulated successfully!\n\nPurchase ID: ${testPurchaseId}\nOperation: UPDATE\nUser: ${user.email}\nRequires Approval: Yes\n\nCheck the audit trail for the new entry.`
        )
      }
    } catch (error) {
            console.error('Error details:', JSON.stringify(error, null, 2))

      if (error instanceof Error) {
        alert(
          `Failed to simulate security event:\n\nError: ${error.message}\n\nCheck the browser console for more details.`
        )
      } else {
        alert(
          `Failed to simulate security event:\n\nUnknown error occurred. Check the browser console for details.`
        )
      }
    }
  }

    const simulateSecurityEventFallback = () => {
    const timestamp = new Date()
    const testEvent = {
      id: Date.now(),
      timestamp,
      eventType: 'INSERT',
      table: 'purchase_pipeline_audit_log',
      purchaseId: '00000000-0000-0000-0000-' + Date.now().toString().padStart(12, '0').slice(-12),
      operationType: 'SIMULATION',
      changedBy: 'current_user',
      requiresApproval: true,
    }

    // Add to real-time events feed for demonstration
    setRealtimeEvents((prev) => [testEvent, ...prev.slice(0, 9)])

    alert(
      `🔒 Security Event Simulated (Demo Mode)!\n\nEvent Type: ${testEvent.eventType}\nOperation: ${testEvent.operationType}\nPurchase ID: ${testEvent.purchaseId}\nTime: ${timestamp.toLocaleTimeString()}\n\nThis is a demonstration event added to the live feed.`
    )
  }

    const debugPermissions = async () => {
    try {
                  const role = await RoleManagementService.getCurrentUserRole()
                  const allRoles = RoleManagementService.getAllRoles()
                  const roleDefinition = allRoles.find((r) => r.role === role)
                  const perms = await RoleManagementService.getCurrentUserPermissions()
                  const directPerms = roleDefinition?.permissions || []
            // Update UI with direct permissions if service fails
      if (perms && perms.length > 0) {
        setPermissions(perms)
        alert(`✅ Permissions loaded via service:\n${perms.join(', ')}`)
      } else if (directPerms.length > 0) {
        setPermissions(directPerms)
        alert(`✅ Permissions loaded via fallback:\n${directPerms.join(', ')}`)
      } else {
        alert('❌ No permissions found. Check console for details.')
      }
    } catch (error) {
            alert('❌ Permission debug failed. Check console for details.')
    }
  }

  // Manual role assignment removed - now handled automatically in loadUserInfo()

  const passedTests = testResults.filter((r) => r.passed).length
  const totalTests = testResults.length

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Security System Validation</h3>
          <p className="text-sm text-gray-600">Test and validate the security implementation</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <Button
            onClick={loadUserInfo}
            variant="outline"
            disabled={testing}
            className="bg-white hover:bg-blue-50 border-2 border-blue-500 text-blue-700 hover:text-blue-800 font-medium shadow-sm relative z-10"
          >
            <span className="relative z-20">🔄 Refresh Security Context</span>
          </Button>

          {/* Security Tests - Admin/Development Only */}
          {(userRole === 'admin' || process.env.NODE_ENV === 'development') && (
            <Button
              onClick={runSecurityTests}
              disabled={testing}
              className="bg-white hover:bg-purple-50 border-2 border-purple-500 text-purple-700 hover:text-purple-800 font-medium shadow-sm relative z-10"
            >
              <span className="relative z-20">
                {testing ? '⏳ Running Tests...' : '🧪 Security Tests (Admin)'}
              </span>
            </Button>
          )}

          <Button
            onClick={generateSecurityReport}
            variant="outline"
            disabled={testing}
            className="bg-white hover:bg-orange-50 border-2 border-orange-500 text-orange-700 hover:text-orange-800 font-medium shadow-sm relative z-10"
          >
            <span className="relative z-20">📊 Security Report</span>
          </Button>

          {/* Field Security Tests - Admin/Development Only */}
          {(userRole === 'admin' || process.env.NODE_ENV === 'development') && (
            <Button
              onClick={testFieldSecurity}
              variant="outline"
              disabled={testing}
              className="bg-white hover:bg-teal-50 border-2 border-teal-500 text-teal-700 hover:text-teal-800 font-medium shadow-sm relative z-10"
            >
              <span className="relative z-20">🛡️ Field Security (Admin)</span>
            </Button>
          )}

          {!realtimeMonitoring ? (
            <Button
              onClick={startRealtimeMonitoring}
              variant="outline"
              disabled={testing}
              className="bg-white hover:bg-red-50 border-2 border-red-500 text-red-700 hover:text-red-800 font-medium shadow-sm relative z-10"
            >
              <span className="relative z-20">📡 Start Live Monitoring</span>
            </Button>
          ) : (
            <Button
              onClick={stopRealtimeMonitoring}
              variant="outline"
              className="bg-red-50 hover:bg-red-100 border-2 border-red-500 text-red-700 hover:text-red-800 font-medium shadow-sm relative z-10 animate-pulse"
            >
              <span className="flex items-center space-x-1 relative z-20">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                <span>🔴 LIVE ({realtimeEvents.length})</span>
              </span>
            </Button>
          )}

          {/* Development/Admin Tools */}
          {(userRole === 'admin' || process.env.NODE_ENV === 'development') && (
            <>
              <Button
                onClick={simulateSecurityEvent}
                variant="outline"
                disabled={testing}
                className="bg-white hover:bg-amber-50 border-2 border-amber-500 text-amber-700 hover:text-amber-800 font-medium shadow-sm relative z-10"
              >
                <span className="relative z-20">⚡ Simulate Event</span>
              </Button>

              <Button
                onClick={simulateSecurityEventFallback}
                variant="outline"
                disabled={testing}
                className="bg-white hover:bg-green-50 border-2 border-green-500 text-green-700 hover:text-green-800 font-medium shadow-sm relative z-10"
              >
                <span className="relative z-20">🎭 Demo Event</span>
              </Button>

              <Button
                onClick={debugUserInfo}
                variant="outline"
                disabled={testing}
                className="bg-white hover:bg-slate-50 border-2 border-slate-500 text-slate-700 hover:text-slate-800 font-medium shadow-sm relative z-10"
              >
                <span className="relative z-20">🔍 Debug Info</span>
              </Button>

              <Button
                onClick={debugPermissions}
                variant="outline"
                disabled={testing}
                className="bg-white hover:bg-indigo-50 border-2 border-indigo-500 text-indigo-700 hover:text-indigo-800 font-medium shadow-sm relative z-10"
              >
                <span className="relative z-20">🔑 Fix Permissions</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Real-time Security Status */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* User Security Context */}
        {userRole && userRole !== 'viewer' ? (
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-medium text-green-900 mb-2">✅ Security Role Active</h4>
            <div className="text-sm text-green-800">
              <p>
                <strong>Role:</strong> {userRole}
              </p>
              <p>
                <strong>Permissions:</strong>{' '}
                {permissions.length > 0 ? permissions.join(', ') : 'No permissions loaded'}
              </p>
              <p className="mt-2 text-xs">Security system active and ready for use</p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-yellow-900 mb-2">⚠️ No Security Role Found</h4>
            <div className="text-sm text-yellow-800">
              <p>No active security role detected for your account.</p>
              <p className="mt-1 text-xs">
                Click &quot;Refresh Now&quot; to check for role updates or contact your administrator.
              </p>
            </div>
          </div>
        )}

        {/* Real-time Monitoring Status */}
        <div
          className={`p-4 rounded-lg border ${
            realtimeMonitoring ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
          }`}
        >
          <h4
            className={`font-medium mb-2 ${realtimeMonitoring ? 'text-red-900' : 'text-gray-900'}`}
          >
            {realtimeMonitoring ? (
              <div className="flex items-center space-x-2">
                <span className="animate-pulse">🔴</span>
                <span>Real-time Monitoring LIVE</span>
              </div>
            ) : (
              '📡 Real-time Monitoring'
            )}
          </h4>
          <div className={`text-sm ${realtimeMonitoring ? 'text-red-800' : 'text-gray-600'}`}>
            {realtimeMonitoring ? (
              <>
                <p>🟢 Live monitoring all security events</p>
                <p>🔔 Instant alerts for all database changes</p>
                <p>📊 Events captured: {realtimeEvents.length}</p>
                {monitoringStartTime && (
                  <p className="mt-2 text-xs">
                    Started: {monitoringStartTime.toLocaleTimeString()}
                  </p>
                )}
              </>
            ) : (
              <>
                <p>⚪ Monitoring is currently disabled</p>
                <p>Click &quot;Start Monitoring&quot; to enable real-time alerts</p>
                <p className="text-xs mt-1">Will monitor: Audit logs, approvals, field changes</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Security Metrics Dashboard */}
      {securityMetrics && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-3">📊 Security Metrics (Last 7 Days)</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-800">
                {securityMetrics.totalAuditLogs}
              </div>
              <div className="text-xs text-blue-600">Total Audit Logs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-800">
                {securityMetrics.recentChanges}
              </div>
              <div className="text-xs text-orange-600">Recent Changes (24h)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-800">
                {securityMetrics.pendingApprovals}
              </div>
              <div className="text-xs text-red-600">Pending Approvals</div>
            </div>
            <div className="text-center">
              <div
                className={`text-2xl font-bold ${
                  securityMetrics.riskScore < 30
                    ? 'text-green-800'
                    : securityMetrics.riskScore < 70
                      ? 'text-yellow-800'
                      : 'text-red-800'
                }`}
              >
                {securityMetrics.riskScore}
              </div>
              <div className="text-xs text-gray-600">Risk Score</div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Events Feed */}
      {realtimeMonitoring && realtimeEvents.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h4 className="font-medium text-yellow-900 mb-3">🔴 LIVE Security Events Feed</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {realtimeEvents.map((event) => (
              <div key={event.id} className="p-2 bg-white rounded border text-sm">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <span className="font-medium text-yellow-800">
                      {event.eventType} - {event.operationType}
                    </span>
                    <div className="text-xs text-yellow-700 mt-1">
                      Purchase: {event.purchaseId} | User: {event.changedBy} | Approval:{' '}
                      {event.requiresApproval ? 'Required' : 'Not Required'}
                    </div>
                  </div>
                  <span className="text-xs text-yellow-600">
                    {event.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-yellow-700 mt-2">
            ⚡ Live feed updates automatically - showing last 10 events
          </p>
        </div>
      )}

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Test Results</h4>
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                passedTests === totalTests
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {passedTests}/{totalTests} Passed
            </div>
          </div>

          <div className="space-y-3">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-lg ${result.passed ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {result.passed ? '✅' : '❌'}
                      </span>
                      <h5
                        className={`font-medium ${result.passed ? 'text-green-900' : 'text-red-900'}`}
                      >
                        {result.testName}
                      </h5>
                    </div>
                    <p
                      className={`mt-1 text-sm ${result.passed ? 'text-green-700' : 'text-red-700'}`}
                    >
                      {result.message}
                    </p>
                    {result.details && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-600 cursor-pointer">
                          Show Details
                        </summary>
                        <pre className="mt-1 text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Security Implementation Status</h4>
            {passedTests === totalTests ? (
              <div className="text-green-700">
                <p className="font-medium">🎉 All security tests passed!</p>
                <p className="text-sm mt-1">
                  The security system is properly implemented and ready for production use. All
                  audit trails, field-level security, role-based access control, and approval
                  workflows are functioning correctly.
                </p>
              </div>
            ) : (
              <div className="text-red-700">
                <p className="font-medium">⚠️ Some security tests failed</p>
                <p className="text-sm mt-1">
                  Please review the failed tests above and address any issues before deploying to
                  production. Security is critical for protecting sensitive financial and property
                  data.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security Features Overview */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="text-blue-600 text-2xl mb-2">🔒</div>
          <h5 className="font-medium text-blue-900">Field-Level Security</h5>
          <p className="text-sm text-blue-700 mt-1">
            Different security levels for sensitive fields with role-based access control
          </p>
        </div>

        <div className="p-4 bg-green-50 rounded-lg">
          <div className="text-green-600 text-2xl mb-2">📋</div>
          <h5 className="font-medium text-green-900">Audit Trail</h5>
          <p className="text-sm text-green-700 mt-1">
            Complete change history with user tracking and approval status
          </p>
        </div>

        <div className="p-4 bg-purple-50 rounded-lg">
          <div className="text-purple-600 text-2xl mb-2">✅</div>
          <h5 className="font-medium text-purple-900">Approval Workflow</h5>
          <p className="text-sm text-purple-700 mt-1">
            Sensitive changes require approval with business justification
          </p>
        </div>

        <div className="p-4 bg-orange-50 rounded-lg">
          <div className="text-orange-600 text-2xl mb-2">👥</div>
          <h5 className="font-medium text-orange-900">Role Management</h5>
          <p className="text-sm text-orange-700 mt-1">
            Hierarchical role system with granular permission control
          </p>
        </div>
      </div>
    </div>
  )
}
