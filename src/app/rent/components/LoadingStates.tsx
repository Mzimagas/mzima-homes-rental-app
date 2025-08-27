export function UnitCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="aspect-video bg-gray-200 skeleton" />
      <div className="p-6 space-y-3">
        <div className="h-4 bg-gray-200 rounded skeleton w-3/4" />
        <div className="h-6 bg-gray-200 rounded skeleton w-1/2" />
        <div className="h-3 bg-gray-200 rounded skeleton w-2/3" />
        <div className="pt-4 border-t border-gray-100">
          <div className="h-4 bg-gray-200 rounded skeleton w-1/3" />
        </div>
      </div>
    </div>
  )
}

export function UnitDetailSkeleton() {
  return (
    <div className="container py-8 animate-fadeIn">
      {/* Breadcrumb Skeleton */}
      <div className="mb-6">
        <div className="flex items-center space-x-2">
          <div className="h-4 bg-gray-200 rounded skeleton w-24" />
          <span className="text-gray-300">/</span>
          <div className="h-4 bg-gray-200 rounded skeleton w-32" />
          <span className="text-gray-300">/</span>
          <div className="h-4 bg-gray-200 rounded skeleton w-20" />
        </div>
      </div>

      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="h-8 bg-gray-200 rounded skeleton w-48 mb-2" />
            <div className="h-6 bg-gray-200 rounded skeleton w-64" />
            <div className="h-4 bg-gray-200 rounded skeleton w-56 mt-1" />
          </div>
          <div className="h-6 bg-gray-200 rounded-full skeleton w-24" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Skeleton */}
        <div className="lg:col-span-2 space-y-8">
          {/* Gallery Skeleton */}
          <div className="aspect-video bg-gray-200 rounded-xl skeleton" />

          {/* Details Skeleton */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="h-6 bg-gray-200 rounded skeleton w-32 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded skeleton w-20" />
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded skeleton w-full" />
                  <div className="h-4 bg-gray-200 rounded skeleton w-3/4" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded skeleton w-24" />
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded skeleton w-full" />
                  <div className="h-4 bg-gray-200 rounded skeleton w-2/3" />
                </div>
              </div>
            </div>
          </div>

          {/* Amenities Skeleton */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="h-6 bg-gray-200 rounded skeleton w-40 mb-6" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-gray-200 rounded-full skeleton" />
                  <div className="h-4 bg-gray-200 rounded skeleton w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center mb-6">
              <div className="h-8 bg-gray-200 rounded skeleton w-32 mx-auto mb-2" />
              <div className="h-4 bg-gray-200 rounded skeleton w-24 mx-auto" />
            </div>

            {/* Form Skeleton */}
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded skeleton w-32 mb-4" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="h-4 bg-gray-200 rounded skeleton w-20 mb-1" />
                  <div className="h-10 bg-gray-200 rounded skeleton w-full" />
                </div>
              ))}
              <div className="h-12 bg-gray-200 rounded skeleton w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'Please try again later',
  onRetry,
}: {
  title?: string
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="text-center py-12 animate-fadeIn">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-primary">
          Try Again
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  title = 'No results found',
  message = 'Try adjusting your search criteria',
  onClear,
}: {
  title?: string
  message?: string
  onClear?: () => void
}) {
  return (
    <div className="text-center py-12 animate-fadeIn">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6">{message}</p>
      {onClear && (
        <button onClick={onClear} className="btn btn-primary">
          Clear Filters
        </button>
      )}
    </div>
  )
}

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  return (
    <div className="flex items-center justify-center">
      <svg
        className={`animate-spin ${sizeClasses[size]} text-primary-600`}
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    </div>
  )
}

export function SuccessToast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 animate-slideIn">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg max-w-sm">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-green-800">{message}</p>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={onClose}
              className="text-green-400 hover:text-green-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
