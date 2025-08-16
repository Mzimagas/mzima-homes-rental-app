import Link from 'next/link'

export default function DashboardNotFound() {
  return (
    <div className="p-6">
      <div className="rounded border p-6">
        <h2 className="text-base font-semibold mb-2">Not found</h2>
        <p className="text-sm text-gray-600 mb-3">We couldn’t find that dashboard resource.</p>
        <Link href="/dashboard" className="text-blue-600 underline">Back to dashboard</Link>
      </div>
    </div>
  )
}

