import { useState, useEffect, useCallback } from 'react'
import { useFinancialSync } from './useFinancialSync'
import { getStageFinancialRequirements } from '../lib/constants/financial-stage-requirements'

interface WorkflowStage {
  stageNumber: number
  documentsComplete: boolean
  financiallyComplete: boolean
  canProgress: boolean
  blockingReasons: string[]
  criticalMilestone: boolean
}

interface WorkflowOptions {
  propertyId: string
  pipeline: string
  documentStates: Record<string, any>
  enableIntegratedLogic?: boolean
}

// Define critical milestones that require both documents AND payments
const CRITICAL_MILESTONES: Record<
  number,
  {
    name: string
    description: string
    requiresPaymentFirst: boolean
  }
> = {
  3: {
    name: 'Search Certificate Acquisition',
    description: 'Must pay search fee before obtaining search certificate',
    requiresPaymentFirst: true,
  },
  5: {
    name: 'Property Agreement',
    description: 'Down payment required to secure agreement documents',
    requiresPaymentFirst: false, // Can upload docs and pay simultaneously
  },
  6: {
    name: 'LCB Consent Processing',
    description: 'LCB fee required for consent processing',
    requiresPaymentFirst: true,
  },
  9: {
    name: 'Stamp Duty Payment',
    description: 'Stamp duty must be paid before title registration',
    requiresPaymentFirst: true,
  },
  10: {
    name: 'Title Registration',
    description: 'Registration fee required for final title processing',
    requiresPaymentFirst: true,
  },
}

export const useEnhancedWorkflow = (options: WorkflowOptions) => {
  const { propertyId, pipeline, documentStates, enableIntegratedLogic = true } = options

  const [workflowStages, setWorkflowStages] = useState<WorkflowStage[]>([])
  const [currentMilestone, setCurrentMilestone] = useState<number | null>(null)
  const [blockedStages, setBlockedStages] = useState<number[]>([])

  const { getStageFinancialStatus, checkStageCompletion, triggerSync, isSyncing } =
    useFinancialSync({ propertyId, pipeline })

  // Check if documents are complete for a stage
  const checkDocumentsComplete = useCallback(
    (stageNumber: number): boolean => {
      // This would need to be implemented based on your document state structure
      // For now, we'll simulate based on the documentStates passed in
      const stageDocuments = Object.entries(documentStates).filter(([key, state]) => {
        // Map document keys to stages - this is a simplified version
        return true // Placeholder
      })

      return stageDocuments.every(([key, state]) => {
        return state?.documents?.length > 0 || state?.status?.is_na
      })
    },
    [documentStates]
  )

  // Enhanced stage progression logic
  const canProgressToStage = useCallback(
    (stageNumber: number): { canProgress: boolean; reasons: string[] } => {
      const reasons: string[] = []

      if (!enableIntegratedLogic) {
        return { canProgress: true, reasons: [] }
      }

      // Check if previous stage is complete
      if (stageNumber > 1) {
        const prevStageComplete = checkDocumentsComplete(stageNumber - 1)
        const prevFinancialStatus = getStageFinancialStatus(stageNumber - 1)

        if (!prevStageComplete) {
          reasons.push(`Complete documents for Stage ${stageNumber - 1} first`)
        }

        // For critical milestones, check financial completion of previous stage
        if (CRITICAL_MILESTONES[stageNumber - 1] && !prevFinancialStatus.isFinanciallyComplete) {
          reasons.push(`Complete payments for Stage ${stageNumber - 1} first`)
        }
      }

      // Check current stage requirements
      const currentFinancialStatus = getStageFinancialStatus(stageNumber)
      const milestone = CRITICAL_MILESTONES[stageNumber]

      if (milestone && milestone.requiresPaymentFirst) {
        if (!currentFinancialStatus.isFinanciallyComplete) {
          reasons.push(`Payment required: ${milestone.description}`)
        }
      }

      return {
        canProgress: reasons.length === 0,
        reasons,
      }
    },
    [enableIntegratedLogic, checkDocumentsComplete, getStageFinancialStatus]
  )

  // Update workflow stages
  const updateWorkflowStages = useCallback(() => {
    const stages: WorkflowStage[] = []

    for (let stageNumber = 1; stageNumber <= 10; stageNumber++) {
      const documentsComplete = checkDocumentsComplete(stageNumber)
      const financialStatus = getStageFinancialStatus(stageNumber)
      const { canProgress, reasons } = canProgressToStage(stageNumber)

      stages.push({
        stageNumber,
        documentsComplete,
        financiallyComplete: financialStatus.isFinanciallyComplete,
        canProgress,
        blockingReasons: reasons,
        criticalMilestone: !!CRITICAL_MILESTONES[stageNumber],
      })
    }

    setWorkflowStages(stages)

    // Update blocked stages
    const blocked = stages.filter((stage) => !stage.canProgress).map((stage) => stage.stageNumber)
    setBlockedStages(blocked)

    // Update current milestone
    const nextMilestone = stages.find(
      (stage) => stage.criticalMilestone && !stage.documentsComplete && !stage.financiallyComplete
    )
    setCurrentMilestone(nextMilestone?.stageNumber || null)
  }, [checkDocumentsComplete, getStageFinancialStatus, canProgressToStage])

  // Handle stage completion events
  const handleStageCompletion = useCallback(
    async (stageNumber: number) => {
      const stage = workflowStages.find((s) => s.stageNumber === stageNumber)
      if (!stage) return

      // Check if this completes a critical milestone
      if (stage.criticalMilestone && stage.documentsComplete && stage.financiallyComplete) {
        // Trigger sync to update dependent stages
        await triggerSync()

        // Check if next stage can be unlocked
        await checkStageCompletion(stageNumber)

        // Emit milestone completion event
        const milestoneEvent = new CustomEvent('milestoneCompleted', {
          detail: {
            propertyId,
            pipeline,
            stageNumber,
            milestone: CRITICAL_MILESTONES[stageNumber],
            timestamp: new Date(),
          },
        })
        window.dispatchEvent(milestoneEvent)
      }

      // Update workflow stages
      updateWorkflowStages()
    },
    [workflowStages, triggerSync, checkStageCompletion, propertyId, pipeline, updateWorkflowStages]
  )

  // Get next actionable step for user
  const getNextAction = useCallback((): {
    type: 'document' | 'payment' | 'complete'
    stageNumber: number
    description: string
    priority: 'high' | 'medium' | 'low'
  } | null => {
    // Find first incomplete stage
    const incompleteStage = workflowStages.find(
      (stage) => !stage.documentsComplete || !stage.financiallyComplete
    )

    if (!incompleteStage) {
      return {
        type: 'complete',
        stageNumber: 10,
        description: 'All stages completed! Property transaction is ready for finalization.',
        priority: 'high',
      }
    }

    const milestone = CRITICAL_MILESTONES[incompleteStage.stageNumber]

    // For critical milestones that require payment first
    if (milestone && milestone.requiresPaymentFirst && !incompleteStage.financiallyComplete) {
      return {
        type: 'payment',
        stageNumber: incompleteStage.stageNumber,
        description: milestone.description,
        priority: 'high',
      }
    }

    // For document completion
    if (!incompleteStage.documentsComplete) {
      return {
        type: 'document',
        stageNumber: incompleteStage.stageNumber,
        description: `Upload required documents for Stage ${incompleteStage.stageNumber}`,
        priority: incompleteStage.criticalMilestone ? 'high' : 'medium',
      }
    }

    // For payment completion
    if (!incompleteStage.financiallyComplete) {
      return {
        type: 'payment',
        stageNumber: incompleteStage.stageNumber,
        description: `Complete payment requirements for Stage ${incompleteStage.stageNumber}`,
        priority: incompleteStage.criticalMilestone ? 'high' : 'low',
      }
    }

    return null
  }, [workflowStages])

  // Update workflow when dependencies change
  useEffect(() => {
    updateWorkflowStages()
  }, [updateWorkflowStages, documentStates, isSyncing])

  // Listen for external workflow events
  useEffect(() => {
    const handleWorkflowEvent = (event: CustomEvent) => {
      if (event.detail.propertyId === propertyId) {
        updateWorkflowStages()
      }
    }

    window.addEventListener('documentUpdated', handleWorkflowEvent as EventListener)
    window.addEventListener('paymentCompleted', handleWorkflowEvent as EventListener)
    window.addEventListener('stageUnlocked', handleWorkflowEvent as EventListener)

    return () => {
      window.removeEventListener('documentUpdated', handleWorkflowEvent as EventListener)
      window.removeEventListener('paymentCompleted', handleWorkflowEvent as EventListener)
      window.removeEventListener('stageUnlocked', handleWorkflowEvent as EventListener)
    }
  }, [propertyId, updateWorkflowStages])

  return {
    // Workflow state
    workflowStages,
    currentMilestone,
    blockedStages,

    // Workflow logic
    canProgressToStage,
    handleStageCompletion,
    getNextAction,

    // Workflow actions
    updateWorkflowStages,

    // Critical milestones info
    criticalMilestones: CRITICAL_MILESTONES,
  }
}
