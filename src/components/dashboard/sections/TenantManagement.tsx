/**
 * Tenant Management Dashboard Section
 * Comprehensive tenant analytics with occupancy trends, lease expirations, and satisfaction metrics
 * Features tenant lifecycle tracking, communication history, and performance indicators
 */

'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { 
  UserGroupIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  StarIcon,
  ClockIcon,
  PhoneIcon,
  EnvelopeIcon,
  HomeIcon,
  TrendingUpIcon,
  TrendingDownIcon
} from '@heroicons/react/24/outline'
import { ResponsiveContainer } from '../../layout/ResponsiveContainer'
import { LoadingSpinner } from '../../ui/loading'
import { ErrorMessage } from '../../ui/error'
import { dashboardAnalyticsService } from '../../../services/DashboardAnalyticsService'

// Tenant data interfaces
interface TenantSummary {
  totalTenants: number
  activeTenants: number
  newTenants: number
  leavingTenants: number
  averageTenancyDuration: number
  tenantTurnoverRate: number
  occupancyRate: number
  averageSatisfaction: number
}

interface LeaseExpiration {
  tenantId: string
  tenantName: string
  propertyName: string
  unitNumber: string
  expirationDate: string
  daysUntilExpiration: number
  renewalStatus: 'pending' | 'confirmed' | 'declined' | 'unknown'
  monthlyRent: number
}

interface TenantPerformance {
  tenantId: string
  tenantName: string
  propertyName: string
  unitNumber: string
  paymentHistory: number
  maintenanceRequests: number
  satisfactionScore: number
  tenancyDuration: number
  lastPaymentDate: string
  status: 'excellent' | 'good' | 'fair' | 'poor'
}

interface TenantCommunication {
  tenantId: string
  tenantName: string
  lastContact: string
  contactMethod: 'phone' | 'email' | 'in-person' | 'sms'
  issueType: 'maintenance' | 'payment' | 'complaint' | 'inquiry' | 'renewal'
  status: 'open' | 'resolved' | 'pending'
  priority: 'high' | 'medium' | 'low'
}

// Component props
export interface TenantManagementProps {
  loading?: boolean
  onRefresh?: () => Promise<void>
  className?: string
}

// KES currency formatter
const formatKES = (amount: number, compact: boolean = false): string => {
  if (compact) {
    if (amount >= 1000000) {
      return `KES ${(amount / 1000000).toFixed(1)}M`
    } else if (amount >= 1000) {
      return `KES ${(amount / 1000).toFixed(1)}K`
    }
  }
  
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Tenant summary card component
interface TenantSummaryCardProps {
  title: string
  value: string | number
  trend?: number
  icon: React.ComponentType<any>
  color: string
  format?: 'number' | 'percentage' | 'duration'
}

const TenantSummaryCard: React.FC<TenantSummaryCardProps> = ({
  title,
  value,
  trend,
  icon: Icon,
  color,
  format = 'number'
}) => {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val
    
    switch (format) {
      case 'percentage':
        return `${val.toFixed(1)}%`
      case 'duration':
        return `${val.toFixed(1)} months`
      case 'number':
      default:
        return new Intl.NumberFormat('en-KE').format(val)
    }
  }

  const getTrendColor = (trendValue?: number) => {
    if (!trendValue) return 'text-gray-500'
    return trendValue > 0 ? 'text-green-600' : 'text-red-600'
  }

  const TrendIcon = trend && trend > 0 ? TrendingUpIcon : TrendingDownIcon

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center space-x-1 text-sm ${getTrendColor(trend)}`}>
            <TrendIcon className="w-4 h-4" />
            <span>{Math.abs(trend).toFixed(1)}%</span>
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
        <div className="text-2xl font-bold text-gray-900">{formatValue(value)}</div>
      </div>
    </div>
  )
}

// Lease expiration component
interface LeaseExpirationsProps {
  data: LeaseExpiration[]
}

const LeaseExpirations: React.FC<LeaseExpirationsProps> = ({ data }) => {
  const getUrgencyColor = (days: number) => {
    if (days <= 7) return 'text-red-600 bg-red-100'
    if (days <= 30) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  const getRenewalStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-600 bg-green-100'
      case 'declined': return 'text-red-600 bg-red-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Upcoming Lease Expirations</h3>
        <CalendarIcon className="w-5 h-5 text-gray-400" />
      </div>
      
      <div className="space-y-4">
        {data.map((lease) => (
          <div key={lease.tenantId} className="border-b border-gray-100 pb-4 last:border-b-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-medium text-gray-900">{lease.tenantName}</h4>
                <p className="text-sm text-gray-600">
                  {lease.propertyName} - Unit {lease.unitNumber}
                </p>
              </div>
              <div className="text-right">
                <div className={`px-2 py-1 rounded text-xs font-medium ${getUrgencyColor(lease.daysUntilExpiration)}`}>
                  {lease.daysUntilExpiration} days
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <span className="text-gray-600">
                  Expires: {new Date(lease.expirationDate).toLocaleDateString()}
                </span>
                <span className="text-gray-600">
                  Rent: {formatKES(lease.monthlyRent, true)}
                </span>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-medium ${getRenewalStatusColor(lease.renewalStatus)}`}>
                {lease.renewalStatus.charAt(0).toUpperCase() + lease.renewalStatus.slice(1)}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {data.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No upcoming lease expirations</p>
        </div>
      )}
    </div>
  )
}

// Tenant performance component
interface TenantPerformanceProps {
  data: TenantPerformance[]
}

const TenantPerformance: React.FC<TenantPerformanceProps> = ({ data }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-100'
      case 'good': return 'text-blue-600 bg-blue-100'
      case 'fair': return 'text-yellow-600 bg-yellow-100'
      case 'poor': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const renderStars = (score: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(score) ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ))
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Tenant Performance</h3>
      
      <div className="space-y-4">
        {data.map((tenant) => (
          <div key={tenant.tenantId} className="border-b border-gray-100 pb-4 last:border-b-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-medium text-gray-900">{tenant.tenantName}</h4>
                <p className="text-sm text-gray-600">
                  {tenant.propertyName} - Unit {tenant.unitNumber}
                </p>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(tenant.status)}`}>
                {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Payment Score</div>
                <div className="font-medium">{tenant.paymentHistory}%</div>
              </div>
              <div>
                <div className="text-gray-500">Satisfaction</div>
                <div className="flex items-center space-x-1">
                  {renderStars(tenant.satisfactionScore)}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Tenancy</div>
                <div className="font-medium">{tenant.tenancyDuration} months</div>
              </div>
              <div>
                <div className="text-gray-500">Last Payment</div>
                <div className="font-medium">
                  {new Date(tenant.lastPaymentDate).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Communication tracking component
interface CommunicationTrackingProps {
  data: TenantCommunication[]
}

const CommunicationTracking: React.FC<CommunicationTrackingProps> = ({ data }) => {
  const getContactIcon = (method: string) => {
    switch (method) {
      case 'phone': return PhoneIcon
      case 'email': return EnvelopeIcon
      case 'sms': return PhoneIcon
      default: return UserGroupIcon
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'text-green-600 bg-green-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'open': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Communications</h3>
      
      <div className="space-y-4">
        {data.map((comm, index) => {
          const ContactIcon = getContactIcon(comm.contactMethod)
          
          return (
            <div key={index} className="border-b border-gray-100 pb-4 last:border-b-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="p-1 bg-gray-100 rounded">
                    <ContactIcon className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{comm.tenantName}</h4>
                    <p className="text-sm text-gray-600 capitalize">{comm.issueType}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(comm.priority)}`}>
                    {comm.priority}
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(comm.status)}`}>
                    {comm.status}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Last contact: {new Date(comm.lastContact).toLocaleDateString()}</span>
                <span className="capitalize">{comm.contactMethod}</span>
              </div>
            </div>
          )
        })}
      </div>
      
      {data.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <EnvelopeIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No recent communications</p>
        </div>
      )}
    </div>
  )
}

/**
 * Main Tenant Management Component
 */
export const TenantManagement: React.FC<TenantManagementProps> = ({
  loading = false,
  onRefresh,
  className = ''
}) => {
  const [tenantData, setTenantData] = useState<any>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedView, setSelectedView] = useState<'overview' | 'expirations' | 'performance' | 'communications'>('overview')

  // Load tenant data
  React.useEffect(() => {
    const loadTenantData = async () => {
      try {
        setDataLoading(true)
        setError(null)
        
        const data = await dashboardAnalyticsService.getTenantAnalytics()
        setTenantData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tenant data')
      } finally {
        setDataLoading(false)
      }
    }

    loadTenantData()
  }, [])

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      await onRefresh()
    }
    
    try {
      setError(null)
      const data = await dashboardAnalyticsService.getTenantAnalytics()
      setTenantData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh tenant data')
    }
  }, [onRefresh])

  // Mock data for demonstration
  const mockData = useMemo(() => ({
    summary: {
      totalTenants: 68,
      activeTenants: 64,
      newTenants: 5,
      leavingTenants: 2,
      averageTenancyDuration: 18.5,
      tenantTurnoverRate: 15.2,
      occupancyRate: 94.1,
      averageSatisfaction: 4.2
    },
    leaseExpirations: [
      {
        tenantId: '1',
        tenantName: 'John Kamau',
        propertyName: 'Westlands Tower',
        unitNumber: 'A-12',
        expirationDate: '2024-01-15',
        daysUntilExpiration: 8,
        renewalStatus: 'pending' as const,
        monthlyRent: 45000
      },
      {
        tenantId: '2',
        tenantName: 'Mary Wanjiku',
        propertyName: 'Karen Villas',
        unitNumber: 'V-3',
        expirationDate: '2024-01-22',
        daysUntilExpiration: 15,
        renewalStatus: 'confirmed' as const,
        monthlyRent: 85000
      },
      {
        tenantId: '3',
        tenantName: 'Peter Ochieng',
        propertyName: 'Kilimani Heights',
        unitNumber: 'B-7',
        expirationDate: '2024-02-05',
        daysUntilExpiration: 29,
        renewalStatus: 'declined' as const,
        monthlyRent: 38000
      }
    ],
    performance: [
      {
        tenantId: '1',
        tenantName: 'Sarah Muthoni',
        propertyName: 'Westlands Tower',
        unitNumber: 'A-5',
        paymentHistory: 98,
        maintenanceRequests: 1,
        satisfactionScore: 4.8,
        tenancyDuration: 24,
        lastPaymentDate: '2024-01-01',
        status: 'excellent' as const
      },
      {
        tenantId: '2',
        tenantName: 'David Kiprop',
        propertyName: 'Karen Villas',
        unitNumber: 'V-1',
        paymentHistory: 95,
        maintenanceRequests: 2,
        satisfactionScore: 4.5,
        tenancyDuration: 18,
        lastPaymentDate: '2023-12-28',
        status: 'good' as const
      },
      {
        tenantId: '3',
        tenantName: 'Grace Akinyi',
        propertyName: 'Kilimani Heights',
        unitNumber: 'B-3',
        paymentHistory: 85,
        maintenanceRequests: 4,
        satisfactionScore: 3.8,
        tenancyDuration: 12,
        lastPaymentDate: '2023-12-25',
        status: 'fair' as const
      }
    ],
    communications: [
      {
        tenantId: '1',
        tenantName: 'Michael Otieno',
        lastContact: '2024-01-05',
        contactMethod: 'phone' as const,
        issueType: 'maintenance' as const,
        status: 'pending' as const,
        priority: 'high' as const
      },
      {
        tenantId: '2',
        tenantName: 'Jane Nyokabi',
        lastContact: '2024-01-04',
        contactMethod: 'email' as const,
        issueType: 'renewal' as const,
        status: 'resolved' as const,
        priority: 'medium' as const
      },
      {
        tenantId: '3',
        tenantName: 'Robert Kigen',
        lastContact: '2024-01-03',
        contactMethod: 'sms' as const,
        issueType: 'payment' as const,
        status: 'open' as const,
        priority: 'high' as const
      }
    ]
  }), [])

  const isLoading = loading || dataLoading

  if (error) {
    return (
      <ResponsiveContainer className={className}>
        <ErrorMessage
          title="Tenant Management Error"
          message={error}
          onRetry={handleRefresh}
        />
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer className={`tenant-management ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tenant Management</h2>
          <p className="text-gray-600">Tenant analytics and relationship management</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* View selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'expirations', label: 'Expirations' },
              { key: 'performance', label: 'Performance' },
              { key: 'communications', label: 'Communications' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSelectedView(key as any)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  selectedView === key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {isLoading ? <LoadingSpinner size="sm" /> : <UserGroupIcon className="w-4 h-4" />}
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Tenant Summary Cards */}
          {selectedView === 'overview' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <TenantSummaryCard
                  title="Total Tenants"
                  value={mockData.summary.totalTenants}
                  trend={8.3}
                  icon={UserGroupIcon}
                  color="bg-blue-500"
                  format="number"
                />
                <TenantSummaryCard
                  title="Occupancy Rate"
                  value={mockData.summary.occupancyRate}
                  trend={2.1}
                  icon={HomeIcon}
                  color="bg-green-500"
                  format="percentage"
                />
                <TenantSummaryCard
                  title="Avg Tenancy Duration"
                  value={mockData.summary.averageTenancyDuration}
                  trend={-5.2}
                  icon={ClockIcon}
                  color="bg-purple-500"
                  format="duration"
                />
                <TenantSummaryCard
                  title="Satisfaction Score"
                  value={mockData.summary.averageSatisfaction}
                  trend={3.8}
                  icon={StarIcon}
                  color="bg-yellow-500"
                  format="number"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <LeaseExpirations data={mockData.leaseExpirations.slice(0, 3)} />
                <CommunicationTracking data={mockData.communications.slice(0, 3)} />
              </div>
            </>
          )}

          {selectedView === 'expirations' && (
            <LeaseExpirations data={mockData.leaseExpirations} />
          )}

          {selectedView === 'performance' && (
            <TenantPerformance data={mockData.performance} />
          )}

          {selectedView === 'communications' && (
            <CommunicationTracking data={mockData.communications} />
          )}
        </>
      )}
    </ResponsiveContainer>
  )
}

export default TenantManagement
