'use client'

import { useState, useEffect, Suspense, lazy } from 'react'
import { useAuth } from '../../../components/auth/AuthProvider'
import { clientBusinessFunctions } from '../../../lib/supabase-client'
import { LoadingStats, LoadingCard } from '../../../components/ui/loading'
import { ErrorCard } from '../../../components/ui/error'
import ErrorBoundary from '../../../components/ui/ErrorBoundary'

// Lazy load notification components
const NotificationSettings = lazy(
  () => import('../../../components/notifications/notification-settings')
)
const NotificationHistory = lazy(
  () => import('../../../components/notifications/notification-history')
)
const NotificationTemplates = lazy(
  () => import('../../../components/notifications/notification-templates')
)
const AutomatedNotifications = lazy(
  () => import('../../../components/notifications/automated-notifications')
)
const CustomNotificationForm = lazy(
  () => import('../../../components/notifications/custom-notification-form')
)

// Loading component for notification tabs
function NotificationTabLoading() {
  return (
    <div className="min-h-[300px] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-3 text-gray-600">Loading notifications...</p>
      </div>
    </div>
  )
}

interface NotificationRule {
  id: string
  type: 'rent_due' | 'payment_overdue' | 'lease_expiring' | 'maintenance_due' | 'custom'
  name: string
  description: string
  enabled: boolean
  trigger_days: number
  channels: ('email' | 'sms' | 'in_app')[]
  template_id: string | null
  created_at: string
  updated_at: string
}

interface NotificationHistoryItem {
  id: string
  rule_id: string | null
  type: string
  recipient_type: 'tenant' | 'landlord' | 'admin'
  recipient_id: string
  recipient_contact: string
  channel: 'email' | 'sms' | 'in_app'
  subject: string
  message: string
  status: 'pending' | 'sent' | 'failed' | 'delivered'
  sent_at: string | null
  delivered_at: string | null
  error_message: string | null
  created_at: string
}

interface NotificationStats {
  totalSent: number
  totalPending: number
  totalFailed: number
  deliveryRate: number
  recentNotifications: NotificationHistoryItem[]
  notificationsByType: {
    type: string
    count: number
  }[]
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const [rules, setRules] = useState<NotificationRule[]>([])
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<
    'automated' | 'history' | 'templates' | 'settings' | 'scheduler'
  >('automated')
  const [triggerCreateRule, setTriggerCreateRule] = useState(false)
  const [showCustomNotificationForm, setShowCustomNotificationForm] = useState(false)
  const [processingNotifications, setProcessingNotifications] = useState(false)
  const [cronStats, setCronStats] = useState<any[]>([])
  const [loadingCronStats, setLoadingCronStats] = useState(false)

  useEffect(() => {
    loadNotificationData()
    loadCronStats()
  }, [])

  const loadCronStats = async () => {
    try {
      setLoadingCronStats(true)
      const { data, error } = await clientBusinessFunctions.getCronJobStats()

      if (error) {
        console.error('Error loading cron stats:', error)
        // Don't show error to user for cron stats - just use empty data
        // This allows the page to still function even if cron stats are unavailable
        setCronStats([])
        return
      }

      setCronStats((data as any[]) || [])
    } catch (err) {
      console.error('Error loading cron stats:', err)
      // Set empty array so the UI doesn't break
      setCronStats([])
    } finally {
      setLoadingCronStats(false)
    }
  }

  const createDefaultNotificationRules = async () => {
    try {
      setLoading(true)
      setError(null)

      const defaultRules = [
        {
          type: 'rent_due' as const,
          name: 'Rent Due Reminder',
          description: 'Notify tenants 3 days before rent is due',
          enabled: true,
          trigger_days: 3,
          channels: ['email', 'sms'],
          template_id: null,
        },
        {
          type: 'payment_overdue' as const,
          name: 'Overdue Payment Alert',
          description: 'Alert when payment is 7 days overdue',
          enabled: true,
          trigger_days: 7,
          channels: ['email', 'sms', 'in_app'],
          template_id: null,
        },
      ]

      const createdRules = []
      const errors = []

      for (const rule of defaultRules) {
        console.log('Creating rule:', rule.name)
        const { data, error } = await clientBusinessFunctions.createNotificationRule(rule)

        if (error) {
          console.error('Error creating default notification rule:', error)
          errors.push(`${rule.name}: ${error}`)
        } else if (data) {
          console.log('Successfully created rule:', (data as any).name)
          createdRules.push(data as any)
        }
      }

      // Show errors if any occurred
      if (errors.length > 0) {
        setError(`Failed to create some rules: ${errors.join(', ')}`)
      }

      // Show success message if any rules were created
      if (createdRules.length > 0) {
        console.log(`Successfully created ${createdRules.length} notification rules`)
        // Reload notification data to show the newly created rules
        await loadNotificationData()
      }

      // If no rules were created and there were errors, don't reload
      if (createdRules.length === 0 && errors.length > 0) {
        console.error('No notification rules were created due to errors')
      }

      return createdRules
    } catch (err) {
      console.error('Error creating default notification rules:', err)
      setError(
        `Failed to create default rules: ${err instanceof Error ? err.message : 'Unknown error'}`
      )
      return []
    } finally {
      setLoading(false)
    }
  }

  const loadNotificationData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load notification rules from database
      const { data: rulesData, error: rulesError } =
        await clientBusinessFunctions.getNotificationRules()

      if (rulesError) {
        console.error('Error loading notification rules:', rulesError)
        // If it's an authentication error, provide specific feedback
        if (rulesError.includes('not authenticated') || rulesError.includes('JWT')) {
          setError('Please sign in again to access notifications')
          return
        }
        // If it's a landlord access error, provide specific guidance
        if (rulesError.includes('No landlord access found')) {
          setError(
            'Your account is not linked to a landlord profile. Please contact support to set up your account properly.'
          )
          return
        }
        // For other errors, still try to continue with empty rules
        setRules([])
      } else {
        setRules((rulesData as any[]) || [])
      }

      // Load notification history from database
      const { data: historyData, error: historyError } =
        await clientBusinessFunctions.getNotificationHistory(50, 0)

      let notificationHistory: NotificationHistoryItem[] = []

      if (historyError) {
        console.error('Error loading notification history:', historyError)
        // If it's an authentication error and we haven't already set an error, set it now
        if (
          !rulesError &&
          (historyError.includes('not authenticated') || historyError.includes('JWT'))
        ) {
          setError('Please sign in again to access notifications')
          return
        }
        // If it's a landlord access error and we haven't already set an error, set it now
        if (!rulesError && historyError.includes('No landlord access found')) {
          setError(
            'Your account is not linked to a landlord profile. Please contact support to set up your account properly.'
          )
          return
        }
        // For other errors, continue with empty history
        notificationHistory = []
      } else {
        notificationHistory = (historyData as any[]) || []
      }

      // If both rules and history failed to load due to errors other than auth/landlord access, show a general error
      if (
        rulesError &&
        historyError &&
        !rulesError.includes('not authenticated') &&
        !historyError.includes('not authenticated') &&
        !rulesError.includes('No landlord access found') &&
        !historyError.includes('No landlord access found')
      ) {
        setError('Unable to load notification data. Please check your connection and try again.')
        return
      }

      // Calculate stats from notification history
      const totalSent = notificationHistory.filter(
        (n) => n.status === 'sent' || n.status === 'delivered'
      ).length
      const totalPending = notificationHistory.filter((n) => n.status === 'pending').length
      const totalFailed = notificationHistory.filter((n) => n.status === 'failed').length
      const deliveryRate =
        totalSent > 0
          ? (notificationHistory.filter((n) => n.status === 'delivered').length / totalSent) * 100
          : 0

      const notificationsByType = Object.entries(
        notificationHistory.reduce(
          (acc, notification) => {
            acc[notification.type] = (acc[notification.type] || 0) + 1
            return acc
          },
          {} as Record<string, number>
        )
      ).map(([type, count]) => ({ type, count }))

      setStats({
        totalSent,
        totalPending,
        totalFailed,
        deliveryRate,
        recentNotifications: notificationHistory.slice(0, 10),
        notificationsByType,
      })

      // If we have no rules and no history, and no errors, this might be a new user
      if (
        (!rulesData || rulesData.length === 0) &&
        (!historyData || historyData.length === 0) &&
        !rulesError &&
        !historyError
      ) {
        console.log('No notification data found - this might be a new user account')
        // Optionally auto-create default rules for new users
        // await createDefaultNotificationRules()
      }
    } catch (err) {
      console.error('Notification data loading error:', err)

      // Provide more specific error messages based on the error type
      if (err instanceof Error) {
        if (err.message.includes('not authenticated') || err.message.includes('JWT')) {
          setError('Authentication required. Please sign in again.')
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          setError('Network error. Please check your connection and try again.')
        } else {
          setError(`Failed to load notification data: ${err.message}`)
        }
      } else {
        setError('An unexpected error occurred while loading notification data')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleProcessNotifications = async () => {
    setProcessingNotifications(true)
    try {
      const { data, error } = await clientBusinessFunctions.processNotifications()

      if (error) {
        // Check if it's a deployment issue
        if (error.includes('not deployed') || error.includes('404')) {
          alert(
            'Notification processing service is not yet deployed. Please contact your administrator to deploy the Edge Functions.'
          )
          return
        }
        throw new Error(error)
      }

      // Check if we got a mock response indicating the function isn't deployed
      if (data?.status === 'not_deployed') {
        alert(
          'Notification processing service is not yet deployed. The system returned a mock response. Please deploy the Edge Functions to enable this feature.'
        )
        return
      }

      alert(`Notifications processed successfully! ${data?.processed || 0} rules processed.`)

      // Refresh notification data and cron stats
      loadNotificationData()
      loadCronStats()
    } catch (err) {
      console.error('Error processing notifications:', err)

      // Provide specific error messages based on error type
      const error = err as any
      if (
        error.name === 'FunctionsFetchError' ||
        error.message?.includes('Failed to send a request to the Edge Function')
      ) {
        alert(
          'The notification processing service is not available. Please ensure the Edge Functions are deployed in your Supabase project.'
        )
      } else if (error.message?.includes('404') || error.message?.includes('not found')) {
        alert(
          'The notification processing service is not deployed. Please deploy the process-notifications Edge Function.'
        )
      } else {
        alert(
          'Failed to process notifications. Please try again or contact support if the issue persists.'
        )
      }
    } finally {
      setProcessingNotifications(false)
    }
  }

  const handleTriggerCronScheduler = async () => {
    try {
      const { data, error } = await clientBusinessFunctions.triggerCronScheduler()

      if (error) {
        throw new Error(error)
      }

      alert('Cron scheduler triggered successfully!')
      loadCronStats()
    } catch (err) {
      console.error('Error triggering cron scheduler:', err)
      alert('Failed to trigger cron scheduler. Please try again.')
    }
  }

  const tabs = [
    { key: 'automated', label: 'Automated Rules', icon: 'automation' },
    { key: 'history', label: 'History', icon: 'history' },
    { key: 'templates', label: 'Templates', icon: 'template' },
    { key: 'settings', label: 'Settings', icon: 'settings' },
    { key: 'scheduler', label: 'Scheduler', icon: 'clock' },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
        </div>
        <LoadingStats />
        <LoadingCard title="Loading notification data..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
        </div>
        <ErrorCard
          title="Failed to load notifications"
          message={error}
          onRetry={loadNotificationData}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage automated notifications and communication settings
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleProcessNotifications}
            disabled={processingNotifications}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processingNotifications ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Process Now
              </>
            )}
          </button>
          <button
            onClick={() => setShowCustomNotificationForm(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Send Custom
          </button>
          {rules.length === 0 && (
            <button
              onClick={createDefaultNotificationRules}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Create Default Rules
            </button>
          )}
          <button
            onClick={() => {
              setActiveTab('automated')
              setTriggerCreateRule(true)
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create Rule
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Sent</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalSent}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-yellow-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalPending}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-red-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Failed</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalFailed}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Delivery Rate</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.deliveryRate.toFixed(1)}%
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content with Lazy Loading */}
      <div className="mt-6">
        <ErrorBoundary>
          <Suspense fallback={<NotificationTabLoading />}>
            {activeTab === 'automated' && (
              <AutomatedNotifications
                rules={rules}
                onRulesChange={loadNotificationData}
                triggerCreateRule={triggerCreateRule}
                onCreateRuleTriggered={() => setTriggerCreateRule(false)}
              />
            )}
            {activeTab === 'history' && (
              <NotificationHistory notifications={stats?.recentNotifications || []} />
            )}
            {activeTab === 'templates' && <NotificationTemplates />}
            {activeTab === 'settings' && <NotificationSettings />}
          </Suspense>
        </ErrorBoundary>
        {activeTab === 'scheduler' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Notification Scheduler</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Monitor and manage automated notification scheduling
                </p>
              </div>
              <button
                onClick={handleTriggerCronScheduler}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Trigger Scheduler
              </button>
            </div>

            {/* Cron Job Statistics */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Scheduled Jobs</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Status and statistics for automated notification jobs
                </p>
              </div>
              {loadingCronStats ? (
                <div className="px-4 py-5 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <span className="mt-2 text-sm text-gray-600">Loading scheduler stats...</span>
                </div>
              ) : cronStats.length === 0 ? (
                <div className="px-4 py-5 text-center">
                  <p className="text-sm text-gray-500">No scheduled jobs have run yet.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    If you're expecting to see jobs here, please ensure the cron job migration has
                    been applied.
                  </p>
                </div>
              ) : (
                <div className="border-t border-gray-200">
                  <dl>
                    {cronStats.map((job, index) => (
                      <div
                        key={job.job_name}
                        className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6`}
                      >
                        <dt className="text-sm font-medium text-gray-500">
                          {job.job_name
                            .replace(/-/g, ' ')
                            .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          {job.last_status === 'not_deployed' && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              Not Deployed
                            </span>
                          )}
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          {job.last_status === 'not_deployed' ? (
                            <div className="text-sm text-gray-500">
                              <p>
                                This job is not yet deployed. Please deploy the Edge Functions to
                                enable automated scheduling.
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-xs text-gray-500">Success Rate:</span>
                                <div
                                  className={`text-sm font-medium ${job.success_rate >= 90 ? 'text-green-600' : job.success_rate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}
                                >
                                  {job.success_rate}% ({job.successful_runs}/{job.total_runs})
                                </div>
                              </div>
                              <div>
                                <span className="text-xs text-gray-500">Last Run:</span>
                                <div className="text-sm text-gray-900">
                                  {job.last_run ? new Date(job.last_run).toLocaleString() : 'Never'}
                                </div>
                              </div>
                            </div>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Custom Notification Form */}
      {showCustomNotificationForm && (
        <CustomNotificationForm
          onClose={() => setShowCustomNotificationForm(false)}
          onSuccess={() => {
            // Refresh notification data after sending
            loadNotificationData()
          }}
        />
      )}
    </div>
  )
}
