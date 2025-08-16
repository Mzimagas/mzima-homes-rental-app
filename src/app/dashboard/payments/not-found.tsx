import Link from 'next/link'

export default function PaymentsNotFound() {
  return (
    <div className="p-6">
      <div className="rounded border p-6">
        <h2 className="text-base font-semibold mb-2">Payment resource not found</h2>
        <p className="text-sm text-gray-600 mb-3">We couldn’t find the requested payment or collection.</p>
        <Link href="/dashboard/payments" className="text-blue-600 underline">Back to payments</Link>
      </div>
    </div>
  )
}

