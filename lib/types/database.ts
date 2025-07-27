// Database types for Voi Rental Management App
// Generated from Supabase schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      landlords: {
        Row: {
          id: string
          full_name: string
          phone: string
          email: string
          default_currency: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          phone: string
          email: string
          default_currency?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          phone?: string
          email?: string
          default_currency?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      properties: {
        Row: {
          id: string
          landlord_id: string
          name: string
          physical_address: string
          lat: number | null
          lng: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          landlord_id: string
          name: string
          physical_address: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          landlord_id?: string
          name?: string
          physical_address?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      units: {
        Row: {
          id: string
          property_id: string
          unit_label: string
          monthly_rent_kes: number
          deposit_kes: number
          meter_type: 'TOKEN' | 'POSTPAID' | 'ANALOG' | 'NONE'
          kplc_account: string | null
          water_included: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          unit_label: string
          monthly_rent_kes: number
          deposit_kes?: number
          meter_type?: 'TOKEN' | 'POSTPAID' | 'ANALOG' | 'NONE'
          kplc_account?: string | null
          water_included?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          unit_label?: string
          monthly_rent_kes?: number
          deposit_kes?: number
          meter_type?: 'TOKEN' | 'POSTPAID' | 'ANALOG' | 'NONE'
          kplc_account?: string | null
          water_included?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      tenants: {
        Row: {
          id: string
          current_unit_id: string | null
          full_name: string
          phone: string
          national_id: string | null
          email: string | null
          start_date: string | null
          end_date: string | null
          status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          current_unit_id?: string | null
          full_name: string
          phone: string
          national_id?: string | null
          email?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: 'ACTIVE' | 'INACTIVE' | 'TERMINATED'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          current_unit_id?: string | null
          full_name?: string
          phone?: string
          national_id?: string | null
          email?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: 'ACTIVE' | 'INACTIVE' | 'TERMINATED'
          created_at?: string
          updated_at?: string
        }
      }
      tenancy_agreements: {
        Row: {
          id: string
          tenant_id: string
          unit_id: string
          start_date: string
          end_date: string | null
          rent_kes: number
          billing_day: number
          document_url: string | null
          status: 'DRAFT' | 'ACTIVE' | 'TERMINATED' | 'EXPIRED'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          unit_id: string
          start_date: string
          end_date?: string | null
          rent_kes: number
          billing_day?: number
          document_url?: string | null
          status?: 'DRAFT' | 'ACTIVE' | 'TERMINATED' | 'EXPIRED'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          unit_id?: string
          start_date?: string
          end_date?: string | null
          rent_kes?: number
          billing_day?: number
          document_url?: string | null
          status?: 'DRAFT' | 'ACTIVE' | 'TERMINATED' | 'EXPIRED'
          created_at?: string
          updated_at?: string
        }
      }
      rent_invoices: {
        Row: {
          id: string
          unit_id: string
          tenant_id: string
          tenancy_agreement_id: string | null
          period_start: string
          period_end: string
          due_date: string
          amount_due_kes: number
          amount_paid_kes: number
          status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          unit_id: string
          tenant_id: string
          tenancy_agreement_id?: string | null
          period_start: string
          period_end: string
          due_date: string
          amount_due_kes: number
          amount_paid_kes?: number
          status?: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          unit_id?: string
          tenant_id?: string
          tenancy_agreement_id?: string | null
          period_start?: string
          period_end?: string
          due_date?: string
          amount_due_kes?: number
          amount_paid_kes?: number
          status?: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE'
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          invoice_id: string | null
          tenant_id: string
          payment_date: string
          amount_kes: number
          method: 'MPESA' | 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER'
          tx_ref: string | null
          notes: string | null
          posted_by_user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id?: string | null
          tenant_id: string
          payment_date: string
          amount_kes: number
          method?: 'MPESA' | 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER'
          tx_ref?: string | null
          notes?: string | null
          posted_by_user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string | null
          tenant_id?: string
          payment_date?: string
          amount_kes?: number
          method?: 'MPESA' | 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER'
          tx_ref?: string | null
          notes?: string | null
          posted_by_user_id?: string | null
          created_at?: string
        }
      }
      payment_allocations: {
        Row: {
          id: string
          payment_id: string
          invoice_id: string
          amount_kes: number
          created_at: string
        }
        Insert: {
          id?: string
          payment_id: string
          invoice_id: string
          amount_kes: number
          created_at?: string
        }
        Update: {
          id?: string
          payment_id?: string
          invoice_id?: string
          amount_kes?: number
          created_at?: string
        }
      }
    }
    Functions: {
      run_monthly_rent: {
        Args: {
          p_period_start: string
          p_due_date?: string
        }
        Returns: {
          invoices_created: number
          total_amount_kes: number
        }[]
      }
      apply_payment: {
        Args: {
          p_tenant_id: string
          p_amount_kes: number
          p_payment_date: string
          p_method?: 'MPESA' | 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER'
          p_tx_ref?: string
          p_posted_by_user_id?: string
        }
        Returns: string
      }
      get_tenant_balance: {
        Args: {
          p_tenant_id: string
        }
        Returns: number
      }
      get_property_stats: {
        Args: {
          p_property_id: string
        }
        Returns: {
          total_units: number
          occupied_units: number
          vacant_units: number
          occupancy_rate: number
          monthly_rent_potential: number
          monthly_rent_actual: number
        }[]
      }
      terminate_tenancy: {
        Args: {
          p_tenancy_agreement_id: string
          p_termination_date: string
          p_reason?: string
        }
        Returns: string
      }
    }
  }
}

// Convenience types
export type Landlord = Database['public']['Tables']['landlords']['Row']
export type Property = Database['public']['Tables']['properties']['Row']
export type Unit = Database['public']['Tables']['units']['Row']
export type Tenant = Database['public']['Tables']['tenants']['Row']
export type TenancyAgreement = Database['public']['Tables']['tenancy_agreements']['Row']
export type RentInvoice = Database['public']['Tables']['rent_invoices']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']
export type PaymentAllocation = Database['public']['Tables']['payment_allocations']['Row']

// Extended types with relations
export type UnitWithProperty = Unit & {
  property: Property
}

export type TenantWithUnit = Tenant & {
  unit: Unit & {
    property: Property
  }
}

export type InvoiceWithDetails = RentInvoice & {
  tenant: Tenant
  unit: Unit & {
    property: Property
  }
}

export type PaymentWithAllocations = Payment & {
  allocations: (PaymentAllocation & {
    invoice: RentInvoice
  })[]
}
