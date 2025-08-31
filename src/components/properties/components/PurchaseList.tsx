'use client'

import { Button, useToast } from '../../ui'
import ViewOnGoogleMapsButton from '../../location/ViewOnGoogleMapsButton'
import PropertyCard, { PropertyCardHeader, PropertyCardContent, PropertyCardFooter } from './PropertyCard'

import { PurchaseListProps, PurchaseItem } from '../types/purchase-pipeline.types'
import { initializePipelineStages, getPurchaseStatusColor } from '../utils/purchase-pipeline.utils'
import { getSourceIcon, getSourceLabel } from '../utils/property-management.utils'
import InlinePurchaseView from './InlinePurchaseView'
import { useState, useEffect } from 'react'

export default function PurchaseList({
  purchases,
  loading,
  onAddPurchase,
  onEditPurchase,
  onTransferProperty,
  onStageClick,
  onStageUpdate,
  transferringId,
}: PurchaseListProps) {
  const [openDetailsId, setOpenDetailsId] = useState<string | null>(null)
  const [updatedPurchases, setUpdatedPurchases] = useState<{ [key: string]: PurchaseItem }>({})

  // Removed old event listener - using new direct navigation approach

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading purchases...</p>
      </div>
    )
  }

  if (purchases.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <div className="text-4xl mb-4">🏢</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Purchase Opportunities</h3>
        <p className="text-gray-600 mb-4">
          Start tracking properties you're considering for purchase.
        </p>
        <Button onClick={onAddPurchase} variant="primary">
          Add First Purchase
        </Button>
      </div>
    )
  }

  // Handle purchase updates from InlinePurchaseView
  const handlePurchaseUpdate = (updatedPurchase: PurchaseItem) => {
    setUpdatedPurchases((prev) => ({
      ...prev,
      [updatedPurchase.id]: updatedPurchase,
    }))
  }

  // Get the most current purchase data (updated or original)
  const getCurrentPurchase = (purchase: PurchaseItem) => {
    return updatedPurchases[purchase.id] || purchase
  }

  return (
    <div className="grid gap-6">
      {purchases.map((purchase) => {
        const currentPurchase = getCurrentPurchase(purchase)
        return (
          <div key={purchase.id} className="space-y-4">
            {/* Purchase Card */}
            <PropertyCard
              status={currentPurchase.purchase_status}
              interactive={true}
              theme="purchase-pipeline"
              aria-label={`Purchase: ${currentPurchase.property_name}`}
              data-purchase-id={purchase.id}
            >
              <PropertyCardHeader>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <div className="md:col-span-2">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {currentPurchase.property_name}
                      </h3>
                      <span className="text-lg">{getSourceIcon('PURCHASE_PIPELINE')}</span>
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                        {getSourceLabel('PURCHASE_PIPELINE')}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${getPurchaseStatusColor(currentPurchase.purchase_status)}`}
                      >
                        {currentPurchase.purchase_status.replace('_', ' ')}
                      </span>
                      {(purchase as any).property_id && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                          🔗 Linked Property
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-2">{currentPurchase.property_address}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      {currentPurchase.seller_name && (
                        <span>Seller: {currentPurchase.seller_name}</span>
                      )}
                      <span>Progress: {currentPurchase.overall_progress}%</span>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <ViewOnGoogleMapsButton
                      lat={(purchase as any).property_lat ?? null}
                      lng={(purchase as any).property_lng ?? null}
                      address={
                        (purchase as any).property_physical_address ||
                        purchase.property_address ||
                        purchase.property_name
                      }
                      propertyName={purchase.property_name}
                      debug={process.env.NODE_ENV === 'development'}
                      debugContext={`Purchase List - ${purchase.property_name}`}
                    />
                  </div>
                </div>
              </PropertyCardHeader>

              <PropertyCardContent>
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${currentPurchase.overall_progress}%` }}
                  />
                </div>

                {/* Overall Progress Percentage */}
                <div className="text-right mb-4">
                  <span className="text-sm font-medium text-gray-700">
                    Overall Progress: {currentPurchase.overall_progress}%
                  </span>
                </div>
              </PropertyCardContent>

              <PropertyCardFooter>
                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <Button variant="secondary" size="sm" onClick={() => onEditPurchase(purchase)}>
                    Edit Details
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setOpenDetailsId(openDetailsId === purchase.id ? null : purchase.id)
                    }
                    data-purchase-details-btn={purchase.id}
                  >
                    {openDetailsId === purchase.id ? 'Hide Details' : 'View Details'}
                  </Button>

                  {(currentPurchase.purchase_status === 'COMPLETED' ||
                    currentPurchase.overall_progress >= 100) && (
                    <Button
                      variant={currentPurchase.completed_property_id ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() =>
                        currentPurchase.completed_property_id
                          ? window.dispatchEvent(
                              new CustomEvent('toast', {
                                detail: {
                                  type: 'info',
                                  message: `Property already transferred: ${currentPurchase.property_name}`,
                                },
                              })
                            )
                          : onTransferProperty(currentPurchase)
                      }
                      disabled={
                        transferringId === purchase.id || !!currentPurchase.completed_property_id
                      }
                    >
                      {transferringId === purchase.id ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                          Transferring...
                        </>
                      ) : currentPurchase.completed_property_id ? (
                        'Property Transferred'
                      ) : (
                        'Transfer to Properties'
                      )}
                    </Button>
                  )}
                </div>
                </div>

                {/* Inline Purchase Details (mirrors Direct Purchase InlinePropertyView) */}
                {openDetailsId === purchase.id && (
                  <div className="mt-4">
                    <InlinePurchaseView
                      purchase={currentPurchase}
                      onClose={() => setOpenDetailsId(null)}
                      onPurchaseUpdate={handlePurchaseUpdate}
                    />
                  </div>
                )}
              </PropertyCardFooter>
            </PropertyCard>
          </div>
        )
      })}
    </div>
  )
}
