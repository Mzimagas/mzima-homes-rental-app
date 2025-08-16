"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import supabase from '../../lib/supabase-client'

export default function TenantDetail({ id }: { id: string }) {
  const [data, setData] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [unitsById, setUnitsById] = useState<Record<string, any>>({})
  const [propertiesById, setPropertiesById] = useState<Record<string, any>>({})


  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tenants/${id}`, { credentials: 'same-origin' })
      const j = await res.json()
      if (!res.ok || !j.ok) throw new Error(j?.message || 'Failed to load tenant')
      setData(j.data)
      // Preload all properties and units used in agreements and current unit
      const unitIds = Array.from(new Set([
        ...(j.data?.tenancy_agreements || []).map((a: any) => a.unit_id),
        j.data?.current_unit_id,
      ].filter(Boolean)))
      if (unitIds.length) {
        const { data: unitsData, error: unitsErr } = await supabase
          .from('units')
          .select('id, unit_label, property_id')
          .in('id', unitIds as any)
        if (!unitsErr && unitsData) {
          setUnitsById((unitsData as any[]).reduce((acc: any, u: any) => { acc[u.id] = u; return acc }, {}))
          const propIds = Array.from(new Set((unitsData as any[]).map((u: any) => u.property_id).filter(Boolean)))
          if (propIds.length) {
            const { data: propsData, error: propsErr } = await supabase
              .from('properties')
              .select('id, name')
              .in('id', propIds as any)
            if (!propsErr && propsData) {
              setPropertiesById((propsData as any[]).reduce((acc: any, p: any) => { acc[p.id] = p; return acc }, {}))
            }
          }
        }
      }

    } catch (e: any) {
      setError(e.message || 'Failed to load tenant')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const onDelete = async () => {
    if (!confirm('Delete this tenant? This is a soft delete and can be reversed by admin.')) return

    const { data: { session } } = await supabase.auth.getSession()
    const csrf = document.cookie.match(/(?:^|; )csrf-token=([^;]+)/)?.[1] || ''
    const headers: Record<string, string> = { 'x-csrf-token': csrf }
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

    const res = await fetch(`/api/tenants/${id}`, {
      method: 'DELETE',
      headers,
      credentials: 'same-origin'
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || !j.ok) {
      alert(j?.message || 'Failed to delete tenant')
      return
    }
    alert('Tenant deleted')
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div className="text-red-600">{error}</div>
  if (!data) return <div className="text-red-600">Not found</div>

  const t = data
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t.full_name}</h2>
        <div className="flex gap-2">
          <Link className="px-3 py-2 rounded border" href={`/dashboard/tenants/${id}/edit`}>Edit</Link>
          <Link className="px-3 py-2 rounded border" href={`/dashboard/tenants/${id}/move`}>Move Tenant</Link>
          <button className="px-3 py-2 rounded border text-red-600" onClick={onDelete}>Delete</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-gray-500">Phone</div>
          <div>{t.phone || '-'}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Email</div>
          <div>{t.email || '-'}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Employer</div>
          <div>{t.employer || '-'}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">National ID</div>
          <div>{t.national_id || '-'}</div>
        </div>
      </div>

      <div>
        <h3 className="font-medium">Emergency Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500">Name</div>
            <div>{t.emergency_contact_name || '-'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Phone</div>
            <div>{t.emergency_contact_phone || '-'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Relationship</div>
            <div>{t.emergency_contact_relationship || '-'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Email</div>
            <div>{t.emergency_contact_email || '-'}</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-medium">Agreements</h3>
        {t.tenancy_agreements?.length ? (
          <div className="overflow-x-auto border rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">Unit</th>
                  <th className="text-left p-2">Start</th>
                  <th className="text-left p-2">End</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Monthly Rent</th>
                </tr>
              </thead>
              <tbody>
                {t.tenancy_agreements.map((a: any) => {
                  const unit = a.unit_id ? unitsById[a.unit_id] : null
                  const prop = unit ? propertiesById[unit.property_id] : null
                  const unitPart = unit?.unit_label || (a.unit_id ? `${a.unit_id} (not found)` : '-')
                  const propPart = unit ? (prop?.name ? ` - ${prop.name}` : '') : ''
                  return (
                    <tr key={a.id} className="border-t">
                      <td className="p-2">{unitPart}{propPart}</td>
                      <td className="p-2">{a.start_date}</td>
                      <td className="p-2">{a.end_date || '-'}</td>
                      <td className="p-2">{a.status}</td>
                      <td className="p-2">{a.monthly_rent_kes || '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-gray-600">No agreements.</div>
        )}
      </div>
    </div>
  )
}

