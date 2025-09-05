'use client'

import React, { Suspense } from 'react'
import dynamic from 'next/dynamic'

// Route-specific loading components
const DashboardLoading = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading dashboard...</p>
    </div>
  </div>
)

const PropertiesLoading = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading properties...</p>
    </div>
  </div>
)

const ReportsLoading = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading reports...</p>
    </div>
  </div>
)

const AdminLoading = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading administration...</p>
    </div>
  </div>
)

// Core dashboard routes (higher priority, smaller chunks)
// Note: Dashboard components have been removed - using placeholder

export const LazyPropertyManagement = dynamic(
  () => import('../properties/PropertyManagementTabs'),
  {
    loading: PropertiesLoading,
    ssr: true, // Properties are core functionality
  }
)

export const LazyTenantManagement = dynamic(
  () => import('../rental-management/components/TenantManagement'),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading tenant management...</span>
      </div>
    ),
    ssr: true,
  }
)

// Reports and analytics (separate bundle)
export const LazyReportsPage = dynamic(() => import('../../app/dashboard/reports/page'), {
  loading: ReportsLoading,
  ssr: false, // Reports don't need SSR
})

export const LazyFinancialReports = dynamic(() => import('../reports/financial-reports'), {
  loading: ReportsLoading,
  ssr: false,
})

export const LazyOccupancyReports = dynamic(() => import('../reports/occupancy-reports'), {
  loading: ReportsLoading,
  ssr: false,
})

// Admin features (separate bundle, lazy loaded)
export const LazyAdministrationPage = dynamic(
  () => import('../../app/dashboard/administration/page'),
  {
    loading: AdminLoading,
    ssr: false, // Admin features don't need SSR
  }
)

export const LazyUserManagementPage = dynamic(() => import('../administration/UserManagement'), {
  loading: AdminLoading,
  ssr: false,
})

// Payment features
export const LazyPaymentsPage = dynamic(() => import('../../app/dashboard/payments/page'), {
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      <span className="ml-3 text-gray-600">Loading payments...</span>
    </div>
  ),
  ssr: false,
})

// Utilities and settings
export const LazyUtilitiesPage = dynamic(() => import('../../app/dashboard/utilities/page'), {
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      <span className="ml-3 text-gray-600">Loading utilities...</span>
    </div>
  ),
  ssr: false,
})

export const LazySettingsPage = dynamic(() => import('../../app/settings/security/page'), {
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
      <span className="ml-3 text-gray-600">Loading settings...</span>
    </div>
  ),
  ssr: false,
})

// Route preloading hook
export const useRoutePreloader = () => {
  const preloadRoutes = React.useCallback(() => {
    // Preload core routes that users are likely to visit
    const coreRoutes = [
      () => import('../properties/PropertyManagementTabs'),
      () => import('../rental-management/components/TenantManagement'),
    ]

    coreRoutes.forEach((route) => {
      route().catch((error) => {
        console.warn('Failed to preload route:', error)
      })
    })
  }, [])

  const preloadAdminRoutes = React.useCallback(() => {
    // Preload admin routes only when needed
    const adminRoutes = [
      () => import('../administration/UserManagement'),
      () => import('../properties/permission-management/GranularPermissionManager'),
      () => import('../properties/components/AuditTrailDashboard'),
    ]

    adminRoutes.forEach((route) => {
      route().catch((error) => {
        console.warn('Failed to preload admin route:', error)
      })
    })
  }, [])

  const preloadReportRoutes = React.useCallback(() => {
    // Preload report routes when user shows interest
    const reportRoutes = [
      () => import('../reports/financial-reports'),
      () => import('../reports/occupancy-reports'),
      () => import('../reports/tenant-analytics'),
      () => import('../reports/property-reports'),
    ]

    reportRoutes.forEach((route) => {
      route().catch((error) => {
        console.warn('Failed to preload report route:', error)
      })
    })
  }, [])

  return {
    preloadRoutes,
    preloadAdminRoutes,
    preloadReportRoutes,
  }
}

// Route-based error boundary
interface RouteErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  routeName?: string
}

export class RouteErrorBoundary extends React.Component<
  RouteErrorBoundaryProps,
  { hasError: boolean; error?: Error }
> {
  constructor(props: RouteErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Route error in ${this.props.routeName}:`, error, errorInfo)

    // Send error to analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      ;(window as any).gtag('event', 'route_error', {
        route_name: this.props.routeName,
        error_message: error.message,
      })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-600 text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
              <p className="text-gray-600 mb-4">
                Failed to load {this.props.routeName || 'this page'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Reload Page
              </button>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}

// Wrapper for lazy routes with error boundary
interface LazyRouteWrapperProps {
  children: React.ReactNode
  routeName: string
  preloadOnHover?: boolean
  preloadFn?: () => void
}

export const LazyRouteWrapper: React.FC<LazyRouteWrapperProps> = ({
  children,
  routeName,
  preloadOnHover = false,
  preloadFn,
}) => {
  const handleMouseEnter = React.useCallback(() => {
    if (preloadOnHover && preloadFn) {
      preloadFn()
    }
  }, [preloadOnHover, preloadFn])

  return (
    <RouteErrorBoundary routeName={routeName}>
      <div onMouseEnter={handleMouseEnter}>
        <Suspense fallback={<DashboardLoading />}>{children}</Suspense>
      </div>
    </RouteErrorBoundary>
  )
}

// Performance monitoring for routes
export const useRoutePerformance = (routeName: string) => {
  React.useEffect(() => {
    const startTime = performance.now()

    return () => {
      const endTime = performance.now()
      const loadTime = endTime - startTime

      // Log route load time
      if (process.env.NODE_ENV === 'development') {
        console.log(`Route ${routeName} loaded in ${loadTime.toFixed(2)}ms`)
      }

      // Send to analytics
      if (typeof window !== 'undefined' && (window as any).gtag) {
        ;(window as any).gtag('event', 'route_load_time', {
          route_name: routeName,
          load_time: Math.round(loadTime),
        })
      }
    }
  }, [routeName])
}
