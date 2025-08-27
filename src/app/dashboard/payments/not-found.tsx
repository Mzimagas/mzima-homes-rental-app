import Link from 'next/link'

export default function PaymentsNotFound() {
  return (
    <div className="p-6">
      <div className="rounded border p-6">
        <h2 className="text-base font-semibold mb-2">Payment resource not found</h2>
        <p className="text-sm text-gray-600 mb-3">
          We couldn’t find the requested payment or collection. Payment functionality has been moved
          to the Rental Management system.
        </p>
        <Link href="/dashboard/rental-management" className="text-blue-600 underline">
          Go to Rental Management
        </Link>
      </div>
    </div>
  )
}
