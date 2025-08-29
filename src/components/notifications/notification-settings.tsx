'use client'

import { useState, useEffect } from 'react'
import { clientBusinessFunctions } from '../../lib/supabase-client'

interface NotificationSettingsData {
  email: {
    enabled: boolean
    smtp_host: string
    smtp_port: number
    smtp_username: string
    smtp_password: string
    from_email: string
    from_name: string
  }
  sms: {
    enabled: boolean
    provider: 'twilio' | 'africastalking' | 'custom'
    api_key: string
    api_secret: string
    sender_id: string
  }
  general: {
    timezone: string
    business_hours_start: string
    business_hours_end: string
    send_during_business_hours_only: boolean
    max_retries: number
    retry_interval_minutes: number
  }
}

export default function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettingsData>({
    email: {
      enabled: true,
      smtp_host: 'smtp.gmail.com',
      smtp_port: 587,
      smtp_username: '',
      smtp_password: '',
      from_email: 'noreply@example.com',
      from_name: 'Rental Management',
    },
    sms: {
      enabled: false,
      provider: 'africastalking',
      api_key: '',
      api_secret: '',
      sender_id: 'RENTAL',
    },
    general: {
      timezone: 'Africa/Nairobi',
      business_hours_start: '08:00',
      business_hours_end: '18:00',
      send_during_business_hours_only: false,
      max_retries: 3,
      retry_interval_minutes: 30,
    },
  })

  const [loading, setLoading] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [testingEmail, setTestingEmail] = useState(false)
  const [testingSms, setTestingSms] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testPhone, setTestPhone] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadNotificationSettings()
  }, [])

  const loadNotificationSettings = async () => {
    try {
      setLoadingSettings(true)
      setError(null)

      const { data, error: settingsError } = await clientBusinessFunctions.getNotificationSettings()

      if (settingsError) {
                // Don't show error for missing settings (new user)
        if (!settingsError.includes('No rows')) {
          setError('Failed to load notification settings')
        }
        return
      }

      if (data) {
        // Convert database format to component format
        setSettings({
          email: {
            enabled: data.email_enabled || true,
            smtp_host: data.email_smtp_host || 'smtp.gmail.com',
            smtp_port: data.email_smtp_port || 587,
            smtp_username: data.email_smtp_username || '',
            smtp_password: data.email_smtp_password || '',
            from_email: data.email_from_email || 'noreply@example.com',
            from_name: data.email_from_name || 'Rental Management',
          },
          sms: {
            enabled: data.sms_enabled || false,
            provider: data.sms_provider || 'africastalking',
            api_key: data.sms_api_key || '',
            api_secret: data.sms_api_secret || '',
            sender_id: data.sms_sender_id || 'RENTAL',
          },
          general: {
            timezone: data.timezone || 'Africa/Nairobi',
            business_hours_start: data.business_hours_start || '08:00',
            business_hours_end: data.business_hours_end || '18:00',
            send_during_business_hours_only: data.send_during_business_hours_only || false,
            max_retries: data.max_retries || 3,
            retry_interval_minutes: data.retry_interval_minutes || 30,
          },
        })
      }
    } catch (err) {
            setError('Failed to load notification settings')
    } finally {
      setLoadingSettings(false)
    }
  }

  const handleEmailSettingChange = (field: keyof NotificationSettingsData['email'], value: any) => {
    setSettings((prev) => ({
      ...prev,
      email: {
        ...prev.email,
        [field]: value,
      },
    }))
  }

  const handleSmsSettingChange = (field: keyof NotificationSettingsData['sms'], value: any) => {
    setSettings((prev) => ({
      ...prev,
      sms: {
        ...prev.sms,
        [field]: value,
      },
    }))
  }

  const handleGeneralSettingChange = (
    field: keyof NotificationSettingsData['general'],
    value: any
  ) => {
    setSettings((prev) => ({
      ...prev,
      general: {
        ...prev.general,
        [field]: value,
      },
    }))
  }

  const handleSaveSettings = async () => {
    setLoading(true)
    setError(null)
    try {
      const { error: saveError } =
        await clientBusinessFunctions.updateNotificationSettings(settings)

      if (saveError) {
        throw new Error(saveError)
      }

      alert('Settings saved successfully!')
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to save settings. Please try again.'
      setError(errorMessage)
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleTestEmail = async () => {
    if (!testEmail) {
      alert('Please enter an email address to test')
      return
    }

    setTestingEmail(true)
    try {
      const { error: testError } = await clientBusinessFunctions.testEmailSettings(
        testEmail,
        settings
      )

      if (testError) {
        throw new Error(testError)
      }

      alert('Test email sent successfully!')
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to send test email. Please check your settings.'
      alert(errorMessage)
    } finally {
      setTestingEmail(false)
    }
  }

  const handleTestSms = async () => {
    if (!testPhone) {
      alert('Please enter a phone number to test')
      return
    }

    setTestingSms(true)
    try {
      const { error: testError } = await clientBusinessFunctions.testSmsSettings(
        testPhone,
        settings
      )

      if (testError) {
        throw new Error(testError)
      }

      alert('Test SMS sent successfully!')
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to send test SMS. Please check your settings.'
      alert(errorMessage)
    } finally {
      setTestingSms(false)
    }
  }

  if (loadingSettings) {
    return (
      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Notification Settings</h3>
          <p className="mt-1 text-sm text-gray-500">
            Configure email, SMS, and general notification settings
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading settings...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">Notification Settings</h3>
        <p className="mt-1 text-sm text-gray-500">
          Configure email, SMS, and general notification settings
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Email Settings */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-medium text-gray-900">Email Settings</h4>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 mr-3">Enable Email</span>
              <button
                onClick={() => handleEmailSettingChange('enabled', !settings.email.enabled)}
                className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  settings.email.enabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                    settings.email.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">SMTP Host</label>
              <input
                type="text"
                value={settings.email.smtp_host}
                onChange={(e) => handleEmailSettingChange('smtp_host', e.target.value)}
                disabled={!settings.email.enabled}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="smtp.gmail.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">SMTP Port</label>
              <input
                type="number"
                value={settings.email.smtp_port}
                onChange={(e) => handleEmailSettingChange('smtp_port', parseInt(e.target.value))}
                disabled={!settings.email.enabled}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="587"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <input
                type="text"
                value={settings.email.smtp_username}
                onChange={(e) => handleEmailSettingChange('smtp_username', e.target.value)}
                disabled={!settings.email.enabled}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="your-email@gmail.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={settings.email.smtp_password}
                onChange={(e) => handleEmailSettingChange('smtp_password', e.target.value)}
                disabled={!settings.email.enabled}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">From Email</label>
              <input
                type="email"
                value={settings.email.from_email}
                onChange={(e) => handleEmailSettingChange('from_email', e.target.value)}
                disabled={!settings.email.enabled}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="noreply@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">From Name</label>
              <input
                type="text"
                value={settings.email.from_name}
                onChange={(e) => handleEmailSettingChange('from_name', e.target.value)}
                disabled={!settings.email.enabled}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="Rental Management"
              />
            </div>
          </div>

          {/* Test Email */}
          <div className="border-t pt-6">
            <h5 className="text-sm font-medium text-gray-900 mb-3">Test Email Configuration</h5>
            <div className="flex space-x-3">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                disabled={!settings.email.enabled}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="test@example.com"
              />
              <button
                onClick={handleTestEmail}
                disabled={!settings.email.enabled || testingEmail}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {testingEmail ? 'Sending...' : 'Send Test Email'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SMS Settings */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-medium text-gray-900">SMS Settings</h4>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 mr-3">Enable SMS</span>
              <button
                onClick={() => handleSmsSettingChange('enabled', !settings.sms.enabled)}
                className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  settings.sms.enabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                    settings.sms.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">SMS Provider</label>
              <select
                value={settings.sms.provider}
                onChange={(e) => handleSmsSettingChange('provider', e.target.value)}
                disabled={!settings.sms.enabled}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="africastalking">Africa&apos;s Talking</option>
                <option value="twilio">Twilio</option>
                <option value="custom">Custom Provider</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Sender ID</label>
              <input
                type="text"
                value={settings.sms.sender_id}
                onChange={(e) => handleSmsSettingChange('sender_id', e.target.value)}
                disabled={!settings.sms.enabled}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="RENTAL"
                maxLength={11}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">API Key</label>
              <input
                type="text"
                value={settings.sms.api_key}
                onChange={(e) => handleSmsSettingChange('api_key', e.target.value)}
                disabled={!settings.sms.enabled}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="Your API Key"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">API Secret</label>
              <input
                type="password"
                value={settings.sms.api_secret}
                onChange={(e) => handleSmsSettingChange('api_secret', e.target.value)}
                disabled={!settings.sms.enabled}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Test SMS */}
          <div className="border-t pt-6">
            <h5 className="text-sm font-medium text-gray-900 mb-3">Test SMS Configuration</h5>
            <div className="flex space-x-3">
              <input
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                disabled={!settings.sms.enabled}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="+254712345678"
              />
              <button
                onClick={handleTestSms}
                disabled={!settings.sms.enabled || testingSms}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {testingSms ? 'Sending...' : 'Send Test SMS'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* General Settings */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-medium text-gray-900">General Settings</h4>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Timezone</label>
              <select
                value={settings.general.timezone}
                onChange={(e) => handleGeneralSettingChange('timezone', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                <option value="Africa/Cairo">Africa/Cairo (EET)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Max Retries</label>
              <input
                type="number"
                value={settings.general.max_retries}
                onChange={(e) =>
                  handleGeneralSettingChange('max_retries', parseInt(e.target.value))
                }
                min="0"
                max="10"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Business Hours Start
              </label>
              <input
                type="time"
                value={settings.general.business_hours_start}
                onChange={(e) => handleGeneralSettingChange('business_hours_start', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Business Hours End</label>
              <input
                type="time"
                value={settings.general.business_hours_end}
                onChange={(e) => handleGeneralSettingChange('business_hours_end', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Retry Interval (minutes)
              </label>
              <input
                type="number"
                value={settings.general.retry_interval_minutes}
                onChange={(e) =>
                  handleGeneralSettingChange('retry_interval_minutes', parseInt(e.target.value))
                }
                min="1"
                max="1440"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="business_hours_only"
              checked={settings.general.send_during_business_hours_only}
              onChange={(e) =>
                handleGeneralSettingChange('send_during_business_hours_only', e.target.checked)
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="business_hours_only" className="ml-2 block text-sm text-gray-900">
              Only send notifications during business hours
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={loading}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
