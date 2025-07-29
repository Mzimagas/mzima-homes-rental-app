import { createClient } from '@supabase/supabase-js'
import { Database } from './types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Client for browser/frontend use (with RLS)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Function to create admin client only when needed (server-side)
export function createSupabaseAdmin() {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
  }

  return createClient<Database>(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

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

// Type-safe RPC function calls
export async function callRPC<T = any>(
  functionName: string,
  params?: Record<string, any>,
  useAdmin = false
): Promise<{ data: T | null; error: string | null }> {
  try {
    const client = useAdmin ? createSupabaseAdmin() : supabase
    const { data, error } = await client.rpc(functionName, params)

    if (error) {
      return { data: null, error: handleSupabaseError(error) }
    }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: handleSupabaseError(err) }
  }
}

// Client-side business logic function wrappers (using regular supabase client with RLS)
export const businessFunctions = {
  // Apply payment to tenant account
  async applyPayment(
    tenantId: string,
    amountKes: number,
    paymentDate: string,
    method: 'MPESA' | 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER' = 'MPESA',
    txRef?: string,
    postedByUserId?: string
  ) {
    return callRPC<string>(
      'apply_payment',
      {
        p_tenant_id: tenantId,
        p_amount_kes: amountKes,
        p_payment_date: paymentDate,
        p_method: method,
        p_tx_ref: txRef,
        p_posted_by_user_id: postedByUserId
      }
    )
  },

  // Get tenant outstanding balance
  async getTenantBalance(tenantId: string) {
    return callRPC<number>('get_tenant_balance', { p_tenant_id: tenantId })
  },

  // Get property statistics
  async getPropertyStats(propertyId: string) {
    return callRPC<{
      total_units: number
      occupied_units: number
      vacant_units: number
      occupancy_rate: number
      monthly_rent_potential: number
      monthly_rent_actual: number
    }[]>('get_property_stats', { p_property_id: propertyId })
  },

  // Get tenant payment history
  async getTenantPaymentHistory(tenantId: string, limit = 50) {
    return callRPC<{
      payment_date: string
      amount_kes: number
      method: string
      tx_ref: string | null
      allocated_to_invoices: any[]
    }[]>('get_tenant_payment_history', { p_tenant_id: tenantId, p_limit: limit })
  }
}

// Client-side utility functions for common queries (respects RLS)
export const queries = {
  // Get accessible properties for current user (using multi-user system)
  async getAccessibleProperties() {
    return supabase.rpc('get_user_accessible_properties')
  },

  // Get properties for a specific user (legacy support)
  async getPropertiesByLandlord(landlordId: string) {
    return supabase
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
      .eq('landlord_id', landlordId)
      .order('name')
  },

  // Get tenant details with current unit
  async getTenantWithUnit(tenantId: string) {
    return supabase
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
      .eq('id', tenantId)
      .single()
  },

  // Get outstanding invoices for a tenant
  async getOutstandingInvoices(tenantId: string) {
    return supabase
      .from('rent_invoices')
      .select(`
        *,
        units (
          unit_label,
          properties (
            name
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .in('status', ['PENDING', 'PARTIAL', 'OVERDUE'])
      .order('due_date')
  },

  // Get recent payments for accessible properties
  async getRecentPayments(propertyId: string, limit = 20) {
    return supabase
      .from('payments')
      .select(`
        *,
        tenants (
          full_name,
          units (
            unit_label
          )
        )
      `)
      .eq('tenants.units.property_id', propertyId)
      .order('payment_date', { ascending: false })
      .limit(limit)
  },

  // Get property users (for user management)
  async getPropertyUsers(propertyId: string) {
    return supabase
      .from('property_users')
      .select('*')
      .eq('property_id', propertyId)
      .eq('status', 'ACTIVE')
  },

  // Get pending invitations for a property
  async getPendingInvitations(propertyId: string) {
    return supabase
      .from('user_invitations')
      .select('*')
      .eq('property_id', propertyId)
      .eq('status', 'PENDING')
  }
}
