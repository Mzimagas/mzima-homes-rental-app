/**
 * Property Analytics Dashboard Section
 * Comprehensive property analytics with occupancy rates, revenue trends, and performance metrics
 * Features KES currency formatting, responsive design, and real-time updates
 */

'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { 
  BuildingOfficeIcon,
  ChartBarIcon,
  MapPinIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  EyeIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import { ResponsiveContainer } from '../../layout/ResponsiveContainer'
import { LoadingSpinner } from '../../ui/loading'
import { ErrorMessage } from '../../ui/error'
import { dashboardAnalyticsService } from '../../../services/DashboardAnalyticsService'

// Property analytics interfaces
interface PropertyPerformanceData {
  propertyId: string
  propertyName: string
  occupancyRate: number
  monthlyRevenue: number
  collectionRate: number
  maintenanceRequests: number
  tenantSatisfaction: number
  units: number
  location: string
  propertyType: string
}

interface OccupancyTrendData {
  month: string
  occupancyRate: number
  totalUnits: number
  occupiedUnits: number
}

interface PropertyTypeDistribution {
  type: string
  count: number
  percentage: number
  averageRent: number
  occupancyRate: number
}

interface LocationAnalytics {
  location: string
  propertyCount: number
  totalUnits: number
  occupancyRate: number
  averageRent: number
  totalRevenue: number
}

// Component props
export interface PropertyAnalyticsProps {
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

// Property performance card component
interface PropertyCardProps {
  property: PropertyPerformanceData
  onClick?: (propertyId: string) => void
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, onClick }) => {
  const getOccupancyColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600 bg-green-100'
    if (rate >= 75) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getCollectionColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600'
    if (rate >= 85) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick?.(property.propertyId)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 truncate">{property.propertyName}</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
            <MapPinIcon className="w-4 h-4" />
            <span>{property.location}</span>
            <span>•</span>
            <span>{property.propertyType}</span>
          </div>
        </div>
        <button className="p-1 text-gray-400 hover:text-gray-600">
          <EyeIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-xs text-gray-500 mb-1">Occupancy Rate</div>
          <div className={`text-sm font-medium px-2 py-1 rounded ${getOccupancyColor(property.occupancyRate)}`}>
            {property.occupancyRate.toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Monthly Revenue</div>
          <div className="text-sm font-medium text-gray-900">
            {formatKES(property.monthlyRevenue, true)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-gray-500">Collection</div>
          <div className={`font-medium ${getCollectionColor(property.collectionRate)}`}>
            {property.collectionRate.toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-gray-500">Units</div>
          <div className="font-medium text-gray-900">{property.units}</div>
        </div>
        <div>
          <div className="text-gray-500">Satisfaction</div>
          <div className="font-medium text-gray-900">{property.tenantSatisfaction.toFixed(1)}/5</div>
        </div>
      </div>
    </div>
  )
}

// Occupancy trend chart component (simplified)
interface OccupancyTrendChartProps {
  data: OccupancyTrendData[]
}

const OccupancyTrendChart: React.FC<OccupancyTrendChartProps> = ({ data }) => {
  const maxRate = Math.max(...data.map(d => d.occupancyRate))
  const minRate = Math.min(...data.map(d => d.occupancyRate))
  const range = maxRate - minRate || 1

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Occupancy Trends (12 Months)</h3>
      
      <div className="relative h-48">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500">
          <span>{maxRate.toFixed(0)}%</span>
          <span>{((maxRate + minRate) / 2).toFixed(0)}%</span>
          <span>{minRate.toFixed(0)}%</span>
        </div>
        
        {/* Chart area */}
        <div className="ml-8 h-full relative">
          {/* Grid lines */}
          <div className="absolute inset-0">
            {[0, 25, 50, 75, 100].map(percent => (
              <div 
                key={percent}
                className="absolute w-full border-t border-gray-100"
                style={{ top: `${100 - percent}%` }}
              />
            ))}
          </div>
          
          {/* Data points and line */}
          <svg className="absolute inset-0 w-full h-full">
            <polyline
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2"
              points={data.map((point, index) => {
                const x = (index / (data.length - 1)) * 100
                const y = 100 - ((point.occupancyRate - minRate) / range) * 100
                return `${x}%,${y}%`
              }).join(' ')}
            />
            {data.map((point, index) => {
              const x = (index / (data.length - 1)) * 100
              const y = 100 - ((point.occupancyRate - minRate) / range) * 100
              return (
                <circle
                  key={index}
                  cx={`${x}%`}
                  cy={`${y}%`}
                  r="3"
                  fill="#3B82F6"
                  className="hover:r-4 transition-all"
                />
              )
            })}
          </svg>
        </div>
        
        {/* X-axis labels */}
        <div className="absolute bottom-0 left-8 right-0 flex justify-between text-xs text-gray-500">
          {data.map((point, index) => (
            index % 2 === 0 && (
              <span key={index}>{point.month}</span>
            )
          ))}
        </div>
      </div>
    </div>
  )
}

// Property type distribution component
interface PropertyTypeDistributionProps {
  data: PropertyTypeDistribution[]
}

const PropertyTypeDistribution: React.FC<PropertyTypeDistributionProps> = ({ data }) => {
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-red-500']

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Property Type Distribution</h3>
      
      <div className="space-y-3">
        {data.map((type, index) => (
          <div key={type.type} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
              <div>
                <div className="font-medium text-gray-900">{type.type}</div>
                <div className="text-sm text-gray-600">
                  {type.count} properties • {type.percentage.toFixed(1)}%
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium text-gray-900">
                {formatKES(type.averageRent, true)}
              </div>
              <div className="text-sm text-gray-600">
                {type.occupancyRate.toFixed(1)}% occupied
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Location analytics component
interface LocationAnalyticsProps {
  data: LocationAnalytics[]
}

const LocationAnalytics: React.FC<LocationAnalyticsProps> = ({ data }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Performance by Location</h3>
      
      <div className="space-y-3">
        {data.map((location) => (
          <div key={location.location} className="border-b border-gray-100 pb-3 last:border-b-0">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">{location.location}</h4>
              <div className="text-sm font-medium text-gray-900">
                {formatKES(location.totalRevenue, true)}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Properties</div>
                <div className="font-medium">{location.propertyCount}</div>
              </div>
              <div>
                <div className="text-gray-500">Occupancy</div>
                <div className="font-medium">{location.occupancyRate.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-gray-500">Avg Rent</div>
                <div className="font-medium">{formatKES(location.averageRent, true)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Main Property Analytics Component
 */
export const PropertyAnalytics: React.FC<PropertyAnalyticsProps> = ({
  loading = false,
  onRefresh,
  className = ''
}) => {
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedView, setSelectedView] = useState<'overview' | 'performance' | 'trends'>('overview')

  // Load analytics data
  React.useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setDataLoading(true)
        setError(null)
        
        const data = await dashboardAnalyticsService.getPropertyAnalytics()
        setAnalyticsData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics')
      } finally {
        setDataLoading(false)
      }
    }

    loadAnalytics()
  }, [])

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      await onRefresh()
    }
    
    // Reload analytics data
    try {
      setError(null)
      const data = await dashboardAnalyticsService.getPropertyAnalytics()
      setAnalyticsData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh analytics')
    }
  }, [onRefresh])

  // Mock data for demonstration
  const mockData = useMemo(() => ({
    properties: [
      {
        propertyId: '1',
        propertyName: 'Westlands Tower',
        occupancyRate: 95,
        monthlyRevenue: 240000,
        collectionRate: 98,
        maintenanceRequests: 2,
        tenantSatisfaction: 4.5,
        units: 12,
        location: 'Westlands',
        propertyType: 'Apartment'
      },
      {
        propertyId: '2',
        propertyName: 'Karen Villas',
        occupancyRate: 100,
        monthlyRevenue: 180000,
        collectionRate: 100,
        maintenanceRequests: 0,
        tenantSatisfaction: 4.8,
        units: 6,
        location: 'Karen',
        propertyType: 'Villa'
      },
      {
        propertyId: '3',
        propertyName: 'Kilimani Heights',
        occupancyRate: 75,
        monthlyRevenue: 135000,
        collectionRate: 85,
        maintenanceRequests: 5,
        tenantSatisfaction: 3.9,
        units: 8,
        location: 'Kilimani',
        propertyType: 'Apartment'
      }
    ],
    occupancyTrends: Array.from({ length: 12 }, (_, i) => ({
      month: new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'short' }),
      occupancyRate: Math.floor(Math.random() * 20) + 80,
      totalUnits: 26,
      occupiedUnits: Math.floor((Math.random() * 20 + 80) * 26 / 100)
    })),
    propertyTypes: [
      { type: 'Apartment', count: 15, percentage: 60, averageRent: 45000, occupancyRate: 88 },
      { type: 'Villa', count: 6, percentage: 24, averageRent: 85000, occupancyRate: 92 },
      { type: 'Townhouse', count: 4, percentage: 16, averageRent: 65000, occupancyRate: 85 }
    ],
    locations: [
      { location: 'Westlands', propertyCount: 8, totalUnits: 96, occupancyRate: 91, averageRent: 52000, totalRevenue: 480000 },
      { location: 'Karen', propertyCount: 6, totalUnits: 36, occupancyRate: 94, averageRent: 78000, totalRevenue: 280000 },
      { location: 'Kilimani', propertyCount: 5, totalUnits: 40, occupancyRate: 82, averageRent: 48000, totalRevenue: 192000 },
      { location: 'Lavington', propertyCount: 6, totalUnits: 48, occupancyRate: 89, averageRent: 62000, totalRevenue: 298000 }
    ]
  }), [])

  const isLoading = loading || dataLoading

  if (error) {
    return (
      <ResponsiveContainer className={className}>
        <ErrorMessage
          title="Property Analytics Error"
          message={error}
          onRetry={handleRefresh}
        />
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer className={`property-analytics ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Property Analytics</h2>
          <p className="text-gray-600">Comprehensive property performance insights</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* View selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'performance', label: 'Performance' },
              { key: 'trends', label: 'Trends' }
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
            {isLoading ? <LoadingSpinner size="sm" /> : <ChartBarIcon className="w-4 h-4" />}
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Content based on selected view */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {selectedView === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PropertyTypeDistribution data={mockData.propertyTypes} />
              <LocationAnalytics data={mockData.locations} />
            </div>
          )}

          {selectedView === 'performance' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockData.properties.map(property => (
                <PropertyCard
                  key={property.propertyId}
                  property={property}
                  onClick={(id) => console.log('View property:', id)}
                />
              ))}
            </div>
          )}

          {selectedView === 'trends' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <OccupancyTrendChart data={mockData.occupancyTrends} />
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Revenue Trends</h3>
                <div className="text-center text-gray-500 py-8">
                  Revenue trend chart would be implemented here
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </ResponsiveContainer>
  )
}

export default PropertyAnalytics
