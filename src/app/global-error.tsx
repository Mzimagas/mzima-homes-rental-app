'use client'

export default function GlobalError({ 
  error, 
  reset 
}: { 
  error: Error & { digest?: string }
  reset: () => void 
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
            <div className="text-red-600 mb-4">
              <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Error</h1>
            <p className="text-gray-600 mb-6">
              A critical error occurred. Please try refreshing the page or contact support if the problem persists.
            </p>
            
            <div className="space-y-3">
              <button 
                onClick={() => reset()} 
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Try Again
              </button>
              <button 
                onClick={() => window.location.href = '/'} 
                className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Go to Home
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-6 text-left bg-gray-100 p-4 rounded-lg">
                <summary className="cursor-pointer font-semibold text-gray-800">
                  Error Details (Development Only)
                </summary>
                <div className="mt-3 space-y-2">
                  <div>
                    <strong className="text-gray-700">Message:</strong>
                    <p className="text-sm text-gray-600 mt-1">{error.message || 'No message available'}</p>
                  </div>
                  {error.digest && (
                    <div>
                      <strong className="text-gray-700">Digest:</strong>
                      <p className="text-sm text-gray-600 mt-1">{error.digest}</p>
                    </div>
                  )}
                  {error.stack && (
                    <div>
                      <strong className="text-gray-700">Stack Trace:</strong>
                      <pre className="text-xs text-gray-600 mt-1 whitespace-pre-wrap overflow-auto max-h-40 bg-white p-2 rounded border">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}
