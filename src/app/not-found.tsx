import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-lg border p-6 text-center">
        <h1 className="text-lg font-semibold mb-2">Page not found</h1>
        <p className="text-sm text-gray-600 mb-4">
          The page you are looking for doesn’t exist or was moved.
        </p>
        <Link href="/" className="text-blue-600 underline">
          Go back home
        </Link>
      </div>
    </div>
  )
}
