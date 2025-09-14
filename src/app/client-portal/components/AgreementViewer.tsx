"use client"

import { useState } from 'react'

interface AgreementViewerProps {
  propertyId: string
  propertyName: string
}

export default function AgreementViewer({ propertyId, propertyName }: AgreementViewerProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agreement, setAgreement] = useState<any | null>(null)

  const loadAgreement = async () => {
    try {
      setLoading(true)
      setError(null)
      setAgreement(null)

      // Generate (or re-generate) the latest agreement snapshot for display
      const res = await fetch('/api/clients/generate-agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ propertyId }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to load agreement')
      }

      const data = await res.json()
      setAgreement(data.agreement)
    } catch (e: any) {
      setError(e?.message || 'Failed to load agreement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">Purchase Agreement</h4>
          <p className="text-gray-600 text-sm">View the agreement you signed for {propertyName}</p>
        </div>
        <button
          onClick={() => {
            setOpen(true)
            if (!agreement) loadAgreement()
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
        >
          View Agreement
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h5 className="text-lg font-semibold">Agreement Preview</h5>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-4 max-h-[70vh] overflow-y-auto">
              {loading && <div className="text-gray-600">Loading agreement…</div>}
              {error && (
                <div className="bg-red-50 text-red-800 border border-red-200 rounded p-3 text-sm">
                  {error}
                </div>
              )}

              {!loading && !error && agreement && (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-600">Agreement ID</div>
                    <div className="font-mono text-gray-900 break-all">{agreement.agreementId}</div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-600">Generated At</div>
                    <div className="text-gray-900">
                      {new Date(agreement.generatedAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <div className="text-sm text-gray-600">Property</div>
                    <div className="text-gray-900 font-medium">{agreement.property?.name}</div>
                    <div className="text-sm text-gray-700">
                      {agreement.property?.location} • {agreement.property?.type}
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <div className="text-sm text-gray-600">Client</div>
                    <div className="text-gray-900 font-medium">{agreement.client?.fullName}</div>
                    <div className="text-sm text-gray-700">{agreement.client?.email}</div>
                    {agreement.client?.phone && (
                      <div className="text-sm text-gray-700">{agreement.client.phone}</div>
                    )}
                  </div>

                  <div className="border-t pt-3">
                    <div className="text-sm text-gray-600">Terms</div>
                    <ul className="list-disc list-inside text-gray-900 text-sm space-y-1">
                      <li>Deposit: KES {Number(agreement.terms?.depositAmount || 0).toLocaleString()}</li>
                      <li>Balance: KES {Number(agreement.terms?.balanceAmount || 0).toLocaleString()}</li>
                      <li>Payment Period: {agreement.terms?.paymentPeriodDays} days</li>
                      <li>Legal Fees Sharing: {agreement.terms?.legalFeesSharing}</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t flex items-center justify-end gap-2">
              <button
                onClick={loadAgreement}
                className="text-sm text-blue-700 hover:text-blue-800"
                disabled={loading}
              >
                Refresh
              </button>
              <button
                onClick={() => setOpen(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

