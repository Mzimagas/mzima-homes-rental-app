'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '../../ui/Button'
import { TextField } from '../../ui/TextField'
import { Modal } from '../../ui/Modal'
import { AcquisitionFinancialsService } from '../services/acquisition-financials.service'
import { PurchasePriceHistoryEntry } from '../types/property-management.types'

interface EnhancedPurchasePriceManagerProps {
  propertyId: string
  initialPrice: number | null
  onPriceUpdate?: (newPrice: number) => void
}

export default function EnhancedPurchasePriceManager({
  propertyId,
  initialPrice,
  onPriceUpdate,
}: EnhancedPurchasePriceManagerProps) {
  const [currentPrice, setCurrentPrice] = useState<number | null>(initialPrice)
  const [inputPrice, setInputPrice] = useState<string>(initialPrice?.toString() || '')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [showReasonModal, setShowReasonModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [changeReason, setChangeReason] = useState('')
  const [priceHistory, setPriceHistory] = useState<PurchasePriceHistoryEntry[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [hasHistory, setHasHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString()}`
  }

  // Check if there's history on component mount
  useEffect(() => {
    if (currentPrice !== null) {
      checkForHistory()
    }
  }, [currentPrice, propertyId])

  const checkForHistory = async () => {
    try {
      const history = await AcquisitionFinancialsService.getPurchasePriceHistory(propertyId)
      setHasHistory(history.length > 0)
    } catch (error) {
      console.error('Error checking price history:', error)
      setHasHistory(false)
    }
  }

  const loadPriceHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const history = await AcquisitionFinancialsService.getPurchasePriceHistory(propertyId)
      setPriceHistory(history)
    } catch (error) {
      console.error('Error loading price history:', error)
      setError('Failed to load price history')
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const handleViewHistory = () => {
    setShowHistoryModal(true)
    loadPriceHistory()
  }

  // Initialize editing state based on whether we have a price
  useEffect(() => {
    if (currentPrice === null) {
      setIsEditing(true)
    }
  }, [currentPrice])

  const handleEditClick = () => {
    if (currentPrice !== null) {
      // Show warning for existing price changes
      setShowWarningModal(true)
    } else {
      setIsEditing(true)
    }
  }

  const handleWarningProceed = () => {
    setShowWarningModal(false)
    setIsEditing(true)
    setInputPrice(currentPrice?.toString() || '')
  }

  const handleSaveClick = () => {
    const newPrice = parseFloat(inputPrice)

    if (isNaN(newPrice) || newPrice < 0) {
      setError('Please enter a valid price')
      return
    }

    // If this is an edit (not initial save), require reason
    if (currentPrice !== null && currentPrice !== newPrice) {
      setShowReasonModal(true)
    } else {
      // Initial save or no change
      handleSave()
    }
  }

  const handleSave = async (reason?: string) => {
    setIsSaving(true)
    setError(null)

    try {
      const newPrice = parseFloat(inputPrice)
      await AcquisitionFinancialsService.updatePurchasePrice(propertyId, newPrice, reason)

      setCurrentPrice(newPrice)
      setIsEditing(false)
      setShowReasonModal(false)
      setChangeReason('')

      // Refresh history check after saving
      await checkForHistory()

      if (onPriceUpdate) {
        onPriceUpdate(newPrice)
      }
    } catch (error: any) {
      console.error('Error saving purchase price:', error)
      setError(error.message || 'Failed to save purchase price')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReasonSubmit = () => {
    if (changeReason.length < 10) {
      setError('Change reason must be at least 10 characters')
      return
    }
    handleSave(changeReason)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setInputPrice(currentPrice?.toString() || '')
    setError(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <TextField
            value={inputPrice}
            onChange={(e) => setInputPrice(e.target.value)}
            placeholder="Enter purchase price in KES"
            type="number"
            disabled={!isEditing}
          />
        </div>

        {isEditing ? (
          <div className="flex space-x-2">
            <Button
              onClick={handleSaveClick}
              disabled={isSaving}
              size="sm"
              variant="primary"
              loading={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            {currentPrice !== null && (
              <Button onClick={handleCancel} variant="secondary" size="sm">
                Cancel
              </Button>
            )}
          </div>
        ) : (
          <div className="flex space-x-2">
            <Button onClick={handleEditClick} variant="secondary" size="sm">
              Edit
            </Button>
            {/* View History Button - Always available when a current price exists (shows empty state if no history) */}
            {currentPrice !== null && (
              <Button onClick={handleViewHistory} variant="tertiary" size="sm">
                📋 View History
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Status indicators */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-2">
          {currentPrice !== null ? (
            <span className="text-green-600 font-medium">✓ Saved</span>
          ) : (
            <span className="text-gray-400">Not Set</span>
          )}
        </div>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}

      {/* Warning Modal */}
      {showWarningModal && (
        <Modal
          isOpen={showWarningModal}
          onClose={() => setShowWarningModal(false)}
          title="Modify Purchase Price"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              You are about to modify the purchase price. This action will be logged for audit
              purposes.
            </p>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm">
                <strong>Current Price:</strong> {formatCurrency(currentPrice || 0)}
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="secondary" onClick={() => setShowWarningModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleWarningProceed}>
                Proceed
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reason Modal */}
      {showReasonModal && (
        <Modal
          isOpen={showReasonModal}
          onClose={() => setShowReasonModal(false)}
          title="Reason for Price Change"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Please provide a reason for this price change (minimum 10 characters)
              </label>
              <textarea
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Enter reason for price change..."
                className="w-full p-2 border border-gray-300 rounded-md"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                {changeReason.length}/10 characters minimum
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Common reasons:</label>
              <div className="flex flex-wrap gap-2">
                {[
                  'Market adjustment',
                  'Negotiation outcome',
                  'Appraisal update',
                  'Correction of error',
                ].map((reason) => (
                  <Button
                    key={reason}
                    variant="tertiary"
                    size="sm"
                    onClick={() => setChangeReason(reason)}
                  >
                    {reason}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowReasonModal(false)
                  setChangeReason('')
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleReasonSubmit}
                disabled={changeReason.length < 10}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <Modal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          title="Purchase Price Change History"
        >
          <div className="space-y-4">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading history...</span>
              </div>
            ) : priceHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No price changes recorded yet.</div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {priceHistory.map((entry, index) => (
                  <div key={entry.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          {entry.previous_price_kes !== null ? (
                            <span className="text-sm">
                              <span className="line-through text-gray-500">
                                {formatCurrency(entry.previous_price_kes)}
                              </span>
                              <span className="mx-2 text-gray-400">→</span>
                              <span className="font-medium text-green-600">
                                {formatCurrency(entry.new_price_kes)}
                              </span>
                            </span>
                          ) : (
                            <span className="text-sm font-medium text-blue-600">
                              Initial price: {formatCurrency(entry.new_price_kes)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          <strong>Reason:</strong> {entry.change_reason}
                        </p>
                      </div>
                      <div className="text-xs text-gray-500 text-right">
                        <div>#{priceHistory.length - index}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-200">
                      <div className="flex items-center space-x-4">
                        <span>👤 {entry.changed_by_name || 'Unknown User'}</span>
                        <span>🕒 {new Date(entry.changed_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <Button variant="primary" onClick={() => setShowHistoryModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
