'use client'

import { useState, useEffect } from 'react'
import { clientBusinessFunctions } from '../../lib/supabase-client'

interface Tenant {
  id: string
  name: string
  email: string
  phone: string
  property_name: string
  unit_label: string
}

interface CustomNotificationFormProps {
  onClose: () => void
  onSuccess: () => void
}

export default function CustomNotificationForm({
  onClose,
  onSuccess,
}: CustomNotificationFormProps) {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingTenants, setLoadingTenants] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    recipients: [] as string[], // tenant IDs
    recipientType: 'selected' as 'all' | 'selected' | 'property',
    propertyId: '',
    subject: '',
    message: '',
    channels: ['email'] as ('email' | 'sms' | 'in_app')[],
    sendImmediately: true,
    scheduledFor: '',
  })

  useEffect(() => {
    loadTenants()
  }, [])

  const loadTenants = async () => {
    try {
      setLoadingTenants(true)
      setError(null) // Clear any previous errors

      const { data, error } = await clientBusinessFunctions.getTenants()

      if (error) {
                // Provide user-friendly error messages based on error type
        let userFriendlyError = 'Failed to load tenants. '

        if (error.includes('not authenticated') || error.includes('JWT')) {
          userFriendlyError += 'Please sign in again to continue.'
        } else if (error.includes('No landlord access')) {
          userFriendlyError += 'You do not have permission to access tenant data.'
        } else if (error.includes('relationship') || error.includes('schema')) {
          userFriendlyError += 'There was a database configuration issue. Please contact support.'
        } else if (error.includes('network') || error.includes('fetch')) {
          userFriendlyError += 'Please check your internet connection and try again.'
        } else {
          userFriendlyError += 'Please try again or contact support if the problem persists.'
        }

        setError(userFriendlyError)

        // Fall back to mock data for demonstration purposes
                const mockTenants: Tenant[] = [
          {
            id: 'mock-1',
            name: 'John Doe (Demo)',
            email: 'john.demo@example.com',
            phone: '+254700000001',
            property_name: 'Demo Property',
            unit_label: 'A1',
          },
          {
            id: 'mock-2',
            name: 'Jane Smith (Demo)',
            email: 'jane.demo@example.com',
            phone: '+254700000002',
            property_name: 'Demo Property',
            unit_label: 'B2',
          },
        ]
        setTenants(mockTenants)
      } else {
        // Successfully loaded tenants
        setTenants(data || [])

        // Log success for debugging
                // Clear any previous errors
        setError(null)

        // Show a brief success message if no tenants found but no error occurred
        if (!data || data.length === 0) {
                  }
      }
    } catch (err) {
            setError('Failed to load tenants')
    } finally {
      setLoadingTenants(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate required fields
      if (!formData.subject.trim()) {
        throw new Error('Subject is required')
      }
      if (!formData.message.trim()) {
        throw new Error('Message is required')
      }
      if (formData.channels.length === 0) {
        throw new Error('At least one notification channel is required')
      }
      if (formData.recipientType === 'selected' && formData.recipients.length === 0) {
        throw new Error('Please select at least one recipient')
      }

      // Prepare notification data
      const notificationData = {
        type: 'custom',
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        channels: formData.channels,
        recipients: formData.recipients,
        recipientType: formData.recipientType,
        propertyId: formData.propertyId,
        sendImmediately: formData.sendImmediately,
        scheduledFor: formData.scheduledFor || null,
      }

      // Send the custom notification
      const result = await clientBusinessFunctions.sendCustomNotification(notificationData)

      if (result.error) {
        throw new Error(result.error)
      }

      alert(
        `Custom notification sent successfully! ${result.data?.length || 0} notifications created.`
      )
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleRecipientToggle = (tenantId: string) => {
    const currentRecipients = formData.recipients
    if (currentRecipients.includes(tenantId)) {
      setFormData({
        ...formData,
        recipients: currentRecipients.filter((id) => id !== tenantId),
      })
    } else {
      setFormData({
        ...formData,
        recipients: [...currentRecipients, tenantId],
      })
    }
  }

  const handleChannelChange = (channel: 'email' | 'sms' | 'in_app', checked: boolean) => {
    const currentChannels = formData.channels
    if (checked) {
      setFormData({
        ...formData,
        channels: [...currentChannels, channel],
      })
    } else {
      setFormData({
        ...formData,
        channels: currentChannels.filter((c: string) => c !== channel),
      })
    }
  }

  const selectAllTenants = () => {
    setFormData({
      ...formData,
      recipients: tenants.map((t) => t.id),
    })
  }

  const clearAllTenants = () => {
    setFormData({
      ...formData,
      recipients: [],
    })
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Send Custom Notification</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Message Content */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter notification subject"
                    disabled={loading}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={6}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your message here..."
                    disabled={loading}
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    You can use variables like {'{'}tenant_name{'}'}, {'{'}property_name{'}'}, {'{'}
                    unit_label{'}'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notification Channels *
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'email', label: 'Email', icon: '📧' },
                      { value: 'sms', label: 'SMS', icon: '📱' },
                      { value: 'in_app', label: 'In-App', icon: '🔔' },
                    ].map((channel) => (
                      <label key={channel.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.channels.includes(channel.value as any)}
                          onChange={(e) =>
                            handleChannelChange(channel.value as any, e.target.checked)
                          }
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          disabled={loading}
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {channel.icon} {channel.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Recipients */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipients *
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="recipientType"
                          value="selected"
                          checked={formData.recipientType === 'selected'}
                          onChange={(e) =>
                            setFormData({ ...formData, recipientType: e.target.value as any })
                          }
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          disabled={loading}
                        />
                        <span className="ml-2 text-sm text-gray-700">Selected Tenants</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="recipientType"
                          value="all"
                          checked={formData.recipientType === 'all'}
                          onChange={(e) =>
                            setFormData({ ...formData, recipientType: e.target.value as any })
                          }
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          disabled={loading}
                        />
                        <span className="ml-2 text-sm text-gray-700">All Tenants</span>
                      </label>
                    </div>

                    {formData.recipientType === 'selected' && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">
                            {formData.recipients.length} of {tenants.length} selected
                          </span>
                          <div className="space-x-2">
                            <button
                              type="button"
                              onClick={selectAllTenants}
                              className="text-xs text-blue-600 hover:text-blue-800"
                              disabled={loading}
                            >
                              Select All
                            </button>
                            <button
                              type="button"
                              onClick={clearAllTenants}
                              className="text-xs text-gray-600 hover:text-gray-800"
                              disabled={loading}
                            >
                              Clear All
                            </button>
                          </div>
                        </div>

                        <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md">
                          {loadingTenants ? (
                            <div className="p-4 text-center text-gray-500">
                              <div className="animate-spin inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full mr-2"></div>
                              Loading tenants...
                            </div>
                          ) : error ? (
                            <div className="p-4 text-center">
                              <div className="text-red-600 text-sm mb-2">⚠️ {error}</div>
                              {tenants.length > 0 && (
                                <div className="text-xs text-gray-500">
                                  Showing demo data below. Functionality may be limited.
                                </div>
                              )}
                            </div>
                          ) : tenants.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                              No active tenants found. Make sure tenants are assigned to units and
                              have active status.
                            </div>
                          ) : (
                            <div className="divide-y divide-gray-200">
                              {tenants.map((tenant) => (
                                <label
                                  key={tenant.id}
                                  className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={formData.recipients.includes(tenant.id)}
                                    onChange={() => handleRecipientToggle(tenant.id)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    disabled={loading}
                                  />
                                  <div className="ml-3 flex-1">
                                    <div className="text-sm font-medium text-gray-900">
                                      {tenant.name}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {tenant.property_name} - {tenant.unit_label}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      {tenant.email} • {tenant.phone}
                                    </div>
                                  </div>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Options
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="deliveryTiming"
                        checked={formData.sendImmediately}
                        onChange={() =>
                          setFormData({ ...formData, sendImmediately: true, scheduledFor: '' })
                        }
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        disabled={loading}
                      />
                      <span className="ml-2 text-sm text-gray-700">Send immediately</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="deliveryTiming"
                        checked={!formData.sendImmediately}
                        onChange={() => setFormData({ ...formData, sendImmediately: false })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        disabled={loading}
                      />
                      <span className="ml-2 text-sm text-gray-700">Schedule for later</span>
                    </label>
                    {!formData.sendImmediately && (
                      <input
                        type="datetime-local"
                        value={formData.scheduledFor}
                        onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
                        className="ml-6 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        disabled={loading}
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Notification'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
