'use client'

import { useState, useEffect } from 'react'
import { clientBusinessFunctions } from '../../lib/supabase-client'

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

interface NotificationRuleFormProps {
  rule?: NotificationRule | null
  onSave: (rule: any) => void
  onCancel: () => void
  onSuccess: () => void
}

export default function NotificationRuleForm({
  rule,
  onSave,
  onCancel,
  onSuccess,
}: NotificationRuleFormProps) {
  const [formData, setFormData] = useState<any>({
    type: 'rent_due',
    name: '',
    description: '',
    enabled: true,
    trigger_days: 3,
    channels: ['email'],
    template_id: null,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (rule) {
      setFormData(rule)
    }
  }, [rule])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate required fields
      if (!formData.name?.trim()) {
        throw new Error('Rule name is required')
      }
      if (!formData.description?.trim()) {
        throw new Error('Rule description is required')
      }
      if (!formData.channels || formData.channels.length === 0) {
        throw new Error('At least one notification channel is required')
      }
      if (formData.trigger_days === undefined || formData.trigger_days < 0) {
        throw new Error('Trigger days must be a non-negative number')
      }

      const ruleData = {
        type: formData.type!,
        name: formData.name.trim(),
        description: formData.description.trim(),
        enabled: formData.enabled!,
        trigger_days: formData.trigger_days!,
        channels: formData.channels,
        template_id: formData.template_id,
      }

      let result
      if (rule?.id) {
        // Update existing rule
        result = await clientBusinessFunctions.updateNotificationRule(rule.id, ruleData)
      } else {
        // Create new rule
        result = await clientBusinessFunctions.createNotificationRule(ruleData)
      }

      if (result.error) {
        throw new Error(result.error)
      }

      onSave(result.data)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleChannelChange = (channel: 'email' | 'sms' | 'in_app', checked: boolean) => {
    const currentChannels = formData.channels || []
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

  const getTypeDisplayName = (type: string) => {
    switch (type) {
      case 'rent_due':
        return 'Rent Due Reminder'
      case 'payment_overdue':
        return 'Payment Overdue'
      case 'lease_expiring':
        return 'Lease Expiring'
      case 'maintenance_due':
        return 'Maintenance Due'
      case 'custom':
        return 'Custom Rule'
      default:
        return type.charAt(0).toUpperCase() + type.slice(1)
    }
  }

  const getTriggerDescription = (type: string) => {
    switch (type) {
      case 'rent_due':
        return 'days before rent is due'
      case 'payment_overdue':
        return 'days after payment is overdue'
      case 'lease_expiring':
        return 'days before lease expires'
      case 'maintenance_due':
        return 'days after maintenance request'
      default:
        return 'days trigger'
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              {rule ? 'Edit Notification Rule' : 'Create Notification Rule'}
            </h3>
            <button
              onClick={onCancel}
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
            {/* Rule Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rule Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                <option value="rent_due">Rent Due Reminder</option>
                <option value="payment_overdue">Payment Overdue</option>
                <option value="lease_expiring">Lease Expiring</option>
                <option value="maintenance_due">Maintenance Due</option>
                <option value="custom">Custom Rule</option>
              </select>
            </div>

            {/* Rule Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rule Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter a descriptive name for this rule"
                disabled={loading}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe when and how this rule should be triggered"
                disabled={loading}
                required
              />
            </div>

            {/* Trigger Days */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Trigger Timing</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={formData.trigger_days}
                  onChange={(e) =>
                    setFormData({ ...formData, trigger_days: parseInt(e.target.value) || 0 })
                  }
                  min="0"
                  max="365"
                  className="block w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                />
                <span className="text-sm text-gray-600">
                  {getTriggerDescription(formData.type || 'rent_due')}
                </span>
              </div>
            </div>

            {/* Notification Channels */}
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
                      checked={formData.channels?.includes(channel.value as any) || false}
                      onChange={(e) => handleChannelChange(channel.value as any, e.target.checked)}
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

            {/* Enabled Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={loading}
              />
              <label className="ml-2 text-sm text-gray-700">Enable this rule immediately</label>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={onCancel}
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
                {loading ? 'Saving...' : rule ? 'Update Rule' : 'Create Rule'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
