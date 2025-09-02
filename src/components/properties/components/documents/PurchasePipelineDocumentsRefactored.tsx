/**
 * Refactored Purchase Pipeline Documents Component
 * 
 * This is the new, clean version of PurchasePipelineDocuments.tsx that reuses
 * the document management components instead of being a 1,438-line monster.
 * 
 * PERFORMANCE IMPROVEMENTS:
 * - Reduced from 1,438 lines to ~200 lines
 * - Reuses existing document management components
 * - Better separation of concerns
 * - Cleaner state management
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'

// Reuse the refactored document components
import DocumentManagerRefactored from './DocumentManagerRefactored'

// Services and hooks
import { PurchasePipelineService } from '../../services/purchase-pipeline.service'
import { useFinancialStatus } from '../../../../hooks/useFinancialStatus'
import { useFinancialSync } from '../../../../hooks/useFinancialSync'
import { useEnhancedWorkflow } from '../../../../hooks/useEnhancedWorkflow'

// Utils
import { calculateWorkflowProgress } from '../../utils/stage-filtering.utils'

interface PurchasePipelineDocumentsProps {
  propertyId: string
  propertyName: string
}

export default function PurchasePipelineDocuments({
  propertyId,
  propertyName,
}: PurchasePipelineDocumentsProps) {
  const [lastUpdatedProgress, setLastUpdatedProgress] = useState<number | null>(null)

  // Financial status integration
  const { getStageFinancialStatus, loading: financialLoading } = useFinancialStatus(propertyId)

  // Enhanced workflow integration
  const {
    workflowStages,
    currentStage,
    isStageCompleted,
    canAdvanceToStage,
    loading: workflowLoading,
  } = useEnhancedWorkflow({
    propertyId,
    workflowType: 'purchase_pipeline',
  })

  // Real-time financial sync
  const { isSyncing, lastSyncTime, triggerSync } = useFinancialSync({
    propertyId,
    pipeline: 'purchase_pipeline',
    enabled: true,
  })

  // Update purchase pipeline overall progress
  const updatePurchasePipelineProgress = useCallback(
    async (documentProgress: number) => {
      try {
        const { error } = await PurchasePipelineService.updateProgress(propertyId, {
          document_progress: documentProgress,
          last_updated: new Date().toISOString(),
        })

        if (error) {
          console.error('Failed to update purchase pipeline progress:', error)
        }
      } catch (error) {
        console.error('Error updating purchase pipeline progress:', error)
      }
    },
    [propertyId]
  )

  // Handle document state changes and update pipeline progress
  const handleDocumentStateChange = useCallback(
    (documentStates: any) => {
      // Calculate progress using the same logic as the original
      const stats = calculateWorkflowProgress(documentStates, 'purchase_pipeline')
      
      if (stats.percentage !== undefined && stats.percentage !== lastUpdatedProgress) {
        // Debounce the progress update to avoid too many database calls
        const timeoutId = setTimeout(() => {
          updatePurchasePipelineProgress(stats.percentage)
          setLastUpdatedProgress(stats.percentage)
        }, 1000) // 1 second debounce

        return () => clearTimeout(timeoutId)
      }
    },
    [lastUpdatedProgress, updatePurchasePipelineProgress]
  )

  // Stage completion notification
  const handleStageCompletion = useCallback(
    async (stageNumber: number) => {
      try {
        // Map stage numbers to status values
        const statusMap: Record<number, string> = {
          1: 'Completed',
          2: 'Completed',
          3: 'Completed',
          4: 'Completed',
          5: 'Completed',
          6: 'Completed',
          7: 'Completed',
          8: 'Completed',
          9: 'Completed',
          10: 'Completed',
        }

        const newStatus = statusMap[stageNumber] || 'Completed'

        await PurchasePipelineService.updateStatus(propertyId, newStatus)
        
        // Trigger financial sync if needed
        if ([3, 6, 9, 10].includes(stageNumber)) {
          triggerSync()
        }

        toast.success(`Stage ${stageNumber} completed successfully!`)
      } catch (error) {
        console.error('Error updating stage completion:', error)
        toast.error('Failed to update stage completion')
      }
    },
    [propertyId, triggerSync]
  )

  // Create a purchase pipeline-specific property object for workflow detection
  const purchasePipelineProperty = {
    property_source: 'PURCHASE',
    subdivision_status: null,
    handover_status: null,
  }

  return (
    <div className="space-y-6">
      {/* Purchase Pipeline Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Purchase Pipeline Documents</h2>
            <p className="text-gray-600 mt-1">
              Manage documents for property acquisition through purchase pipeline
            </p>
          </div>
          
          {/* Pipeline Status Indicator */}
          <div className="text-right">
            <div className="text-sm text-gray-600">Pipeline Status</div>
            <div className="text-lg font-semibold text-blue-600">
              {workflowLoading ? 'Loading...' : currentStage ? `Stage ${currentStage}` : 'Not Started'}
            </div>
            {isSyncing && (
              <div className="text-xs text-blue-500 mt-1">
                Syncing financial data...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Financial Requirements Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-amber-800">
              Financial Requirements
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              Stages 3, 6, 9, and 10 require payment completion before document upload is enabled.
              Complete the financial requirements first, then proceed with document uploads.
            </p>
          </div>
        </div>
      </div>

      {/* Document Manager */}
      <DocumentManagerRefactored
        propertyId={propertyId}
        propertyName={propertyName}
        pipeline="purchase_pipeline"
        property={purchasePipelineProperty}
        stageFilter="stages_1_10" // Purchase pipeline uses stages 1-10 only
        onDocumentStateChange={handleDocumentStateChange}
        onStageCompletion={handleStageCompletion}
      />

      {/* Purchase Pipeline Specific Notes */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">
          Purchase Pipeline Guidelines
        </h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Complete documents in sequential order for optimal workflow</li>
          <li>• Agreement documents (Stage 4) must be completed as a group</li>
          <li>• Financial payments are required before certain document stages</li>
          <li>• All documents will be stored under the purchase pipeline</li>
          <li>• Contact support if you need assistance with any document requirements</li>
        </ul>
      </div>
    </div>
  )
}
