import { supabase } from '../supabase-client'

export interface FieldSecurityConfig {
  field_name: string
  security_level: 'PUBLIC' | 'RESTRICTED' | 'CONFIDENTIAL' | 'LOCKED'
  requires_reason: boolean
  requires_approval: boolean
  allowed_roles: string[]
  max_changes_per_day: number | null
  lock_after_stage: number | null
}

export interface ChangeRequest {
  field_name: string
  old_value: any
  new_value: any
  reason?: string
  business_justification?: string
}

export interface AuditLogEntry {
  id: string
  purchase_id: string
  operation_type: string
  changed_fields: string[]
  old_values: any
  new_values: any
  changed_by: string
  change_reason?: string
  requires_approval: boolean
  approved_by?: string
  approved_at?: string
  created_at: string
}

export class FieldSecurityService {
  // Get security configuration for all fields
  static async getFieldSecurityConfig(): Promise<FieldSecurityConfig[]> {
    const { data, error } = await supabase
      .from('purchase_pipeline_field_security')
      .select('*')
      .order('field_name')

    if (error) throw error
    return data || []
  }

  // Check if user can modify a specific field
  static async canModifyField(
    fieldName: string, 
    userRole: string, 
    currentStage?: number
  ): Promise<{ canModify: boolean; reason?: string }> {
    const { data: config } = await supabase
      .from('purchase_pipeline_field_security')
      .select('*')
      .eq('field_name', fieldName)
      .single()

    if (!config) {
      return { canModify: true } // No restrictions if not configured
    }

    // Check role permissions
    if (config.allowed_roles.length > 0 && !config.allowed_roles.includes(userRole)) {
      return { 
        canModify: false, 
        reason: `Insufficient permissions. Required roles: ${config.allowed_roles.join(', ')}` 
      }
    }

    // Check stage-based locking
    if (config.lock_after_stage && currentStage && currentStage > config.lock_after_stage) {
      return { 
        canModify: false, 
        reason: `Field is locked after stage ${config.lock_after_stage}. Current stage: ${currentStage}` 
      }
    }

    // Check daily change limits
    if (config.max_changes_per_day) {
      const today = new Date().toISOString().split('T')[0]
      const { count } = await supabase
        .from('purchase_pipeline_audit_log')
        .select('*', { count: 'exact', head: true })
        .contains('changed_fields', [fieldName])
        .gte('created_at', `${today}T00:00:00Z`)
        .eq('changed_by', (await supabase.auth.getUser()).data.user?.id)

      if (count && count >= config.max_changes_per_day) {
        return { 
          canModify: false, 
          reason: `Daily change limit exceeded (${config.max_changes_per_day} changes per day)` 
        }
      }
    }

    return { canModify: true }
  }

  // Validate change request before processing
  static async validateChangeRequest(
    purchaseId: string,
    changes: ChangeRequest[],
    userRole: string,
    currentStage?: number
  ): Promise<{ valid: boolean; errors: string[]; requiresApproval: boolean }> {
    const errors: string[] = []
    let requiresApproval = false

    for (const change of changes) {
      const canModify = await this.canModifyField(change.field_name, userRole, currentStage)
      
      if (!canModify.canModify) {
        errors.push(`${change.field_name}: ${canModify.reason}`)
        continue
      }

      // Check if field requires reason
      const { data: config } = await supabase
        .from('purchase_pipeline_field_security')
        .select('requires_reason, requires_approval')
        .eq('field_name', change.field_name)
        .single()

      if (config?.requires_reason && !change.reason) {
        errors.push(`${change.field_name}: Change reason is required`)
      }

      if (config?.requires_approval) {
        requiresApproval = true
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      requiresApproval
    }
  }

  // Create change approval request
  static async createChangeApprovalRequest(
    purchaseId: string,
    changes: ChangeRequest[],
    businessJustification: string,
    riskAssessment?: string
  ): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const changeSummary = changes.map(c => 
      `${c.field_name}: ${c.old_value} → ${c.new_value}`
    ).join('; ')

    const { data, error } = await supabase
      .from('purchase_pipeline_change_approvals')
      .insert({
        purchase_id: purchaseId,
        requested_by: user.id,
        approver_role: 'finance_manager', // Determine based on field types
        change_summary: changeSummary,
        business_justification: businessJustification,
        risk_assessment: riskAssessment
      })
      .select('id')
      .single()

    if (error) throw error
    return data.id
  }

  // Get audit trail for a purchase
  static async getAuditTrail(purchaseId: string): Promise<AuditLogEntry[]> {
    try {
      // Validate UUID format if needed
      if (purchaseId && !this.isValidUUID(purchaseId)) {
        console.warn('Invalid UUID format for purchase ID:', purchaseId)
        return [] // Return empty array for invalid UUIDs instead of throwing
      }

      const { data, error } = await supabase
        .from('purchase_pipeline_audit_log')
        .select('*')
        .eq('purchase_id', purchaseId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching audit trail:', error)
        throw new Error(`Failed to fetch audit trail: ${error.message || 'Unknown database error'}`)
      }

      return data || []
    } catch (error) {
      console.error('Error in getAuditTrail:', error)
      if (error instanceof Error) {
        throw error
      } else {
        throw new Error('Failed to fetch audit trail: Unknown error')
      }
    }
  }

  // Helper method to validate UUID format
  private static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }

  // Get pending approvals for user
  static async getPendingApprovals(userRole: string): Promise<any[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('User not authenticated for pending approvals')
        return []
      }

      const { data, error } = await supabase
        .from('purchase_pipeline_change_approvals')
        .select('*')
        .eq('status', 'PENDING')
        .eq('approver_role', userRole)
        .order('requested_at', { ascending: true })

      if (error) {
        console.error('Error fetching pending approvals:', error)
        throw new Error(`Failed to fetch pending approvals: ${error.message || 'Unknown database error'}`)
      }

      return data || []
    } catch (error) {
      console.error('Error in getPendingApprovals:', error)
      if (error instanceof Error) {
        throw error
      } else {
        throw new Error('Failed to fetch pending approvals: Unknown error')
      }
    }
  }

  // Approve or reject change request
  static async processApproval(
    approvalId: string,
    action: 'APPROVED' | 'REJECTED',
    notes?: string
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('purchase_pipeline_change_approvals')
        .update({
          status: action,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          approval_notes: notes
        })
        .eq('id', approvalId)

      if (error) {
        console.error('Error processing approval:', error)
        throw new Error(`Failed to process approval: ${error.message || 'Unknown database error'}`)
      }

      // If approved, update the corresponding audit log entry
      if (action === 'APPROVED') {
        const { data: approval, error: fetchError } = await supabase
          .from('purchase_pipeline_change_approvals')
          .select('audit_log_id')
          .eq('id', approvalId)
          .single()

        if (fetchError) {
          console.error('Error fetching approval data:', fetchError)
          // Don't throw here, the main approval was successful
        } else if (approval?.audit_log_id) {
          const { error: updateError } = await supabase
            .from('purchase_pipeline_audit_log')
            .update({
              approved_by: user.id,
              approved_at: new Date().toISOString()
            })
            .eq('id', approval.audit_log_id)

          if (updateError) {
            console.error('Error updating audit log:', updateError)
            // Don't throw here, the main approval was successful
          }
        }
      }
    } catch (error) {
      console.error('Error in processApproval:', error)
      if (error instanceof Error) {
        throw error
      } else {
        throw new Error('Failed to process approval: Unknown error')
      }
    }
  }

  // Check if field is currently locked
  static async isFieldLocked(
    fieldName: string,
    currentStage?: number
  ): Promise<boolean> {
    try {
      const { data: config, error } = await supabase
        .from('purchase_pipeline_field_security')
        .select('security_level, lock_after_stage')
        .eq('field_name', fieldName)
        .single()

      if (error) {
        console.error('Error checking field lock status:', error)
        return false // Default to unlocked if we can't determine
      }

      if (!config) return false

      // LOCKED security level means field is permission-controlled, not stage-locked
      // LOCKED fields are accessible to authorized users regardless of stage
      if (config.security_level === 'LOCKED') return false

      // PUBLIC fields are never locked
      if (config.security_level === 'PUBLIC') return false

      // Check stage-based locking
      if (config.lock_after_stage && currentStage && currentStage > config.lock_after_stage) {
        return true
      }

      return false
    } catch (error) {
      console.error('Error in isFieldLocked:', error)
      return false // Default to unlocked on error
    }
  }

  // Get field security summary for UI
  static async getFieldSecuritySummary(
    fieldNames: string[],
    userRole: string,
    currentStage?: number
  ): Promise<Record<string, { canModify: boolean; requiresReason: boolean; requiresApproval: boolean; isLocked: boolean }>> {
    const summary: Record<string, any> = {}

    for (const fieldName of fieldNames) {
      const canModify = await this.canModifyField(fieldName, userRole, currentStage)
      const isLocked = await this.isFieldLocked(fieldName, currentStage)
      
      const { data: config } = await supabase
        .from('purchase_pipeline_field_security')
        .select('requires_reason, requires_approval')
        .eq('field_name', fieldName)
        .single()

      summary[fieldName] = {
        canModify: canModify.canModify,
        requiresReason: config?.requires_reason || false,
        requiresApproval: config?.requires_approval || false,
        isLocked
      }
    }

    return summary
  }
}
