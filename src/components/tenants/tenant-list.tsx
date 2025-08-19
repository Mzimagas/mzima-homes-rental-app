"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import supabase from '../../lib/supabase-client'
import { Property, Tenant, Unit } from '../../lib/types/database'
import { usePropertyAccess } from '../../hooks/usePropertyAccess'

function getCsrf() {
  return document.cookie.match(/(?:^|; )csrf-token=([^;]+)/)?.[1] || ''
}

type Props = {
  defaultPropertyId?: string
  showDeleted?: boolean
  hidePropertyFilters?: boolean
  onViewTenant?: (tenantId: string) => void
  onEditTenant?: (tenantId: string) => void
  onMoveTenant?: (tenantId: string, propertyId?: string) => void
  onCreateTenant?: (propertyId?: string, unitId?: string) => void
  onViewDeleted?: () => void
  onBack?: () => void
}

export default function TenantList({
  defaultPropertyId,
  showDeleted = false,
  hidePropertyFilters = false,
  onViewTenant,
  onEditTenant,
  onMoveTenant,
  onCreateTenant,
  onViewDeleted,
  onBack
}: Props) {
  const { properties: userProperties } = usePropertyAccess()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [propertyId, setPropertyId] = useState<string>(defaultPropertyId || '')
  const [unitId, setUnitId] = useState<string>('')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Use showDeleted prop instead of local state
  const [unitsById, setUnitsById] = useState<Record<string, any>>({})
  const [propertiesById, setPropertiesById] = useState<Record<string, any>>({})

  // Check if user has admin permissions (OWNER or PROPERTY_MANAGER)
  const hasAdminAccess = userProperties.some(p =>
    ['OWNER', 'PROPERTY_MANAGER'].includes(p.user_role)
  )
  const newTenantHref = useMemo(() => {
    const params = new URLSearchParams()
    if (propertyId) params.set('propertyId', propertyId)
    if (unitId) params.set('unitId', unitId)
    const qs = params.toString()
    return qs ? `/dashboard/tenants/new?${qs}` : '/dashboard/tenants/new'
  }, [propertyId, unitId])



  const loadProperties = async () => {
    setError(null)
    console.info('[TenantList] Loading accessible properties...')

    // Check authentication first
    const { data: { user } } = await supabase.auth.getUser()
    console.info('[TenantList] Current user:', user?.id)

    // Load accessible properties via RPC
    const { data: accessible, error: rpcErr } = await supabase.rpc('get_user_properties_simple')
    if (rpcErr) {
      console.error('[TenantList] RPC error:', rpcErr)
      setError(rpcErr.message || 'Failed to load accessible properties');
      return
    }

    console.info('[TenantList] Accessible properties:', accessible)
    const ids = (accessible || []).map((p: any) => (typeof p === 'string' ? p : p?.property_id)).filter(Boolean)
    console.info('[TenantList] Property IDs:', ids)

    if (ids.length === 0) {
      console.warn('[TenantList] No accessible properties found')
      setProperties([]); setPropertiesById({}); setUnitsById({});
      return
    }

    const { data, error } = await supabase.from('properties').select('id, name').in('id', ids).order('name')
    if (error) {
      console.error('[TenantList] Properties query error:', error)
      setError(error.message || 'Failed to load properties');
      return
    }

    const props = data || []
    console.info('[TenantList] Loaded properties:', props.length)
    setProperties(props)
    setPropertiesById(props.reduce((acc: any, p: any) => { acc[p.id] = p; return acc }, {}))

    // Preload all units for these properties for display mapping
    const { data: allUnits, error: unitsErr } = await supabase
      .from('units')
      .select('id, unit_label, property_id')
      .in('property_id', ids)
    if (unitsErr) {
      console.error('[TenantList] Units query error:', unitsErr)
      setError(unitsErr.message || 'Failed to load units');
      return
    }

    console.info('[TenantList] Loaded units:', allUnits?.length || 0)
    setUnitsById((allUnits || []).reduce((acc: any, u: any) => { acc[u.id] = u; return acc }, {}))
  }

  const loadUnits = async (propId: string) => {
    setUnits([])
    setUnitId('')
    if (!propId) return
    const { data, error } = await supabase.from('units').select('id, unit_label, property_id, monthly_rent_kes').eq('property_id', propId).order('unit_label')
    if (error) { setError(error.message || 'Failed to load units'); return }
    setUnits(data || [])
  }

  const loadTenants = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)

      // Apply property/unit filters regardless of hidePropertyFilters
      // hidePropertyFilters only controls UI visibility, not data filtering
      if (propertyId) params.set('propertyId', propertyId)
      if (unitId) params.set('unitId', unitId)

      // For defaultPropertyId (used in inline tenant management), apply as filter
      if (!propertyId && defaultPropertyId) {
        params.set('propertyId', defaultPropertyId)
      }

      if (showDeleted) params.set('includeDeleted', '1')

      const url = `/api/tenants?${params.toString()}`
      console.info('[TenantList] Loading tenants from:', url)
      console.info('[TenantList] Filters:', {
        q,
        propertyId: propertyId || defaultPropertyId || 'none',
        unitId: unitId || 'none',
        showDeleted,
        hidePropertyFilters,
        appliedPropertyFilter: propertyId || defaultPropertyId
      })

      const res = await fetch(url, { credentials: 'same-origin' })
      console.info('[TenantList] Response status:', res.status, res.statusText)

      const j = await res.json()
      console.info('[TenantList] Response data:', j)

      if (!res.ok || !j.ok) {
        console.error('[TenantList] API error:', j)
        throw new Error(j?.message || 'Failed to fetch tenants')
      }

      console.info('[TenantList] Setting tenants:', j.data?.length || 0, 'records')
      setTenants(j.data || [])

    } catch (e: any) {
      console.error('[TenantList] Error loading tenants:', e)
      setError(e.message || 'Failed to fetch tenants')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProperties() }, [])
  useEffect(() => { if (propertyId) loadUnits(propertyId) }, [propertyId])
  useEffect(() => { loadTenants() }, [q, propertyId, unitId, showDeleted])

  const unitOptions = useMemo(() => units.map(u => ({ value: u.id, label: u.unit_label || 'Unit' })), [units])

  const clearAllFilters = () => {
    console.info('[TenantList] Clearing all filters')
    setQ('')
    setPropertyId('')
    setUnitId('')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="border rounded px-3 py-2 w-64"
          placeholder="Search by name..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {!hidePropertyFilters && (
          <>
            <select className="border rounded px-3 py-2" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
              <option value="">All properties</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select className="border rounded px-3 py-2" value={unitId} onChange={(e) => setUnitId(e.target.value)} disabled={!propertyId}>
              <option value="">All units</option>
              {unitOptions.map(u => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
            <button
              onClick={clearAllFilters}
              className="px-3 py-2 text-sm bg-gray-100 border rounded hover:bg-gray-200"
            >
              Clear Filters
            </button>

          </>
        )}
        {hasAdminAccess && onViewDeleted && !showDeleted && (
          <button
            onClick={onViewDeleted}
            className="px-3 py-2 text-sm bg-red-100 text-red-700 border border-red-200 rounded hover:bg-red-200"
          >
            Deleted Tenants
          </button>
        )}
        {onBack && showDeleted && (
          <button
            onClick={onBack}
            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 border border-gray-200 rounded hover:bg-gray-200"
          >
            ← Back to Active Tenants
          </button>
        )}
        {onCreateTenant ? (
          <button
            onClick={() => onCreateTenant(
              hidePropertyFilters ? undefined : propertyId,
              hidePropertyFilters ? undefined : unitId
            )}
            className="ml-auto inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            New Tenant
          </button>
        ) : (
          <Link className="ml-auto inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded" href={newTenantHref}>New Tenant</Link>
        )}
      </div>

      {error && <div className="text-red-600">{error}</div>}
      {loading ? (
        <div>Loading tenants...</div>
      ) : tenants.length === 0 ? (
        <div className="text-gray-600">No tenants found.</div>
      ) : (
        <div className="overflow-x-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Current Unit</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => {
                const unit = t.current_unit_id ? unitsById[t.current_unit_id] : null
                const prop = unit ? propertiesById[unit.property_id] : null
                const unitPart = unit?.unit_label || (t.current_unit_id ? `${t.current_unit_id} (not found)` : '-')
                const propPart = unit ? (prop?.name ? ` - ${prop.name}` : '') : ''
                const isDeleted = (t as any).status === 'DELETED'
                return (
                  <tr key={t.id} className={`border-t ${isDeleted ? 'text-gray-400' : ''}`}>
                    <td className="p-2">{t.full_name}</td>
                    <td className="p-2">{(t as any).status || 'ACTIVE'}</td>
                    <td className="p-2">{unitPart}{propPart}</td>
                    <td className="p-2">
                      {isDeleted ? (
                        <span className="px-2 py-1 text-xs rounded bg-gray-100 border">DELETED</span>
                      ) : onViewTenant ? (
                        <button
                          onClick={() => onViewTenant(t.id)}
                          className="text-blue-600 hover:underline"
                        >
                          View
                        </button>
                      ) : (
                        <Link className="text-blue-600 hover:underline" href={`/dashboard/tenants/${t.id}`}>View</Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

