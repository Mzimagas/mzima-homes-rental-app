'use client'

import { useState } from 'react'
import { Button, Modal, TextField } from '../ui'
import { useToast } from '../ui/Toast'

export function PropertyActions({ propertyId, hasDisabledAt, onChanged, canDelete }: { propertyId: string; hasDisabledAt?: boolean; onChanged?: () => void; canDelete?: boolean }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'disable' | 'enable' | 'delete'>('disable')
  const [reason, setReason] = useState('')
  const [disableUnits, setDisableUnits] = useState(true)
  const { show } = useToast()

  async function submit() {
    try {
      const url = mode === 'disable' ? `/api/properties/${propertyId}/disable` : mode === 'enable' ? `/api/properties/${propertyId}/enable` : `/api/properties/${propertyId}`
      const method = mode === 'delete' ? 'DELETE' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': (document.cookie.match(/(?:^|; )csrf-token=([^;]+)/)?.[1] || '') },
        body: mode === 'disable' ? JSON.stringify({ reason, disableUnits }) : undefined,
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        if (j?.code === 'ACTIVE_TENANCY') show('Property has active tenancies. End them before disabling.', { variant: 'warning' })
        else if (j?.code === 'INELIGIBLE') show('Property has related records and cannot be deleted.', { variant: 'warning' })
        else if (res.status === 403) show('You do not have permission to perform this action.', { variant: 'error' })
        else show('Failed to update property', { variant: 'error' })
        return
      }
      show(mode === 'disable' ? 'Property disabled' : mode === 'enable' ? 'Property enabled' : 'Property deleted', { variant: 'success' })
      setOpen(false)
      setReason('')
      onChanged?.()
    } catch (e) {
      console.error(e)
      show('Unexpected error', { variant: 'error' })
    }
  }

  return (
    <div className="flex items-center gap-2">
      {!hasDisabledAt ? (
        <>
          <Button variant="danger" onClick={() => { setMode('disable'); setOpen(true) }}>Disable</Button>
          {canDelete && <Button variant="danger" onClick={() => { setMode('delete'); setOpen(true) }} className="ml-2">Delete permanently</Button>}
        </>
      ) : (
        <>
          <Button variant="primary" onClick={() => { setMode('enable'); setOpen(true) }}>Enable</Button>
          {canDelete && <Button variant="danger" onClick={() => { setMode('delete'); setOpen(true) }} className="ml-2">Delete permanently</Button>}
        </>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title={mode === 'disable' ? 'Disable property?' : mode === 'enable' ? 'Enable property?' : 'Delete property permanently?'}>
        {mode === 'disable' ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">This will hide the property from rentals and tenant assignment. You can re-enable later.</p>
            <TextField label="Reason (optional)" value={reason} onChange={(e:any)=>setReason(e.target.value)} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={disableUnits} onChange={(e)=>setDisableUnits(e.target.checked)} />
              Also disable all units in this property
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="danger" onClick={submit}>Disable</Button>
            </div>
          </div>
        ) : mode === 'enable' ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">This will make the property available again.</p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit}>Enable</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-700">This action cannot be undone. The property will be deleted permanently only if it has no related records (units, tenancies, maintenance tickets, payments, documents).</p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="danger" onClick={submit}>Delete permanently</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

