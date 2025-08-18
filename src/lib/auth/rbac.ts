// Role-Based Access Control (RBAC) System
import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Define user roles
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  SALES_AGENT = 'sales_agent',
  FINANCE = 'finance',
  OPERATIONS = 'operations',
  VIEWER = 'viewer'
}

// Define permissions
export enum Permission {
  // Parcel management
  VIEW_PARCELS = 'view_parcels',
  CREATE_PARCELS = 'create_parcels',
  EDIT_PARCELS = 'edit_parcels',
  DELETE_PARCELS = 'delete_parcels',

  // Subdivision management
  VIEW_SUBDIVISIONS = 'view_subdivisions',
  CREATE_SUBDIVISIONS = 'create_subdivisions',
  EDIT_SUBDIVISIONS = 'edit_subdivisions',
  DELETE_SUBDIVISIONS = 'delete_subdivisions',

  // Sales management
  VIEW_SALES = 'view_sales',
  CREATE_SALES = 'create_sales',
  EDIT_SALES = 'edit_sales',
  DELETE_SALES = 'delete_sales',
  APPROVE_SALES = 'approve_sales',

  // Financial management
  VIEW_FINANCIAL = 'view_financial',
  CREATE_INVOICES = 'create_invoices',
  EDIT_INVOICES = 'edit_invoices',
  PROCESS_PAYMENTS = 'process_payments',
  RECONCILE_ACCOUNTS = 'reconcile_accounts',
  MANAGE_COMMISSIONS = 'manage_commissions',

  // User management
  VIEW_USERS = 'view_users',
  CREATE_USERS = 'create_users',
  EDIT_USERS = 'edit_users',
  DELETE_USERS = 'delete_users',
  ASSIGN_ROLES = 'assign_roles',

  // Document management
  VIEW_DOCUMENTS = 'view_documents',
  UPLOAD_DOCUMENTS = 'upload_documents',
  EDIT_DOCUMENTS = 'edit_documents',
  DELETE_DOCUMENTS = 'delete_documents',

  // Reports and analytics
  VIEW_REPORTS = 'view_reports',
  EXPORT_DATA = 'export_data',

  // System administration
  SYSTEM_CONFIG = 'system_config',
  AUDIT_LOGS = 'audit_logs',
  BACKUP_RESTORE = 'backup_restore'
}

// Role-Permission mapping
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(Permission),

  [UserRole.ADMIN]: [
    Permission.VIEW_PARCELS,
    Permission.CREATE_PARCELS,
    Permission.EDIT_PARCELS,
    Permission.VIEW_SUBDIVISIONS,
    Permission.CREATE_SUBDIVISIONS,
    Permission.EDIT_SUBDIVISIONS,
    Permission.VIEW_SALES,
    Permission.CREATE_SALES,
    Permission.EDIT_SALES,
    Permission.APPROVE_SALES,
    Permission.VIEW_FINANCIAL,
    Permission.CREATE_INVOICES,
    Permission.EDIT_INVOICES,
    Permission.PROCESS_PAYMENTS,
    Permission.RECONCILE_ACCOUNTS,
    Permission.MANAGE_COMMISSIONS,
    Permission.VIEW_USERS,
    Permission.CREATE_USERS,
    Permission.EDIT_USERS,
    Permission.VIEW_DOCUMENTS,
    Permission.UPLOAD_DOCUMENTS,
    Permission.EDIT_DOCUMENTS,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_DATA,
    Permission.AUDIT_LOGS
  ],

  [UserRole.MANAGER]: [
    Permission.VIEW_PARCELS,
    Permission.EDIT_PARCELS,
    Permission.VIEW_SUBDIVISIONS,
    Permission.EDIT_SUBDIVISIONS,
    Permission.VIEW_SALES,
    Permission.CREATE_SALES,
    Permission.EDIT_SALES,
    Permission.APPROVE_SALES,
    Permission.VIEW_FINANCIAL,
    Permission.CREATE_INVOICES,
    Permission.EDIT_INVOICES,
    Permission.PROCESS_PAYMENTS,
    Permission.VIEW_USERS,
    Permission.VIEW_DOCUMENTS,
    Permission.UPLOAD_DOCUMENTS,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_DATA
  ],

  [UserRole.SALES_AGENT]: [
    Permission.VIEW_PARCELS,
    Permission.VIEW_SUBDIVISIONS,
    Permission.VIEW_SALES,
    Permission.CREATE_SALES,
    Permission.EDIT_SALES,
    Permission.VIEW_FINANCIAL,
    Permission.VIEW_DOCUMENTS,
    Permission.UPLOAD_DOCUMENTS,
    Permission.VIEW_REPORTS
  ],

  [UserRole.FINANCE]: [
    Permission.VIEW_PARCELS,
    Permission.VIEW_SUBDIVISIONS,
    Permission.VIEW_SALES,
    Permission.VIEW_FINANCIAL,
    Permission.CREATE_INVOICES,
    Permission.EDIT_INVOICES,
    Permission.PROCESS_PAYMENTS,
    Permission.RECONCILE_ACCOUNTS,
    Permission.MANAGE_COMMISSIONS,
    Permission.VIEW_DOCUMENTS,
    Permission.UPLOAD_DOCUMENTS,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_DATA
  ],

  [UserRole.OPERATIONS]: [
    Permission.VIEW_PARCELS,
    Permission.EDIT_PARCELS,
    Permission.VIEW_SUBDIVISIONS,
    Permission.CREATE_SUBDIVISIONS,
    Permission.EDIT_SUBDIVISIONS,
    Permission.VIEW_SALES,
    Permission.VIEW_FINANCIAL,
    Permission.VIEW_DOCUMENTS,
    Permission.UPLOAD_DOCUMENTS,
    Permission.EDIT_DOCUMENTS,
    Permission.VIEW_REPORTS
  ],

  [UserRole.VIEWER]: [
    Permission.VIEW_PARCELS,
    Permission.VIEW_SUBDIVISIONS,
    Permission.VIEW_SALES,
    Permission.VIEW_FINANCIAL,
    Permission.VIEW_DOCUMENTS,
    Permission.VIEW_REPORTS
  ]
}

// User interface
export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  department?: string
  phone?: string
  is_active: boolean
  last_login?: string
  created_at: string
  updated_at: string
}

// RBAC Service
export class RBACService {
  // Check if user has specific permission
  static hasPermission(userRole: UserRole, permission: Permission): boolean {
    const rolePermissions = ROLE_PERMISSIONS[userRole]
    return rolePermissions.includes(permission)
  }

  // Check if user has any of the specified permissions
  static hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(userRole, permission))
  }

  // Check if user has all specified permissions
  static hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(userRole, permission))
  }

  // Get all permissions for a role
  static getRolePermissions(role: UserRole): Permission[] {
    return ROLE_PERMISSIONS[role] || []
  }

  // Check if role can access module
  static canAccessModule(userRole: UserRole, module: string): boolean {
    switch (module) {
      case 'parcels':
        return this.hasPermission(userRole, Permission.VIEW_PARCELS)
      case 'subdivisions':
        return this.hasPermission(userRole, Permission.VIEW_SUBDIVISIONS)
      case 'sales':
        return this.hasPermission(userRole, Permission.VIEW_SALES)
      case 'financial':
        return this.hasPermission(userRole, Permission.VIEW_FINANCIAL)
      case 'users':
        return this.hasPermission(userRole, Permission.VIEW_USERS)
      case 'documents':
        return this.hasPermission(userRole, Permission.VIEW_DOCUMENTS)
      case 'reports':
        return this.hasPermission(userRole, Permission.VIEW_REPORTS)
      default:
        return false
    }
  }

  // Get user by ID
  static async getUser(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting user:', error)
      return null
    }
  }

  // Create user profile
  static async createUserProfile(userData: {
    id: string
    email: string
    full_name: string
    role: UserRole
    department?: string
    phone?: string
  }): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          ...userData,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating user profile:', error)
      return null
    }
  }

  // Update user role
  static async updateUserRole(userId: string, newRole: UserRole, updatedBy: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error

      // Log role change
      await this.logUserActivity(userId, 'role_change', updatedBy, {
        new_role: newRole
      })

      return true
    } catch (error) {
      console.error('Error updating user role:', error)
      return false
    }
  }

  // Deactivate user
  static async deactivateUser(userId: string, deactivatedBy: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error

      // Log deactivation
      await this.logUserActivity(userId, 'deactivate', deactivatedBy)

      return true
    } catch (error) {
      console.error('Error deactivating user:', error)
      return false
    }
  }

  // Get all users
  static async getAllUsers(filters?: {
    role?: UserRole
    department?: string
    is_active?: boolean
    search?: string
  }): Promise<User[]> {
    try {
      let query = supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters?.role) {
        query = query.eq('role', filters.role)
      }
      if (filters?.department) {
        query = query.eq('department', filters.department)
      }
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active)
      }
      if (filters?.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting users:', error)
      return []
    }
  }

  // Log user activity
  static async logUserActivity(
    userId: string,
    action: string,
    performedBy: string,
    metadata?: any
  ): Promise<void> {
    try {
      await supabase
        .from('user_activities')
        .insert({
          user_id: userId,
          action,
          performed_by: performedBy,
          metadata,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Error logging user activity:', error)
    }
  }

  // Update last login
  static async updateLastLogin(userId: string): Promise<void> {
    try {
      await supabase
        .from('user_profiles')
        .update({
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
    } catch (error) {
      console.error('Error updating last login:', error)
    }
  }

  // Check if user can perform action on resource
  static async canPerformAction(
    userId: string,
    action: Permission,
    resourceType?: string,
    resourceId?: string
  ): Promise<boolean> {
    try {
      const user = await this.getUser(userId)
      if (!user || !user.is_active) return false

      // Check basic permission
      if (!this.hasPermission(user.role, action)) return false

      // Additional resource-specific checks can be added here
      // For example, sales agents can only edit their own sales
      if (resourceType === 'sale_agreement' && user.role === UserRole.SALES_AGENT) {
        // Check if the sale agreement belongs to this agent
        const { data } = await supabase
          .from('sale_agreements')
          .select('agent_id')
          .eq('sale_agreement_id', resourceId)
          .single()

        return data?.agent_id === userId
      }

      return true
    } catch (error) {
      console.error('Error checking action permission:', error)
      return false
    }
  }
}

// React hook for RBAC
export function useRBAC() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          const userProfile = await RBACService.getUser(authUser.id)
          setUser(userProfile)

          // Update last login
          await RBACService.updateLastLogin(authUser.id)
        }
      } catch (error) {
        console.error('Error getting current user:', error)
      } finally {
        setLoading(false)
      }
    }

    getCurrentUser()
  }, [])

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false
    return RBACService.hasPermission(user.role, permission)
  }

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    if (!user) return false
    return RBACService.hasAnyPermission(user.role, permissions)
  }

  const canAccessModule = (module: string): boolean => {
    if (!user) return false
    return RBACService.canAccessModule(user.role, module)
  }

  return {
    user,
    loading,
    hasPermission,
    hasAnyPermission,
    canAccessModule,
    isAdmin: user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN,
    isSalesAgent: user?.role === UserRole.SALES_AGENT,
    isFinance: user?.role === UserRole.FINANCE,
    isOperations: user?.role === UserRole.OPERATIONS
  }
}

// Permission guard component
interface PermissionGuardProps {
  permission: Permission | Permission[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function PermissionGuard({ permission, children, fallback = null }: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission } = useRBAC()

  const hasAccess = Array.isArray(permission)
    ? hasAnyPermission(permission)
    : hasPermission(permission)

  return hasAccess ? children : fallback
}

// Module guard component
interface ModuleGuardProps {
  module: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ModuleGuard({ module, children, fallback = null }: ModuleGuardProps) {
  const { canAccessModule } = useRBAC()

  return canAccessModule(module) ? children : fallback
}

export default RBACService
