'use client'

import { useState, useEffect } from 'react'
import NotificationRuleForm from './notification-rule-form'
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

interface AutomatedNotificationsProps {
  rules: NotificationRule[]
  onRulesChange: () => void
  triggerCreateRule?: boolean
  onCreateRuleTriggered?: () => void
}

export default function AutomatedNotifications({
  rules,
  onRulesChange,
  triggerCreateRule,
  onCreateRuleTriggered
}: AutomatedNotificationsProps) {
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Handle external trigger to create rule
  useEffect(() => {
    if (triggerCreateRule) {
      setShowCreateForm(true)
      onCreateRuleTriggered?.()
    }
  }, [triggerCreateRule, onCreateRuleTriggered])

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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'rent_due':
        return 'bg-blue-100 text-blue-800'
      case 'payment_overdue':
        return 'bg-red-100 text-red-800'
      case 'lease_expiring':
        return 'bg-yellow-100 text-yellow-800'
      case 'maintenance_due':
        return 'bg-purple-100 text-purple-800'
      case 'custom':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return (
          <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )
      case 'sms':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )
      case 'in_app':
        return (
          <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v2H4v-2zM20 4H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z" />
          </svg>
        )
      default:
        return null
    }
  }

  const handleToggleRule = async (rule: NotificationRule) => {
    try {
      const { error } = await clientBusinessFunctions.updateNotificationRule(rule.id, {
        enabled: !rule.enabled
      })

      if (error) {
        console.error('Error toggling rule:', error)
        alert('Failed to update rule. Please try again.')
        return
      }

      onRulesChange()
    } catch (err) {
      console.error('Error toggling rule:', err)
      alert('Failed to update rule. Please try again.')
    }
  }

  const handleEditRule = (rule: NotificationRule) => {
    setEditingRule(rule)
  }

  const handleDeleteRule = async (rule: NotificationRule) => {
    if (!confirm(`Are you sure you want to delete the rule "${rule.name}"?`)) {
      return
    }

    try {
      const { error } = await clientBusinessFunctions.deleteNotificationRule(rule.id)

      if (error) {
        console.error('Error deleting rule:', error)
        alert('Failed to delete rule. Please try again.')
        return
      }

      onRulesChange()
    } catch (err) {
      console.error('Error deleting rule:', err)
      alert('Failed to delete rule. Please try again.')
    }
  }

  const handleFormSave = (savedRule: NotificationRule) => {
    console.log('Rule saved:', savedRule)
    setShowCreateForm(false)
    setEditingRule(null)
  }

  const handleFormCancel = () => {
    setShowCreateForm(false)
    setEditingRule(null)
  }

  const handleFormSuccess = () => {
    onRulesChange()
  }

  const formatTriggerText = (rule: NotificationRule) => {
    switch (rule.type) {
      case 'rent_due':
        return `${rule.trigger_days} days before rent is due`
      case 'payment_overdue':
        return `${rule.trigger_days} days after payment is overdue`
      case 'lease_expiring':
        return `${rule.trigger_days} days before lease expires`
      case 'maintenance_due':
        return `${rule.trigger_days} days after maintenance request`
      default:
        return `${rule.trigger_days} days trigger`
    }
  }

  const hasRuleOfType = (type: string) => {
    return rules.some(rule => rule.type === type && rule.enabled)
  }

  const handleQuickSetup = async (type: 'rent_due' | 'payment_overdue' | 'lease_expiring') => {
    const defaultRules = {
      rent_due: {
        type: 'rent_due' as const,
        name: 'Rent Due Reminder',
        description: 'Notify tenants 3 days before rent is due',
        enabled: true,
        trigger_days: 3,
        channels: ['email'],
        template_id: null
      },
      payment_overdue: {
        type: 'payment_overdue' as const,
        name: 'Overdue Payment Alert',
        description: 'Alert when payment is 7 days overdue',
        enabled: true,
        trigger_days: 7,
        channels: ['email', 'in_app'],
        template_id: null
      },
      lease_expiring: {
        type: 'lease_expiring' as const,
        name: 'Lease Expiry Notification',
        description: 'Notify 30 days before lease expires',
        enabled: true,
        trigger_days: 30,
        channels: ['email'],
        template_id: null
      }
    }

    try {
      const ruleData = defaultRules[type]
      const result = await clientBusinessFunctions.createNotificationRule(ruleData)

      if (result.error) {
        throw new Error(result.error)
      }

      // Refresh the rules list
      onRulesChange()

      // Show success message
      alert(`${ruleData.name} has been set up successfully!`)
    } catch (err) {
      console.error('Error creating notification rule:', err)
      alert('Failed to set up notification rule. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Automated Notification Rules</h3>
          <p className="mt-1 text-sm text-gray-500">
            Configure automatic notifications for rent reminders, overdue payments, and more
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create Rule
        </button>
      </div>

      {/* Rules List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {rules.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No notification rules</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first automated notification rule.</p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Rule
              </button>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {rules.map((rule) => (
              <li key={rule.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`w-3 h-3 rounded-full ${rule.enabled ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-sm font-medium text-gray-900">{rule.name}</h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(rule.type)}`}>
                          {getTypeDisplayName(rule.type)}
                        </span>
                        {!rule.enabled && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Disabled
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                      
                      <div className="flex items-center space-x-6 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{formatTriggerText(rule)}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span>Channels:</span>
                          <div className="flex space-x-1">
                            {rule.channels.map((channel, index) => (
                              <div key={index} title={channel.charAt(0).toUpperCase() + channel.slice(1)}>
                                {getChannelIcon(channel)}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleRule(rule)}
                      className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        rule.enabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                      title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                          rule.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>

                    <button
                      onClick={() => handleEditRule(rule)}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      title="Edit rule"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>

                    <button
                      onClick={() => handleDeleteRule(rule)}
                      className="inline-flex items-center px-3 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      title="Delete rule"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quick Setup Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Rent Reminders Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <h3 className="text-lg font-medium text-gray-900">Rent Reminders</h3>
                <p className="text-sm text-gray-500">Automatically remind tenants before rent is due</p>
                {hasRuleOfType('rent_due') ? (
                  <div className="mt-2 flex items-center text-sm text-green-600">
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Configured
                  </div>
                ) : (
                  <button
                    onClick={() => handleQuickSetup('rent_due')}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    Set up now →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Overdue Alerts Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <h3 className="text-lg font-medium text-gray-900">Overdue Alerts</h3>
                <p className="text-sm text-gray-500">Alert when payments are overdue</p>
                {hasRuleOfType('payment_overdue') ? (
                  <div className="mt-2 flex items-center text-sm text-green-600">
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Configured
                  </div>
                ) : (
                  <button
                    onClick={() => handleQuickSetup('payment_overdue')}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    Set up now →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Lease Expiry Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <h3 className="text-lg font-medium text-gray-900">Lease Expiry</h3>
                <p className="text-sm text-gray-500">Notify before leases expire</p>
                {hasRuleOfType('lease_expiring') ? (
                  <div className="mt-2 flex items-center text-sm text-green-600">
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Configured
                  </div>
                ) : (
                  <button
                    onClick={() => handleQuickSetup('lease_expiring')}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    Set up now →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Rule Form */}
      {(showCreateForm || editingRule) && (
        <NotificationRuleForm
          rule={editingRule}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  )
}
