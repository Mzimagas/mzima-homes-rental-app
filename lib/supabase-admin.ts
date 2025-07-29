// Server-side Supabase admin utilities
// This file should only be imported in server-side code (API routes, server components, etc.)

import { createClient } from '@supabase/supabase-js'
import { Database } from './types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables for admin client')
}

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient<Database>(
  supabaseUrl, 
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Helper function to handle Supabase errors
export function handleSupabaseError(error: any) {
  console.error('Supabase error:', error)
  
  if (error?.code === 'PGRST116') {
    return 'No data found'
  }
  
  if (error?.code === '23505') {
    return 'This record already exists'
  }
  
  if (error?.code === '23503') {
    return 'Cannot delete this record because it is referenced by other data'
  }
  
  return error?.message || 'An unexpected error occurred'
}

// Admin-only business functions
export const adminFunctions = {
  // Generate monthly rent invoices
  async runMonthlyRent(periodStart: string, dueDate?: string) {
    try {
      const { data, error } = await supabaseAdmin.rpc('run_monthly_rent', {
        p_period_start: periodStart,
        p_due_date: dueDate
      })
      
      if (error) {
        return { data: null, error: handleSupabaseError(error) }
      }
      
      return { data, error: null }
    } catch (err) {
      return { data: null, error: handleSupabaseError(err) }
    }
  },

  // Terminate tenancy (admin operation)
  async terminateTenancy(
    tenancyAgreementId: string,
    terminationDate: string,
    reason?: string
  ) {
    try {
      const { data, error } = await supabaseAdmin.rpc('terminate_tenancy', {
        p_tenancy_agreement_id: tenancyAgreementId,
        p_termination_date: terminationDate,
        p_reason: reason
      })
      
      if (error) {
        return { data: null, error: handleSupabaseError(error) }
      }
      
      return { data, error: null }
    } catch (err) {
      return { data: null, error: handleSupabaseError(err) }
    }
  },

  // Mark overdue invoices (admin operation)
  async markOverdueInvoices() {
    try {
      const { data, error } = await supabaseAdmin.rpc('mark_overdue_invoices', {})
      
      if (error) {
        return { data: null, error: handleSupabaseError(error) }
      }
      
      return { data, error: null }
    } catch (err) {
      return { data: null, error: handleSupabaseError(err) }
    }
  },

  // Create user account (admin operation)
  async createUser(email: string, password: string, metadata?: any) {
    try {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: metadata
      })
      
      if (error) {
        return { data: null, error: handleSupabaseError(error) }
      }
      
      return { data, error: null }
    } catch (err) {
      return { data: null, error: handleSupabaseError(err) }
    }
  },

  // List users (admin operation)
  async listUsers() {
    try {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers()
      
      if (error) {
        return { data: null, error: handleSupabaseError(error) }
      }
      
      return { data, error: null }
    } catch (err) {
      return { data: null, error: handleSupabaseError(err) }
    }
  }
}

// Admin queries that bypass RLS
export const adminQueries = {
  // Get all properties (admin view)
  async getAllProperties() {
    return supabaseAdmin
      .from('properties')
      .select(`
        *,
        units (
          id,
          unit_label,
          monthly_rent_kes,
          is_active,
          tenants (
            id,
            full_name,
            status
          )
        )
      `)
      .order('name')
  },

  // Get all tenants (admin view)
  async getAllTenants() {
    return supabaseAdmin
      .from('tenants')
      .select(`
        *,
        units (
          *,
          properties (
            name,
            physical_address
          )
        )
      `)
      .order('full_name')
  },

  // Get property users for a specific property (admin view)
  async getPropertyUsers(propertyId: string) {
    return supabaseAdmin
      .from('property_users')
      .select('*')
      .eq('property_id', propertyId)
  }
}
