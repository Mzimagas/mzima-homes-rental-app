import supabase from '../supabase-client'

export interface UserRole {
  id: string
  user_id: string
  role: string
  permissions: string[]
  assigned_by: string
  assigned_at: string
  expires_at?: string
  is_active: boolean
}

export interface RoleDefinition {
  role: string
  display_name: string
  description: string
  permissions: string[]
  hierarchy_level: number
}

export class RoleManagementService {
  // Cache for user roles to avoid repeated API calls
  private static roleCache = new Map<string, { roles: UserRole[]; timestamp: number }>()
  private static readonly CACHE_TTL = 10 * 60 * 1000 // 10 minutes
  private static readonly RETRY_DELAYS = [1000, 3000, 9000] // Exponential backoff
  private static retryCount = 0

  // Predefined roles and their permissions
  static readonly ROLE_DEFINITIONS: RoleDefinition[] = [
    {
      role: 'admin',
      display_name: 'Administrator',
      description: 'Full system access with all permissions',
      permissions: ['*'], // Wildcard for all permissions
      hierarchy_level: 100,
    },
    {
      role: 'finance_manager',
      display_name: 'Finance Manager',
      description: 'Manage financial data and approve financial changes',
      permissions: [
        'view_financial_data',
        'edit_financial_data',
        'approve_financial_changes',
        'view_audit_logs',
        'manage_payments',
      ],
      hierarchy_level: 80,
    },
    {
      role: 'property_manager',
      display_name: 'Property Manager',
      description: 'Manage properties and basic operations',
      permissions: [
        'view_properties',
        'edit_properties',
        'create_properties',
        'manage_tenants',
        'view_basic_financial_data',
        'edit_property_details',
      ],
      hierarchy_level: 60,
    },
    {
      role: 'legal',
      display_name: 'Legal Representative',
      description: 'Manage legal documents and compliance',
      permissions: [
        'view_legal_documents',
        'edit_legal_documents',
        'manage_contracts',
        'view_audit_logs',
        'approve_legal_changes',
      ],
      hierarchy_level: 70,
    },
    {
      role: 'workflow_manager',
      display_name: 'Workflow Manager',
      description: 'Manage workflow stages and status changes',
      permissions: [
        'view_workflows',
        'edit_workflow_stages',
        'approve_status_changes',
        'manage_pipeline_stages',
      ],
      hierarchy_level: 65,
    },
    {
      role: 'risk_manager',
      display_name: 'Risk Manager',
      description: 'Assess and manage risks',
      permissions: [
        'view_risk_assessments',
        'edit_risk_assessments',
        'approve_risk_changes',
        'view_audit_logs',
      ],
      hierarchy_level: 70,
    },
    {
      role: 'inspector',
      display_name: 'Property Inspector',
      description: 'Inspect properties and update condition reports',
      permissions: ['view_properties', 'edit_property_conditions', 'create_inspection_reports'],
      hierarchy_level: 40,
    },
    {
      role: 'surveyor',
      display_name: 'Surveyor',
      description: 'Conduct surveys and update survey status',
      permissions: ['view_properties', 'edit_survey_status', 'create_survey_reports'],
      hierarchy_level: 50,
    },
    {
      role: 'project_manager',
      display_name: 'Project Manager',
      description: 'Manage project timelines and completion dates',
      permissions: [
        'view_projects',
        'edit_project_timelines',
        'manage_completion_dates',
        'view_progress_reports',
      ],
      hierarchy_level: 65,
    },
    {
      role: 'viewer',
      display_name: 'Viewer',
      description: 'Read-only access to basic information',
      permissions: ['view_properties', 'view_basic_data'],
      hierarchy_level: 10,
    },
  ]

  // Get current user's roles with caching and enhanced error handling
  static async getCurrentUserRoles(): Promise<UserRole[]> {
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Getting current user roles...')
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('User not authenticated')
        }
        return []
      }

      // Check cache first
      const cached = this.roleCache.get(user.id)
      const now = Date.now()

      if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Returning cached roles for user:', user.id)
        }
        return cached.roles
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log('Current user ID:', user.id)
      }

      const { data, error } = await supabase
        .from('security_user_roles')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (process.env.NODE_ENV !== 'production') {
        console.log('Database query result:', { data, error })
      }

      if (error) {
        console.warn('Error fetching user roles:', error)

        // Check if it's a server error (500+) - RLS recursion typically shows as 500
        if (error.code === 'PGRST301' || (error.message && error.message.includes('infinite recursion'))) {
          console.warn('RLS recursion detected, attempting fallback...')

          // Implement exponential backoff for server errors
          if (this.retryCount < this.RETRY_DELAYS.length) {
            const delay = this.RETRY_DELAYS[this.retryCount]
            this.retryCount++

            console.warn(`Backing off for ${delay}ms before retry...`)
            await new Promise(resolve => setTimeout(resolve, delay))
          }

          // Try fallback RPC if available
          try {
            const { data: rpcData, error: rpcError } = await supabase
              .rpc('get_user_active_roles', { p_uid: user.id })

            if (!rpcError && rpcData) {
              if (process.env.NODE_ENV !== 'production') {
                console.log('Fallback RPC successful:', rpcData)
              }

              // Cache successful result
              this.roleCache.set(user.id, { roles: rpcData, timestamp: now })
              this.retryCount = 0 // Reset retry count on success
              return rpcData
            }
          } catch (rpcErr) {
            console.warn('Fallback RPC also failed:', rpcErr)
          }

          // Show user-friendly error for server issues
          throw new Error('Server error: Unable to load user roles. Please try again or contact support.')
        }

        return []
      }

      // Cache successful result
      const roles = data || []
      this.roleCache.set(user.id, { roles, timestamp: now })
      this.retryCount = 0 // Reset retry count on success

      if (process.env.NODE_ENV !== 'production') {
        console.log('Returning roles:', roles)
      }
      return roles
    } catch (error) {
      console.log('Error in getCurrentUserRoles:', error)
      return []
    }
  }

  // Get user's highest role with enhanced error handling
  static async getCurrentUserRole(): Promise<string> {
    try {
      const roles = await this.getCurrentUserRoles()
      if (roles.length === 0) {
        console.log('No roles assigned to user, defaulting to property_manager')
        return 'property_manager' // Default role for property management
      }

      // Return the role with highest hierarchy level
      const highestRole = roles.reduce((highest, current) => {
        const currentDef = this.ROLE_DEFINITIONS.find((r) => r.role === current.role)
        const highestDef = this.ROLE_DEFINITIONS.find((r) => r.role === highest.role)

        if (!currentDef) return highest
        if (!highestDef) return current

        return currentDef.hierarchy_level > highestDef.hierarchy_level ? current : highest
      })

      return highestRole.role
    } catch (error) {
      console.warn('Error getting user role:', error)

      // If it's a server error, show a warning but still provide fallback
      if (error instanceof Error && error.message.includes('Server error:')) {
        console.warn('Server error detected in getCurrentUserRole, using fallback role')
        // Could show a toast notification here in the future
      }

      console.log('Defaulting to property_manager role')
      return 'property_manager' // Fallback to property_manager role
    }
  }

  // Check if user has specific permission
  static async hasPermission(permission: string): Promise<boolean> {
    try {
      const roles = await this.getCurrentUserRoles()

      for (const userRole of roles) {
        const roleDef = this.ROLE_DEFINITIONS.find((r) => r.role === userRole.role)
        if (!roleDef) continue

        // Check for wildcard permission (admin)
        if (roleDef.permissions.includes('*')) return true

        // Check for specific permission
        if (roleDef.permissions.includes(permission)) return true
      }

      return false
    } catch (error) {
      console.warn('Error checking permission:', error)
      return false
    }
  }

  // Get all permissions for current user
  static async getCurrentUserPermissions(): Promise<string[]> {
    try {
      console.log('Getting user permissions...')
      const roles = await this.getCurrentUserRoles()
      console.log('User roles from database:', roles)

      const permissions = new Set<string>()

      for (const userRole of roles) {
        console.log('Processing role:', userRole.role)
        const roleDef = this.ROLE_DEFINITIONS.find((r) => r.role === userRole.role)
        console.log('Role definition found:', roleDef)

        if (!roleDef) continue

        // If user has admin role, return all permissions
        if (roleDef.permissions.includes('*')) {
          console.log('Admin role detected, returning all permissions')
          return ['*']
        }

        roleDef.permissions.forEach((permission) => permissions.add(permission))
      }

      const finalPermissions = Array.from(permissions)
      console.log('Final permissions:', finalPermissions)
      return finalPermissions
    } catch (error) {
      console.warn('Error getting user permissions:', error)
      return []
    }
  }

  // Assign role to user (admin only)
  static async assignRole(userId: string, role: string, expiresAt?: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Check if current user has permission to assign roles
    const hasPermission = await this.hasPermission('manage_user_roles')
    if (!hasPermission) {
      throw new Error('Insufficient permissions to assign roles')
    }

    const { error } = await supabase.from('security_user_roles').insert({
      user_id: userId,
      role: role,
      assigned_by: user.id,
      expires_at: expiresAt,
      is_active: true,
    })

    if (error) throw error
  }

  // Revoke role from user (admin only)
  static async revokeRole(userId: string, role: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Check if current user has permission to revoke roles
    const hasPermission = await this.hasPermission('manage_user_roles')
    if (!hasPermission) {
      throw new Error('Insufficient permissions to revoke roles')
    }

    const { error } = await supabase
      .from('security_user_roles')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('role', role)

    if (error) throw error
  }

  // Get role definition
  static getRoleDefinition(role: string): RoleDefinition | undefined {
    return this.ROLE_DEFINITIONS.find((r) => r.role === role)
  }

  // Get all available roles
  static getAllRoles(): RoleDefinition[] {
    return this.ROLE_DEFINITIONS
  }

  // Check if user can modify field based on role
  static async canModifyField(fieldName: string): Promise<boolean> {
    const userRole = await this.getCurrentUserRole()
    const roleDef = this.getRoleDefinition(userRole)

    if (!roleDef) return false

    // Admin can modify everything
    if (roleDef.permissions.includes('*')) return true

    // Map field names to required permissions
    const fieldPermissions: Record<string, string> = {
      asking_price_kes: 'edit_financial_data',
      negotiated_price_kes: 'edit_financial_data',
      deposit_paid_kes: 'edit_financial_data',
      property_name: 'edit_property_details',
      property_address: 'edit_property_details',
      property_type: 'edit_property_details',
      contract_reference: 'edit_legal_documents',
      title_deed_status: 'edit_legal_documents',
      legal_representative: 'edit_legal_documents',
      survey_status: 'edit_survey_status',
      property_condition_notes: 'edit_property_conditions',
      risk_assessment: 'edit_risk_assessments',
      purchase_status: 'edit_workflow_stages',
      current_stage: 'edit_workflow_stages',
    }

    const requiredPermission = fieldPermissions[fieldName]
    if (!requiredPermission) return true // No specific permission required

    return roleDef.permissions.includes(requiredPermission)
  }

  // Clear role cache (useful for logout or role changes)
  static clearRoleCache(userId?: string): void {
    if (userId) {
      this.roleCache.delete(userId)
    } else {
      this.roleCache.clear()
    }
    this.retryCount = 0
  }

  // Get cache stats (for debugging)
  static getCacheStats(): { size: number; entries: Array<{ userId: string; age: number }> } {
    const now = Date.now()
    const entries = Array.from(this.roleCache.entries()).map(([userId, cached]) => ({
      userId,
      age: now - cached.timestamp
    }))

    return { size: this.roleCache.size, entries }
  }

  // Get all available role definitions
  static getRoleDefinitions(): RoleDefinition[] {
    return this.ROLE_DEFINITIONS
  }
}
