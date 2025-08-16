import Link from 'next/link'

export default function PropertiesNotFound() {
  return (
    <div className="p-6">
      <div className="rounded border p-6">
        <h2 className="text-base font-semibold mb-2">Property not found</h2>
        <p className="text-sm text-gray-600 mb-3">The property you’re looking for does not exist or you don’t have access.</p>
        <Link href="/dashboard/properties" className="text-blue-600 underline">Back to properties</Link>
      </div>
    </div>
  )
}

