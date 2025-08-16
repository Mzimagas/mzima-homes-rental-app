'use client'

import { useState } from 'react'
import { Button, Modal, TextField } from '../ui'
import { useToast } from '../ui/Toast'

export function UnitActions({ unitId, isActive, onChanged }: { unitId: string; isActive: boolean; onChanged?: () => void }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'disable' | 'enable' | 'delete'>('disable')
  const [reason, setReason] = useState('')
  const { show } = useToast()

  async function submit() {
    try {
      const url = mode === 'disable' ? `/api/units/${unitId}/disable` : mode === 'enable' ? `/api/units/${unitId}/enable` : `/api/units/${unitId}`
      const method = mode === 'delete' ? 'DELETE' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': (document.cookie.match(/(?:^|; )csrf-token=([^;]+)/)?.[1] || '') },
        body: mode === 'disable' ? JSON.stringify({ reason }) : undefined,
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        if (j?.code === 'ACTIVE_TENANCY') {
          show('Unit has an active tenancy. End it before disabling.', { variant: 'warning' })
        } else if (j?.code === 'INELIGIBLE') {
          show('Unit has related records and cannot be deleted.', { variant: 'warning' })
        } else {
          show('Failed to update unit status', { variant: 'error' })
        }
        return
      }
      show(mode === 'disable' ? 'Unit disabled' : mode === 'enable' ? 'Unit enabled' : 'Unit deleted', { variant: 'success' })
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
      {isActive ? (
        <>
          <Button variant="danger" onClick={() => { setMode('disable'); setOpen(true) }}>Disable</Button>
          <Button variant="danger" onClick={() => { setMode('delete'); setOpen(true) }} className="ml-2">Delete permanently</Button>
        </>
      ) : (
        <>
          <Button variant="primary" onClick={() => { setMode('enable'); setOpen(true) }}>Enable</Button>
          <Button variant="danger" onClick={() => { setMode('delete'); setOpen(true) }} className="ml-2">Delete permanently</Button>
        </>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title={mode === 'disable' ? 'Disable unit?' : mode === 'enable' ? 'Enable unit?' : 'Delete unit permanently?'}>
        {mode === 'disable' ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">This will hide the unit from rentals and tenant assignment. You can re-enable later.</p>
            <TextField label="Reason (optional)" value={reason} onChange={(e:any)=>setReason(e.target.value)} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="danger" onClick={submit}>Disable</Button>
            </div>
          </div>
        ) : mode === 'enable' ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">This will make the unit available again.</p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit}>Enable</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-700">This action cannot be undone. The unit will be deleted permanently only if it has no related records (tenancies, maintenance tickets, or current tenants).</p>
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

