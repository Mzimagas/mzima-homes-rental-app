'use client'

import { useState, useEffect } from 'react'
import { Button, TextField, Select } from '../../ui'
import { HandoverFinancialsService } from '../services/handover-financials.service'
import {
  HANDOVER_COST_TYPES,
  HANDOVER_COST_CATEGORY_LABELS,
  HandoverCostCategory
} from '../types/property-management.types'
import {
  validateHandoverCostEntry,
  validatePaymentReceiptEntry,
  getNextReceiptNumber,
  getHandoverCostTypeLabel
} from '../utils/handover-financials.utils'

interface HandoverFinancialSectionProps {
  propertyId: string
  financialSummary: any
  onDataUpdate: () => void
}

export default function HandoverFinancialSection({
  propertyId,
  financialSummary,
  onDataUpdate
}: HandoverFinancialSectionProps) {
  const [collapsedSections, setCollapsedSections] = useState({
    summary: false,
    deposits: false,
    costs: false,
    breakdown: true
  })

  const [loading, setLoading] = useState(false)
  const [showAddCost, setShowAddCost] = useState(false)
  const [showAddReceipt, setShowAddReceipt] = useState(false)
  const [showEditPrice, setShowEditPrice] = useState(false)
  const [showPriceHistory, setShowPriceHistory] = useState(false)
  const [priceHistory, setPriceHistory] = useState<any[]>([])
  const [editPrice, setEditPrice] = useState('')
  const [changeReason, setChangeReason] = useState('')

  // Form states
  const [newCost, setNewCost] = useState({
    cost_type_id: '',
    cost_category: '' as HandoverCostCategory,
    amount_kes: '',
    payment_reference: '',
    payment_date: '',
    notes: ''
  })

  const [newReceipt, setNewReceipt] = useState({
    receipt_number: 1,
    amount_kes: '',
    payment_date: '',
    payment_reference: '',
    payment_method: '' as 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'MOBILE_MONEY' | 'OTHER' | '',
    notes: ''
  })

  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return 'KES 0'
    return `KES ${amount.toLocaleString()}`
  }

  // Set next receipt number when component loads or data updates
  useEffect(() => {
    if (financialSummary?.payment_receipts) {
      const nextNumber = getNextReceiptNumber(financialSummary.payment_receipts)
      setNewReceipt(prev => ({ ...prev, receipt_number: nextNumber }))
    }
  }, [financialSummary?.payment_receipts])

  const handleAddCost = async () => {
    const errors = validateHandoverCostEntry({
      ...newCost,
      amount_kes: parseFloat(newCost.amount_kes)
    })

    if (errors.length > 0) {
      alert('Please fix the following errors:\n' + errors.join('\n'))
      return
    }

    setLoading(true)
    try {
      await HandoverFinancialsService.createHandoverCost(propertyId, {
        cost_type_id: newCost.cost_type_id,
        cost_category: newCost.cost_category,
        amount_kes: parseFloat(newCost.amount_kes),
        payment_reference: newCost.payment_reference || undefined,
        payment_date: newCost.payment_date || undefined,
        notes: newCost.notes || undefined
      })

      // Reset form
      setNewCost({
        cost_type_id: '',
        cost_category: '' as HandoverCostCategory,
        amount_kes: '',
        payment_reference: '',
        payment_date: '',
        notes: ''
      })
      setShowAddCost(false)
      onDataUpdate()
    } catch (error) {
      console.error('Error adding cost:', error)
      alert('Failed to add cost: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleAddReceipt = async () => {
    const errors = validatePaymentReceiptEntry({
      ...newReceipt,
      amount_kes: parseFloat(newReceipt.amount_kes)
    })

    if (errors.length > 0) {
      alert('Please fix the following errors:\n' + errors.join('\n'))
      return
    }

    setLoading(true)
    try {
      await HandoverFinancialsService.createPaymentReceipt(propertyId, {
        receipt_number: newReceipt.receipt_number,
        amount_kes: parseFloat(newReceipt.amount_kes),
        payment_date: newReceipt.payment_date || undefined,
        payment_reference: newReceipt.payment_reference || undefined,
        payment_method: newReceipt.payment_method || undefined,
        notes: newReceipt.notes || undefined
      })

      // Reset form and increment receipt number
      const nextNumber = newReceipt.receipt_number + 1
      setNewReceipt({
        receipt_number: nextNumber,
        amount_kes: '',
        payment_date: '',
        payment_reference: '',
        payment_method: '',
        notes: ''
      })
      setShowAddReceipt(false)
      onDataUpdate()
    } catch (error) {
      console.error('Error adding receipt:', error)
      alert('Failed to add receipt: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCost = async (costId: string) => {
    if (!confirm('Are you sure you want to delete this cost entry?')) return

    setLoading(true)
    try {
      await HandoverFinancialsService.deleteHandoverCost(propertyId, costId)
      onDataUpdate()
    } catch (error) {
      console.error('Error deleting cost:', error)
      alert('Failed to delete cost: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteReceipt = async (receiptId: string) => {
    if (!confirm('Are you sure you want to delete this payment receipt?')) return

    setLoading(true)
    try {
      await HandoverFinancialsService.deletePaymentReceipt(propertyId, receiptId)
      onDataUpdate()
    } catch (error) {
      console.error('Error deleting receipt:', error)
      alert('Failed to delete receipt: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleEditPrice = () => {
    const currentPrice = financialSummary?.property?.handover_price_agreement_kes ||
                        financialSummary?.financial_summary?.handover_price_agreement_kes || 0
    setEditPrice(currentPrice.toString())
    setChangeReason('')
    setShowEditPrice(true)
  }

  const handleSavePrice = async () => {
    const newPrice = parseFloat(editPrice)
    if (isNaN(newPrice) || newPrice < 0) {
      alert('Please enter a valid price')
      return
    }

    if (!changeReason.trim()) {
      alert('Please provide a reason for the price change')
      return
    }

    setLoading(true)
    try {
      await HandoverFinancialsService.updateHandoverPrice(propertyId, newPrice, changeReason)
      setShowEditPrice(false)
      setEditPrice('')
      setChangeReason('')
      onDataUpdate()
      alert('Handover price updated successfully!')
    } catch (error) {
      console.error('Error updating price:', error)
      alert('Failed to update price: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleViewHistory = async () => {
    setLoading(true)
    try {
      const history = await HandoverFinancialsService.getHandoverPriceHistory(propertyId)
      setPriceHistory(history)
      setShowPriceHistory(true)
    } catch (error) {
      console.error('Error fetching price history:', error)
      alert('Failed to fetch price history: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  if (!financialSummary) {
    return (
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-yellow-900 mb-3">Handover Financial Management</h4>
          <p className="text-yellow-800">
            Loading financial data for property: {propertyId}
          </p>
          <button
            onClick={onDataUpdate}
            className="mt-2 px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200"
          >
            Refresh Data
          </button>
        </div>
      </div>
    )
  }

  const { property, financial_summary, cost_breakdown, cost_entries, payment_receipts } = financialSummary

  return (
    <div className="space-y-6">
      {/* Enhanced Handover Price Management */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-lg font-semibold text-blue-900 mb-3">Purchase Price in Sales Agreement</h4>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-gray-600">Current Purchase Price</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(property?.handover_price_agreement_kes || financial_summary?.handover_price_agreement_kes)}
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleEditPrice}
                disabled={loading}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Edit Price
              </button>
              <button
                onClick={handleViewHistory}
                disabled={loading}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                View History
              </button>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Property: {property?.name || 'Unknown Property'} • Last updated: {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Edit Price Modal */}
      {showEditPrice && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h5 className="font-medium text-yellow-900 mb-3">Edit Handover Price</h5>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Handover Price (KES) *</label>
              <TextField
                type="number"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Change *</label>
              <TextField
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Explain why the price is being changed..."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowEditPrice(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSavePrice}
                disabled={loading || !editPrice || !changeReason.trim()}
              >
                {loading ? 'Saving...' : 'Save Price'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Price History Modal */}
      {showPriceHistory && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h5 className="font-medium text-gray-900">Handover Price History</h5>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowPriceHistory(false)}
            >
              Close
            </Button>
          </div>
          <div className="space-y-2">
            {priceHistory.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No price history available
              </div>
            ) : (
              priceHistory.map((entry, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{formatCurrency(entry.price_kes)}</div>
                    <div className="text-sm text-gray-600">
                      {entry.change_date && `Date: ${new Date(entry.change_date).toLocaleDateString()}`}
                      {entry.changed_by && ` • By: ${entry.changed_by}`}
                    </div>
                    {entry.change_reason && (
                      <div className="text-sm text-gray-500 mt-1">Reason: {entry.change_reason}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Financial Summary */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <button
            type="button"
            onClick={() => toggleSection('summary')}
            className="flex items-center space-x-2 text-left focus:outline-none focus:ring-2 focus:ring-green-500 rounded"
          >
            <span aria-hidden="true">{collapsedSections.summary ? '▶' : '▼'}</span>
            <h4 className="text-lg font-semibold text-green-900">Financial Summary</h4>
          </button>
          <button
            onClick={onDataUpdate}
            className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-md hover:bg-green-200"
          >
            Refresh Data
          </button>
        </div>

        {!collapsedSections.summary && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <div className="text-sm text-green-700">Agreement Price</div>
                <div className="font-bold text-green-900">
                  {formatCurrency(financial_summary?.handover_price_agreement_kes)}
                </div>
              </div>
              <div>
                <div className="text-sm text-green-700">Handover Costs</div>
                <div className="font-bold text-green-900">
                  {formatCurrency(financial_summary?.total_handover_costs_kes)}
                </div>
              </div>
              <div>
                <div className="text-sm text-green-700">Received Purchase Price</div>
                <div className="font-bold text-green-900">
                  {formatCurrency(financial_summary?.total_receipts_kes)}
                </div>
              </div>
              <div>
                <div className="text-sm text-green-700">Purchase Price Balance</div>
                <div className="font-bold text-green-900">
                  {formatCurrency(financial_summary?.remaining_balance_kes)}
                </div>
              </div>
            </div>
            <div className="border-t border-green-200 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-green-900">Total Income</span>
                <span className="text-xl font-bold text-green-900">
                  {formatCurrency(financial_summary?.total_income_kes)}
                </span>
              </div>
              <div className="text-sm text-green-700 mt-1">
                Purchase Price - Handover Costs
              </div>
            </div>
          </>
        )}
      </div>

      {/* Purchase Price Deposit and Installments */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => toggleSection('deposits')}
            className="flex items-center space-x-2 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            <span aria-hidden="true">{collapsedSections.deposits ? '▶' : '▼'}</span>
            <h4 className="text-lg font-semibold text-gray-900">Purchase Price Deposit and Installments</h4>
          </button>
          {!collapsedSections.deposits && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddReceipt(true)}
              disabled={loading}
            >
              + Add Deposit/Installment
            </Button>
          )}
        </div>

        {!collapsedSections.deposits && (
          <div className="mt-4">
            {/* Add Receipt Form */}
            {showAddReceipt && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4 mb-4">
                <h5 className="font-medium text-gray-900 mb-3">Add Deposit/Installment Payment</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Number</label>
                    <TextField
                      type="number"
                      value={newReceipt.receipt_number.toString()}
                      onChange={(e) => setNewReceipt(prev => ({ ...prev, receipt_number: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KES) *</label>
                    <TextField
                      type="number"
                      value={newReceipt.amount_kes}
                      onChange={(e) => setNewReceipt(prev => ({ ...prev, amount_kes: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date (Optional)</label>
                    <TextField
                      type="date"
                      value={newReceipt.payment_date}
                      onChange={(e) => setNewReceipt(prev => ({ ...prev, payment_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Reference (Optional)</label>
                    <TextField
                      value={newReceipt.payment_reference}
                      onChange={(e) => setNewReceipt(prev => ({ ...prev, payment_reference: e.target.value }))}
                      placeholder="Transaction/receipt number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method (Optional)</label>
                    <Select
                      value={newReceipt.payment_method}
                      onChange={(e) => setNewReceipt(prev => ({ ...prev, payment_method: e.target.value as any }))}
                    >
                      <option value="">Select method...</option>
                      <option value="CASH">Cash</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="MOBILE_MONEY">Mobile Money</option>
                      <option value="OTHER">Other</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                    <TextField
                      value={newReceipt.notes}
                      onChange={(e) => setNewReceipt(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes about this payment"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowAddReceipt(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAddReceipt}
                    disabled={loading || !newReceipt.amount_kes}
                  >
                    {loading ? 'Adding...' : 'Add Deposit/Installment'}
                  </Button>
                </div>
              </div>
            )}

            {!payment_receipts || payment_receipts.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500 mb-2">No deposits or installments recorded yet</div>
                <div className="text-sm text-gray-400">
                  Click "Add Deposit/Installment" to record the first payment
                </div>
              </div>
            ) : (
              <div className="space-y-2 mt-4">
                {payment_receipts.map((receipt: any, index: number) => (
                  <div key={receipt.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Receipt #{receipt.receipt_number}</div>
                      <div className="text-sm text-gray-600">
                        {receipt.payment_date && `Date: ${new Date(receipt.payment_date).toLocaleDateString()}`}
                        {receipt.payment_reference && ` • Ref: ${receipt.payment_reference}`}
                        {receipt.payment_method && ` • Method: ${receipt.payment_method}`}
                      </div>
                      {receipt.notes && <div className="text-sm text-gray-500 mt-1">{receipt.notes}</div>}
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="font-bold text-gray-900">{formatCurrency(receipt.amount_kes)}</div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDeleteReceipt(receipt.id)}
                        disabled={loading}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Handover Costs */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => toggleSection('costs')}
            className="flex items-center space-x-2 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            <span aria-hidden="true">{collapsedSections.costs ? '▶' : '▼'}</span>
            <h4 className="text-lg font-semibold text-gray-900">Handover Costs</h4>
          </button>
          {!collapsedSections.costs && (
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

        {!collapsedSections.costs && (
          <div className="mt-4">
            {/* Add Cost Form */}
            {showAddCost && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4 mb-4">
                <h5 className="font-medium text-gray-900 mb-3">Add New Cost</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cost Type *</label>
                    <Select
                      value={newCost.cost_type_id}
                      onChange={(e) => {
                        const costType = HANDOVER_COST_TYPES.find(type => type.id === e.target.value)
                        setNewCost(prev => ({
                          ...prev,
                          cost_type_id: e.target.value,
                          cost_category: costType?.category || '' as HandoverCostCategory
                        }))
                      }}
                    >
                      <option value="">Select cost type...</option>
                      {Object.entries(HANDOVER_COST_CATEGORY_LABELS).map(([category, label]) => (
                        <optgroup key={category} label={label}>
                          {HANDOVER_COST_TYPES
                            .filter(type => type.category === category)
                            .map(type => (
                              <option key={type.id} value={type.id}>
                                {type.label}
                              </option>
                            ))}
                        </optgroup>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KES) *</label>
                    <TextField
                      type="number"
                      value={newCost.amount_kes}
                      onChange={(e) => setNewCost(prev => ({ ...prev, amount_kes: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Reference (Optional)</label>
                    <TextField
                      value={newCost.payment_reference}
                      onChange={(e) => setNewCost(prev => ({ ...prev, payment_reference: e.target.value }))}
                      placeholder="Receipt/reference number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date (Optional)</label>
                    <TextField
                      type="date"
                      value={newCost.payment_date}
                      onChange={(e) => setNewCost(prev => ({ ...prev, payment_date: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                    <TextField
                      value={newCost.notes}
                      onChange={(e) => setNewCost(prev => ({ ...prev, notes: e.target.value }))}
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

            {!cost_entries || cost_entries.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500 mb-2">No costs recorded yet</div>
                <div className="text-sm text-gray-400">
                  Click "Add Cost" to record the first handover cost
                </div>
              </div>
            ) : (
              <div className="space-y-2 mt-4">
                {cost_entries.map((entry: any, index: number) => (
                  <div key={entry.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{getHandoverCostTypeLabel(entry.cost_type_id)}</div>
                      <div className="text-sm text-gray-600">
                        Category: {HANDOVER_COST_CATEGORY_LABELS[entry.cost_category as HandoverCostCategory] || entry.cost_category}
                        {entry.payment_date && ` • Date: ${new Date(entry.payment_date).toLocaleDateString()}`}
                        {entry.payment_reference && ` • Ref: ${entry.payment_reference}`}
                      </div>
                      {entry.notes && <div className="text-sm text-gray-500 mt-1">{entry.notes}</div>}
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="font-bold text-gray-900">{formatCurrency(entry.amount_kes)}</div>
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
          </div>
        )}
      </div>

      {/* Debug Information */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <details>
          <summary className="text-sm font-medium text-gray-700 cursor-pointer">Debug Information</summary>
          <div className="mt-2 text-xs text-gray-600">
            <div><strong>Property ID:</strong> {propertyId}</div>
            <div><strong>Data Loaded:</strong> {financialSummary ? 'Yes' : 'No'}</div>
            <div><strong>Cost Entries:</strong> {cost_entries?.length || 0}</div>
            <div><strong>Payment Receipts:</strong> {payment_receipts?.length || 0}</div>
            <div><strong>Last Updated:</strong> {new Date().toLocaleString()}</div>
          </div>
        </details>
      </div>
    </div>
  )
}