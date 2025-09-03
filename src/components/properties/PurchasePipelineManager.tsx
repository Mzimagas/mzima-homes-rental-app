'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '../ui'
import PurchaseList from './components/PurchaseList'
import SecurePurchaseForm from './components/SecurePurchaseForm'

import PropertySearch from './components/PropertySearch'
import { PurchasePipelineService } from './services/purchase-pipeline.service'
import { FieldSecurityService, ChangeRequest } from '../../lib/security/field-security.service'
import {
  PurchasePipelineManagerProps,
  PurchaseItem,
  PurchasePipelineFormValues,
} from './types/purchase-pipeline.types'

export default function PurchasePipelineManager({
  onPropertyTransferred,
  searchTerm = '',
  onSearchChange,
  userRole = 'property_manager',
}: PurchasePipelineManagerProps) {
  // State management
  const [purchases, setPurchases] = useState<PurchaseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPurchase, setEditingPurchase] = useState<PurchaseItem | null>(null)
  const [transferringId, setTransferringId] = useState<string | null>(null)

  // Filter purchases based on search term
  const filteredPurchases = useMemo(() => {
    if (!searchTerm.trim()) return purchases

    const lower = searchTerm.toLowerCase()
    return purchases.filter((purchase) => {
      return (
        purchase.property_name.toLowerCase().includes(lower) ||
        (purchase.property_address?.toLowerCase().includes(lower) ?? false) ||
        (purchase.property_type?.toLowerCase().includes(lower) ?? false) ||
        (purchase.seller_name?.toLowerCase().includes(lower) ?? false) ||
        (purchase.risk_assessment?.toLowerCase().includes(lower) ?? false) ||
        (purchase.property_condition_notes?.toLowerCase().includes(lower) ?? false)
      )
    })
  }, [purchases, searchTerm])

  // Load purchases on component mount
  useEffect(() => {
    loadPurchases()
  }, [])

  const loadPurchases = useCallback(async () => {
    try {
      setLoading(true)
      const data = await PurchasePipelineService.loadPurchases()
      setPurchases(data)
    } catch (error) {
      console.error('Error loading purchases:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleAddPurchase = () => {
    setEditingPurchase(null)
    setShowForm(true)
  }

  const handleEditPurchase = (purchase: PurchaseItem) => {
    setEditingPurchase(purchase)
    setShowForm(true)
  }

  const handlePurchaseCreated = () => {
    loadPurchases()
    setShowForm(false)
    setEditingPurchase(null)
  }

  // Handle secure form submission with change tracking
  const handleSecureFormSubmit = async (
    values: PurchasePipelineFormValues,
    changeRequests: ChangeRequest[]
  ) => {
    try {
      if (editingPurchase) {
        // For updates, validate changes first
        if (changeRequests.length > 0) {
          const validation = await FieldSecurityService.validateChangeRequest(
            editingPurchase.id,
            changeRequests,
            userRole,
            editingPurchase.current_stage
          )

          if (!validation.valid) {
            throw new Error(`Cannot save changes: ${validation.errors.join(', ')}`)
          }

          if (validation.requiresApproval) {
            // Changes require approval - they will be handled by the SecurePurchaseForm
            return
          }
        }

        await PurchasePipelineService.updatePurchase(editingPurchase.id, values)
      } else {
        await PurchasePipelineService.createPurchase(values)
      }

      handlePurchaseCreated()
    } catch (error) {
      throw error
    }
  }

  const handleStageClick = (stageId: number, purchaseId: string) => {
    // Stage modal functionality removed
  }

  const handleStageUpdate = async (
    purchaseId: string,
    stageId: number,
    newStatus: string,
    notes?: string,
    stageData?: any
  ) => {
    try {
      await PurchasePipelineService.updateStageStatus(
        purchaseId,
        stageId,
        newStatus,
        notes,
        stageData
      )
      await loadPurchases()
    } catch (error) {
      throw error
    }
  }

  const handleTransferProperty = async (purchase: PurchaseItem) => {
    try {
      setTransferringId(purchase.id)
      const propertyId = await PurchasePipelineService.transferToProperties(purchase)
      alert('Property successfully transferred to properties management!')
      loadPurchases()
      onPropertyTransferred?.(propertyId)
    } catch (error) {
      alert('Failed to transfer property')
    } finally {
      setTransferringId(null)
    }
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingPurchase(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Purchase Pipeline</h2>
          <p className="text-gray-600">Track properties being acquired through purchase process</p>
        </div>
        <Button onClick={handleAddPurchase} variant="primary">
          Add Purchase Opportunity
        </Button>
      </div>

      {/* Search */}
      {onSearchChange && (
        <PropertySearch
          onSearchChange={onSearchChange}
          placeholder="Search purchases by property name, address, seller, or notes..."
          resultsCount={filteredPurchases.length}
          totalCount={purchases.length}
        />
      )}

      {/* Purchase List */}
      <PurchaseList
        purchases={filteredPurchases}
        loading={loading}
        onAddPurchase={handleAddPurchase}
        onEditPurchase={handleEditPurchase}
        onTransferProperty={handleTransferProperty}
        onStageClick={handleStageClick}
        onStageUpdate={handleStageUpdate}
        transferringId={transferringId}
      />

      {/* Secure Purchase Form Modal */}
      <SecurePurchaseForm
        isOpen={showForm}
        onClose={handleCloseForm}
        editingPurchase={editingPurchase}
        onSubmit={handleSecureFormSubmit}
        userRole={userRole}
      />
    </div>
  )
}
