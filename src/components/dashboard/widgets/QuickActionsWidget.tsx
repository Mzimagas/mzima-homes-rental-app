/**
 * Quick Actions Widget Component
 * Provides shortcuts to common dashboard actions
 */

'use client'

import React from 'react'
import { 
  PlusIcon,
  UserPlusIcon,
  CreditCardIcon,
  DocumentTextIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { BaseWidget, BaseWidgetProps } from './BaseWidget'

export interface QuickAction {
  id: string
  label: string
  icon: React.ComponentType<any>
  onClick: () => void
  disabled?: boolean
}

export interface QuickActionsWidgetProps extends Omit<BaseWidgetProps, 'children'> {
  actions?: QuickAction[]
  layout?: 'grid' | 'list'
}

const defaultActions: QuickAction[] = [
  {
    id: 'add-property',
    label: 'Add Property',
    icon: PlusIcon,
    onClick: () => console.log('Add Property clicked')
  },
  {
    id: 'add-tenant',
    label: 'Add Tenant',
    icon: UserPlusIcon,
    onClick: () => console.log('Add Tenant clicked')
  },
  {
    id: 'record-payment',
    label: 'Record Payment',
    icon: CreditCardIcon,
    onClick: () => console.log('Record Payment clicked')
  },
  {
    id: 'generate-report',
    label: 'Generate Report',
    icon: DocumentTextIcon,
    onClick: () => console.log('Generate Report clicked')
  },
  {
    id: 'maintenance-request',
    label: 'Maintenance',
    icon: WrenchScrewdriverIcon,
    onClick: () => console.log('Maintenance clicked')
  },
  {
    id: 'view-analytics',
    label: 'Analytics',
    icon: ChartBarIcon,
    onClick: () => console.log('Analytics clicked')
  }
]

export const QuickActionsWidget: React.FC<QuickActionsWidgetProps> = ({
  actions = defaultActions,
  layout = 'grid',
  ...baseProps
}) => {
  return (
    <BaseWidget {...baseProps}>
      <div className="quick-actions-widget h-full">
        <div className={`
          ${layout === 'grid' 
            ? 'grid grid-cols-2 gap-3' 
            : 'flex flex-col space-y-2'
          }
        `}>
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.id}
                onClick={action.onClick}
                disabled={action.disabled}
                className={`
                  quick-action-button
                  flex items-center justify-center
                  p-3 rounded-lg border-2 border-gray-200
                  hover:border-blue-300 hover:bg-blue-50
                  transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${layout === 'grid' ? 'flex-col space-y-2' : 'flex-row space-x-3'}
                `}
              >
                <Icon className={`
                  ${layout === 'grid' ? 'w-6 h-6' : 'w-5 h-5'}
                  text-blue-600
                `} />
                <span className={`
                  text-sm font-medium text-gray-700
                  ${layout === 'grid' ? 'text-center' : ''}
                `}>
                  {action.label}
                </span>
              </button>
            )
          })}
        </div>
        
        {/* Recent actions */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Recent Actions
          </h4>
          <div className="space-y-1 text-xs text-gray-600">
            <div>• Property added (2h ago)</div>
            <div>• Payment recorded (4h ago)</div>
            <div>• Report generated (1d ago)</div>
          </div>
        </div>
      </div>
    </BaseWidget>
  )
}

export default QuickActionsWidget
