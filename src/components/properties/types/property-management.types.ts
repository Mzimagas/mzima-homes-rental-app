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
  {
    id: 1,
    name: 'Initial Handover Preparation',
    description: 'Property preparation and buyer identification',
    statusOptions: ['Not Started', 'In Progress', 'Completed', 'On Hold'],
    requiredFields: ['propertyId', 'buyerName', 'askingPrice'],
    estimatedDays: 7,
  },
  {
    id: 2,
    name: 'Property Documentation & Survey',
    description: 'Document preparation and property survey verification',
    statusOptions: ['Not Started', 'Scheduled', 'In Progress', 'Completed', 'Issues Found'],
    estimatedDays: 14,
  },
  {
    id: 3,
    name: 'Legal Clearance & Verification',
    description: 'Legal verification and clearance documentation',
    statusOptions: [
      'Not Started',
      'Documents Requested',
      'Under Review',
      'Verified',
      'Issues Found',
    ],
    estimatedDays: 21,
  },
  {
    id: 4,
    name: 'Handover Agreement & Documentation',
    description: 'Sale agreement preparation and signing',
    statusOptions: ['Not Started', 'Draft Prepared', 'Under Review', 'Signed', 'Amendments Needed'],
    estimatedDays: 10,
  },
  {
    id: 5,
    name: 'Payment Processing',
    description: 'Initial payment and deposit processing',
    statusOptions: ['Not Started', 'Pending', 'Partial', 'Completed', 'Issues'],
    estimatedDays: 5,
  },
  {
    id: 6,
    name: 'Final Payment Processing',
    description: 'Balance payment and final settlement',
    statusOptions: ['Not Started', 'Pending', 'Partial', 'Completed', 'Issues'],
    estimatedDays: 7,
  },
  {
    id: 7,
    name: 'LCB & Transfer Forms Processing',
    description: 'Land Control Board approval and transfer forms',
    statusOptions: ['Not Started', 'Submitted', 'Under Review', 'Approved', 'Forms Pending'],
    estimatedDays: 30,
  },
  {
    id: 8,
    name: 'Title Transfer & Registration',
    description: 'Final title transfer and registration completion',
    statusOptions: ['Not Started', 'In Progress', 'Registered', 'Completed'],
    estimatedDays: 14,
  },
]

// Handover pipeline schema
export const handoverPipelineSchema = z.object({
  propertyId: z.string().min(1, 'Please select a property'),
  buyerName: z.string().min(1, 'Buyer name is required'),
  buyerContact: z
    .string()
    .regex(phoneRegex, 'Enter a valid phone number')
    .optional()
    .or(z.literal('')),
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
  expectedProfitPercentage: z
    .number()
    .min(0)
    .max(100, 'Percentage must be between 0-100')
    .optional(),
})

export type HandoverPipelineFormValues = z.infer<typeof handoverPipelineSchema>

// Handover Pipeline Stage Data Interface
export interface HandoverPipelineStageData {
  stage_id: number
  status: string
  started_date?: string
  completed_date?: string
  notes: string
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
  // Enhanced location data from joined property table
  property_lat?: number | null
  property_lng?: number | null
  property_physical_address?: string
}

// Property acquisition cost categories
export type AcquisitionCostCategory =
  | 'PRE_PURCHASE'
  | 'AGREEMENT_LEGAL'
  | 'LCB_PROCESS'
  | 'PAYMENTS'
  | 'TRANSFER_REGISTRATION'
  | 'OTHER'

// Property subdivision cost categories
export type SubdivisionCostCategory =
  | 'STATUTORY_BOARD_FEES'
  | 'SURVEY_PLANNING_FEES'
  | 'REGISTRATION_TITLE_FEES'
  | 'LEGAL_COMPLIANCE'
  | 'OTHER_CHARGES'

// Property handover cost categories - Kenya-specific property handover cost framework
export type HandoverCostCategory =
  | 'PRE_HANDOVER'
  | 'AGREEMENT_LEGAL'
  | 'LCB_PROCESS'
  | 'PAYMENT_TRACKING'
  | 'TRANSFER_REGISTRATION'
  | 'OTHER'

// Property acquisition cost types
export interface AcquisitionCostType {
  id: string
  category: AcquisitionCostCategory
  label: string
  description?: string
}

// Property subdivision cost types
export interface SubdivisionCostType {
  id: string
  category: SubdivisionCostCategory
  label: string
  description?: string
  default_amount_kes?: number
}

// Property handover cost types
export interface HandoverCostType {
  id: string
  category: HandoverCostCategory
  label: string
  description?: string
}

// Individual cost entry
export interface AcquisitionCostEntry {
  id: string
  property_id: string
  cost_type_id: string
  cost_category: AcquisitionCostCategory
  amount_kes: number
  payment_reference?: string
  payment_date?: string
  notes?: string
  created_at: string
  updated_at: string
}

// Individual subdivision cost entry
export interface SubdivisionCostEntry {
  id: string
  property_id: string
  cost_type_id: string
  cost_category: SubdivisionCostCategory
  amount_kes: number
  payment_status: 'PENDING' | 'PAID' | 'PARTIALLY_PAID'
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
  // Subdivision costs
  subdivision_cost_entries?: SubdivisionCostEntry[]
  total_subdivision_costs_kes?: number
  subdivision_costs_paid_kes?: number
  subdivision_costs_pending_kes?: number
  subdivision_cost_breakdown_by_category?: Record<SubdivisionCostCategory, number>
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
  {
    id: 'site_visit_costs',
    category: 'PRE_PURCHASE',
    label: 'Property viewing/site visit costs',
    description: 'Transport, accommodation for property visits',
  },
  {
    id: 'broker_meeting_costs',
    category: 'PRE_PURCHASE',
    label: 'Broker/seller meeting costs',
    description: 'Costs for meetings with brokers or sellers',
  },
  {
    id: 'due_diligence_costs',
    category: 'PRE_PURCHASE',
    label: 'Property search and due diligence costs',
    description: 'Research and investigation costs',
  },
  {
    id: 'legal_consultation',
    category: 'PRE_PURCHASE',
    label: 'Legal consultation fees',
    description: 'Initial legal advice and consultation',
  },

  // Agreement & Legal Costs
  {
    id: 'paperwork_preparation',
    category: 'AGREEMENT_LEGAL',
    label: 'Paperwork preparation for purchase agreement',
    description: 'Document preparation costs',
  },
  {
    id: 'contract_review_fees',
    category: 'AGREEMENT_LEGAL',
    label: 'Legal fees for contract review',
    description: 'Legal review of purchase contracts',
  },
  {
    id: 'initial_deposit',
    category: 'AGREEMENT_LEGAL',
    label: 'Initial deposit/down payment to vendor',
    description: 'First payment to secure the property',
  },
  {
    id: 'broker_commission',
    category: 'AGREEMENT_LEGAL',
    label: 'Broker commission',
    description: 'Commission paid to property broker',
  },

  // Land Control Board Process
  {
    id: 'lcb_application_fees',
    category: 'LCB_PROCESS',
    label: 'LCB application fees',
    description: 'Land Control Board application costs',
  },
  {
    id: 'lcb_transport_costs',
    category: 'LCB_PROCESS',
    label: 'Transport costs for LCB meetings/submissions',
    description: 'Travel costs for LCB processes',
  },
  {
    id: 'lcb_meeting_costs',
    category: 'LCB_PROCESS',
    label: 'LCB meeting attendance costs',
    description: 'Costs for attending LCB meetings',
  },

  // Transfer & Registration Costs
  {
    id: 'transfer_forms_prep',
    category: 'TRANSFER_REGISTRATION',
    label: 'Transfer forms preparation costs',
    description: 'Preparation of transfer documents',
  },
  {
    id: 'property_valuation',
    category: 'TRANSFER_REGISTRATION',
    label: 'Property valuation fees',
    description: 'Official property valuation costs',
  },
  {
    id: 'stamp_duty',
    category: 'TRANSFER_REGISTRATION',
    label: 'Stamp duty payments',
    description: 'Government stamp duty charges',
  },
  {
    id: 'lra_33_forms',
    category: 'TRANSFER_REGISTRATION',
    label: 'LRA 33 forms preparation',
    description: 'Land Registration Authority forms',
  },
  {
    id: 'registration_legal_fees',
    category: 'TRANSFER_REGISTRATION',
    label: 'Legal fees for land registration process',
    description: 'Legal costs for registration',
  },
  {
    id: 'registry_submission',
    category: 'TRANSFER_REGISTRATION',
    label: 'Title Registration / New Title Costs',
    description: 'Submission fees to land registry for title registration and new title processing',
  },
  {
    id: 'registry_facilitation',
    category: 'TRANSFER_REGISTRATION',
    label: 'Land registry facilitation costs',
    description: 'Facilitation and processing costs',
  },
  {
    id: 'title_deed_collection',
    category: 'TRANSFER_REGISTRATION',
    label: 'Final title deed collection costs',
    description: 'Costs for collecting final title deed',
  },

  // Other Costs
  {
    id: 'other_acquisition_cost',
    category: 'OTHER',
    label: 'Other Acquisition Cost',
    description: 'Miscellaneous acquisition costs not covered by other categories',
  },
]

// Category labels for display
export const ACQUISITION_COST_CATEGORY_LABELS: Record<AcquisitionCostCategory, string> = {
  PRE_PURCHASE: 'Pre-Purchase Costs',
  AGREEMENT_LEGAL: 'Agreement & Legal Costs',
  LCB_PROCESS: 'Land Control Board Process',
  PAYMENTS: 'Payment Tracking',
  TRANSFER_REGISTRATION: 'Transfer & Registration Costs',
  OTHER: 'Other Costs',
}

// Predefined handover cost types - Kenya-specific property handover cost framework
export const HANDOVER_COST_TYPES: HandoverCostType[] = [
  // Pre-Handover Preparation
  {
    id: 'property_valuation',
    category: 'PRE_HANDOVER',
    label: 'Property Valuation',
    description: 'Professional property valuation for handover pricing',
  },
  {
    id: 'market_research',
    category: 'PRE_HANDOVER',
    label: 'Market Research',
    description: 'Market analysis and pricing research',
  },
  {
    id: 'property_inspection',
    category: 'PRE_HANDOVER',
    label: 'Property Inspection',
    description: 'Pre-handover property condition assessment',
  },
  {
    id: 'marketing_preparation',
    category: 'PRE_HANDOVER',
    label: 'Marketing Preparation',
    description: 'Costs for preparing property marketing materials',
  },

  // Agreement & Legal Fees
  {
    id: 'legal_fees',
    category: 'AGREEMENT_LEGAL',
    label: 'Legal Fees',
    description: 'Legal representation and advisory fees',
  },
  {
    id: 'contract_preparation',
    category: 'AGREEMENT_LEGAL',
    label: 'Contract Preparation',
    description: 'Sale agreement drafting and preparation costs',
  },
  {
    id: 'due_diligence',
    category: 'AGREEMENT_LEGAL',
    label: 'Due Diligence',
    description: 'Legal due diligence and verification costs',
  },
  {
    id: 'title_verification',
    category: 'AGREEMENT_LEGAL',
    label: 'Title Verification',
    description: 'Title deed verification and search costs',
  },

  // LCB Process & Consent
  {
    id: 'lcb_application_fee',
    category: 'LCB_PROCESS',
    label: 'LCB Application Fee',
    description: 'Land Control Board application processing fee',
  },
  {
    id: 'lcb_processing_fee',
    category: 'LCB_PROCESS',
    label: 'LCB Processing Fee',
    description: 'Additional LCB processing and administrative fees',
  },
  {
    id: 'consent_fee',
    category: 'LCB_PROCESS',
    label: 'Consent Fee',
    description: 'Land Control Board consent issuance fee',
  },

  // Payment Processing & Tracking
  {
    id: 'deposit_handling',
    category: 'PAYMENT_TRACKING',
    label: 'Deposit Handling',
    description: 'Costs for processing and securing buyer deposits',
  },
  {
    id: 'installment_processing',
    category: 'PAYMENT_TRACKING',
    label: 'Installment Processing',
    description: 'Payment installment processing and tracking costs',
  },
  {
    id: 'payment_verification',
    category: 'PAYMENT_TRACKING',
    label: 'Payment Verification',
    description: 'Bank verification and payment confirmation costs',
  },

  // Transfer & Registration
  {
    id: 'transfer_fee',
    category: 'TRANSFER_REGISTRATION',
    label: 'Transfer Fee',
    description: 'Property transfer processing fee',
  },
  {
    id: 'registration_fee',
    category: 'TRANSFER_REGISTRATION',
    label: 'Registration Fee',
    description: 'Land registry registration fees',
  },
  {
    id: 'stamp_duty',
    category: 'TRANSFER_REGISTRATION',
    label: 'Stamp Duty',
    description: 'Government stamp duty on property transfer',
  },
  {
    id: 'mutation_fee',
    category: 'TRANSFER_REGISTRATION',
    label: 'Mutation Fee',
    description: 'Property mutation and record update fees',
  },

  // Other Costs
  {
    id: 'other_handover_expense',
    category: 'OTHER',
    label: 'Other Handover Expense',
    description: 'Miscellaneous handover-related expenses',
  },
  {
    id: 'lcb_consent_special',
    category: 'REGULATORY_LEGAL',
    label: 'LCB Consent - Special Board',
    description: 'Land Control Board Consent for special board proceedings - KES 15,000',
  },
  {
    id: 'chai_ya_wazee',
    category: 'REGULATORY_LEGAL',
    label: 'Chai ya Wazee',
    description: 'Traditional facilitation fee - KES 2,000',
  },

  // Survey & Mapping
  {
    id: 'beacon_reestablishment',
    category: 'SURVEY_MAPPING',
    label: 'Beacon Re-establishment',
    description: 'Re-establishment of property beacons if necessary',
  },

  // Administrative / Incidental Costs
  {
    id: 'transfer_forms_prep',
    category: 'ADMINISTRATIVE',
    label: 'Transfer Forms Preparation (LRA 33 Forms)',
    description: 'Preparation of Land Registration Authority Form 33 for property transfer',
  },
  {
    id: 'search_fee',
    category: 'ADMINISTRATIVE',
    label: 'Search Fee (Official Land Search)',
    description: 'Official land search fee - KES 500',
  },
  {
    id: 'agreement_drafting',
    category: 'ADMINISTRATIVE',
    label: 'Agreement Drafting / Notarization',
    description:
      'Legal agreement drafting and notarization - KES 3,000–10,000 depending on advocate',
  },
  {
    id: 'miscellaneous_admin',
    category: 'ADMINISTRATIVE',
    label: 'Miscellaneous Admin Costs',
    description: 'Facilitation, courier, photocopying, and other administrative costs',
  },

  // Total Acquisition Cost
  {
    id: 'total_acquisition_cost',
    category: 'TOTAL_ACQUISITION',
    label: 'Comprehensive Acquisition Cost',
    description:
      'Purchase Price + LCB Consent + Stamp Duty + Registration & Title Costs + Legal/Professional Fees + Survey/Mutation Costs (if applicable) + Logistics (e.g., client land visit, transport, admin)',
  },

  // Other Costs
  {
    id: 'other_handover_cost',
    category: 'OTHER',
    label: 'Other Handover Cost',
    description: 'Miscellaneous handover costs not covered by other categories',
  },
]

// Handover cost category labels for display
export const HANDOVER_COST_CATEGORY_LABELS: Record<HandoverCostCategory, string> = {
  PRE_HANDOVER: 'Pre-Handover Preparation',
  AGREEMENT_LEGAL: 'Agreement & Legal Fees',
  LCB_PROCESS: 'LCB Process & Consent',
  PAYMENT_TRACKING: 'Payment Processing & Tracking',
  TRANSFER_REGISTRATION: 'Transfer & Registration',
  OTHER: 'Other Costs',
}

// Subdivision Pipeline Stage Definitions
export interface SubdivisionPipelineStage {
  id: number
  name: string
  description: string
  statusOptions: string[]
  estimatedDays?: number
}

export const SUBDIVISION_PIPELINE_STAGES: SubdivisionPipelineStage[] = [
  {
    id: 1,
    name: 'Planning & Design',
    description: 'Initial subdivision planning and design phase',
    statusOptions: ['Not Started', 'In Progress', 'Completed', 'On Hold'],
    estimatedDays: 14,
  },
  {
    id: 2,
    name: 'Survey Ordered',
    description: 'Professional survey commissioned and scheduled',
    statusOptions: ['Not Started', 'Ordered', 'Scheduled', 'In Progress', 'Completed'],
    estimatedDays: 21,
  },
  {
    id: 3,
    name: 'Survey Completed',
    description: 'Land survey completed and beacons placed',
    statusOptions: ['Not Started', 'In Progress', 'Completed', 'Issues Found'],
    estimatedDays: 14,
  },
  {
    id: 4,
    name: 'Approval Pending',
    description: 'Subdivision plan submitted for authority approval',
    statusOptions: [
      'Not Started',
      'Submitted',
      'Under Review',
      'Additional Info Required',
      'Approved',
    ],
    estimatedDays: 45,
  },
  {
    id: 5,
    name: 'Approved',
    description: 'Subdivision plan approved by relevant authorities',
    statusOptions: ['Not Started', 'Approved', 'Conditional Approval', 'Rejected'],
    estimatedDays: 7,
  },
  {
    id: 6,
    name: 'Plots Created',
    description: 'Individual plots created and documented',
    statusOptions: ['Not Started', 'In Progress', 'Completed'],
    estimatedDays: 10,
  },
  {
    id: 7,
    name: 'Completed',
    description: 'Subdivision pipeline completed and ready for sale',
    statusOptions: ['Not Started', 'Completed', 'Finalized'],
    estimatedDays: 5,
  },
]

// Subdivision Pipeline Stage Data
export interface SubdivisionPipelineStageData {
  stage_id: number
  status: string
  started_date?: string
  completed_date?: string
  notes?: string
  documents?: any[]
}



// Predefined subdivision cost types
export const SUBDIVISION_COST_TYPES: SubdivisionCostType[] = [
  // Statutory & Board Fees
  {
    id: 'lcb_normal_fee',
    category: 'STATUTORY_BOARD_FEES',
    label: 'Land Control Board (Normal)',
    description: 'Standard LCB processing fee',
    default_amount_kes: 4050,
  },
  {
    id: 'lcb_special_fee',
    category: 'STATUTORY_BOARD_FEES',
    label: 'Land Control Board (Special)',
    description: 'Special LCB processing fee',
    default_amount_kes: 10000,
  },
  {
    id: 'board_application_fee',
    category: 'STATUTORY_BOARD_FEES',
    label: 'Board Application Fee',
    description: 'Application fee for board approval',
    default_amount_kes: 3050,
  },

  // Survey & Planning Fees
  {
    id: 'scheme_plan_preparation',
    category: 'SURVEY_PLANNING_FEES',
    label: 'Scheme Plan Preparation',
    description: 'Cost per portion for scheme plan',
    default_amount_kes: 1000,
  },
  {
    id: 'mutation_drawing',
    category: 'SURVEY_PLANNING_FEES',
    label: 'Mutation Drawing',
    description: 'Drawing of mutation plans',
    default_amount_kes: 5000,
  },
  {
    id: 'mutation_checking',
    category: 'SURVEY_PLANNING_FEES',
    label: 'Mutation Checking',
    description: 'Cost per portion for mutation checking',
    default_amount_kes: 500,
  },
  {
    id: 'surveyor_professional_fees',
    category: 'SURVEY_PLANNING_FEES',
    label: 'Surveyor Professional Fees',
    description: 'Professional surveyor fees (variable)',
    default_amount_kes: 50000,
  },
  {
    id: 'map_amendment',
    category: 'SURVEY_PLANNING_FEES',
    label: 'Map Amendment',
    description: 'Cost per portion for map amendments',
    default_amount_kes: 500,
  },
  {
    id: 'rim_update',
    category: 'SURVEY_PLANNING_FEES',
    label: 'RIM Update',
    description: 'Cost per portion for RIM updates',
    default_amount_kes: 1000,
  },
  {
    id: 'new_parcel_numbers',
    category: 'SURVEY_PLANNING_FEES',
    label: 'New Parcel Numbers',
    description: 'Cost per portion for new parcel numbers',
    default_amount_kes: 1000,
  },

  // Registration & Title Fees
  {
    id: 'new_title_registration',
    category: 'REGISTRATION_TITLE_FEES',
    label: 'New Title Registration',
    description: 'Cost per portion for new title registration',
    default_amount_kes: 3550,
  },
  {
    id: 'registrar_fees',
    category: 'REGISTRATION_TITLE_FEES',
    label: 'Registrar Fees',
    description: 'Cost per portion for registrar fees',
    default_amount_kes: 1000,
  },
  {
    id: 'title_printing',
    category: 'REGISTRATION_TITLE_FEES',
    label: 'Title Printing',
    description: 'Cost per portion for title printing',
    default_amount_kes: 500,
  },

  // Legal & Compliance
  {
    id: 'compliance_certificate',
    category: 'LEGAL_COMPLIANCE',
    label: 'Compliance Certificate',
    description: 'Cost per portion for compliance certificate',
    default_amount_kes: 1500,
  },
  {
    id: 'development_fee',
    category: 'LEGAL_COMPLIANCE',
    label: 'Development Fee',
    description: 'Cost per portion for development fee',
    default_amount_kes: 1500,
  },
  {
    id: 'admin_costs',
    category: 'LEGAL_COMPLIANCE',
    label: 'Administrative Costs',
    description: 'Cost per portion for admin costs',
    default_amount_kes: 250,
  },
  {
    id: 'search_fee',
    category: 'LEGAL_COMPLIANCE',
    label: 'Search Fee',
    description: 'Property search fee',
    default_amount_kes: 1050,
  },
  {
    id: 'land_rates_clearance',
    category: 'LEGAL_COMPLIANCE',
    label: 'Land Rates Clearance',
    description: 'Clearance of land rates',
    default_amount_kes: 3000,
  },
  {
    id: 'stamp_duty',
    category: 'LEGAL_COMPLIANCE',
    label: 'Stamp Duty',
    description: '1-4% of property value',
    default_amount_kes: 0,
  },

  // Other Charges
  {
    id: 'county_planning_fees',
    category: 'OTHER_CHARGES',
    label: 'County Planning Fees',
    description: 'County planning approval fees',
    default_amount_kes: 15000,
  },
  {
    id: 'professional_legal_fees',
    category: 'OTHER_CHARGES',
    label: 'Professional/Legal Fees',
    description: 'Variable professional and legal fees',
    default_amount_kes: 0,
  },
  {
    id: 'miscellaneous_disbursements',
    category: 'OTHER_CHARGES',
    label: 'Miscellaneous Disbursements',
    description: 'Other miscellaneous costs',
    default_amount_kes: 0,
  },
]

// Subdivision cost category labels for display
export const SUBDIVISION_COST_CATEGORY_LABELS: Record<SubdivisionCostCategory, string> = {
  STATUTORY_BOARD_FEES: 'Statutory & Board Fees',
  SURVEY_PLANNING_FEES: 'Survey & Planning Fees',
  REGISTRATION_TITLE_FEES: 'Registration & Title Fees',
  LEGAL_COMPLIANCE: 'Legal & Compliance',
  OTHER_CHARGES: 'Other Charges',
}

// Utility functions for property management
export const hasPendingChanges = (property: PropertyItem): boolean => {
  // Check if property has any pending changes in any pipeline
  return (
    property.direct_addition_pipeline?.some(stage => stage.status === 'In Progress') ||
    property.purchase_pipeline?.some(stage => stage.status === 'In Progress') ||
    property.handover_pipeline?.some(stage => stage.status === 'In Progress') ||
    false
  )
}

export const getPendingSubdivisionValue = (property: PropertyItem): number => {
  // Get pending subdivision value if any
  return property.subdivision_value || 0
}

export const getPendingHandoverValue = (property: PropertyItem): number => {
  // Get pending handover value if any
  return property.handover_value || 0
}
