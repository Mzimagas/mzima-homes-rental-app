/**
 * ADMINISTRATIVE BACKDOOR SYSTEM
 * 
 * This module implements a secure administrative safeguard mechanism that ensures
 * permanent access to the system for designated super-administrators. This serves
 * as a failsafe against hostile actors attempting to lock out legitimate administrators.
 * 
 * SECURITY FEATURES:
 * - Hardcoded at code level (not just database)
 * - Immutable super-admin accounts
 * - Bypass for all access controls
 * - Audit logging for backdoor usage
 * - Environment-based configuration with fallback
 * 
 * DESIGNATED SUPER-ADMIN: mzimagas@gmail.com
 * 
 * @author System Security Team
 * @version 1.0.0
 * @security CRITICAL - DO NOT MODIFY WITHOUT SECURITY REVIEW
 */

import { createClient } from '@supabase/supabase-js'
import { UserRole, Permission } from './rbac'

// CRITICAL: Hardcoded super-admin accounts - IMMUTABLE
const PERMANENT_SUPER_ADMINS = [
  'mzimagas@gmail.com',
  // Additional emergency accounts can be added here
  // 'emergency@company.com',
] as const

// Backup super-admin in case environment variable is compromised
const EMERGENCY_SUPER_ADMIN = 'mzimagas@gmail.com'

// Create admin client with service role key
const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, serviceKey)
}

/**
 * Administrative Backdoor Service
 * Provides emergency access and safeguard mechanisms
 */
export class AdminBackdoorService {
  
  /**
   * Check if an email is a permanent super-admin
   * This check is hardcoded and cannot be bypassed
   */
  static isPermanentSuperAdmin(email: string): boolean {
    if (!email) return false
    
    const normalizedEmail = email.toLowerCase().trim()
    
    // Primary check: Hardcoded list
    const isHardcodedAdmin = PERMANENT_SUPER_ADMINS.includes(normalizedEmail as any)
    
    // Secondary check: Environment variable (with fallback)
    const envAdmins = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || EMERGENCY_SUPER_ADMIN)
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean)
    
    const isEnvAdmin = envAdmins.includes(normalizedEmail)
    
    // Tertiary check: Emergency fallback
    const isEmergencyAdmin = normalizedEmail === EMERGENCY_SUPER_ADMIN
    
    return isHardcodedAdmin || isEnvAdmin || isEmergencyAdmin
  }

  /**
   * Get all permanent super-admin emails
   */
  static getPermanentSuperAdmins(): string[] {
    const hardcoded = [...PERMANENT_SUPER_ADMINS]
    const envAdmins = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean)
    
    // Combine and deduplicate
    return [...new Set([...hardcoded, ...envAdmins, EMERGENCY_SUPER_ADMIN])]
  }

  /**
   * Ensure super-admin account exists and has proper permissions
   * This function creates/updates the super-admin if needed
   */
  static async ensureSuperAdminAccess(email: string, userId?: string): Promise<boolean> {
    if (!this.isPermanentSuperAdmin(email)) {
      return false
    }

    try {
      const adminClient = getAdminClient()
      
      // Log backdoor usage for security audit
      await this.logBackdoorUsage(email, 'ENSURE_ACCESS', userId)

      // Check if user profile exists
      const { data: existingProfile } = await adminClient
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single()

      if (!existingProfile && userId) {
        // Create super-admin profile if it doesn't exist
        await adminClient
          .from('user_profiles')
          .upsert({
            id: userId,
            email: email,
            full_name: 'System Administrator',
            role: UserRole.SUPER_ADMIN,
            is_active: true,
            department: 'System Administration',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
      } else if (existingProfile) {
        // Ensure existing profile has super-admin role and is active
        await adminClient
          .from('user_profiles')
          .update({
            role: UserRole.SUPER_ADMIN,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('email', email)
      }

      return true
    } catch (error) {
      console.error('AdminBackdoor: Error ensuring super-admin access:', error)
      return false
    }
  }

  /**
   * Check if user has backdoor permissions (bypasses all normal checks)
   */
  static async hasBackdoorPermission(email: string, permission?: Permission): boolean {
    if (!this.isPermanentSuperAdmin(email)) {
      return false
    }

    // Log backdoor permission check
    await this.logBackdoorUsage(email, 'PERMISSION_CHECK', undefined, permission)

    // Super-admins have ALL permissions
    return true
  }

  /**
   * Get user with backdoor privileges (bypasses normal user lookup)
   */
  static async getBackdoorUser(email: string): Promise<any | null> {
    if (!this.isPermanentSuperAdmin(email)) {
      return null
    }

    try {
      const adminClient = getAdminClient()
      
      // Log backdoor user access
      await this.logBackdoorUsage(email, 'USER_ACCESS')

      // Try to get user profile
      const { data: profile } = await adminClient
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single()

      if (profile) {
        // Ensure super-admin role
        if (profile.role !== UserRole.SUPER_ADMIN) {
          await adminClient
            .from('user_profiles')
            .update({ 
              role: UserRole.SUPER_ADMIN,
              is_active: true,
              updated_at: new Date().toISOString()
            })
            .eq('email', email)
          
          profile.role = UserRole.SUPER_ADMIN
          profile.is_active = true
        }
        
        return profile
      }

      // If no profile exists, return a virtual super-admin profile
      return {
        id: 'backdoor-admin',
        email: email,
        full_name: 'System Administrator',
        role: UserRole.SUPER_ADMIN,
        is_active: true,
        department: 'System Administration',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    } catch (error) {
      console.error('AdminBackdoor: Error getting backdoor user:', error)
      return null
    }
  }

  /**
   * Log backdoor usage for security auditing
   */
  static async logBackdoorUsage(
    email: string, 
    action: string, 
    userId?: string, 
    permission?: string
  ): Promise<void> {
    try {
      const adminClient = getAdminClient()
      
      await adminClient
        .from('admin_backdoor_audit')
        .insert({
          admin_email: email,
          user_id: userId,
          action: action,
          permission: permission,
          timestamp: new Date().toISOString(),
          ip_address: 'system', // Could be enhanced to capture real IP
          user_agent: 'backdoor-system'
        })
    } catch (error) {
      // Fail silently to not break the backdoor functionality
      console.warn('AdminBackdoor: Could not log usage (non-critical):', error)
    }
  }

  /**
   * Emergency account creation (for disaster recovery)
   */
  static async createEmergencyAccess(email: string): Promise<{ success: boolean; message: string }> {
    if (!this.isPermanentSuperAdmin(email)) {
      return { success: false, message: 'Email not authorized for emergency access' }
    }

    try {
      const adminClient = getAdminClient()
      
      // Log emergency access creation
      await this.logBackdoorUsage(email, 'EMERGENCY_ACCESS_CREATION')

      // Create auth user if doesn't exist
      const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: {
          full_name: 'Emergency Administrator',
          emergency_access: true
        }
      })

      if (authError && !authError.message.includes('already registered')) {
        throw authError
      }

      const userId = authUser?.user?.id || 'emergency-admin'

      // Ensure super-admin profile
      await this.ensureSuperAdminAccess(email, userId)

      return { 
        success: true, 
        message: 'Emergency access ensured for super-admin account' 
      }
    } catch (error) {
      console.error('AdminBackdoor: Emergency access creation failed:', error)
      return { 
        success: false, 
        message: `Emergency access creation failed: ${error}` 
      }
    }
  }

  /**
   * Validate backdoor system integrity
   */
  static validateBackdoorIntegrity(): { valid: boolean; issues: string[] } {
    const issues: string[] = []

    // Check hardcoded admins
    if (PERMANENT_SUPER_ADMINS.length === 0) {
      issues.push('No hardcoded super-admins defined')
    }

    // Check emergency admin
    if (!EMERGENCY_SUPER_ADMIN) {
      issues.push('No emergency super-admin defined')
    }

    // Check environment configuration
    if (!process.env.NEXT_PUBLIC_ADMIN_EMAILS) {
      issues.push('NEXT_PUBLIC_ADMIN_EMAILS environment variable not set')
    }

    // Check Supabase configuration
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      issues.push('Supabase configuration incomplete')
    }

    return {
      valid: issues.length === 0,
      issues
    }
  }
}

export default AdminBackdoorService
