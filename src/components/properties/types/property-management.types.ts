import { z } from 'zod'
import { Property } from '../../../lib/types/database'

// Phone number validation regex (consistent with tenant validation)
export const phoneRegex = /^\+?[0-9\s\-()]+$/

// Handover Pipeline Stage Definitions
export interface HandoverPipelineStage {
  id: number
  name: string
  description: string
  statusOptions: string[]
  requiredFields?: string[]
  estimatedDays?: number
}

export const HANDOVER_PIPELINE_STAGES: HandoverPipelineStage[] = [
  { id: 1, name: 'Initial Handover Preparation', description: 'Property preparation and buyer identification', statusOptions: ['Not Started', 'In Progress', 'Completed', 'On Hold'], requiredFields: ['propertyId', 'buyerName', 'askingPrice'], estimatedDays: 7 },
  { id: 2, name: 'Property Documentation & Survey', description: 'Document preparation and property survey verification', statusOptions: ['Not Started', 'Scheduled', 'In Progress', 'Completed', 'Issues Found'], estimatedDays: 14 },
  { id: 3, name: 'Legal Clearance & Verification', description: 'Legal verification and clearance documentation', statusOptions: ['Not Started', 'Documents Requested', 'Under Review', 'Verified', 'Issues Found'], estimatedDays: 21 },
  { id: 4, name: 'Handover Agreement & Documentation', description: 'Sale agreement preparation and signing', statusOptions: ['Not Started', 'Draft Prepared', 'Under Review', 'Signed', 'Amendments Needed'], estimatedDays: 10 },
  { id: 5, name: 'Payment Processing', description: 'Initial payment and deposit processing', statusOptions: ['Not Started', 'Pending', 'Partial', 'Completed', 'Issues'], estimatedDays: 5 },
  { id: 6, name: 'Final Payment Processing', description: 'Balance payment and final settlement', statusOptions: ['Not Started', 'Pending', 'Partial', 'Completed', 'Issues'], estimatedDays: 7 },
  { id: 7, name: 'LCB & Transfer Forms Processing', description: 'Land Control Board approval and transfer forms', statusOptions: ['Not Started', 'Submitted', 'Under Review', 'Approved', 'Forms Pending'], estimatedDays: 30 },
  { id: 8, name: 'Title Transfer & Registration', description: 'Final title transfer and registration completion', statusOptions: ['Not Started', 'In Progress', 'Registered', 'Completed'], estimatedDays: 14 },
]

// Handover pipeline schema
export const handoverPipelineSchema = z.object({
  propertyId: z.string().min(1, 'Please select a property'),
  buyerName: z.string().min(1, 'Buyer name is required'),
  buyerContact: z.string().regex(phoneRegex, 'Enter a valid phone number').optional().or(z.literal('')),
  buyerEmail: z.string().email('Enter a valid email').optional().or(z.literal('')),
  buyerAddress: z.string().optional(),
  askingPrice: z.number().positive('Asking price must be positive').optional(),
  negotiatedPrice: z.number().positive('Negotiated price must be positive').optional(),
  depositReceived: z.number().min(0, 'Deposit cannot be negative').optional(),
  targetCompletionDate: z.string().optional(),
  legalRepresentative: z.string().optional(),
  riskAssessment: z.string().optional(),
  propertyConditionNotes: z.string().optional(),
  expectedProfit: z.number().min(0, 'Expected profit cannot be negative').optional(),
  expectedProfitPercentage: z.number().min(0).max(100, 'Percentage must be between 0-100').optional(),
})

export type HandoverPipelineFormValues = z.infer<typeof handoverPipelineSchema>

// Handover Pipeline Stage Data Interface
export interface HandoverPipelineStageData {
  stage_id: number
  status: string
  started_date?: string
  completed_date?: string
  notes: string
  documents: string[]
}

// Handover Item Interface
export interface HandoverItem {
  id: string
  property_id: string
  property_name: string
  property_address: string
  property_type: string
  buyer_name?: string
  buyer_contact?: string
  buyer_email?: string
  buyer_address?: string
  asking_price_kes?: number
  negotiated_price_kes?: number
  deposit_received_kes?: number
  balance_due_kes?: number
  handover_status: string
  current_stage: number
  overall_progress: number
  pipeline_stages?: HandoverPipelineStageData[]
  target_completion_date?: string
  actual_completion_date?: string
  legal_representative?: string
  risk_assessment?: string
  property_condition_notes?: string
  expected_profit_kes?: number
  expected_profit_percentage?: number
  created_at: string
  updated_at: string
}

// Property acquisition cost categories
export type AcquisitionCostCategory =
  | 'PRE_PURCHASE'
  | 'AGREEMENT_LEGAL'
  | 'LCB_PROCESS'
  | 'PAYMENTS'
  | 'TRANSFER_REGISTRATION'
  | 'OTHER'

// Property acquisition cost types
export interface AcquisitionCostType {
  id: string
  category: AcquisitionCostCategory
  label: string
  description?: string
}

// Individual cost entry
export interface AcquisitionCostEntry {
  id: string
  property_id: string
  cost_type_id: string
  amount_kes: number
  payment_reference?: string
  payment_date?: string
  notes?: string
  created_at: string
  updated_at: string
}

// Payment installment entry
export interface PaymentInstallment {
  id: string
  property_id: string
  installment_number: number
  amount_kes: number
  payment_date?: string
  payment_reference?: string
  payment_method?: string
  notes?: string
  created_at: string
  updated_at: string
}

// Purchase price history entry
export interface PurchasePriceHistoryEntry {
  id: string
  previous_price_kes: number | null
  new_price_kes: number
  change_reason: string
  changed_by: string
  changed_by_name: string
  changed_at: string
}

// Property acquisition financial summary
export interface PropertyAcquisitionFinancials {
  property_id: string
  total_purchase_price_kes?: number
  initial_deposit_kes?: number
  total_paid_kes: number
  remaining_balance_kes: number
  cost_entries: AcquisitionCostEntry[]
  payment_installments: PaymentInstallment[]
  total_acquisition_cost_kes: number
  cost_breakdown_by_category: Record<AcquisitionCostCategory, number>
}

// Property with lifecycle information
export interface PropertyWithLifecycle extends Property {
  property_source?: string
  lifecycle_status?: string
  subdivision_status?: 'NOT_STARTED' | 'SUB_DIVISION_STARTED' | 'SUBDIVIDED'
  source_reference_id?: string
  parent_property_id?: string
  purchase_completion_date?: string
  subdivision_date?: string
  handover_status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  handover_date?: string
  acquisition_notes?: string
  expected_rental_income_kes?: number
  sale_price_kes?: number
  estimated_value_kes?: number
  total_area_sqm?: number
  total_area_acres?: number
  purchase_price_agreement_kes?: number

  // Property acquisition financial data
  acquisition_financials?: PropertyAcquisitionFinancials
}

// Component Props Interfaces
export interface PropertyManagementTabsProps {
  onPropertyCreated?: (propertyId: string) => void
  onRefreshProperties?: () => void
}

// State management types
export interface PendingChanges {
  [propertyId: string]: {
    subdivision?: string
    handover?: string
  }
}

export type ActiveTab = 'properties' | 'purchase' | 'subdivision' | 'handover'

// Predefined acquisition cost types
export const ACQUISITION_COST_TYPES: AcquisitionCostType[] = [
  // Pre-Purchase Costs
  { id: 'site_visit_costs', category: 'PRE_PURCHASE', label: 'Property viewing/site visit costs', description: 'Transport, accommodation for property visits' },
  { id: 'broker_meeting_costs', category: 'PRE_PURCHASE', label: 'Broker/seller meeting costs', description: 'Costs for meetings with brokers or sellers' },
  { id: 'due_diligence_costs', category: 'PRE_PURCHASE', label: 'Property search and due diligence costs', description: 'Research and investigation costs' },
  { id: 'legal_consultation', category: 'PRE_PURCHASE', label: 'Legal consultation fees', description: 'Initial legal advice and consultation' },

  // Agreement & Legal Costs
  { id: 'paperwork_preparation', category: 'AGREEMENT_LEGAL', label: 'Paperwork preparation for purchase agreement', description: 'Document preparation costs' },
  { id: 'contract_review_fees', category: 'AGREEMENT_LEGAL', label: 'Legal fees for contract review', description: 'Legal review of purchase contracts' },
  { id: 'initial_deposit', category: 'AGREEMENT_LEGAL', label: 'Initial deposit/down payment to vendor', description: 'First payment to secure the property' },
  { id: 'broker_commission', category: 'AGREEMENT_LEGAL', label: 'Broker commission', description: 'Commission paid to property broker' },

  // Land Control Board Process
  { id: 'lcb_application_fees', category: 'LCB_PROCESS', label: 'LCB application fees', description: 'Land Control Board application costs' },
  { id: 'lcb_transport_costs', category: 'LCB_PROCESS', label: 'Transport costs for LCB meetings/submissions', description: 'Travel costs for LCB processes' },
  { id: 'lcb_meeting_costs', category: 'LCB_PROCESS', label: 'LCB meeting attendance costs', description: 'Costs for attending LCB meetings' },

  // Transfer & Registration Costs
  { id: 'transfer_forms_prep', category: 'TRANSFER_REGISTRATION', label: 'Transfer forms preparation costs', description: 'Preparation of transfer documents' },
  { id: 'property_valuation', category: 'TRANSFER_REGISTRATION', label: 'Property valuation fees', description: 'Official property valuation costs' },
  { id: 'stamp_duty', category: 'TRANSFER_REGISTRATION', label: 'Stamp duty payments', description: 'Government stamp duty charges' },
  { id: 'lra_33_forms', category: 'TRANSFER_REGISTRATION', label: 'LRA 33 forms preparation', description: 'Land Registration Authority forms' },
  { id: 'registration_legal_fees', category: 'TRANSFER_REGISTRATION', label: 'Legal fees for land registration process', description: 'Legal costs for registration' },
  { id: 'registry_submission', category: 'TRANSFER_REGISTRATION', label: 'Land registry submission costs', description: 'Submission fees to land registry' },
  { id: 'registry_facilitation', category: 'TRANSFER_REGISTRATION', label: 'Land registry facilitation costs', description: 'Facilitation and processing costs' },
  { id: 'title_deed_collection', category: 'TRANSFER_REGISTRATION', label: 'Final title deed collection costs', description: 'Costs for collecting final title deed' },

  // Other Costs
  { id: 'other_cost', category: 'OTHER', label: 'Other Cost', description: 'Miscellaneous acquisition costs not covered by other categories' }
]

// Category labels for display
export const ACQUISITION_COST_CATEGORY_LABELS: Record<AcquisitionCostCategory, string> = {
  PRE_PURCHASE: 'Pre-Purchase Costs',
  AGREEMENT_LEGAL: 'Agreement & Legal Costs',
  LCB_PROCESS: 'Land Control Board Process',
  PAYMENTS: 'Payment Tracking',
  TRANSFER_REGISTRATION: 'Transfer & Registration Costs',
  OTHER: 'Other Costs'
}
