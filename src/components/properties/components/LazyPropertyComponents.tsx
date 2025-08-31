'use client'

import React, { lazy, Suspense, ComponentType } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

// Loading components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600">Loading...</span>
  </div>
)

const LoadingCard = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
    <div className="flex items-center space-x-4 mb-4">
      <div className="w-8 h-8 bg-gray-300 rounded"></div>
      <div className="flex-1">
        <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-300 rounded w-1/2"></div>
      </div>
    </div>
    <div className="space-y-3">
      <div className="h-3 bg-gray-300 rounded"></div>
      <div className="h-3 bg-gray-300 rounded w-5/6"></div>
      <div className="h-3 bg-gray-300 rounded w-4/6"></div>
    </div>
  </div>
)

const LoadingTable = () => (
  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="h-6 bg-gray-300 rounded w-1/4 animate-pulse"></div>
    </div>
    <div className="divide-y divide-gray-200">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="px-6 py-4 animate-pulse">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gray-300 rounded"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="h-3 bg-gray-300 rounded w-1/2"></div>
            </div>
            <div className="w-20 h-8 bg-gray-300 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
)

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
    <div className="text-red-600 mb-4">
      <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <h3 className="text-lg font-medium text-red-900 mb-2">Something went wrong</h3>
    <p className="text-red-700 mb-4">{error.message}</p>
    <button
      onClick={resetErrorBoundary}
      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
    >
      Try again
    </button>
  </div>
)

// Lazy-loaded components with webpack magic comments for chunk naming and preloading
export const LazyInlinePropertyView = lazy(() =>
  import(
    /* webpackChunkName: "property-view" */
    /* webpackPreload: true */
    './InlinePropertyView'
  ).then(module => ({ default: module.default }))
)

export const LazyInlinePurchaseView = lazy(() =>
  import(
    /* webpackChunkName: "purchase-view" */
    /* webpackPrefetch: true */
    './InlinePurchaseView'
  ).then(module => ({ default: module.default }))
)

export const LazyInlineHandoverView = lazy(() =>
  import(
    /* webpackChunkName: "handover-view" */
    /* webpackPrefetch: true */
    './InlineHandoverView'
  ).then(module => ({ default: module.default }))
)

export const LazyPropertyAcquisitionFinancials = lazy(() =>
  import(
    /* webpackChunkName: "property-financials" */
    /* webpackPrefetch: true */
    './PropertyAcquisitionFinancials'
  ).then(module => ({ default: module.default }))
)

export const LazyHandoverFinancialSection = lazy(() =>
  import(
    /* webpackChunkName: "handover-financials" */
    /* webpackPrefetch: true */
    './HandoverFinancialSection'
  ).then(module => ({ default: module.default }))
)


// Temporarily disabled due to react-window import issues
// export const LazyVirtualizedPropertyList = lazy(() =>
//   import(
//     /* webpackChunkName: "virtualized-list" */
//     /* webpackPreload: true */
//     './VirtualizedPropertyList'
//   ).then(module => ({ default: module.default }))
// )

// Document management components
export const LazyDirectAdditionDocumentsV2 = lazy(() =>
  import(
    /* webpackChunkName: "direct-addition-docs" */
    /* webpackPrefetch: true */
    './DirectAdditionDocumentsV2'
  ).then(module => ({ default: module.default }))
)

export const LazyPurchasePipelineDocuments = lazy(() =>
  import(
    /* webpackChunkName: "purchase-pipeline-docs" */
    /* webpackPrefetch: true */
    './PurchasePipelineDocuments'
  ).then(module => ({ default: module.default }))
)


// Higher-order component for lazy loading with error boundary and loading states
export function withLazyLoading<P extends object>(
  LazyComponent: ComponentType<P>,
  loadingComponent: ComponentType = LoadingSpinner,
  errorComponent: ComponentType<{ error: Error; resetErrorBoundary: () => void }> = ErrorFallback
) {
  return function LazyWrapper(props: P) {
    return (
      <ErrorBoundary
        FallbackComponent={errorComponent}
        onReset={() => window.location.reload()}
      >
        <Suspense fallback={React.createElement(loadingComponent)}>
          <LazyComponent {...props} />
        </Suspense>
      </ErrorBoundary>
    )
  }
}

// Pre-configured lazy components with appropriate loading states
export const LazyInlinePropertyViewWithLoading = withLazyLoading(LazyInlinePropertyView, LoadingCard)
export const LazyInlinePurchaseViewWithLoading = withLazyLoading(LazyInlinePurchaseView, LoadingCard)
export const LazyInlineHandoverViewWithLoading = withLazyLoading(LazyInlineHandoverView, LoadingCard)
// export const LazyVirtualizedPropertyListWithLoading = withLazyLoading(LazyVirtualizedPropertyList, LoadingTable)

// Preload functions for critical components
export const preloadCriticalComponents = () => {
  // Preload components that are likely to be used soon
  import('./InlinePropertyView')
  // import('./VirtualizedPropertyList') // Temporarily disabled
}

export const preloadFinancialComponents = () => {
  import('./PropertyAcquisitionFinancials')
  import('./HandoverFinancialSection')
}

export const preloadDocumentComponents = () => {
  import('./DirectAdditionDocumentsV2')
  import('./PurchasePipelineDocuments')
}

export const preloadProgressComponents = () => {
  // no-op: handover progress preloading disabled
}

// Component registry for dynamic loading
export const componentRegistry = {
  'inline-property-view': LazyInlinePropertyViewWithLoading,
  'inline-purchase-view': LazyInlinePurchaseViewWithLoading,
  'inline-handover-view': LazyInlineHandoverViewWithLoading,
  // 'virtualized-property-list': LazyVirtualizedPropertyListWithLoading, // Temporarily disabled
  'property-financials': withLazyLoading(LazyPropertyAcquisitionFinancials, LoadingCard),
  'handover-financials': withLazyLoading(LazyHandoverFinancialSection, LoadingCard),
  'direct-addition-docs': withLazyLoading(LazyDirectAdditionDocumentsV2, LoadingCard),
  'purchase-pipeline-docs': withLazyLoading(LazyPurchasePipelineDocuments, LoadingCard),
} as const

export type ComponentKey = keyof typeof componentRegistry

// Dynamic component loader
export function DynamicComponent({ 
  component, 
  ...props 
}: { 
  component: ComponentKey 
} & Record<string, any>) {
  const Component = componentRegistry[component]
  
  if (!Component) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">Component "{component}" not found</p>
      </div>
    )
  }
  
  return <Component {...props} />
}

// Hook for preloading components based on user interaction
export function useComponentPreloader() {
  const preloadComponent = React.useCallback((componentKey: ComponentKey) => {
    switch (componentKey) {
      case 'inline-property-view':
        import('./InlinePropertyView')
        break
      case 'inline-purchase-view':
        import('./InlinePurchaseView')
        break
      case 'inline-handover-view':
        import('./InlineHandoverView')
        break
      // case 'virtualized-property-list':
      //   import('./VirtualizedPropertyList')
      //   break
      case 'property-financials':
        import('./PropertyAcquisitionFinancials')
        break
      case 'handover-financials':
        import('./HandoverFinancialSection')
        break

      case 'direct-addition-docs':
        import('./DirectAdditionDocumentsV2')
        break
      case 'purchase-pipeline-docs':
        import('./PurchasePipelineDocuments')
        break
    }
  }, [])

  const preloadOnHover = React.useCallback((componentKey: ComponentKey) => {
    return {
      onMouseEnter: () => preloadComponent(componentKey),
      onFocus: () => preloadComponent(componentKey),
    }
  }, [preloadComponent])

  return {
    preloadComponent,
    preloadOnHover,
  }
}

// Bundle size monitoring (development only)
if (process.env.NODE_ENV !== 'production') {
  // Track which components are loaded
  const loadedComponents = new Set<string>()
  
  const originalImport = window.__webpack_require__ || (() => {})
  
  // Monitor chunk loading
  if (typeof window !== 'undefined' && 'performance' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name.includes('chunk') && entry.entryType === 'navigation') {
          console.log(`Loaded chunk: ${entry.name}, Size: ${entry.transferSize} bytes`)
        }
      }
    })
    
    try {
      observer.observe({ entryTypes: ['navigation', 'resource'] })
    } catch (e) {
      // Observer not supported
    }
  }
}
