import { Property, Unit, Tenant, TenancyAgreement } from '../../../lib/types/database'

// Extended types for rental management
export interface RentalProperty extends Property {
  units?: RentalUnit[]
  total_units?: number
  occupied_units?: number
  vacancy_rate?: number
  monthly_income?: number
  is_published?: boolean
}

export interface RentalUnit extends Unit {
  tenant?: Tenant | null
  tenancy_agreement?: TenancyAgreement | null
  last_inspection_date?: string
  next_inspection_date?: string
  maintenance_requests_count?: number
  rent_status?: 'CURRENT' | 'OVERDUE' | 'PARTIAL' | 'VACANT'
  available_from?: string
  amenities?: string[]
  photos?: UnitPhoto[]
}

export interface UnitPhoto {
  id: string
  unit_id: string
  url: string
  alt_text?: string
  order_index: number
  type: 'PHOTO' | 'FLOOR_PLAN'
  created_at: string
}

export interface RentalTenant extends Tenant {
  current_unit?: RentalUnit
  tenancy_agreements?: TenancyAgreement[]
  rent_balance?: number
  last_payment_date?: string
  payment_history?: PaymentRecord[]
  maintenance_requests?: MaintenanceRequest[]
}

export interface LeaseAgreement extends TenancyAgreement {
  tenant?: Tenant
  unit?: RentalUnit
  property?: Property
  lease_terms?: LeaseTerms
  documents?: LeaseDocument[]
  renewal_history?: LeaseRenewal[]
}

export interface LeaseTerms {
  security_deposit?: number
  pet_deposit?: number
  late_fee_amount?: number
  late_fee_grace_days?: number
  utilities_included?: string[]
  parking_included?: boolean
  smoking_allowed?: boolean
  pets_allowed?: boolean
  max_occupants?: number
  lease_break_fee?: number
}

export interface LeaseDocument {
  id: string
  lease_id: string
  document_type: 'LEASE_AGREEMENT' | 'ADDENDUM' | 'INSPECTION_REPORT' | 'OTHER'
  file_name: string
  file_url: string
  uploaded_at: string
  uploaded_by: string
}

export interface LeaseRenewal {
  id: string
  original_lease_id: string
  new_lease_id: string
  renewal_date: string
  new_rent_amount?: number
  new_end_date: string
  notes?: string
}

export interface PaymentRecord {
  id: string
  tenant_id: string
  amount: number
  payment_date: string
  payment_method: 'CASH' | 'BANK_TRANSFER' | 'MPESA' | 'CHEQUE' | 'CARD'
  reference_number?: string
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  invoice_id?: string
  notes?: string
}

export interface MaintenanceRequest {
  id: string
  property_id: string
  unit_id?: string
  tenant_id?: string
  title: string
  description: string
  category: 'PLUMBING' | 'ELECTRICAL' | 'HVAC' | 'APPLIANCE' | 'STRUCTURAL' | 'COSMETIC' | 'OTHER'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: 'SUBMITTED' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  submitted_date: string
  acknowledged_date?: string
  completed_date?: string
  assigned_to?: string
  estimated_cost?: number
  actual_cost?: number
  photos?: string[]
  notes?: string
}

export interface PropertyInspection {
  id: string
  property_id: string
  unit_id?: string
  inspection_type: 'MOVE_IN' | 'MOVE_OUT' | 'ROUTINE' | 'MAINTENANCE' | 'EMERGENCY'
  scheduled_date: string
  completed_date?: string
  inspector_name: string
  tenant_id?: string
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  checklist_items?: InspectionItem[]
  photos?: string[]
  notes?: string
  overall_condition?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
}

export interface InspectionItem {
  id: string
  category: string
  item: string
  condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED'
  notes?: string
  photos?: string[]
  requires_attention: boolean
}

export interface RentRoll {
  property_id: string
  property_name: string
  units: RentRollUnit[]
  total_units: number
  occupied_units: number
  vacancy_rate: number
  total_monthly_rent: number
  collected_rent: number
  outstanding_rent: number
  collection_rate: number
}

export interface RentRollUnit {
  unit_id: string
  unit_label: string
  tenant_name?: string
  monthly_rent: number
  rent_status: 'CURRENT' | 'OVERDUE' | 'PARTIAL' | 'VACANT'
  balance: number
  lease_start?: string
  lease_end?: string
  move_in_date?: string
}

export interface FinancialReport {
  period_start: string
  period_end: string
  total_income: number
  total_expenses: number
  net_income: number
  properties: PropertyFinancials[]
  income_breakdown: IncomeBreakdown
  expense_breakdown: ExpenseBreakdown
}

export interface PropertyFinancials {
  property_id: string
  property_name: string
  rental_income: number
  other_income: number
  total_income: number
  expenses: number
  net_income: number
  occupancy_rate: number
}

export interface IncomeBreakdown {
  rental_income: number
  late_fees: number
  pet_fees: number
  parking_fees: number
  other_income: number
}

export interface ExpenseBreakdown {
  maintenance: number
  utilities: number
  insurance: number
  property_tax: number
  management_fees: number
  marketing: number
  other_expenses: number
}

// Tab types for navigation
export type RentalManagementTab =
  | 'properties'
  | 'tenants'
  | 'leases'
  | 'smart-allocation'
  | 'payments'
  | 'maintenance'
  | 'inspections'
  | 'reports'
  | 'documents'

// Form types
export interface RentalPropertyFormData {
  name: string
  physical_address: string
  property_type: 'HOME' | 'HOSTEL' | 'STALL'
  lat?: number
  lng?: number
  notes?: string
  is_published: boolean
  default_billing_day: number
  default_align_billing_to_start: boolean
}

export interface TenantFormData {
  full_name: string
  phone: string
  email?: string
  national_id: string
  employer?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
  emergency_contact_email?: string
  notes?: string
}

export interface LeaseFormData {
  tenant_id: string
  unit_id: string
  start_date: string
  end_date?: string
  monthly_rent_kes: number
  security_deposit?: number
  pet_deposit?: number
  lease_terms?: LeaseTerms
  notes?: string
}

export interface MaintenanceRequestFormData {
  property_id: string
  unit_id?: string
  title: string
  description: string
  category: MaintenanceRequest['category']
  priority: MaintenanceRequest['priority']
  photos?: File[]
}

export interface InspectionFormData {
  property_id: string
  unit_id?: string
  inspection_type: PropertyInspection['inspection_type']
  scheduled_date: string
  inspector_name: string
  tenant_id?: string
  notes?: string
}
