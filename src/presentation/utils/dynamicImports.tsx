/**
 * Dynamic Import Utilities
 * Utilities for code splitting and lazy loading
 */

import React, { lazy, ComponentType, LazyExoticComponent } from 'react'
import dynamic from 'next/dynamic'

// Loading component for lazy imports
export const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
)

// Error boundary component for lazy imports
export const LazyErrorBoundary = ({ error, retry }: { error: Error; retry: () => void }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <div className="text-red-600 mb-4">
      <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <h3 className="text-lg font-semibold">Failed to load component</h3>
    </div>
    <p className="text-gray-600 mb-4">{error.message}</p>
    <button
      onClick={retry}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      Try Again
    </button>
  </div>
)

// Enhanced lazy loading with error handling and retry
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: {
    fallback?: ComponentType
    errorBoundary?: ComponentType<{ error: Error; retry: () => void }>
    retryAttempts?: number
    retryDelay?: number
  } = {}
): LazyExoticComponent<T> {
  const {
    fallback = LoadingSpinner,
    errorBoundary = LazyErrorBoundary,
    retryAttempts = 3,
    retryDelay = 1000
  } = options

  let attempts = 0

  const retryableImport = async (): Promise<{ default: T }> => {
    try {
      return await importFn()
    } catch (error) {
      attempts++
      
      if (attempts < retryAttempts) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempts))
        return retryableImport()
      }
      
      throw error
    }
  }

  return lazy(retryableImport)
}

// Dynamic imports for major application sections
export const DynamicComponents = {
  // Property Management
  PropertyList: dynamic(() => import('../../components/properties/components/PropertyList'), {
    loading: LoadingSpinner,
    ssr: false
  }),

  PropertyForm: dynamic(() => import('../../components/properties/property-form'), {
    loading: LoadingSpinner,
    ssr: false
  }),

  PropertyDetails: dynamic(() => import('../../components/properties/components/InlinePropertyView'), {
    loading: LoadingSpinner,
    ssr: false
  }),

  // Tenant Management
  TenantList: dynamic(() => import('../../components/tenants/tenant-list'), {
    loading: LoadingSpinner,
    ssr: false
  }),

  TenantForm: dynamic(() => import('../../components/tenants/tenant-form'), {
    loading: LoadingSpinner,
    ssr: false
  }),

  TenantDetails: dynamic(() => import('../../components/tenants/tenant-detail'), {
    loading: LoadingSpinner,
    ssr: false
  }),

  // Dashboard Components
  Dashboard: dynamic(() => import('../../components/dashboard/ResponsiveDashboardGrid'), {
    loading: LoadingSpinner,
    ssr: false
  }),

  Analytics: dynamic(() => import('../../components/reports/property-reports'), {
    loading: LoadingSpinner,
    ssr: false
  }),

  // Settings and Admin
  Settings: dynamic(() => import('../../components/notifications/notification-settings'), {
    loading: LoadingSpinner,
    ssr: false
  }),

  UserManagement: dynamic(() => import('../../components/users/ComprehensiveUserManagement'), {
    loading: LoadingSpinner,
    ssr: false
  }),

  // CQRS Debug Panel
  CQRSDebugPanel: dynamic(() => import('../../components/debug/SearchDebugPanel'), {
    loading: LoadingSpinner,
    ssr: false
  })
}

// Route-based code splitting
export const RouteComponents = {
  PropertiesPage: dynamic(() => import('../../components/properties/PropertyManagementTabs'), {
    loading: LoadingSpinner,
    ssr: true // Enable SSR for main pages
  }),

  TenantsPage: dynamic(() => import('../../components/rental-management/components/TenantManagement'), {
    loading: LoadingSpinner,
    ssr: true
  }),

  DashboardPage: dynamic(() => import('../../components/dashboard/ResponsiveDashboardGrid'), {
    loading: LoadingSpinner,
    ssr: true
  }),

  AnalyticsPage: dynamic(() => import('../../components/reports/property-reports'), {
    loading: LoadingSpinner,
    ssr: false // Analytics can be client-side only
  }),

  SettingsPage: dynamic(() => import('../../components/notifications/notification-settings'), {
    loading: LoadingSpinner,
    ssr: false
  })
}

// Feature-based code splitting
export const FeatureComponents = {
  // Property Features
  PropertySearch: dynamic(() => import('../../components/properties/components/PropertySearch'), {
    loading: LoadingSpinner,
    ssr: false
  }),

  PropertyMap: dynamic(() => import('../../components/location/ViewOnGoogleMapsButton'), {
    loading: LoadingSpinner,
    ssr: false
  }),

  PropertyReports: dynamic(() => import('../../components/reports/property-reports'), {
    loading: LoadingSpinner,
    ssr: false
  }),

  // Tenant Features
  TenantCommunication: dynamic(() => import('../../components/notifications/notification-center'), {
    loading: LoadingSpinner,
    ssr: false
  }),

  LeaseManagement: dynamic(() => import('../../components/rental-management/components/TenantManagement'), {
    loading: LoadingSpinner,
    ssr: false
  }),

  // Payment Features
  PaymentProcessing: dynamic(() => import('../../components/payments/enhanced-payment-form'), {
    loading: LoadingSpinner,
    ssr: false
  }),

  PaymentReports: dynamic(() => import('../../components/payments/payment-analytics'), {
    loading: LoadingSpinner,
    ssr: false
  }),

  // Advanced Features
  BulkOperations: dynamic(() => import('../../components/properties/components/PropertyList'), {
    loading: LoadingSpinner,
    ssr: false
  }),

  DataExport: dynamic(() => import('../../components/reports/property-reports'), {
    loading: LoadingSpinner,
    ssr: false
  }),

  AdvancedFilters: dynamic(() => import('../../components/dashboard/SearchFilters'), {
    loading: LoadingSpinner,
    ssr: false
  })
}

// Enhanced utility for preloading components with navigation optimization
export class ComponentPreloader {
  private static preloadedComponents = new Set<string>()
  private static preloadPromises = new Map<string, Promise<any>>()

  /**
   * Preload a single component
   */
  static async preload(componentName: keyof typeof DynamicComponents | keyof typeof FeatureComponents | string): Promise<void> {
    if (this.preloadedComponents.has(componentName)) {
      return
    }

    // Return existing promise if already preloading
    if (this.preloadPromises.has(componentName)) {
      return this.preloadPromises.get(componentName)
    }

    const preloadPromise = this.createPreloadPromise(componentName)
    this.preloadPromises.set(componentName, preloadPromise)

    try {
      await preloadPromise
      this.preloadedComponents.add(componentName)
      console.log(`✅ Preloaded component: ${componentName}`)
    } catch (error) {
      console.warn(`❌ Failed to preload component ${componentName}:`, error)
    } finally {
      this.preloadPromises.delete(componentName)
    }
  }

  /**
   * Preload multiple components
   */
  static async preloadMultiple(componentNames: string[]): Promise<void> {
    const promises = componentNames.map(name => this.preload(name))
    await Promise.allSettled(promises)
  }

  /**
   * Check if component is preloaded
   */
  static isPreloaded(componentName: string): boolean {
    return this.preloadedComponents.has(componentName)
  }

  /**
   * Create preload promise for a component
   */
  private static createPreloadPromise(componentName: string): Promise<any> {
    // Handle route-specific components
    switch (componentName) {
      case 'Dashboard':
        return import('../../components/dashboard/ResponsiveDashboardGrid')
      case 'PropertyList':
        return import('../../components/properties/components/PropertyList')
      case 'PropertyForm':
        return import('../../components/properties/property-form')
      case 'PropertySearch':
        return import('../../components/properties/components/PropertySearch')
      case 'TenantList':
        return import('../../components/tenants/tenant-list')
      case 'TenantForm':
        return import('../../components/tenants/tenant-form')
      case 'LeaseManagement':
        return import('../../components/rental-management/components/TenantManagement')
      case 'ExpenseTracking':
        return import('../../components/accounting/AccountingManagementTabs')
      case 'IncomeTracking':
        return import('../../components/accounting/AccountingManagementTabs')
      case 'UserManagement':
        return import('../../components/users/ComprehensiveUserManagement')
      case 'Settings':
        return import('../../components/notifications/notification-settings')
      case 'NotificationCenter':
        return import('../../components/notifications/notification-center')
      case 'Analytics':
        return import('../../components/reports/property-reports')
      case 'PropertyReports':
        return import('../../components/reports/property-reports')
      default:
        // Try to preload from existing dynamic components
        if (componentName in DynamicComponents) {
          return (DynamicComponents[componentName as keyof typeof DynamicComponents] as any).preload?.() || Promise.resolve()
        } else if (componentName in FeatureComponents) {
          return (FeatureComponents[componentName as keyof typeof FeatureComponents] as any).preload?.() || Promise.resolve()
        }
        return Promise.resolve()
    }
  }

  static async preloadMultiple(componentNames: string[]): Promise<void> {
    const promises = componentNames.map(name => this.preload(name))
    await Promise.allSettled(promises)
  }

  static async preloadByRoute(route: string): Promise<void> {
    const routePreloadMap: Record<string, string[]> = {
      '/properties': ['PropertyList', 'PropertyForm', 'PropertySearch'],
      '/tenants': ['TenantList', 'TenantForm', 'LeaseManagement'],
      '/dashboard': ['Analytics', 'PropertyReports'],
      '/settings': ['UserManagement', 'BulkOperations']
    }

    const componentsToPreload = routePreloadMap[route] || []
    await this.preloadMultiple(componentsToPreload)
  }

  static getPreloadedComponents(): string[] {
    return Array.from(this.preloadedComponents)
  }

  static clearPreloadCache() {
    this.preloadedComponents.clear()
  }
}

// Bundle size monitoring
export class BundleSizeMonitor {
  private static measurements: Array<{
    component: string
    loadTime: number
    timestamp: Date
  }> = []

  static measureComponentLoad<T>(
    componentName: string,
    loadFn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now()
    
    return loadFn().then(result => {
      const loadTime = performance.now() - startTime
      
      this.measurements.push({
        component: componentName,
        loadTime,
        timestamp: new Date()
      })

      // Log slow loads in development
      if (process.env.NODE_ENV === 'development' && loadTime > 1000) {
        console.warn(`Slow component load: ${componentName} took ${loadTime.toFixed(2)}ms`)
      }

      return result
    })
  }

  static getLoadTimes(): typeof this.measurements {
    return [...this.measurements]
  }

  static getAverageLoadTime(componentName?: string): number {
    const filtered = componentName 
      ? this.measurements.filter(m => m.component === componentName)
      : this.measurements

    if (filtered.length === 0) return 0

    const total = filtered.reduce((sum, m) => sum + m.loadTime, 0)
    return total / filtered.length
  }

  static getSlowestComponents(limit: number = 5): Array<{ component: string; averageTime: number }> {
    const componentTimes = new Map<string, number[]>()

    this.measurements.forEach(m => {
      if (!componentTimes.has(m.component)) {
        componentTimes.set(m.component, [])
      }
      componentTimes.get(m.component)!.push(m.loadTime)
    })

    const averages = Array.from(componentTimes.entries()).map(([component, times]) => ({
      component,
      averageTime: times.reduce((sum, time) => sum + time, 0) / times.length
    }))

    return averages
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, limit)
  }

  static clearMeasurements() {
    this.measurements = []
  }
}
