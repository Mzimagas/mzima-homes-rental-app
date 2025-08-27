'use client'

import { useState, useEffect } from 'react'
import { getEmailStats, getEmailReport, emailMonitor } from '../../lib/email-monitoring'

export default function EmailMonitoringDashboard() {
  const [stats, setStats] = useState(getEmailStats())
  const [report, setReport] = useState(getEmailReport())
  const [timeframe, setTimeframe] = useState(24)

  useEffect(() => {
    const updateStats = () => {
      setStats(getEmailStats(timeframe))
      setReport(getEmailReport())
    }

    updateStats()
    const interval = setInterval(updateStats, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [timeframe])

  const getBounceRateColor = (rate: number) => {
    if (rate > 20) return 'text-red-600 bg-red-100'
    if (rate > 10) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600 bg-green-100'
    if (rate >= 85) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-gray-900">Email Delivery Monitoring</h2>
        <div className="flex items-center space-x-2">
          <label htmlFor="timeframe" className="text-sm text-gray-700">
            Timeframe:
          </label>
          <select
            id="timeframe"
            value={timeframe}
            onChange={(e) => setTimeframe(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm"
          >
            <option value={1}>Last Hour</option>
            <option value={24}>Last 24 Hours</option>
            <option value={168}>Last Week</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-gray-500">Total Attempts</div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalAttempts}</div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-gray-500">Success Rate</div>
          <div
            className={`text-2xl font-bold px-2 py-1 rounded ${getSuccessRateColor(stats.successRate)}`}
          >
            {stats.successRate.toFixed(1)}%
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-gray-500">Bounce Rate</div>
          <div
            className={`text-2xl font-bold px-2 py-1 rounded ${getBounceRateColor(stats.bounceRate)}`}
          >
            {stats.bounceRate.toFixed(1)}%
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-gray-500">Failures</div>
          <div className="text-2xl font-bold text-gray-900">{stats.failureCount}</div>
        </div>
      </div>

      {/* Bounce Rate Warning */}
      {stats.bounceRate > 10 && (
        <div
          className={`p-4 rounded-md mb-6 ${stats.bounceRate > 20 ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}
        >
          <div className="flex">
            <div className="flex-shrink-0">
              {stats.bounceRate > 20 ? (
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <h3
                className={`text-sm font-medium ${stats.bounceRate > 20 ? 'text-red-800' : 'text-yellow-800'}`}
              >
                {stats.bounceRate > 20 ? 'Critical Bounce Rate!' : 'Elevated Bounce Rate'}
              </h3>
              <div
                className={`mt-2 text-sm ${stats.bounceRate > 20 ? 'text-red-700' : 'text-yellow-700'}`}
              >
                <p>
                  Your email bounce rate is {stats.bounceRate.toFixed(1)}%.
                  {stats.bounceRate > 20
                    ? ' This is critically high and may trigger Supabase email restrictions.'
                    : ' Monitor this closely to prevent email delivery issues.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Failures */}
      {stats.recentFailures.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Recent Failures</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="space-y-2">
              {stats.recentFailures.slice(0, 5).map((failure, index) => (
                <div key={index} className="flex justify-between items-start text-sm">
                  <div className="flex-1">
                    <span className="font-medium">{failure.email}</span>
                    <span className="text-gray-500 ml-2">({failure.type})</span>
                  </div>
                  <div className="text-right">
                    <div
                      className={`px-2 py-1 rounded text-xs ${
                        failure.status === 'bounced'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {failure.status}
                    </div>
                    <div className="text-gray-500 text-xs mt-1">
                      {failure.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detailed Report */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Detailed Report</h3>
        <pre className="text-xs text-gray-600 bg-gray-50 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
          {report}
        </pre>
      </div>

      {/* Recommendations */}
      <div className="border-t pt-6 mt-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Recommendations</h3>
        <div className="space-y-2 text-sm text-gray-600">
          {stats.bounceRate > 20 && (
            <div className="flex items-start">
              <span className="text-red-500 mr-2">•</span>
              <span>Immediately review and clean up invalid email addresses</span>
            </div>
          )}
          {stats.bounceRate > 10 && (
            <div className="flex items-start">
              <span className="text-yellow-500 mr-2">•</span>
              <span>Implement stricter email validation</span>
            </div>
          )}
          {stats.successRate < 85 && (
            <div className="flex items-start">
              <span className="text-red-500 mr-2">•</span>
              <span>Check SMTP configuration and email templates</span>
            </div>
          )}
          <div className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            <span>Monitor Supabase dashboard for email delivery warnings</span>
          </div>
          <div className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            <span>Consider implementing custom SMTP for better control</span>
          </div>
        </div>
      </div>
    </div>
  )
}
