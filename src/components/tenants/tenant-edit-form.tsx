"use client"

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { tenantUpdateSchema, TenantUpdateInput } from '../../lib/validation/tenant'
import supabase from '../../lib/supabase-client'

function getCsrf() {
  return document.cookie.match(/(?:^|; )csrf-token=([^;]+)/)?.[1] || ''
}

type Props = {
  id: string
  onSuccess?: () => void
}

export default function TenantEditForm({ id, onSuccess }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const form = useForm<TenantUpdateInput>({
    resolver: zodResolver(tenantUpdateSchema),
    defaultValues: { id },
  })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/tenants/${id}`, { credentials: 'same-origin' })
        const j = await res.json()
        if (!res.ok || !j.ok) throw new Error(j?.message || 'Failed to load tenant')
        form.reset({ id, ...j.data })
      } catch (e: any) {
        setError(e.message || 'Failed to load tenant')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const onSubmit = async (values: TenantUpdateInput) => {
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-csrf-token': getCsrf()
      }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

      const res = await fetch(`/api/tenants/${id}`, {
        method: 'PATCH',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify(values),
      })
      const j = await res.json()
      if (!res.ok || !j.ok) throw new Error(j?.message || 'Failed to update tenant')
      onSuccess?.()
    } catch (e: any) {
      setError(e.message || 'Failed to update tenant')
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      {error && <div className="text-red-600">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Full Name <span className="text-red-600">*</span></label>
          <input className="border rounded px-3 py-2 w-full" {...form.register('full_name')} required />
        </div>
        <div>
          <label className="block text-sm font-medium">Phone <span className="text-red-600">*</span></label>
          <input className="border rounded px-3 py-2 w-full" {...form.register('phone')} required />
        </div>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input className="border rounded px-3 py-2 w-full" {...form.register('email')} />
        </div>
        <div>
          <label className="block text-sm font-medium">National ID <span className="text-red-600">*</span></label>
          <input className="border rounded px-3 py-2 w-full" {...form.register('national_id')} required />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium">Notes</label>
          <textarea className="border rounded px-3 py-2 w-full" rows={3} {...form.register('notes')} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Emergency Contact Name</label>
          <input className="border rounded px-3 py-2 w-full" {...form.register('emergency_contact_name')} />
        </div>
        <div>
          <label className="block text-sm font-medium">Emergency Contact Phone</label>
          <input className="border rounded px-3 py-2 w-full" {...form.register('emergency_contact_phone')} />
        </div>
        <div>
          <label className="block text-sm font-medium">Emergency Contact Relationship</label>
          <input className="border rounded px-3 py-2 w-full" {...form.register('emergency_contact_relationship')} />
        </div>
        <div>
          <label className="block text-sm font-medium">Emergency Contact Email</label>
          <input className="border rounded px-3 py-2 w-full" {...form.register('emergency_contact_email')} />
        </div>
      </div>

      <div className="flex gap-2">
        <button className="bg-blue-600 text-white px-4 py-2 rounded" type="submit">Save Changes</button>
      </div>
    </form>
  )
}

