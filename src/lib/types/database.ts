// Minimal shared types for frontend usage; adapt as schema evolves
// If you regenerate types from Supabase, replace this with the full Database type

export interface Payment {
  id: string
  tenant_id?: string | null
  unit_id?: string | null
  property_id?: string | null
  amount_kes: number
  method?: string | null
  payment_date: string
  created_at?: string
  // Common optional fields referenced in UI
  tx_ref?: string | null
  notes?: string | null
}

export interface Unit {
  id: string
  property_id?: string | null
  is_active?: boolean
  monthly_rent_kes?: number | null
  // Fields used throughout UI
  unit_label?: string
  deposit_kes?: number | null
  meter_type?: 'PREPAID' | 'POSTPAID_ANALOGUE'
  kplc_account?: string | null
  water_included?: boolean
  water_meter_type?: 'DIRECT_TAVEVO' | 'INTERNAL_SUBMETER' | null
  water_meter_number?: string | null
}

export interface Property {
  id: string
  landlord_id?: string | null
  name: string
  physical_address?: string | null
  property_type?: string | null
  notes?: string | null
  created_at?: string
}

export interface Tenant {
  id: string
  full_name: string
  phone?: string | null
  email?: string | null
  national_id?: string | null
  employer?: string | null
  notes?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  emergency_contact_relationship?: string | null
  emergency_contact_email?: string | null
  current_unit_id?: string | null
  created_at?: string
}

export interface TenancyAgreement {
  id: string
  tenant_id: string
  unit_id: string
  start_date: string
  end_date?: string | null
  status: string
  monthly_rent_kes?: number | null
  created_at?: string
}


// Placeholder Database type to satisfy supabase client generics
// Replace with generated types when available
export type Database = Record<string, unknown>

