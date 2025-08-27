'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { tenantCreateSchema, TenantCreateInput } from '../../lib/validation/tenant'
import supabase from '../../lib/supabase-client'
import { useToast } from '../ui/Toast'

function getCsrf() {
  return document.cookie.match(/(?:^|; )csrf-token=([^;]+)/)?.[1] || ''
}

type Props = {
  defaultPropertyId?: string
  defaultUnitId?: string
  onSuccess?: (id: string) => void
  onCancel?: () => void
}

export default function TenantForm({
  defaultPropertyId,
  defaultUnitId,
  onSuccess,
  onCancel,
}: Props) {
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(defaultPropertyId || '')
  const [units, setUnits] = useState<
    { id: string; label: string; monthly_rent_kes: number | null }[]
  >([])
  const [loadingUnits, setLoadingUnits] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [propertyDefaults, setPropertyDefaults] = useState<{
    default_align_billing_to_start?: boolean
    default_billing_day?: number | null
  } | null>(null)
  const { show } = useToast()

  const form = useForm<TenantCreateInput>({
    resolver: zodResolver(tenantCreateSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      email: '',
      national_id: '',
      employer: '',
      notes: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_relationship: '',
      emergency_contact_email: '',
      current_unit_id: defaultUnitId || undefined,
      align_billing_to_start: true,
      billing_day: null as any,
    },
  })

  const unitId = form.watch('current_unit_id')

  // Load properties if not preselected via defaultPropertyId
  useEffect(() => {
    if (defaultPropertyId) return
    const loadProps = async () => {
      try {
        const { data: accessible, error: rpcErr } = await supabase.rpc('get_user_properties_simple')
        if (rpcErr) throw rpcErr
        const ids = (accessible || [])
          .map((p: any) => (typeof p === 'string' ? p : p?.property_id))
          .filter(Boolean)
        if (ids.length === 0) {
          setProperties([])
          return
        }
        const { data, error } = await supabase
          .from('properties')
          .select('id, name')
          .in('id', ids)
          .order('name')
        if (error) throw error
        setProperties(data || [])
      } catch (e: any) {
        // Don't block the form entirely; surface error inline
        setError(e.message || 'Failed to load properties')
      }
    }
    loadProps()
  }, [defaultPropertyId])

  useEffect(() => {
    const loadUnits = async () => {
      setError(null)
      setLoadingUnits(true)
      try {
        const propId = selectedPropertyId || defaultPropertyId
        if (!propId) {
          setUnits([])
          setPropertyDefaults(null)
          return
        }

        // Load property defaults
        const { data: prop, error: propErr } = await supabase
          .from('properties')
          .select('id, default_align_billing_to_start, default_billing_day')
          .eq('id', propId)
          .maybeSingle()
        if (propErr) throw propErr
        setPropertyDefaults({
          default_align_billing_to_start: (prop as any)?.default_align_billing_to_start ?? true,
          default_billing_day: (prop as any)?.default_billing_day ?? null,
        })
        ;(form as any).setValue(
          'align_billing_to_start' as any,
          (prop as any)?.default_align_billing_to_start ?? true
        )
        ;(form as any).setValue('billing_day' as any, (prop as any)?.default_billing_day ?? null)

        // Load units
        const { data, error } = await supabase
          .from('units')
          .select('id, unit_label, monthly_rent_kes')
          .eq('property_id', propId)
          .order('unit_label')
        if (error) throw error
        const mapped = (data || []).map((u: any) => ({
          id: u.id,
          label: u.unit_label || 'Unit',
          monthly_rent_kes: u.monthly_rent_kes,
        }))
        setUnits(mapped)
        // If unit is preselected, suggest monthly_rent_kes as default (overridable)
        if (defaultUnitId) {
          const sel = mapped.find((u: any) => u.id === defaultUnitId)
          if (sel?.monthly_rent_kes) {
            ;(form as any).setValue('monthly_rent_kes' as any, sel.monthly_rent_kes)
          }
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load units')
      } finally {
        setLoadingUnits(false)
      }
    }
    loadUnits()
  }, [selectedPropertyId, defaultPropertyId, defaultUnitId, form])

  // When user changes the selected unit, update the suggested monthly_rent_kes (user can override)
  useEffect(() => {
    if (!unitId) return
    const sel = units.find((u) => u.id === unitId)
    if (sel?.monthly_rent_kes) {
      ;(form as any).setValue('monthly_rent_kes' as any, sel.monthly_rent_kes)
    }
  }, [unitId, units, form])

  const onSubmit = async (values: TenantCreateInput) => {
    setError(null)
    try {
      // Normalize payload: turn empty string into null for optional UUIDs
      const normalized: any = { ...values }
      if ((normalized.current_unit_id as any) === '') normalized.current_unit_id = null

      // Include CSRF and (if available) an auth token so API can authenticate the user
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-csrf-token': getCsrf(),
      }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify(normalized),
      })
      const j = await res.json()
      if (!res.ok || !j.ok) throw new Error(j?.message || 'Failed to create tenant')
      show('Tenant created successfully', { variant: 'success' })
      onSuccess?.(j.data?.id)
      form.reset()
    } catch (e: any) {
      setError(e.message || 'Failed to create tenant')
    }
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      {error && <div className="text-red-600">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">
            Full Name <span className="text-red-600">*</span>
          </label>
          <input className="border rounded px-3 py-2 w-full" {...form.register('full_name')} />
          {form.formState.errors.full_name && (
            <p className="text-xs text-red-600 mt-1">
              {form.formState.errors.full_name.message as any}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium">
            Phone <span className="text-red-600">*</span>
          </label>
          <input className="border rounded px-3 py-2 w-full" {...form.register('phone')} />
          {form.formState.errors.phone && (
            <p className="text-xs text-red-600 mt-1">
              {form.formState.errors.phone.message as any}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium">Alternate Phone (optional)</label>
          <input
            className="border rounded px-3 py-2 w-full"
            {...form.register('alternate_phone' as any)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input className="border rounded px-3 py-2 w-full" {...form.register('email')} />
          {form.formState.errors.email && (
            <p className="text-xs text-red-600 mt-1">
              {form.formState.errors.email.message as any}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium">
            National ID <span className="text-red-600">*</span>
          </label>
          <input className="border rounded px-3 py-2 w-full" {...form.register('national_id')} />
          {form.formState.errors.national_id && (
            <p className="text-xs text-red-600 mt-1">
              {form.formState.errors.national_id.message as any}
            </p>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium">Notes</label>
          <textarea
            className="border rounded px-3 py-2 w-full"
            rows={3}
            placeholder="e.g., employer information, special requirements, etc."
            {...form.register('notes')}
          />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-800">Emergency Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Emergency Contact Name</label>
            <input
              className="border rounded px-3 py-2 w-full"
              {...form.register('emergency_contact_name')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Emergency Contact Phone</label>
            <input
              className="border rounded px-3 py-2 w-full"
              {...form.register('emergency_contact_phone')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Emergency Contact Relationship</label>
            <input
              className="border rounded px-3 py-2 w-full"
              {...form.register('emergency_contact_relationship')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Emergency Contact Email (optional)</label>
            <input
              className="border rounded px-3 py-2 w-full"
              {...form.register('emergency_contact_email')}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {!defaultPropertyId && (
          <div>
            <label className="block text-sm font-medium">Property</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={selectedPropertyId}
              onChange={(e) => {
                setSelectedPropertyId(e.target.value)
                // Reset selected unit when property changes
                ;(form as any).setValue('current_unit_id' as any, '')
              }}
            >
              <option value="">Select property</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium">Assign to Unit (optional)</label>
          <select
            className="border rounded px-3 py-2 w-full"
            disabled={!defaultPropertyId && !selectedPropertyId}
            {...form.register('current_unit_id')}
          >
            <option value="">Unassigned</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Monthly Rent (suggested)</label>
          <input
            className="border rounded px-3 py-2 w-full"
            type="number"
            step="0.01"
            {...(form.register as any)('monthly_rent_kes' as any)}
          />
          <small className="text-gray-500">
            Defaults to the selected unit's monthly_rent_kes; you can override.
          </small>
        </div>
      </div>

      {/* Billing Day Controls */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            {...form.register('align_billing_to_start')}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            defaultChecked
          />
          <label className="text-sm text-gray-700">Align rent due date to tenancy start date</label>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Custom Due Day (1–31)
          </label>
          <input
            type="number"
            min={1}
            max={31}
            {...form.register('billing_day', { valueAsNumber: true } as any)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            disabled={form.watch('align_billing_to_start')}
            placeholder="e.g., 15"
          />
          <p className="text-gray-500 text-xs mt-1">
            If the month has fewer days, the due date is set to the last day of the month.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button className="bg-blue-600 text-white px-4 py-2 rounded" type="submit">
          Create Tenant
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
