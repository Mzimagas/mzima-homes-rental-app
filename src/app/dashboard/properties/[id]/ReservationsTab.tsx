"use client"
import { useEffect, useState } from 'react'
import supabase from '../../../../lib/supabase-client'

export default function ReservationsTab({ propertyId }: { propertyId: string }) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setError(null); setLoading(true)
      try {
        const { data, error } = await supabase
          .from('reservation_requests')
          .select('id, unit_id, full_name, phone, email, preferred_move_in, status, created_at, units(unit_label)')
          .eq('property_id', propertyId)
          .order('created_at', { ascending: false })
        if (error) throw error
        setRows(data || [])
      } catch (e: any) {
        setError(e.message || 'Failed to load reservations')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [propertyId])

  const updateStatus = async (id: string, status: 'APPROVED'|'DECLINED'|'NEEDS_INFO') => {
    try {
      const { error } = await supabase.from('reservation_requests').update({ status }).eq('id', id)
      if (error) throw error
      setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    } catch (e: any) {
      alert(e.message || 'Failed to update')
    }
  }

  const convertToAgreement = async (id: string) => {
    const start_date = prompt('Enter start date (YYYY-MM-DD)')
    if (!start_date) return
    try {
      const res = await fetch(`/api/reservations/${id}/convert-to-agreement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date }),
      })
      const j = await res.json()
      if (!res.ok || !j.ok) throw new Error(j?.message || 'Failed to convert')
      alert('Agreement draft created')
    } catch (e: any) {
      alert(e.message || 'Failed to convert')
    }
  }

  if (loading) return <div>Loading…</div>
  if (error) return <div className="text-red-600">{error}</div>

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <p className="text-gray-600">No reservation requests yet.</p>
      ) : rows.map(r => (
        <div key={r.id} className="border rounded p-3 flex items-center justify-between">
          <div>
            <div className="font-medium">{r.full_name} — {r.phone} {r.email ? `• ${r.email}` : ''}</div>
            <div className="text-sm text-gray-600">Unit {r.units?.unit_label} • Preferred: {r.preferred_move_in || '—'} • {new Date(r.created_at).toLocaleString()}</div>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-xs px-2 py-1 rounded border">{r.status}</span>
            <button className="text-green-700 border px-2 py-1 rounded" onClick={() => updateStatus(r.id, 'APPROVED')}>Approve</button>
            <button className="text-yellow-700 border px-2 py-1 rounded" onClick={() => updateStatus(r.id, 'NEEDS_INFO')}>Need Info</button>
            <button className="text-red-700 border px-2 py-1 rounded" onClick={() => updateStatus(r.id, 'DECLINED')}>Decline</button>
            <button className="text-blue-700 border px-2 py-1 rounded" onClick={() => convertToAgreement(r.id)}>Convert to Agreement</button>
          </div>
        </div>
      ))}
    </div>
  )
}

