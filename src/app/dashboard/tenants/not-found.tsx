import Link from 'next/link'

export default function TenantsNotFound() {
  return (
    <div className="p-6">
      <div className="rounded border p-6">
        <h2 className="text-base font-semibold mb-2">Tenant not found</h2>
        <p className="text-sm text-gray-600 mb-3">The tenant record could not be found or is inaccessible.</p>
        <Link href="/dashboard/tenants" className="text-blue-600 underline">Back to tenants</Link>
      </div>
    </div>
  )
}

