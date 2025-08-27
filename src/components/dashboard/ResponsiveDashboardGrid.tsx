'use client'

import React from 'react'
import {
  ResponsiveGrid,
  ResponsiveCard,
  ResponsiveStack,
  ResponsiveText,
} from '../layout/ResponsiveContainer'
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  CreditCardIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

interface DashboardStats {
  totalProperties: number
  totalTenants: number
  monthlyRevenue: number
  occupancyRate: number
  pendingPayments: number
  maintenanceRequests: number
}

interface ResponsiveDashboardGridProps {
  stats?: DashboardStats
  className?: string
}

const defaultStats: DashboardStats = {
  totalProperties: 12,
  totalTenants: 28,
  monthlyRevenue: 45000,
  occupancyRate: 92,
  pendingPayments: 3,
  maintenanceRequests: 5,
}

export default function ResponsiveDashboardGrid({
  stats = defaultStats,
  className = '',
}: ResponsiveDashboardGridProps) {
  const statCards = [
    {
      title: 'Total Properties',
      value: stats.totalProperties.toString(),
      icon: BuildingOfficeIcon,
      color: 'blue',
      change: '+2 this month',
    },
    {
      title: 'Active Tenants',
      value: stats.totalTenants.toString(),
      icon: UserGroupIcon,
      color: 'green',
      change: '+5 this month',
    },
    {
      title: 'Monthly Revenue',
      value: `$${stats.monthlyRevenue.toLocaleString()}`,
      icon: CreditCardIcon,
      color: 'purple',
      change: '+12% from last month',
    },
    {
      title: 'Occupancy Rate',
      value: `${stats.occupancyRate}%`,
      icon: ChartBarIcon,
      color: 'indigo',
      change: '+3% from last month',
    },
  ]

  const alertCards = [
    {
      title: 'Pending Payments',
      value: stats.pendingPayments.toString(),
      icon: ExclamationTriangleIcon,
      color: 'red',
      description: 'Payments overdue',
    },
    {
      title: 'Maintenance Requests',
      value: stats.maintenanceRequests.toString(),
      icon: CheckCircleIcon,
      color: 'yellow',
      description: 'Open requests',
    },
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'text-blue-600 bg-blue-100',
      green: 'text-green-600 bg-green-100',
      purple: 'text-purple-600 bg-purple-100',
      indigo: 'text-indigo-600 bg-indigo-100',
      red: 'text-red-600 bg-red-100',
      yellow: 'text-yellow-600 bg-yellow-100',
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  return (
    <div className={className}>
      {/* Main Stats Grid */}
      <ResponsiveStack spacing="lg" className="mb-6 md:mb-8">
        <div>
          <ResponsiveText size="2xl" weight="bold" className="mb-2">
            Dashboard Overview
          </ResponsiveText>
          <ResponsiveText size="sm" color="gray" className="text-gray-600">
            Monitor your rental properties and performance metrics
          </ResponsiveText>
        </div>

        <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 4 }} gap="md">
          {statCards.map((card, index) => (
            <ResponsiveCard
              key={index}
              padding="md"
              shadow="md"
              className="hover:shadow-lg transition-shadow duration-200"
            >
              <ResponsiveStack spacing="sm">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${getColorClasses(card.color)}`}>
                    <card.icon className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                  <ResponsiveText size="xs" className="text-gray-500">
                    {card.change}
                  </ResponsiveText>
                </div>

                <div>
                  <ResponsiveText size="2xl" weight="bold" className="block">
                    {card.value}
                  </ResponsiveText>
                  <ResponsiveText size="sm" className="text-gray-600">
                    {card.title}
                  </ResponsiveText>
                </div>
              </ResponsiveStack>
            </ResponsiveCard>
          ))}
        </ResponsiveGrid>
      </ResponsiveStack>

      {/* Alerts and Quick Actions */}
      <ResponsiveStack spacing="lg">
        <ResponsiveText size="xl" weight="semibold">
          Alerts & Quick Actions
        </ResponsiveText>

        <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 2 }} gap="md">
          {alertCards.map((card, index) => (
            <ResponsiveCard
              key={index}
              padding="md"
              shadow="sm"
              className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow duration-200"
            >
              <ResponsiveStack direction="responsive" align="center" spacing="md">
                <div className={`p-3 rounded-full ${getColorClasses(card.color)}`}>
                  <card.icon className="h-6 w-6" />
                </div>

                <div className="flex-1 text-center md:text-left">
                  <ResponsiveText size="2xl" weight="bold" className="block">
                    {card.value}
                  </ResponsiveText>
                  <ResponsiveText size="base" weight="medium" className="block">
                    {card.title}
                  </ResponsiveText>
                  <ResponsiveText size="sm" className="text-gray-600">
                    {card.description}
                  </ResponsiveText>
                </div>

                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 touch-target">
                  <ResponsiveText size="sm" weight="medium" className="text-white">
                    View All
                  </ResponsiveText>
                </button>
              </ResponsiveStack>
            </ResponsiveCard>
          ))}
        </ResponsiveGrid>
      </ResponsiveStack>

      {/* Recent Activity */}
      <ResponsiveStack spacing="lg" className="mt-6 md:mt-8">
        <ResponsiveText size="xl" weight="semibold">
          Recent Activity
        </ResponsiveText>

        <ResponsiveCard padding="md" shadow="sm">
          <ResponsiveStack spacing="md">
            {[
              {
                action: 'Payment received',
                tenant: 'John Doe',
                amount: '$1,200',
                time: '2 hours ago',
              },
              {
                action: 'Maintenance request',
                tenant: 'Jane Smith',
                amount: 'Plumbing issue',
                time: '4 hours ago',
              },
              {
                action: 'Lease renewal',
                tenant: 'Mike Johnson',
                amount: 'Signed',
                time: '1 day ago',
              },
            ].map((activity, index) => (
              <div
                key={index}
                className="flex flex-col md:flex-row md:items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
              >
                <div className="mb-2 md:mb-0">
                  <ResponsiveText size="base" weight="medium" className="block">
                    {activity.action}
                  </ResponsiveText>
                  <ResponsiveText size="sm" className="text-gray-600">
                    {activity.tenant} • {activity.amount}
                  </ResponsiveText>
                </div>
                <ResponsiveText size="sm" className="text-gray-500">
                  {activity.time}
                </ResponsiveText>
              </div>
            ))}
          </ResponsiveStack>
        </ResponsiveCard>
      </ResponsiveStack>
    </div>
  )
}
