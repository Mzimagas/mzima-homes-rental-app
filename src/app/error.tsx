'use client'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md w-full bg-white shadow rounded p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900">Something went wrong</h2>
            <p className="mt-2 text-sm text-gray-600">Please try again. If the problem persists, contact support.</p>
            <div className="mt-4">
              <button onClick={() => reset()} className="px-4 py-2 bg-blue-600 text-white rounded">Try again</button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}

