'use client'

import { useState } from 'react'
import { Button, Modal, TextField } from '../ui'
import { useToast } from '../ui/Toast'
import supabase from '../../lib/supabase-client'

export function PropertyActions({ propertyId, hasDisabledAt, onChanged, canDelete }: { propertyId: string; hasDisabledAt?: boolean; onChanged?: () => void; canDelete?: boolean }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'disable' | 'enable' | 'delete' | 'restore'>('disable')
  const [reason, setReason] = useState('')
  const [disableUnits, setDisableUnits] = useState(true)
  const { show } = useToast()

  async function submit() {
    try {
      const url = mode === 'disable' ? `/api/properties/${propertyId}/disable`
                : mode === 'enable' ? `/api/properties/${propertyId}/enable`
                : mode === 'restore' ? `/api/properties/${propertyId}/restore`
                : `/api/properties/${propertyId}`
      const method = mode === 'delete' ? 'DELETE' : mode === 'restore' ? 'PATCH' : 'POST'
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-csrf-token': (document.cookie.match(/(?:^|; )csrf-token=([^;]+)/)?.[1] || '')
      }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

      const res = await fetch(url, {
        method,
        headers,
        body: mode === 'disable' ? JSON.stringify({ reason, disableUnits }) : undefined,
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        if (j?.code === 'ACTIVE_TENANCY') show('Property has active tenancies. End them before disabling.', { variant: 'warning' })
        else if (j?.code === 'INELIGIBLE') show('Property has related records and cannot be deleted.', { variant: 'warning' })
        else if (res.status === 403) show('You do not have permission to perform this action.', { variant: 'error' })
        else if (mode === 'delete' && j?.message?.includes('active tenant')) show(j.message, { variant: 'warning' })
        else show(`Failed to ${mode} property${j?.message ? ': ' + j.message : ''}`, { variant: 'error' })
        return
      }
      const successMessage = mode === 'disable' ? 'Property disabled'
                           : mode === 'enable' ? 'Property enabled'
                           : mode === 'restore' ? 'Property restored'
                           : 'Property deleted'
      show(successMessage, { variant: 'success' })
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
          {canDelete && <Button variant="danger" onClick={() => { setMode('delete'); setOpen(true) }} className="ml-2">Delete</Button>}
        </>
      ) : (
        <>
          <Button variant="primary" onClick={() => { setMode('enable'); setOpen(true) }}>Enable</Button>
          <Button variant="primary" onClick={() => { setMode('restore'); setOpen(true) }} className="ml-2 bg-green-600 hover:bg-green-700">Restore</Button>
        </>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title={mode === 'disable' ? 'Disable property?' : mode === 'enable' ? 'Enable property?' : mode === 'restore' ? 'Restore property?' : 'Delete property?'}>
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
        ) : mode === 'restore' ? (
          <div className="space-y-3">
            <p className="text-sm text-green-700">This will restore the property and make it available for tenant management again.</p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} className="bg-green-600 hover:bg-green-700 text-white">Restore</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-700">This will soft delete the property. It can be restored later by administrators. The property cannot be deleted if it has active tenants.</p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="danger" onClick={submit}>Delete</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

