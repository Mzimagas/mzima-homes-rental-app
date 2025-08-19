'use client'

import { useState, useEffect } from 'react'
import { Button, Select } from '../../ui'
import Modal from '../../ui/Modal'
import { useToast } from '../../ui/Toast'
import { usePropertyAccess } from '../../../hooks/usePropertyAccess'
import supabase from '../../../lib/supabase-client'

interface ReverseTransferActionProps {
  propertyId: string
  sourceReferenceId?: string
  onSuccess?: () => void
  refreshTrigger?: number // Add a trigger to force refresh
  onPipelineStatusChange?: (hasIssues: boolean) => void // Callback to notify parent of pipeline status
}

export default function ReverseTransferAction({ propertyId, onSuccess, refreshTrigger, onPipelineStatusChange }: ReverseTransferActionProps) {
  const { show } = useToast()
  const { properties } = usePropertyAccess()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [pipelineProgress, setPipelineProgress] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const reasons = ['Title Recalled', 'Legal Issues', 'Documentation Problems', 'Other']

  const access = properties.find(p => p.property_id === propertyId)
  const allowed = access && ['OWNER', 'PROPERTY_MANAGER'].includes(access.user_role)

  // Fetch pipeline progress for this property
  const fetchPipelineProgress = async () => {
    try {
      setLoading(true)

      // First get the property to check its source_reference_id
      const { data: property } = await supabase
        .from('properties')
        .select('source_reference_id')
        .eq('id', propertyId)
        .single()

      console.log('Property data:', property)

      let purchase = null

      // Try to find by source_reference_id first
      if (property?.source_reference_id) {
        const { data: purchaseByRef } = await supabase
          .from('purchase_pipeline')
          .select('overall_progress, id')
          .eq('id', property.source_reference_id)
          .maybeSingle()
        purchase = purchaseByRef
        console.log('Purchase by source_reference_id:', purchase)
      }

      // If not found, try by completed_property_id
      if (!purchase) {
        const { data: purchaseByCompleted } = await supabase
          .from('purchase_pipeline')
          .select('overall_progress, id')
          .eq('completed_property_id', propertyId)
          .maybeSingle()
        purchase = purchaseByCompleted
        console.log('Purchase by completed_property_id:', purchase)
      }

      console.log('Final purchase data:', purchase)
      console.log('Pipeline progress:', purchase?.overall_progress)
      const progress = purchase?.overall_progress ?? null
      setPipelineProgress(progress)

      // Notify parent component about pipeline status
      if (onPipelineStatusChange) {
        const hasIssues = progress !== null && progress < 100
        onPipelineStatusChange(hasIssues)
      }
    } catch (error) {
      console.error('Error fetching pipeline progress:', error)
      setPipelineProgress(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (allowed) {
      fetchPipelineProgress()
    } else {
      setLoading(false)
    }
  }, [propertyId, allowed, refreshTrigger])

  // Refresh when window gains focus (user switches back to tab)
  useEffect(() => {
    if (!allowed) return

    const handleFocus = () => {
      fetchPipelineProgress()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [allowed, propertyId])

  // Also refresh when user clicks anywhere on the property card (optional)
  useEffect(() => {
    if (!allowed) return

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchPipelineProgress()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [allowed, propertyId])

  // Don't show if user doesn't have permission
  if (!allowed) return null

  // Don't show if still loading
  if (loading) return null

  // Show move button if pipeline progress is less than 100% (indicating issues)
  const showMoveButton = pipelineProgress !== null && pipelineProgress < 100

  // Always show refresh button when we have pipeline data (both for issues and for checking updates)
  const showRefreshButton = pipelineProgress !== null

  const handleSubmit = async () => {
    if (!reason) {
      show('Please select a reason for the reverse transfer', { variant: 'warning' })
      return
    }
    if (!confirmed) {
      show('Please confirm before proceeding', { variant: 'warning' })
      return
    }
    try {
      setSubmitting(true)

      // Get auth token and CSRF token
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const csrf = document.cookie.match(/(?:^|; )csrf-token=([^;]+)/)?.[1]

      if (!csrf) {
        throw new Error('CSRF token not found. Please refresh the page and try again.')
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-csrf-token': csrf,
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`/api/properties/${propertyId}/reverse-transfer`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason, notes }),
        credentials: 'same-origin',
      })
      const result = await res.json().catch(()=>({}))
      if (!res.ok || !result?.ok) throw new Error(result?.error || 'Failed to move property back to pipeline')

      show('Property moved back to Purchase Pipeline', { variant: 'success' })
      setOpen(false)

      // Trigger refresh callback if provided
      if (onSuccess) {
        setTimeout(() => {
          onSuccess()
        }, 500)
      }
    } catch (e: any) {
      show(e?.message || 'Reverse transfer failed', { variant: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!showMoveButton && !showRefreshButton) return null

  return (
    <>
      <div className="flex space-x-2">
        {showMoveButton && (
          <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
            Move to Pipeline
          </Button>
        )}

        {showRefreshButton && (
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchPipelineProgress}
            disabled={loading}
            title="Refresh pipeline status"
          >
            {loading ? '🔄' : '🔄'}
          </Button>
        )}
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Confirm Reverse Transfer">
        <div className="space-y-4">
          <div className="bg-amber-50 text-amber-800 p-3 rounded border border-amber-200 text-sm">
            <p className="font-medium">This property will be moved back to the Purchase Pipeline due to incomplete status.</p>
            <p>It will no longer appear in the Properties list until the pipeline is completed again.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <Select value={reason} onChange={(e: any) => setReason(e.target.value)}>
              <option value="">Select a reason...</option>
              {reasons.map(r => <option key={r} value={r}>{r}</option>)}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional context"
            />
          </div>

          <label className="inline-flex items-center text-sm">
            <input type="checkbox" className="mr-2" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            I understand this action will move the property back to the Purchase Pipeline
          </label>

          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="danger" onClick={handleSubmit} disabled={!confirmed || submitting}>
              {submitting ? 'Moving...' : 'Move to Pipeline'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

