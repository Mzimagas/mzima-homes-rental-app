'use client'

import { useState } from 'react'
import {
  UtilityBalanceService,
  UtilityAccountType,
} from '../../lib/services/utility-balance-service'

export default function UtilityAccountForm({
  tenantId,
  unitId,
  onCreated,
}: {
  tenantId: string
  unitId: string
  onCreated?: () => void
}) {
  const [type, setType] = useState<UtilityAccountType>('ELECTRICITY_PREPAID')
  const [lowThreshold, setLowThreshold] = useState<number | ''>('')
  const [creditLimit, setCreditLimit] = useState<number | ''>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    setError(null)
    const { data, error } = await UtilityBalanceService.ensureAccount({
      tenantId,
      unitId,
      type,
      lowThresholdKes: lowThreshold === '' ? null : Number(lowThreshold),
      creditLimitKes: creditLimit === '' ? null : Number(creditLimit),
    })
    if (error) setError(error)
    if (!error && onCreated) onCreated()
    setSaving(false)
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm">Account Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as UtilityAccountType)}
          className="border rounded p-2 w-full"
        >
          <option value="ELECTRICITY_PREPAID">Electricity - Prepaid</option>
          <option value="ELECTRICITY_POSTPAID">Electricity - Postpaid</option>
          <option value="WATER_DIRECT_TAVEVO">Water - Direct Tavevo</option>
          <option value="WATER_INTERNAL_SUBMETER">Water - Internal Submeter</option>
        </select>
      </div>
      {type === 'ELECTRICITY_PREPAID' && (
        <div>
          <label className="block text-sm">Low Balance Threshold (KES)</label>
          <input
            type="number"
            className="border rounded p-2 w-full"
            value={lowThreshold}
            onChange={(e) => setLowThreshold(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>
      )}
      {type !== 'ELECTRICITY_PREPAID' && (
        <div>
          <label className="block text-sm">Credit Limit (KES)</label>
          <input
            type="number"
            className="border rounded p-2 w-full"
            value={creditLimit}
            onChange={(e) => setCreditLimit(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>
      )}
      <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded">
        {saving ? 'Saving...' : 'Create/Update Account'}
      </button>
      {error && <div className="text-red-600 text-sm">{error}</div>}
    </div>
  )
}
