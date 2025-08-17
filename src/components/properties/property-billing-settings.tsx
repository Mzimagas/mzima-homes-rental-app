"use client"

import { useEffect, useState } from 'react'
import supabase from '../../lib/supabase-client'

type Props = { propertyId: string; onChanged?: () => void }

export default function PropertyBillingSettings({ propertyId, onChanged }: Props) {
  const [defaultAlign, setDefaultAlign] = useState(true)
  const [defaultDay, setDefaultDay] = useState<number | ''>('' as any)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('id, default_align_billing_to_start, default_billing_day')
          .eq('id', propertyId)
          .maybeSingle()
        if (error) throw error
        if (data) {
          setDefaultAlign((data as any).default_align_billing_to_start ?? true)
          setDefaultDay((data as any).default_billing_day ?? '')
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load property defaults')
      }
    }
    load()
  }, [propertyId])

  const onSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const update: any = { default_align_billing_to_start: defaultAlign }
      if (!defaultAlign && defaultDay) update.default_billing_day = Number(defaultDay)

      const { error } = await supabase
        .from('properties')
        .update(update)
        .eq('id', propertyId)
      if (error) throw error
      onChanged?.()
    } catch (e: any) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow space-y-3">
      <h3 className="text-lg font-medium text-gray-900">Rent Billing Defaults</h3>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={defaultAlign} onChange={e=>setDefaultAlign(e.target.checked)} />
        <label>Align due date to tenancy start date by default</label>
      </div>
      <div>
        <label className="block text-sm">Default Due Day (1–31)</label>
        <input type="number" min={1} max={31} disabled={defaultAlign}
          value={defaultDay as any} onChange={e=>setDefaultDay((e.target.value as any))}
          className="border rounded px-2 py-1 disabled:bg-gray-100" />
        <p className="text-xs text-gray-500">If a month has fewer days, due date clamps to the last day.</p>
      </div>
      <div>
        <button onClick={onSave} disabled={saving} className="bg-blue-600 text-white px-3 py-1 rounded">
          {saving ? 'Saving…' : 'Save Defaults'}
        </button>
      </div>
    </div>
  )
}

