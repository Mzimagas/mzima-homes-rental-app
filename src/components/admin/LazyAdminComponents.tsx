'use client'

import React, { Suspense } from 'react'
import dynamic from 'next/dynamic'

// Loading component for admin features
const AdminLoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-3 text-gray-600">Loading admin features...</span>
  </div>
)

// Lazy-loaded admin components with separate bundles
export const LazyUserManagement = dynamic(
  () => import('../administration/UserManagement'),
  {
    loading: AdminLoadingSpinner,
    ssr: false, // Admin features don't need SSR
  }
)

export const LazyPermissionManager = dynamic(
  () => import('../properties/permission-management/GranularPermissionManager'),
  {
    loading: AdminLoadingSpinner,
    ssr: false,
  }
)

export const LazyAuditTrail = dynamic(
  () => import('../properties/components/AuditTrailDashboard'),
  {
    loading: AdminLoadingSpinner,
    ssr: false,
  }
)

export const LazySecurityTestPanel = dynamic(
  () => import('../properties/components/SecurityTestPanel'),
  {
    loading: AdminLoadingSpinner,
    ssr: false,
  }
)

// Heavy analytics components
export const LazyTenantAnalytics = dynamic(
  () => import('../reports/tenant-analytics'),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span className="ml-3 text-gray-600">Loading analytics...</span>
      </div>
    ),
    ssr: false,
  }
)

export const LazyPropertyReports = dynamic(
  () => import('../reports/property-reports'),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-gray-600">Loading reports...</span>
      </div>
    ),
    ssr: false,
  }
)

// Document management components
export const LazyDocumentManagement = dynamic(
  () => import('../properties/components/DirectAdditionDocumentsV2'),
  {
    loading: () => (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm text-gray-600">Loading documents...</span>
      </div>
    ),
    ssr: false,
  }
)

export const LazyHandoverDocuments = dynamic(
  () => import('../properties/components/HandoverDocumentsV2'),
  {
    loading: () => (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
        <span className="ml-2 text-sm text-gray-600">Loading handover documents...</span>
      </div>
    ),
    ssr: false,
  }
)

// Payment components
export const LazyPaymentDashboard = dynamic(
  () => import('../payments/payment-dashboard'),
  {
    loading: () => (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        <span className="ml-3 text-gray-600">Loading payment dashboard...</span>
      </div>
    ),
    ssr: false,
  }
)

// Export utilities (PDF/Excel) - only load when needed
export const LazyPDFExport = dynamic(
  () => import('../reports/pdf-export').catch(() => ({ default: () => <div>PDF export not available</div> })),
  {
    loading: () => (
      <div className="inline-flex items-center">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
        <span className="ml-2 text-sm">Loading PDF...</span>
      </div>
    ),
    ssr: false,
  }
)

export const LazyExcelExport = dynamic(
  () => import('../reports/excel-export').catch(() => ({ default: () => <div>Excel export not available</div> })),
  {
    loading: () => (
      <div className="inline-flex items-center">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
        <span className="ml-2 text-sm">Loading Excel...</span>
      </div>
    ),
    ssr: false,
  }
)

// Virtualized components for large lists
export const LazyVirtualizedPropertyList = dynamic(
  () => import('../properties/components/VirtualizedPropertyList'),
  {
    loading: () => (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Loading property list...</span>
      </div>
    ),
    ssr: false,
  }
)

// Advanced search and filters
export const LazyAdvancedFilters = dynamic(
  () => import('../dashboard/SearchFilters'),
  {
    loading: () => (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
        <span className="ml-2 text-sm text-gray-600">Loading filters...</span>
      </div>
    ),
    ssr: false,
  }
)

// Wrapper component for conditional admin features
interface AdminFeatureWrapperProps {
  children: React.ReactNode
  requiredRole?: string
  fallback?: React.ReactNode
}

export const AdminFeatureWrapper: React.FC<AdminFeatureWrapperProps> = ({
  children,
  requiredRole = 'admin',
  fallback = <div className="text-gray-500 p-4">Access denied</div>
}) => {
  // This would integrate with your auth system
  // For now, we'll assume admin access
  const hasAccess = true // Replace with actual role check

  if (!hasAccess) {
    return <>{fallback}</>
  }

  return (
    <Suspense fallback={<AdminLoadingSpinner />}>
      {children}
    </Suspense>
  )
}

// Performance monitoring wrapper
interface PerformanceWrapperProps {
  componentName: string
  children: React.ReactNode
}

export const PerformanceWrapper: React.FC<PerformanceWrapperProps> = ({
  componentName,
  children
}) => {
  React.useEffect(() => {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const loadTime = endTime - startTime
      
      // Log component load time for monitoring
      if (process.env.NODE_ENV === 'development') {
        console.log(`${componentName} loaded in ${loadTime.toFixed(2)}ms`)
      }
      
      // Send to analytics if needed
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'component_load_time', {
          component_name: componentName,
          load_time: Math.round(loadTime)
        })
      }
    }
  }, [componentName])

  return <>{children}</>
}

// Hook for preloading components
export const usePreloadComponent = (importFn: () => Promise<any>) => {
  const preload = React.useCallback(() => {
    importFn().catch(error => {
      console.warn('Failed to preload component:', error)
    })
  }, [importFn])

  return preload
}

// Preload admin components on hover
export const useAdminPreloader = () => {
  const preloadUserManagement = usePreloadComponent(() => import('../administration/UserManagement'))
  const preloadPermissions = usePreloadComponent(() => import('../properties/permission-management/GranularPermissionManager'))
  const preloadAuditTrail = usePreloadComponent(() => import('../properties/components/AuditTrailDashboard'))

  return {
    preloadUserManagement,
    preloadPermissions,
    preloadAuditTrail
  }
}
