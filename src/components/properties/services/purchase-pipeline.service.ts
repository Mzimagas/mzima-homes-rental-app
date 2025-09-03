import getSupabaseClient from '../../../lib/supabase-client'

const supabase = getSupabaseClient()
import {
  PurchaseItem,
  PipelineStageData,
  PurchasePipelineFormValues,
} from '../types/purchase-pipeline.types'
import {
  initializePipelineStages,
  calculateOverallProgress,
  getCurrentStage,
  determinePurchaseStatus,
} from '../utils/purchase-pipeline.utils'

export class PurchasePipelineService {
  // Load all purchases from the database with property coordinates
  static async loadPurchases(): Promise<PurchaseItem[]> {
    try {
      // First, load the purchase pipeline data
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('purchase_pipeline')
        .select('*')
        .order('created_at', { ascending: false })

      if (purchaseError) {
                throw new Error(
          `Failed to load purchases: ${purchaseError.message || 'Unknown database error'}`
        )
      }

      if (!purchaseData || purchaseData.length === 0) {
        return []
      }

      // Get unique property IDs from purchase data (if they exist)
      const propertyIds = purchaseData
        .map((purchase) => purchase.property_id)
        .filter((id) => id != null && id !== '')

            const propertiesMap = new Map()

      // If we have property IDs, try to fetch the corresponding property data
      if (propertyIds.length > 0) {
        try {
          const { data: propertiesData, error: propertiesError } = await supabase
            .from('properties')
            .select('id, lat, lng, physical_address')
            .in('id', propertyIds)

          if (propertiesError) {
                      } else if (propertiesData) {
                        propertiesData.forEach((property) => {
              propertiesMap.set(property.id, property)
            })
          }
        } catch (propertiesError) {
                    // Continue without coordinates - this is not a fatal error
        }
      } else {
              }

      // Enhance purchase data with property coordinates
      const enhancedData = purchaseData.map((purchase) => {
        const property = propertiesMap.get(purchase.property_id)
        const enhanced = {
          ...purchase,
          property_lat: property?.lat || null,
          property_lng: property?.lng || null,
          property_physical_address: property?.physical_address || purchase.property_address,
        }

        if (property) {
                  }

        return enhanced
      })

      return enhancedData as PurchaseItem[]
    } catch (error) {
            if (error instanceof Error) {
        throw error
      } else {
        throw new Error('Failed to load purchases: Unknown error')
      }
    }
  }

  // Create a new purchase opportunity
  static async createPurchase(values: PurchasePipelineFormValues): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Please log in to create purchases')
      }

      const initialStages = initializePipelineStages()
      const currentStageNum = getCurrentStage(initialStages)
      const overallProgress = calculateOverallProgress(initialStages)

      const purchaseData = {
        property_id: values.propertyId || null, // Link to existing property if selected
        property_name: values.propertyName,
        property_address: values.propertyAddress,
        property_type: values.propertyType,
        seller_name: values.sellerName,
        seller_contact: values.sellerPhone || null,
        seller_email: values.sellerEmail || null,
        asking_price_kes: values.askingPrice || null,
        negotiated_price_kes: values.negotiatedPrice || null,
        deposit_paid_kes: values.depositPaid || null,
        target_completion_date: values.targetCompletionDate || null,
        legal_representative: values.legalRepresentative || null,
        financing_source: values.financingSource || null,
        contract_reference: values.contractReference || null,
        title_deed_status: values.titleDeedStatus || null,
        survey_status: values.surveyStatus || null,
        expected_rental_income_kes: values.expectedRentalIncome || null,
        expected_roi_percentage: values.expectedRoi || null,
        risk_assessment: values.riskAssessment || null,
        property_condition_notes: values.propertyConditionNotes || null,
        pipeline_stages: initialStages,
        current_stage: currentStageNum,
        overall_progress: overallProgress,
        purchase_status: determinePurchaseStatus(initialStages),
        created_by: user.id,
      }

            const { error } = await supabase.from('purchase_pipeline').insert([purchaseData])
      if (error) {
                throw new Error(`Failed to create purchase: ${error.message || 'Unknown database error'}`)
      }
          } catch (error) {
            console.error('Error details:', JSON.stringify(error, null, 2))
      if (error instanceof Error) {
        throw error
      } else {
        throw new Error('Failed to create purchase: Unknown error')
      }
    }
  }

  // Update an existing purchase
  static async updatePurchase(
    purchaseId: string,
    values: PurchasePipelineFormValues
  ): Promise<void> {
    try {
      const updateData = {
        property_id: values.propertyId || null, // Link to existing property if selected
        property_name: values.propertyName,
        property_address: values.propertyAddress,
        property_type: values.propertyType,
        seller_name: values.sellerName,
        seller_contact: values.sellerPhone || null,
        seller_email: values.sellerEmail || null,
        asking_price_kes: values.askingPrice || null,
        negotiated_price_kes: values.negotiatedPrice || null,
        deposit_paid_kes: values.depositPaid || null,
        target_completion_date: values.targetCompletionDate || null,
        legal_representative: values.legalRepresentative || null,
        financing_source: values.financingSource || null,
        contract_reference: values.contractReference || null,
        title_deed_status: values.titleDeedStatus || null,
        survey_status: values.surveyStatus || null,
        expected_rental_income_kes: values.expectedRentalIncome || null,
        expected_roi_percentage: values.expectedRoi || null,
        risk_assessment: values.riskAssessment || null,
        property_condition_notes: values.propertyConditionNotes || null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('purchase_pipeline')
        .update(updateData)
        .eq('id', purchaseId)

      if (error) {
                throw new Error(`Failed to update purchase: ${error.message || 'Unknown database error'}`)
      }
    } catch (error) {
            if (error instanceof Error) {
        throw error
      } else {
        throw new Error('Failed to update purchase: Unknown error')
      }
    }
  }

  // Update stage status
  static async updateStageStatus(
    purchaseId: string,
    stageId: number,
    newStatus: string,
    notes?: string,
    stageData?: any
  ): Promise<void> {
    try {
      // Get current purchase data
      const { data: purchase, error: fetchError } = await supabase
        .from('purchase_pipeline')
        .select('pipeline_stages')
        .eq('id', purchaseId)
        .single()

      if (fetchError) {
                throw new Error(
          `Failed to fetch purchase data: ${fetchError.message || 'Unknown database error'}`
        )
      }

      const currentStages = purchase.pipeline_stages as PipelineStageData[]

      // Update the specific stage
      const updatedStages = currentStages.map((stage) => {
        if (stage.stage_id === stageId) {
          const updatedStage = {
            ...stage,
            status: newStatus,
            notes: notes || stage.notes,
            ...stageData,
          }

          // Set completion date if stage is being completed
          if (
            [
              'Completed',
              'Verified',
              'Finalized',
              'Processed',
              'Approved',
              'Fully Signed',
              'Registered',
              'LCB Approved & Forms Signed',
            ].includes(newStatus)
          ) {
            updatedStage.completed_date = new Date().toISOString()
          }

          // Set started date if stage is being started
          if (newStatus !== 'Not Started' && !stage.started_date) {
            updatedStage.started_date = new Date().toISOString()
          }

          return updatedStage
        }
        return stage
      })

      const overallProgress = calculateOverallProgress(updatedStages)
      const currentStage = getCurrentStage(updatedStages)

      // Auto-update purchase status based on pipeline stages
      const newPurchaseStatus = determinePurchaseStatus(updatedStages)

      const { error } = await supabase
        .from('purchase_pipeline')
        .update({
          pipeline_stages: updatedStages,
          current_stage: currentStage,
          overall_progress: overallProgress,
          purchase_status: newPurchaseStatus,
          updated_at: new Date().toISOString(),
          // Set completion date if status is COMPLETED
          actual_completion_date:
            newPurchaseStatus === 'COMPLETED' ? new Date().toISOString().split('T')[0] : undefined,
        })
        .eq('id', purchaseId)

      if (error) {
                throw new Error(
          `Failed to update stage status: ${error.message || 'Unknown database error'}`
        )
      }
    } catch (error) {
            if (error instanceof Error) {
        throw error
      } else {
        throw new Error('Failed to update stage status: Unknown error')
      }
    }
  }

  // Transfer purchase to properties
  static async transferToProperties(purchase: PurchaseItem): Promise<string> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Please log in to transfer properties')
      }

      // Create property from purchase
      const { data: propertyId, error: createError } = await supabase.rpc(
        'create_property_with_owner',
        {
          property_name: purchase.property_name,
          property_address: purchase.property_address,
          property_type: purchase.property_type,
          owner_user_id: user.id,
        }
      )

      if (createError) throw createError

      // Update property with purchase details and lifecycle tracking
      const { error: updateError } = await supabase
        .from('properties')
        .update({
          property_source: 'PURCHASE_PIPELINE',
          source_reference_id: purchase.id,
          lifecycle_status: 'PURCHASED',
          purchase_completion_date: new Date().toISOString().split('T')[0],
          sale_price_kes: purchase.negotiated_price_kes || purchase.asking_price_kes,
          expected_rental_income_kes: purchase.expected_rental_income_kes,
          acquisition_notes: `Transferred from purchase pipeline. Original asking price: ${purchase.asking_price_kes ? `KES ${purchase.asking_price_kes.toLocaleString()}` : 'N/A'}`,
        })
        .eq('id', propertyId)

      if (updateError) throw updateError

      // Update purchase pipeline record
      const { error: pipelineError } = await supabase
        .from('purchase_pipeline')
        .update({
          purchase_status: 'COMPLETED',
          actual_completion_date: new Date().toISOString().split('T')[0],
          completed_property_id: propertyId,
        })
        .eq('id', purchase.id)

      if (pipelineError) throw pipelineError

      return propertyId
    } catch (error) {
            throw error
    }
  }

  // Update purchase status
  static async updatePurchaseStatus(purchaseId: string, status: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('purchase_pipeline')
        .update({
          purchase_status: status,
          actual_completion_date:
            status === 'COMPLETED' ? new Date().toISOString().split('T')[0] : null,
        })
        .eq('id', purchaseId)

      if (error) throw error
    } catch (error) {
            throw error
    }
  }
}
