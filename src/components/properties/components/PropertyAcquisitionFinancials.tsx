import React, { useState, useEffect, memo, useMemo, useCallback, useRef } from 'react'
import { Button, TextField, Select } from '../../ui'
import {
  PropertyWithLifecycle,
  AcquisitionCostEntry,
  PaymentInstallment,
  ACQUISITION_COST_TYPES,
  ACQUISITION_COST_CATEGORY_LABELS,
  AcquisitionCostCategory,
  SUBDIVISION_COST_TYPES,
  SUBDIVISION_COST_CATEGORY_LABELS,
} from '../types/property-management.types'
import { AcquisitionFinancialsService } from '../services/acquisition-financials.service'
import EnhancedPurchasePriceManager from './EnhancedPurchasePriceManager'
import PropertySubdivisionCosts from './PropertySubdivisionCosts'

import { useToast } from '../../ui/Toast'

interface PropertyAcquisitionFinancialsProps {
  property: PropertyWithLifecycle
  onUpdate?: (propertyId: string) => void
}

interface NewCostEntry {
  cost_type_id: string
  amount_kes: string
  payment_reference: string
  payment_date: string

  notes: string
}

interface NewPaymentInstallment {
  amount_kes: string
  payment_date: string
  payment_reference: string
  payment_method: string
  notes: string
}

const PropertyAcquisitionFinancials = memo(function PropertyAcquisitionFinancials({
  property,
  onUpdate,
}: PropertyAcquisitionFinancialsProps) {
  const [costEntries, setCostEntries] = useState<AcquisitionCostEntry[]>([])
  const [paymentInstallments, setPaymentInstallments] = useState<PaymentInstallment[]>([])
  const [subdivisionCostsSummary, setSubdivisionCostsSummary] = useState({
    totalSubdivisionCosts: 0,
    paidSubdivisionCosts: 0,
    pendingSubdivisionCosts: 0,
  })
  const [totalPurchasePrice, setTotalPurchasePrice] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddCost, setShowAddCost] = useState(false)
  const [showAddPayment, setShowAddPayment] = useState(false)
  // Collapsible sections state
  const [collapsedPayments, setCollapsedPayments] = useState(true)
  const [collapsedCosts, setCollapsedCosts] = useState(true)
  const [collapsedBreakdown, setCollapsedBreakdown] = useState(false)

  const { show: showToast } = useToast()

  // Persist collapsible states in localStorage
  const LS_KEYS = {
    payments: 'acqfin:collapsed:payments',
    costs: 'acqfin:collapsed:costs',
    breakdown: 'acqfin:collapsed:breakdown',
  } as const

  useEffect(() => {
    try {
      const p = localStorage.getItem(LS_KEYS.payments)
      if (p !== null) setCollapsedPayments(p === 'true')
      const c = localStorage.getItem(LS_KEYS.costs)
      if (c !== null) setCollapsedCosts(c === 'true')
      const b = localStorage.getItem(LS_KEYS.breakdown)
      if (b !== null) setCollapsedBreakdown(b === 'true')
    } catch {}

    // Reset form states when property changes
    setShowAddCost(false)
    setShowAddPayment(false)
    setError(null)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property.id])

  const handleTogglePayments = () => {
    setCollapsedPayments((prev) => {
      const next = !prev
      try {
        localStorage.setItem(LS_KEYS.payments, String(next))
      } catch {}
      return next
    })
  }

  const handleToggleCosts = () => {
    setCollapsedCosts((prev) => {
      const next = !prev
      try {
        localStorage.setItem(LS_KEYS.costs, String(next))
      } catch {}
      return next
    })
  }

  const handleToggleBreakdown = () => {
    setCollapsedBreakdown((prev) => {
      const next = !prev
      try {
        localStorage.setItem(LS_KEYS.breakdown, String(next))
      } catch {}
      return next
    })
  }

  // New cost entry form state
  const [newCost, setNewCost] = useState<NewCostEntry>({
    cost_type_id: '',
    amount_kes: '',
    payment_reference: '',
    payment_date: '',
    notes: '',
  })
  // Track last applied prefill to avoid overwriting after a successful add
  const lastAppliedPrefillRef = useRef<string | null>(null)


  // Optimized prefill with debounced event handling and memory leak prevention
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null

    const applyPrefillFromParams = (params: URLSearchParams) => {
      const subtab = params.get('subtab')
      console.log('🔍 PropertyAcquisitionFinancials applyPrefillFromParams:', {
        subtab,
        cost_type_id: params.get('cost_type_id'),
        amount_kes: params.get('amount_kes'),
        notes: params.get('notes'),
        allParams: Object.fromEntries(params.entries())
      })

      // Handle both acquisition_costs and subdivision_costs subtabs
      if (subtab !== 'acquisition_costs' && subtab !== 'subdivision_costs') return

      let cost_type_id = params.get('cost_type_id') || ''

      // If this is a subdivision_costs subtab, prefix the cost type ID
      if (subtab === 'subdivision_costs' && cost_type_id && !cost_type_id.startsWith('subdivision_')) {
        cost_type_id = `subdivision_${cost_type_id}`
      }

      // Create a stable signature for this prefill payload to avoid re-applying
      const sig = JSON.stringify({
        type: 'cost',
        cost_type_id,
        amount_kes: params.get('amount_kes') || '',
        payment_date: params.get('payment_date') || new Date().toISOString().slice(0, 10),
        notes: params.get('notes') || ''
      })
      if (lastAppliedPrefillRef.current === sig) {
        console.log('🔍 PropertyAcquisitionFinancials skipping duplicate prefill')
        return
      }

      const amount_kes = params.get('amount_kes') || ''
      const payment_date = params.get('payment_date') || new Date().toISOString().slice(0, 10)
      const notes = params.get('notes') || ''

      // Batch state updates for better performance
      requestAnimationFrame(() => {
        setCollapsedCosts(false)
        setShowAddCost(true)
        setNewCost((prev) => ({
          ...prev,
          cost_type_id,
          amount_kes,
          payment_date,
          notes,
        }))
        lastAppliedPrefillRef.current = sig
      })
    }

    // Apply prefill from URL parameters for payment installments
    const applyPaymentPrefillFromParams = (params: URLSearchParams) => {
      const subtab = params.get('subtab')
      if (subtab !== 'payments') return

      // Create a stable signature for this prefill payload to avoid re-applying
      const sig = JSON.stringify({
        type: 'payment',
        amount_kes: params.get('payment_amount_kes') || '',
        payment_date: params.get('payment_date') || new Date().toISOString().slice(0, 10),
        notes: params.get('payment_notes') || ''
      })
      if (lastAppliedPrefillRef.current === sig) return

      const amount_kes = params.get('payment_amount_kes') || ''
      const payment_date = params.get('payment_date') || new Date().toISOString().slice(0, 10)
      const notes = params.get('payment_notes') || ''

      if (amount_kes || payment_date || notes) {
        // Batch state updates for better performance
        requestAnimationFrame(() => {
          setCollapsedPayments(false)
          setShowAddPayment(true)
          setNewPayment((prev) => ({
            ...prev,
            amount_kes,
            payment_date,
            notes,
          }))
          lastAppliedPrefillRef.current = sig
        })
      }
    }

    // Debounced navigation handler to prevent excessive updates
    const navHandler = (event: Event) => {
      if (timeoutId) clearTimeout(timeoutId)

      timeoutId = setTimeout(() => {
        const e = event as CustomEvent<any>
        const detail = e.detail || {}
        console.log('🔍 PropertyAcquisitionFinancials navHandler received:', {
          tabName: detail?.tabName,
          propertyId: detail?.propertyId,
          subtab: detail?.subtab,
          costTypeId: detail?.costTypeId,
          amount: detail?.amount,
          description: detail?.description,
          matchesProperty: detail?.propertyId === property.id
        })

        if (detail?.tabName === 'financial' && detail?.propertyId === property.id) {
          const params = new URLSearchParams()

          // Handle acquisition costs prefill
          if (detail?.subtab === 'acquisition_costs') {
            if (detail.costTypeId) params.set('cost_type_id', detail.costTypeId)
            if (typeof detail.amount === 'number') params.set('amount_kes', String(detail.amount))
            if (detail.date) params.set('payment_date', detail.date)
            if (detail.description) params.set('notes', detail.description)
            params.set('subtab', 'acquisition_costs')
            console.log('🔍 PropertyAcquisitionFinancials calling applyPrefillFromParams with:', Object.fromEntries(params.entries()))
            applyPrefillFromParams(params)
          }

          // Handle subdivision costs prefill
          else if (detail?.subtab === 'subdivision_costs') {
            if (detail.costTypeId) params.set('cost_type_id', detail.costTypeId)
            if (typeof detail.amount === 'number') params.set('amount_kes', String(detail.amount))
            if (detail.date) params.set('payment_date', detail.date)
            if (detail.description) params.set('notes', detail.description)
            params.set('subtab', 'subdivision_costs')
            console.log('🔍 PropertyAcquisitionFinancials calling applyPrefillFromParams for subdivision with:', Object.fromEntries(params.entries()))
            applyPrefillFromParams(params)
          }

          // Handle payment installments prefill
          else if (detail?.subtab === 'payments') {
            if (typeof detail.amount === 'number')
              params.set('payment_amount_kes', String(detail.amount))
            if (detail.date) params.set('payment_date', detail.date)
            if (detail.description) params.set('payment_notes', detail.description)
            params.set('subtab', 'payments')
            applyPaymentPrefillFromParams(params)
          }
        }
      }, 100) // 100ms debounce
    }

    // Apply from current URL on mount
    try {
      const params = new URLSearchParams(window.location.search)
      applyPrefillFromParams(params)
      applyPaymentPrefillFromParams(params)
    } catch {}

    // Add optimized event listeners
    window.addEventListener('navigateToFinancial', navHandler as EventListener, { passive: true })

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      window.removeEventListener('navigateToFinancial', navHandler as EventListener)
    }
  }, [property.id])

  // New payment installment form state
  const [newPayment, setNewPayment] = useState<NewPaymentInstallment>({
    amount_kes: '',
    payment_date: '',
    payment_reference: '',
    payment_method: '',
    notes: '',
  })

  // Load existing financial data
  useEffect(() => {
    loadFinancialData()
    loadSubdivisionCostsSummary()
  }, [property.id])

  const loadFinancialData = async () => {
    setInitialLoading(true)
    setError(null)

    try {
      // Load financial data from API
      const { costs, payments } = await AcquisitionFinancialsService.loadAllFinancialData(
        property.id
      )

      setCostEntries(costs)
      setPaymentInstallments(payments)

      // Set purchase price from property data
      setTotalPurchasePrice(property.purchase_price_agreement_kes?.toString() || '')
    } catch (error) {
      // Check if it's a database schema issue (migration not applied)
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('403') || errorMessage.includes('Not allowed')) {
        setError(
          'You do not have access to financial data for this property. Please ensure you have the correct permissions.'
        )
        // Set empty data for now
        setCostEntries([])
        setPaymentInstallments([])
        setTotalPurchasePrice('')
      } else if (
        errorMessage.includes('404') ||
        (errorMessage.includes('column') && errorMessage.includes('does not exist'))
      ) {
        setError(
          'Database migration required. Please apply the acquisition financials migration to enable this feature.'
        )
        // Set empty data for now
        setCostEntries([])
        setPaymentInstallments([])
        setTotalPurchasePrice('')
      } else {
        setError('Failed to load financial data. Please try again.')
      }
    } finally {
      setInitialLoading(false)
    }
  }

  const loadSubdivisionCostsSummary = async () => {
    try {
      // Import the service dynamically to avoid circular dependencies
      const { SubdivisionCostsService } = await import('../services/subdivision-costs.service')
      const costs = await SubdivisionCostsService.getSubdivisionCosts(property.id)
      const summary = SubdivisionCostsService.calculateSubdivisionSummary(costs)

      setSubdivisionCostsSummary({
        totalSubdivisionCosts: summary.totalSubdivisionCosts,
        paidSubdivisionCosts: summary.paidSubdivisionCosts,
        pendingSubdivisionCosts: summary.pendingSubdivisionCosts,
      })
    } catch (error) {
      // Don't set error state for subdivision costs as they're optional
    }
  }

  // Calculate totals
  const calculateTotals = () => {
    const totalCosts = costEntries.reduce((sum, entry) => sum + entry.amount_kes, 0)
    const totalPayments = paymentInstallments.reduce((sum, payment) => sum + payment.amount_kes, 0)
    const purchasePrice = parseFloat(totalPurchasePrice) || 0
    const remainingBalance = purchasePrice - totalPayments

    // Calculate costs by category
    const costsByCategory: Record<AcquisitionCostCategory, number> = {
      PRE_PURCHASE: 0,
      AGREEMENT_LEGAL: 0,
      LCB_PROCESS: 0,
      PAYMENTS: totalPayments,
      TRANSFER_REGISTRATION: 0,
      OTHER: 0,
    }

    costEntries.forEach((entry) => {
      const costType = ACQUISITION_COST_TYPES.find((type) => type.id === entry.cost_type_id)
      if (costType) {
        costsByCategory[costType.category] += entry.amount_kes
      }
    })

    return {
      totalCosts,
      totalPayments,
      purchasePrice,
      remainingBalance,
      totalAcquisitionCost:
        totalCosts + purchasePrice + subdivisionCostsSummary.totalSubdivisionCosts,
      totalSubdivisionCosts: subdivisionCostsSummary.totalSubdivisionCosts,
      paidSubdivisionCosts: subdivisionCostsSummary.paidSubdivisionCosts,
      pendingSubdivisionCosts: subdivisionCostsSummary.pendingSubdivisionCosts,
      costsByCategory,
    }
  }

  const handleAddCost = async () => {
    if (!newCost.cost_type_id || !newCost.amount_kes) return

    setLoading(true)
    setError(null)

    try {
      // Check if this is a subdivision cost type
      if (newCost.cost_type_id.startsWith('subdivision_')) {
        // Handle subdivision cost
        const subdivisionCostTypeId = newCost.cost_type_id.replace('subdivision_', '')
        const subdivisionCostType = SUBDIVISION_COST_TYPES.find((type) => type.id === subdivisionCostTypeId)

        if (!subdivisionCostType) {
          throw new Error('Invalid subdivision cost type selected')
        }

        // Import subdivision service dynamically
        const { SubdivisionCostsService } = await import('../services/subdivision-costs.service')

        // Create subdivision cost entry
        const subdivisionCostEntry = await SubdivisionCostsService.createSubdivisionCost(property.id, {
          cost_type_id: subdivisionCostTypeId,
          cost_category: subdivisionCostType.category,
          amount_kes: parseFloat(newCost.amount_kes),
          payment_status: 'PAID',
          payment_reference: newCost.payment_reference || undefined,
          payment_date: newCost.payment_date || new Date().toISOString().split('T')[0],
          notes: newCost.notes || undefined,
        })

        // Update subdivision costs summary
        await handleSubdivisionCostsUpdate(property.id)

        showToast('Subdivision cost added successfully', { variant: 'success' })
      } else {
        // Handle regular acquisition cost
        const costType = ACQUISITION_COST_TYPES.find((type) => type.id === newCost.cost_type_id)
        if (!costType) {
          throw new Error('Invalid cost type selected')
        }

        // Create cost entry via API
        const costEntry = await AcquisitionFinancialsService.createAcquisitionCost(property.id, {
          cost_type_id: newCost.cost_type_id,
          cost_category: costType.category,
          amount_kes: parseFloat(newCost.amount_kes),
          payment_reference: newCost.payment_reference || undefined,
          payment_date: newCost.payment_date || undefined,
          notes: newCost.notes || undefined,
        })

        setCostEntries((prev) => [...prev, costEntry])
        showToast('Cost added successfully', { variant: 'success' })
      }
      setNewCost({
        cost_type_id: '',
        amount_kes: '',
        payment_reference: '',
        payment_date: '',
        notes: '',
      })
      // Clear any stale URL params for prefill to avoid re-filling the form after success
      try {
        const url = new URL(window.location.href)
        url.searchParams.delete('subtab')
        url.searchParams.delete('cost_type_id')
        url.searchParams.delete('amount_kes')
        url.searchParams.delete('payment_date')
        url.searchParams.delete('notes')
        window.history.replaceState({}, '', url.toString())
      } catch {}

      setShowAddCost(false)
      onUpdate?.(property.id)

      // Refresh data from server to ensure consistency
      setTimeout(async () => {
        await loadFinancialData()
        // Attempt to scroll to costs section
        const section = document.getElementById(`costs-section-${property.id}`)
        if (section && section.scrollIntoView) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 300)
    } catch (error) {
      setError('Failed to add cost entry. Please try again.')
    } finally {
      setLoading(false)
      // After add completes, clear prefill signature so new navigations can re-apply
      lastAppliedPrefillRef.current = null
    }
  }

  const handleAddPayment = async () => {
    if (!newPayment.amount_kes) return

    setLoading(true)
    setError(null)

    try {
      // Create payment installment via API
      const payment = await AcquisitionFinancialsService.createPaymentInstallment(property.id, {
        amount_kes: parseFloat(newPayment.amount_kes),
        payment_date: newPayment.payment_date || undefined,
        payment_reference: newPayment.payment_reference || undefined,
        payment_method: newPayment.payment_method || undefined,
        notes: newPayment.notes || undefined,
      })

      setPaymentInstallments((prev) => [...prev, payment])
      setNewPayment({
        amount_kes: '',
        payment_date: '',
        payment_reference: '',
        payment_method: '',
        notes: '',
      })
      setShowAddPayment(false)
      onUpdate?.(property.id)

      // Successful add toast and auto-scroll to the payments section
      showToast('Payment added successfully', { variant: 'success' })

      // Refresh data and scroll
      setTimeout(async () => {
        await loadFinancialData()
        const section = document.getElementById(`payments-section-${property.id}`)
        if (section && section.scrollIntoView) section.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 300)
    } catch (error) {
      setError('Failed to add payment installment. Please try again.')
    } finally {
      setLoading(false)
      // Clear payment prefill URL params so the form doesn't re-populate
      try {
        const url = new URL(window.location.href)
        url.searchParams.delete('subtab')
        url.searchParams.delete('payment_amount_kes')
        url.searchParams.delete('payment_date')
        url.searchParams.delete('payment_notes')
        window.history.replaceState({}, '', url.toString())
      } catch {}
      lastAppliedPrefillRef.current = null
    }
  }

  const handleDeleteCost = async (costId: string) => {
    if (!confirm('Are you sure you want to delete this cost entry?')) return

    setLoading(true)
    setError(null)

    try {
      await AcquisitionFinancialsService.deleteAcquisitionCost(property.id, costId)
      setCostEntries((prev) => prev.filter((entry) => entry.id !== costId))
      onUpdate?.(property.id)

      // Refresh data from server to ensure consistency
      setTimeout(() => {
        loadFinancialData()
      }, 500)
    } catch (error) {
      setError('Failed to delete cost entry. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Are you sure you want to delete this payment?')) return

    setLoading(true)
    setError(null)

    try {
      await AcquisitionFinancialsService.deletePaymentInstallment(property.id, paymentId)
      // Reload payment installments to get updated installment numbers
      const { payments } = await AcquisitionFinancialsService.loadAllFinancialData(property.id)
      setPaymentInstallments(payments)
      onUpdate?.(property.id)
    } catch (error) {
      setError('Failed to delete payment installment. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString()}`
  }

  const getCostTypeLabel = (costTypeId: string) => {
    // Check if it's a subdivision cost type
    if (costTypeId.startsWith('subdivision_')) {
      const subdivisionCostTypeId = costTypeId.replace('subdivision_', '')
      return SUBDIVISION_COST_TYPES.find((type) => type.id === subdivisionCostTypeId)?.label || 'Unknown Subdivision Cost'
    }
    return ACQUISITION_COST_TYPES.find((type) => type.id === costTypeId)?.label || 'Unknown'
  }

  // Handle subdivision costs updates
  const handleSubdivisionCostsUpdate = async (propertyId: string) => {
    try {
      // Import the service dynamically to avoid circular dependencies
      const { SubdivisionCostsService } = await import('../services/subdivision-costs.service')
      const costs = await SubdivisionCostsService.getSubdivisionCosts(propertyId)
      const summary = SubdivisionCostsService.calculateSubdivisionSummary(costs)

      setSubdivisionCostsSummary({
        totalSubdivisionCosts: summary.totalSubdivisionCosts,
        paidSubdivisionCosts: summary.paidSubdivisionCosts,
        pendingSubdivisionCosts: summary.pendingSubdivisionCosts,
      })

      onUpdate?.(propertyId)
    } catch (error) {}
  }

  const totals = calculateTotals()

  // Show loading state during initial data load
  if (initialLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading financial data...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div
          className={`border rounded-lg p-4 ${
            error.includes('migration') ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-center">
            <span
              className={`mr-2 ${error.includes('migration') ? 'text-blue-600' : 'text-red-600'}`}
            >
              {error.includes('migration') ? 'ℹ️' : '⚠️'}
            </span>
            <div className="flex-1">
              <span className={`${error.includes('migration') ? 'text-blue-800' : 'text-red-800'}`}>
                {error}
              </span>
              {error.includes('migration') && (
                <div className="mt-2 text-sm text-blue-700">
                  <p>To enable the acquisition cost tracking feature:</p>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>
                      Apply the database migration:{' '}
                      <code className="bg-blue-100 px-1 rounded">supabase db push</code>
                    </li>
                    <li>Or run the SQL migration in your Supabase dashboard</li>
                  </ol>
                </div>
              )}
            </div>
            <button
              onClick={() => setError(null)}
              className={`ml-2 ${
                error.includes('migration')
                  ? 'text-blue-600 hover:text-blue-800'
                  : 'text-red-600 hover:text-red-800'
              }`}
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {/* Enhanced Purchase Price Management */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-lg font-semibold text-blue-900 mb-3">
          Purchase Price in Sales Agreement
        </h4>
        <EnhancedPurchasePriceManager
          propertyId={property.id}
          initialPrice={property.purchase_price_agreement_kes ?? null}
          onPriceUpdate={(newPrice) => {
            setTotalPurchasePrice(newPrice.toString())
            onUpdate?.(property.id)
          }}
        />
      </div>

      {/* Financial Summary */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="text-lg font-semibold text-green-900 mb-3">Financial Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <div>
            <div className="text-sm text-green-700">Agreement Price</div>
            <div className="font-bold text-green-900">{formatCurrency(totals.purchasePrice)}</div>
          </div>
          <div>
            <div className="text-sm text-green-700">Acquisition Costs</div>
            <div className="font-bold text-green-900">{formatCurrency(totals.totalCosts)}</div>
          </div>
          <div>
            <div className="text-sm text-green-700">Subdivision Costs</div>
            <div className="font-bold text-green-900">
              {formatCurrency(totals.totalSubdivisionCosts)}
            </div>
          </div>
          <div>
            <div className="text-sm text-green-700">Paid Purchase Price</div>
            <div className="font-bold text-green-900">{formatCurrency(totals.totalPayments)}</div>
          </div>
          <div>
            <div className="text-sm text-green-700">Purchase Price Balance</div>
            <div className="font-bold text-green-900">
              {formatCurrency(totals.remainingBalance)}
            </div>
          </div>
        </div>
        <div className="border-t border-green-200 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-green-900">Total Investment</span>
            <span className="text-xl font-bold text-green-900">
              {formatCurrency(totals.totalAcquisitionCost)}
            </span>
          </div>
          <div className="text-sm text-green-700 mt-1">
            Purchase Price + Acquisition Costs + Subdivision Costs
          </div>
        </div>
      </div>

      {/* Purchase Price Deposit and Installments */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={handleTogglePayments}
            aria-expanded={!collapsedPayments}
            aria-controls={`payments-section-${property.id}`}
            className="flex items-center space-x-2 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            <span aria-hidden="true">{collapsedPayments ? '▶' : '▼'}</span>
            <h4 className="text-lg font-semibold text-gray-900">
              Purchase Price Deposit and Installments
            </h4>
          </button>
          {!collapsedPayments && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddPayment(true)}
              disabled={loading}
            >
              + Add Deposit/Installment
            </Button>
          )}
        </div>

        <div id={`payments-section-${property.id}`} aria-hidden={collapsedPayments}>
          {!collapsedPayments && (
            <>
              {/* Add Payment Form */}
              {showAddPayment && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4 mb-4">
                  <h5 className="font-medium text-gray-900 mb-3">
                    Add Deposit/Installment Payment
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount (KES)
                      </label>
                      <TextField
                        type="number"
                        value={newPayment.amount_kes}
                        onChange={(e) =>
                          setNewPayment((prev) => ({ ...prev, amount_kes: e.target.value }))
                        }
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Date (Optional)
                      </label>
                      <TextField
                        type="date"
                        value={newPayment.payment_date}
                        onChange={(e) =>
                          setNewPayment((prev) => ({ ...prev, payment_date: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Reference (Optional)
                      </label>
                      <TextField
                        value={newPayment.payment_reference}
                        onChange={(e) =>
                          setNewPayment((prev) => ({ ...prev, payment_reference: e.target.value }))
                        }
                        placeholder="Transaction/receipt number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Method (Optional)
                      </label>
                      <Select
                        value={newPayment.payment_method}
                        onChange={(e) =>
                          setNewPayment((prev) => ({ ...prev, payment_method: e.target.value }))
                        }
                      >
                        <option value="">Select method...</option>
                        <option value="CASH">Cash</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="MOBILE_MONEY">Mobile Money</option>
                        <option value="OTHER">Other</option>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes (Optional)
                      </label>
                      <TextField
                        value={newPayment.notes}
                        onChange={(e) =>
                          setNewPayment((prev) => ({ ...prev, notes: e.target.value }))
                        }
                        placeholder="Additional notes about this payment"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowAddPayment(false)}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleAddPayment}
                      disabled={loading || !newPayment.amount_kes}
                    >
                      {loading ? 'Adding...' : 'Add Deposit/Installment'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Payment Installments List */}
              {paymentInstallments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No deposits or installments recorded yet
                </p>
              ) : (
                <div className="space-y-2 mt-4">
                  {paymentInstallments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          Installment #{payment.installment_number}
                        </div>
                        <div className="text-sm text-gray-600">
                          {payment.payment_date &&
                            `Date: ${new Date(payment.payment_date).toLocaleDateString()}`}
                          {payment.payment_method && ` • Method: ${payment.payment_method}`}
                          {payment.payment_reference && ` • Ref: ${payment.payment_reference}`}
                        </div>
                        {payment.notes && (
                          <div className="text-sm text-gray-500 mt-1">{payment.notes}</div>
                        )}
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="font-bold text-gray-900">
                          {formatCurrency(payment.amount_kes)}
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDeletePayment(payment.id)}
                          disabled={loading}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Acquisition Costs */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={handleToggleCosts}
            aria-expanded={!collapsedCosts}
            aria-controls={`costs-section-${property.id}`}
            className="flex items-center space-x-2 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            <span aria-hidden="true">{collapsedCosts ? '▶' : '▼'}</span>
            <h4 className="text-lg font-semibold text-gray-900">Acquisition Costs</h4>
          </button>
          {!collapsedCosts && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddCost(true)}
              disabled={loading}
            >
              + Add Cost
            </Button>
          )}
        </div>

        <div id={`costs-section-${property.id}`} aria-hidden={collapsedCosts}>
          {!collapsedCosts && (
            <>
              {/* Add Cost Form */}
              {showAddCost && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4 mb-4">
                  <h5 className="font-medium text-gray-900 mb-3">Add New Cost</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cost Type
                      </label>
                      <Select
                        value={newCost.cost_type_id}
                        onChange={(e) =>
                          setNewCost((prev) => ({ ...prev, cost_type_id: e.target.value }))
                        }
                      >
                        <option value="">Select cost type...</option>
                        {/* Acquisition Cost Categories */}
                        {Object.entries(ACQUISITION_COST_CATEGORY_LABELS).map(
                          ([category, label]) => (
                            <optgroup key={category} label={label}>
                              {ACQUISITION_COST_TYPES.filter(
                                (type) => type.category === category
                              ).map((type) => (
                                <option key={type.id} value={type.id}>
                                  {type.label}
                                </option>
                              ))}
                            </optgroup>
                          )
                        )}
                        {/* Subdivision Costs Section */}
                        <optgroup label="Subdivision Costs">
                          {SUBDIVISION_COST_TYPES.filter(type =>
                            ['search_fee', 'lcb_normal_fee', 'lcb_special_fee', 'mutation_drawing', 'beaconing', 'new_title_registration'].includes(type.id)
                          ).map((type) => (
                            <option key={`subdivision_${type.id}`} value={`subdivision_${type.id}`}>
                              {type.label}
                            </option>
                          ))}
                        </optgroup>
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
                        Payment Reference (Optional)
                      </label>
                      <TextField
                        value={newCost.payment_reference}
                        onChange={(e) =>
                          setNewCost((prev) => ({ ...prev, payment_reference: e.target.value }))
                        }
                        placeholder="Receipt/reference number"
                      />
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
                        Notes (Optional)
                      </label>
                      <TextField
                        value={newCost.notes}
                        onChange={(e) => setNewCost((prev) => ({ ...prev, notes: e.target.value }))}
                        placeholder="Additional notes about this cost"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowAddCost(false)}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleAddCost}
                      disabled={loading || !newCost.cost_type_id || !newCost.amount_kes}
                    >
                      {loading ? 'Adding...' : 'Add Cost'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Cost Entries List */}
              {costEntries.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No costs recorded yet</p>
              ) : (
                <div className="space-y-2 mt-4">
                  {costEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {getCostTypeLabel(entry.cost_type_id)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {entry.payment_date &&
                            `Date: ${new Date(entry.payment_date).toLocaleDateString()}`}
                          {entry.payment_reference && ` • Ref: ${entry.payment_reference}`}
                        </div>
                        {entry.notes && (
                          <div className="text-sm text-gray-500 mt-1">{entry.notes}</div>
                        )}
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="font-bold text-gray-900">
                          {formatCurrency(entry.amount_kes)}
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDeleteCost(entry.id)}
                          disabled={loading}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Subdivision Costs */}
      <PropertySubdivisionCosts property={property} onUpdate={handleSubdivisionCostsUpdate} />

      {/* Cost Breakdown by Category */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={handleToggleBreakdown}
            aria-expanded={!collapsedBreakdown}
            aria-controls={`breakdown-section-${property.id}`}
            className="flex items-center space-x-2 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            <span aria-hidden="true">{collapsedBreakdown ? '▶' : '▼'}</span>
            <h4 className="text-lg font-semibold text-gray-900">Cost Breakdown by Category</h4>
          </button>
        </div>
        <div id={`breakdown-section-${property.id}`} aria-hidden={collapsedBreakdown}>
          {!collapsedBreakdown && (
            <div className="space-y-3 mt-4">
              {Object.entries(ACQUISITION_COST_CATEGORY_LABELS).map(([category, label]) => (
                <div key={category} className="flex justify-between items-center">
                  <span className="text-gray-700">{label}</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(totals.costsByCategory[category as AcquisitionCostCategory])}
                  </span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex justify-between items-center font-bold text-lg">
                  <span className="text-gray-900">Total Acquisition Cost</span>
                  <span className="text-gray-900">
                    {formatCurrency(totals.totalAcquisitionCost)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

export default PropertyAcquisitionFinancials
