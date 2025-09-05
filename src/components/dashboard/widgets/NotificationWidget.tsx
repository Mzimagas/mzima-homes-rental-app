/**
 * Notification Widget Component
 * Displays alerts and notifications with severity indicators
 */

'use client'

import React from 'react'
import { 
  BellIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { BaseWidget, BaseWidgetProps } from './BaseWidget'
import { useDashboardStore } from '../../../presentation/stores/dashboardStore'

export interface NotificationWidgetProps extends Omit<BaseWidgetProps, 'children'> {
  maxItems?: number
  showUnreadOnly?: boolean
  autoRefresh?: boolean
}

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'critical':
      return XCircleIcon
    case 'high':
      return ExclamationTriangleIcon
    case 'medium':
      return InformationCircleIcon
    case 'low':
      return CheckCircleIcon
    default:
      return BellIcon
  }
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'text-red-600 bg-red-50'
    case 'high':
      return 'text-orange-600 bg-orange-50'
    case 'medium':
      return 'text-blue-600 bg-blue-50'
    case 'low':
      return 'text-green-600 bg-green-50'
    default:
      return 'text-gray-600 bg-gray-50'
  }
}

export const NotificationWidget: React.FC<NotificationWidgetProps> = ({
  maxItems = 5,
  showUnreadOnly = false,
  autoRefresh = true,
  ...baseProps
}) => {
  const alerts = useDashboardStore(state => state.getCriticalAlerts())
  const { markAlertAsRead } = useDashboardStore()

  // Filter alerts based on preferences
  const filteredAlerts = alerts
    .filter(alert => !showUnreadOnly || !alert.isRead)
    .slice(0, maxItems)

  const handleMarkAsRead = (alertId: string) => {
    markAlertAsRead(alertId)
  }

  return (
    <BaseWidget {...baseProps}>
      <div className="notification-widget h-full">
        {filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <BellIcon className="w-8 h-8 mb-2" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map((alert) => {
              const SeverityIcon = getSeverityIcon(alert.severity)
              const severityColor = getSeverityColor(alert.severity)
              
              return (
                <div
                  key={alert.id}
                  className={`
                    notification-item p-3 rounded-lg border
                    ${alert.isRead ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'}
                    hover:shadow-sm transition-shadow duration-200
                  `}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`
                      flex-shrink-0 p-1 rounded-full
                      ${severityColor}
                    `}>
                      <SeverityIcon className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`
                          text-sm font-medium truncate
                          ${alert.isRead ? 'text-gray-600' : 'text-gray-900'}
                        `}>
                          {alert.title}
                        </h4>
                        
                        {!alert.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(alert.id)}
                            className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                      
                      <p className={`
                        text-xs mt-1
                        ${alert.isRead ? 'text-gray-500' : 'text-gray-700'}
                      `}>
                        {alert.message}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">
                          {new Date(alert.createdAt).toLocaleTimeString()}
                        </span>
                        
                        <span className={`
                          text-xs px-2 py-1 rounded-full
                          ${severityColor}
                        `}>
                          {alert.severity}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {/* View all link */}
            <div className="pt-2 border-t border-gray-200">
              <button className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium">
                View All Notifications
              </button>
            </div>
          </div>
        )}
      </div>
    </BaseWidget>
  )
}

export default NotificationWidget
