'use client'

import { useEffect, useState } from 'react'
import { withAuth } from '../../../lib/withAuth'

function SecurityAdmin() {
  const [locks, setLocks] = useState<Array<{ key: string; ttl: number }>>([])
  const [audits, setAudits] = useState<Array<{ key: string; ttl: number }>>([])
  const [error, setError] = useState('')

  const fetchData = async () => {
    try {
      const [l, a] = await Promise.all([
        fetch('/api/admin/security/locks').then((r) => r.json()),
        fetch('/api/admin/security/audit').then((r) => r.json()),
      ])
      setLocks(l.locks || [])
      setAudits(a.audits || [])
    } catch (e) {
      setError('Failed to load metrics')
    }
  }

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Security Dashboard</h1>
      {error && <div className="text-red-600 mt-2">{error}</div>}

      <section>
        <h2 className="text-xl font-medium">Active Lockouts</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Key</th>
                <th className="text-left p-2">TTL (sec)</th>
              </tr>
            </thead>
            <tbody>
              {locks.length === 0 && (
                <tr>
                  <td className="p-2" colSpan={2}>
                    None
                  </td>
                </tr>
              )}
              {locks.map((l, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2">{l.key}</td>
                  <td className="p-2">{l.ttl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-medium">Recent Audit Keys</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Key</th>
                <th className="text-left p-2">TTL (sec)</th>
              </tr>
            </thead>
            <tbody>
              {audits.length === 0 && (
                <tr>
                  <td className="p-2" colSpan={2}>
                    None
                  </td>
                </tr>
              )}
              {audits.map((a, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2">{a.key}</td>
                  <td className="p-2">{a.ttl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default withAuth(SecurityAdmin)
