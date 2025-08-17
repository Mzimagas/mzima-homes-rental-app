"use client"

import { useEffect, useState } from 'react'
import supabase from '../../lib/supabase-client'

type Props = { agreementId: string; onSaved?: () => void }

export default function TenancyAgreementEdit({ agreementId, onSaved }: Props) {
  const [billingDay, setBillingDay] = useState<number | ''>('' as any)
  const [alignToStart, setAlignToStart] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('tenancy_agreements')
          .select('id, billing_day, align_billing_to_start')
          .eq('id', agreementId)
          .maybeSingle()
        if (error) throw error
        if (data) {
          setBillingDay((data as any).billing_day ?? '')
          setAlignToStart((data as any).align_billing_to_start ?? true)
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load agreement')
      }
    }
    load()
  }, [agreementId])

  const onSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const body: any = {
        align_billing_to_start: alignToStart
      }
      if (!alignToStart && billingDay) body.billing_day = Number(billingDay)

      const res = await fetch(`/api/tenancy-agreements/${agreementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body)
      })
      const j = await res.json()
      if (!res.ok || !j.ok) throw new Error(j?.message || 'Save failed')
      onSaved?.()
    } catch (e: any) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border rounded p-3 space-y-3">
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={alignToStart} onChange={e=>setAlignToStart(e.target.checked)} />
        <label>Align rent due date to tenancy start date</label>
      </div>
      <div>
        <label className="block text-sm">Custom Due Day (1–31)</label>
        <input type="number" min={1} max={31} value={billingDay as any} onChange={e=>setBillingDay((e.target.value as any))} disabled={alignToStart}
          className="border rounded px-2 py-1 disabled:bg-gray-100" />
        <p className="text-xs text-gray-500">If the month has fewer days, the due date clamps to the last day.</p>
      </div>
      <button onClick={onSave} disabled={saving} className="bg-blue-600 text-white px-3 py-1 rounded">
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}

