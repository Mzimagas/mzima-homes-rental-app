import React, { useState, useEffect } from 'react'
import { Button, TextField, Select } from '../../ui'
import {
  PropertyWithLifecycle,
  SubdivisionCostEntry,
  SUBDIVISION_COST_TYPES,
  SUBDIVISION_COST_CATEGORY_LABELS,
  SubdivisionCostCategory,
} from '../types/property-management.types'
import { SubdivisionCostsService } from '../services/subdivision-costs.service'

interface PropertySubdivisionCostsProps {
  property: PropertyWithLifecycle
  onUpdate?: (propertyId: string) => void
}

interface NewSubdivisionCost {
  cost_type_id: string
  amount_kes: string
  payment_status: 'PENDING' | 'PAID' | 'PARTIALLY_PAID'
  payment_reference: string
  payment_date: string
  notes: string
}

const LS_KEYS = {
  subdivisionCosts: `subdivision-costs-collapsed-${typeof window !== 'undefined' ? window.location.pathname : ''}`,
}

export default function PropertySubdivisionCosts({
  property,
  onUpdate,
}: PropertySubdivisionCostsProps) {
  const [subdivisionCosts, setSubdivisionCosts] = useState<SubdivisionCostEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddCost, setShowAddCost] = useState(false)

  // Collapsible section state
  const [collapsedSubdivisionCosts, setCollapsedSubdivisionCosts] = useState(() => {
    try {
      return localStorage.getItem(LS_KEYS.subdivisionCosts) === 'true'
    } catch {
      return true
    }
  })

  const handleToggleSubdivisionCosts = () => {
    setCollapsedSubdivisionCosts((prev) => {
      const next = !prev
      try {
        localStorage.setItem(LS_KEYS.subdivisionCosts, String(next))
      } catch {}
      return next
    })
  }

  // New subdivision cost form state
  const [newCost, setNewCost] = useState<NewSubdivisionCost>({
    cost_type_id: '',
    amount_kes: '',
    payment_status: 'PENDING',
    payment_reference: '',
    payment_date: '',
    notes: '',
  })

  // Load existing subdivision costs
  useEffect(() => {
    loadSubdivisionCosts()
  }, [property.id])

  // Handle prefill from navigation events
  useEffect(() => {
    const lastAppliedPrefillRef = { current: '' }

    const applySubdivisionCostPrefill = (params: URLSearchParams) => {
      const subtab = params.get('subtab')
      if (subtab !== 'subdivision_costs') return

      const costTypeId = params.get('cost_type_id') || ''
      const amount = params.get('amount_kes') || ''
      const paymentDate = params.get('payment_date') || new Date().toISOString().slice(0, 10)
      const notes = params.get('notes') || ''

      console.log('🔍 PropertySubdivisionCosts applySubdivisionCostPrefill:', {
        subtab,
        costTypeId,
        amount,
        paymentDate,
        notes
      })

      // Create a stable signature for this prefill payload to avoid re-applying
      const sig = JSON.stringify({
        type: 'subdivision_cost',
        cost_type_id: costTypeId,
        amount_kes: amount,
        payment_date: paymentDate,
        notes
      })
      if (lastAppliedPrefillRef.current === sig) {
        console.log('🔍 PropertySubdivisionCosts skipping duplicate prefill')
        return
      }

      // Find the cost type to get the category
      const costType = SUBDIVISION_COST_TYPES.find(type => type.id === costTypeId)

      // Batch state updates for better performance
      requestAnimationFrame(() => {
        setCollapsedSubdivisionCosts(false)
        setShowAddCost(true)
        setNewCost((prev) => ({
          ...prev,
          cost_type_id: costTypeId,
          amount_kes: amount,
          payment_date: paymentDate,
          notes,
        }))
        lastAppliedPrefillRef.current = sig
      })
    }

    // Handle navigation events
    const navHandler = (event: CustomEvent) => {
      const detail = event.detail
      console.log('🔍 PropertySubdivisionCosts navigateToFinancial event:', detail)

      if (detail?.tabName === 'financial' && detail?.propertyId === property.id) {
        const params = new URLSearchParams()

        // Handle subdivision costs prefill
        if (detail?.subtab === 'subdivision_costs') {
          if (detail.costTypeId) params.set('cost_type_id', detail.costTypeId)
          if (typeof detail.amount === 'number') params.set('amount_kes', String(detail.amount))
          if (detail.date) params.set('payment_date', detail.date)
          if (detail.description) params.set('notes', detail.description)
          params.set('subtab', 'subdivision_costs')
          console.log('🔍 PropertySubdivisionCosts calling applySubdivisionCostPrefill with:', Object.fromEntries(params.entries()))
          applySubdivisionCostPrefill(params)
        }
      }
    }

    // Apply prefill from current URL on mount (handles race when component mounts after event)
    try {
      const url = new URL(window.location.href)
      const currentParams = url.searchParams
      const subtab = currentParams.get('subtab')
      console.log('🔍 PropertySubdivisionCosts URL prefill check:', {
        url: url.href,
        subtab,
        cost_type_id: currentParams.get('cost_type_id'),
        amount_kes: currentParams.get('amount_kes'),
        notes: currentParams.get('notes')
      })
      if (subtab === 'subdivision_costs') {
        applySubdivisionCostPrefill(currentParams)
      }
    } catch {}

    window.addEventListener('navigateToFinancial', navHandler as EventListener, { passive: true })
    return () => {
      window.removeEventListener('navigateToFinancial', navHandler as EventListener)
    }
  }, [property.id])

  const loadSubdivisionCosts = async () => {
    setInitialLoading(true)
    setError(null)

    try {
      const costs = await SubdivisionCostsService.getSubdivisionCosts(property.id)
            // Ensure we only set valid cost entries
      const validCosts = Array.isArray(costs)
        ? costs.filter(
            (cost) =>
              cost &&
              typeof cost === 'object' &&
              cost.id &&
              cost.cost_type_id &&
              typeof cost.amount_kes === 'number'
          )
        : []

            setSubdivisionCosts(validCosts)
    } catch (error) {
            setError('Failed to load subdivision costs. Please try again.')
    } finally {
      setInitialLoading(false)
    }
  }

  const handleAddSubdivisionCost = async () => {
    if (!newCost.cost_type_id || !newCost.amount_kes) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Find the cost type to get the category
      const costType = SUBDIVISION_COST_TYPES.find((type) => type.id === newCost.cost_type_id)
      if (!costType) {
        throw new Error('Invalid cost type selected')
      }

      // Create subdivision cost entry via API
      const costEntry = await SubdivisionCostsService.createSubdivisionCost(property.id, {
        cost_type_id: newCost.cost_type_id,
        cost_category: costType.category,
        amount_kes: parseFloat(newCost.amount_kes),
        payment_status: newCost.payment_status,
        payment_reference: newCost.payment_reference || undefined,
        payment_date: newCost.payment_date || undefined,
        notes: newCost.notes || undefined,
      })

      setSubdivisionCosts((prev) => [...prev, costEntry])
      setNewCost({
        cost_type_id: '',
        amount_kes: '',
        payment_status: 'PENDING',
        payment_reference: '',
        payment_date: '',
        notes: '',
      })
      setShowAddCost(false)
      onUpdate?.(property.id)
    } catch (error) {
            setError('Failed to add subdivision cost. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePaymentStatus = async (
    costId: string,
    newStatus: 'PENDING' | 'PAID' | 'PARTIALLY_PAID'
  ) => {
    setLoading(true)
    setError(null)

    try {
      const updatedCost = await SubdivisionCostsService.updateSubdivisionCost(property.id, costId, {
        payment_status: newStatus,
      })

      setSubdivisionCosts((prev) => prev.map((cost) => (cost.id === costId ? updatedCost : cost)))
      onUpdate?.(property.id)
    } catch (error) {
            setError('Failed to update payment status. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCost = async (costId: string) => {
    if (!confirm('Are you sure you want to delete this subdivision cost entry?')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      await SubdivisionCostsService.deleteSubdivisionCost(property.id, costId)
      setSubdivisionCosts((prev) => prev.filter((cost) => cost.id !== costId))
      onUpdate?.(property.id)
    } catch (error) {
            setError('Failed to delete subdivision cost. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Calculate totals
  const summary = SubdivisionCostsService.calculateSubdivisionSummary(subdivisionCosts)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (initialLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={handleToggleSubdivisionCosts}
          aria-expanded={!collapsedSubdivisionCosts}
          aria-controls={`subdivision-costs-section-${property.id}`}
          className="flex items-center space-x-2 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
        >
          <span aria-hidden="true">{collapsedSubdivisionCosts ? '▶' : '▼'}</span>
          <h4 className="text-lg font-semibold text-gray-900">Subdivision Costs</h4>
        </button>
        {!collapsedSubdivisionCosts && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddCost(true)}
            disabled={loading}
          >
            + Add Subdivision Cost
          </Button>
        )}
      </div>

      <div id={`subdivision-costs-section-${property.id}`} aria-hidden={collapsedSubdivisionCosts}>
        {!collapsedSubdivisionCosts && (
          <>
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Add Cost Form */}
            {showAddCost && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4 mb-4">
                <h5 className="font-medium text-gray-900 mb-3">Add Subdivision Cost</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cost Type
                    </label>
                    <Select
                      value={newCost.cost_type_id}
                      onChange={(e) => {
                        const selectedType = SUBDIVISION_COST_TYPES.find(
                          (type) => type.id === e.target.value
                        )
                        setNewCost((prev) => ({
                          ...prev,
                          cost_type_id: e.target.value,
                          amount_kes: selectedType?.default_amount_kes
                            ? selectedType.default_amount_kes.toString()
                            : prev.amount_kes,
                        }))
                      }}
                    >
                      <option value="">Select cost type...</option>
                      {Object.entries(SUBDIVISION_COST_CATEGORY_LABELS).map(([category, label]) => (
                        <optgroup key={category} label={label}>
                          {SUBDIVISION_COST_TYPES.filter((type) => type.category === category).map(
                            (type) => (
                              <option key={type.id} value={type.id}>
                                {type.label}
                              </option>
                            )
                          )}
                        </optgroup>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount (KES)
                    </label>
                    <TextField
                      type="number"
                      value={newCost.amount_kes}
                      onChange={(e) =>
                        setNewCost((prev) => ({ ...prev, amount_kes: e.target.value }))
                      }
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Status
                    </label>
                    <Select
                      value={newCost.payment_status}
                      onChange={(e) =>
                        setNewCost((prev) => ({ ...prev, payment_status: e.target.value as any }))
                      }
                    >
                      <option value="PENDING">Pending</option>
                      <option value="PAID">Paid</option>
                      <option value="PARTIALLY_PAID">Partially Paid</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Date (Optional)
                    </label>
                    <TextField
                      type="date"
                      value={newCost.payment_date}
                      onChange={(e) =>
                        setNewCost((prev) => ({ ...prev, payment_date: e.target.value }))
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Reference (Optional)
                    </label>
                    <TextField
                      value={newCost.payment_reference}
                      onChange={(e) =>
                        setNewCost((prev) => ({ ...prev, payment_reference: e.target.value }))
                      }
                      placeholder="Payment reference or transaction ID"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (Optional)
                    </label>
                    <TextField
                      value={newCost.notes}
                      onChange={(e) => setNewCost((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes about this cost"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-4">
                  <Button
                    variant="secondary"
                    onClick={() => setShowAddCost(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleAddSubdivisionCost} disabled={loading}>
                    {loading ? 'Adding...' : 'Add Cost'}
                  </Button>
                </div>
              </div>
            )}

            {/* Subdivision Costs List */}
            {subdivisionCosts.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No subdivision costs recorded yet</p>
            ) : (
              <div className="space-y-2 mt-4">
                {subdivisionCosts
                  .filter((cost) => cost && cost.id && cost.cost_type_id)
                  .map((cost) => (
                    <div
                      key={cost.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {SubdivisionCostsService.getCostTypeLabel(cost.cost_type_id)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {cost.payment_date &&
                            `Date: ${new Date(cost.payment_date).toLocaleDateString()}`}
                          {cost.payment_reference && ` • Ref: ${cost.payment_reference}`}
                        </div>
                        {cost.notes && (
                          <div className="text-sm text-gray-500 mt-1">{cost.notes}</div>
                        )}
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className="font-bold text-gray-900">
                            {formatCurrency(cost.amount_kes)}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${SubdivisionCostsService.getPaymentStatusColor(cost.payment_status)}`}
                            >
                              {SubdivisionCostsService.getPaymentStatusLabel(cost.payment_status)}
                            </span>
                            <Select
                              value={cost.payment_status}
                              onChange={(e) =>
                                handleUpdatePaymentStatus(cost.id, e.target.value as any)
                              }
                              className="text-xs"
                              disabled={loading}
                            >
                              <option value="PENDING">Pending</option>
                              <option value="PAID">Paid</option>
                              <option value="PARTIALLY_PAID">Partially Paid</option>
                            </Select>
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDeleteCost(cost.id)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-700"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Summary */}
            {subdivisionCosts.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h5 className="font-medium text-blue-900 mb-3">Subdivision Costs Summary</h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-blue-700">Total Costs</div>
                    <div className="font-bold text-blue-900">
                      {formatCurrency(summary.totalSubdivisionCosts)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-blue-700">Paid</div>
                    <div className="font-bold text-blue-900">
                      {formatCurrency(summary.paidSubdivisionCosts)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-blue-700">Pending</div>
                    <div className="font-bold text-blue-900">
                      {formatCurrency(summary.pendingSubdivisionCosts)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-blue-700">Items</div>
                    <div className="font-bold text-blue-900">
                      {summary.subdivisionCostCount} total
                    </div>
                  </div>
                </div>

                {/* Category Breakdown */}
                <div className="space-y-2">
                  <h6 className="font-medium text-blue-900">By Category:</h6>
                  {Object.entries(SUBDIVISION_COST_CATEGORY_LABELS).map(([category, label]) => (
                    <div key={category} className="flex justify-between items-center">
                      <span className="text-blue-700">{label}</span>
                      <span className="font-medium text-blue-900">
                        {formatCurrency(
                          summary.subdivisionCostsByCategory[category as SubdivisionCostCategory]
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
