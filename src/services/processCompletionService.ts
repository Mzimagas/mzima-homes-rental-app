/**
 * Process Completion Service
 * Handles automatic completion of subdivision and handover processes
 * based on tracker progress and document completion
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface CompletionCheckResult {
  canComplete: boolean
  reason?: string
  progress?: number
  requirements?: {
    trackerComplete: boolean
    documentsComplete: boolean
    plotsCreated?: boolean
  }
}

export class ProcessCompletionService {
  /**
   * Check if subdivision can be automatically completed
   */
  static async checkSubdivisionCompletion(propertyId: string): Promise<CompletionCheckResult> {
    try {
      const adminClient = createClient(supabaseUrl, serviceKey)

      // Get property current status
      const { data: property, error: propError } = await adminClient
        .from('properties')
        .select('subdivision_status, handover_status')
        .eq('id', propertyId)
        .single()

      if (propError || !property) {
        return { canComplete: false, reason: 'Property not found' }
      }

      // Only check if subdivision is in progress
      if (property.subdivision_status !== 'SUB_DIVISION_STARTED') {
        return { canComplete: false, reason: 'Subdivision not in progress' }
      }

      // Check if handover is blocking
      if (property.handover_status === 'IN_PROGRESS' || property.handover_status === 'COMPLETED') {
        return { canComplete: false, reason: 'Handover process is active or completed' }
      }

      // Check subdivision pipeline progress
      const { data: subdivisionPipeline, error: pipelineError } = await adminClient
        .from('subdivision_pipeline')
        .select('overall_progress, pipeline_stages')
        .eq('property_id', propertyId)
        .single()

      const trackerComplete = subdivisionPipeline?.overall_progress === 100
      
      // Check if plots are created
      const { data: subdivision, error: subError } = await adminClient
        .from('property_subdivisions')
        .select('total_plots_planned, total_plots_created')
        .eq('original_property_id', propertyId)
        .single()

      const plotsCreated = subdivision ? 
        subdivision.total_plots_created >= subdivision.total_plots_planned : false

      // Check subdivision documents completion
      const { data: documents, error: docError } = await adminClient
        .from('property_documents')
        .select('document_type, status')
        .eq('property_id', propertyId)
        .eq('document_category', 'subdivision')

      const requiredSubdivisionDocs = [
        'survey_report', 'subdivision_plan', 'approval_certificate', 
        'plot_demarcation', 'infrastructure_plan'
      ]
      
      const documentsComplete = requiredSubdivisionDocs.every(docType => 
        documents?.some(doc => doc.document_type === docType && doc.status === 'approved')
      )

      const requirements = {
        trackerComplete,
        documentsComplete,
        plotsCreated
      }

      const canComplete = trackerComplete && documentsComplete && plotsCreated

      return {
        canComplete,
        reason: canComplete ? undefined : this.getSubdivisionBlockingReason(requirements),
        progress: subdivisionPipeline?.overall_progress || 0,
        requirements
      }
    } catch (error) {
      console.error('Error checking subdivision completion:', error)
      return { canComplete: false, reason: 'Error checking completion status' }
    }
  }

  /**
   * Check if handover can be automatically completed
   */
  static async checkHandoverCompletion(propertyId: string): Promise<CompletionCheckResult> {
    try {
      const adminClient = createClient(supabaseUrl, serviceKey)

      // Get property current status
      const { data: property, error: propError } = await adminClient
        .from('properties')
        .select('handover_status, subdivision_status')
        .eq('id', propertyId)
        .single()

      if (propError || !property) {
        return { canComplete: false, reason: 'Property not found' }
      }

      // Only check if handover is in progress
      if (property.handover_status !== 'IN_PROGRESS') {
        return { canComplete: false, reason: 'Handover not in progress' }
      }

      // Check if subdivision is blocking
      if (property.subdivision_status === 'SUB_DIVISION_STARTED') {
        return { canComplete: false, reason: 'Subdivision process is active' }
      }

      // Check handover pipeline progress
      const { data: handoverPipeline, error: pipelineError } = await adminClient
        .from('handover_pipeline')
        .select('overall_progress, pipeline_stages')
        .eq('property_id', propertyId)
        .single()

      const trackerComplete = handoverPipeline?.overall_progress === 100

      // Check handover documents completion
      const { data: documents, error: docError } = await adminClient
        .from('property_documents')
        .select('document_type, status')
        .eq('property_id', propertyId)
        .eq('document_category', 'handover')

      const requiredHandoverDocs = [
        'handover_certificate', 'final_inspection', 'keys_receipt',
        'warranty_documents', 'maintenance_manual'
      ]
      
      const documentsComplete = requiredHandoverDocs.every(docType => 
        documents?.some(doc => doc.document_type === docType && doc.status === 'approved')
      )

      const requirements = {
        trackerComplete,
        documentsComplete
      }

      const canComplete = trackerComplete && documentsComplete

      return {
        canComplete,
        reason: canComplete ? undefined : this.getHandoverBlockingReason(requirements),
        progress: handoverPipeline?.overall_progress || 0,
        requirements
      }
    } catch (error) {
      console.error('Error checking handover completion:', error)
      return { canComplete: false, reason: 'Error checking completion status' }
    }
  }

  /**
   * Automatically complete subdivision if all requirements are met
   */
  static async autoCompleteSubdivision(propertyId: string): Promise<{ success: boolean; message: string }> {
    try {
      const completionCheck = await this.checkSubdivisionCompletion(propertyId)
      
      if (!completionCheck.canComplete) {
        return { 
          success: false, 
          message: `Cannot auto-complete subdivision: ${completionCheck.reason}` 
        }
      }

      const adminClient = createClient(supabaseUrl, serviceKey)

      // Complete the subdivision
      const { error: updateError } = await adminClient
        .from('properties')
        .update({
          subdivision_status: 'SUBDIVIDED',
          subdivision_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', propertyId)

      if (updateError) {
        throw updateError
      }

      return {
        success: true,
        message: 'Subdivision automatically completed - tracker reached 100%, all documents approved, and plots created'
      }
    } catch (error) {
      console.error('Error auto-completing subdivision:', error)
      return { success: false, message: 'Failed to auto-complete subdivision' }
    }
  }

  /**
   * Automatically complete handover if all requirements are met
   */
  static async autoCompleteHandover(propertyId: string): Promise<{ success: boolean; message: string }> {
    try {
      const completionCheck = await this.checkHandoverCompletion(propertyId)
      
      if (!completionCheck.canComplete) {
        return { 
          success: false, 
          message: `Cannot auto-complete handover: ${completionCheck.reason}` 
        }
      }

      const adminClient = createClient(supabaseUrl, serviceKey)

      // Complete the handover
      const { error: updateError } = await adminClient
        .from('properties')
        .update({
          handover_status: 'COMPLETED',
          handover_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', propertyId)

      if (updateError) {
        throw updateError
      }

      return {
        success: true,
        message: 'Handover automatically completed - tracker reached 100% and all documents approved'
      }
    } catch (error) {
      console.error('Error auto-completing handover:', error)
      return { success: false, message: 'Failed to auto-complete handover' }
    }
  }

  /**
   * Get reason why subdivision cannot be completed
   */
  private static getSubdivisionBlockingReason(requirements: any): string {
    const missing = []
    if (!requirements.trackerComplete) missing.push('tracker not at 100%')
    if (!requirements.documentsComplete) missing.push('required documents not approved')
    if (!requirements.plotsCreated) missing.push('plots not created')
    
    return `Missing requirements: ${missing.join(', ')}`
  }

  /**
   * Get reason why handover cannot be completed
   */
  private static getHandoverBlockingReason(requirements: any): string {
    const missing = []
    if (!requirements.trackerComplete) missing.push('tracker not at 100%')
    if (!requirements.documentsComplete) missing.push('required documents not approved')
    
    return `Missing requirements: ${missing.join(', ')}`
  }
}
