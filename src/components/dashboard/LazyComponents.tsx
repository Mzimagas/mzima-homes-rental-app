import { lazy, Suspense } from 'react'
import SkeletonLoader from '../ui/SkeletonLoader'

// Lazy load heavy components to improve initial bundle size
export const LazyEnhancedGlobalSearch = lazy(() => import('./EnhancedGlobalSearch'))
export const LazySearchFilters = lazy(() => import('./SearchFilters'))
export const LazyKeyboardShortcutsHelp = lazy(() => import('../../hooks/useKeyboardShortcuts').then(module => ({ default: module.KeyboardShortcutsHelp })))

// Wrapper components with loading states
export function LazyGlobalSearchWithSuspense(props: any) {
  return (
    <Suspense fallback={
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded-lg"></div>
      </div>
    }>
      <LazyEnhancedGlobalSearch {...props} />
    </Suspense>
  )
}

export function LazySearchFiltersWithSuspense(props: any) {
  return (
    <Suspense fallback={
      <div className="animate-pulse">
        <div className="h-8 w-24 bg-gray-200 rounded-md"></div>
      </div>
    }>
      <LazySearchFilters {...props} />
    </Suspense>
  )
}

export function LazyKeyboardHelpWithSuspense(props: any) {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-6">
          <SkeletonLoader variant="text" lines={5} />
        </div>
      </div>
    }>
      <LazyKeyboardShortcutsHelp {...props} />
    </Suspense>
  )
}
