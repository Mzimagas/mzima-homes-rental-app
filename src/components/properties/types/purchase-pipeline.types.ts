import { z } from 'zod'
import { PropertyTypeEnum } from '../../../lib/validation/property'

// Phone number validation regex (consistent with tenant validation)
export const phoneRegex = /^\+?[0-9\s\-()]+$/

// Pipeline Stage Definitions
export interface PipelineStage {
  id: number
  name: string
  description: string
  statusOptions: string[]
  requiredFields?: string[]
  estimatedDays?: number
}

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 1,
    name: 'Initial Search & Evaluation',
    description: 'Property identification and initial assessment',
    statusOptions: ['Not Started', 'In Progress', 'Completed', 'On Hold'],
    requiredFields: ['propertyName', 'propertyAddress', 'propertyType'],
    estimatedDays: 7,
  },
  {
    id: 2,
    name: 'Survey & Mapping',
    description: 'Beacons placement and site visit documentation',
    statusOptions: ['Not Started', 'Scheduled', 'In Progress', 'Completed', 'Issues Found'],
    estimatedDays: 14,
  },
  {
    id: 3,
    name: 'Legal Verification',
    description: 'Witness verification and stakeholder meetings',
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
    name: 'Agreement & Documentation',
    description: 'Contract preparation and legal documentation',
    statusOptions: ['Not Started', 'Drafting', 'Under Review', 'Finalized', 'Amendments Needed'],
    estimatedDays: 10,
  },
  {
    id: 5,
    name: 'Financial Processing (Down Payment)',
    description: 'Initial payment processing and confirmation',
    statusOptions: ['Not Started', 'Pending', 'Processed', 'Failed', 'Partial'],
    estimatedDays: 5,
  },
  {
    id: 6,
    name: 'Financial Processing (Subsequent Payments)',
    description: 'Remaining payment installments processing',
    statusOptions: ['Not Started', 'Pending', 'In Progress', 'Completed', 'Overdue'],
    estimatedDays: 30,
  },
  {
    id: 7,
    name: 'Land Control Board Meeting & Transfer Forms',
    description: 'LCB approval and seller signed transfer forms',
    statusOptions: [
      'Not Started',
      'Submitted',
      'Under Review',
      'LCB Approved & Forms Signed',
      'Issues Found',
    ],
    estimatedDays: 45,
  },
  {
    id: 8,
    name: 'Title Registration',
    description: 'Final title transfer and registration completion',
    statusOptions: ['Not Started', 'In Progress', 'Registered', 'Completed'],
    estimatedDays: 14,
  },
]

// Purchase pipeline schema
export const purchasePipelineSchema = z.object({
  propertyId: z.string().optional(), // Optional link to existing property
  propertyName: z.string().min(1, 'Property name is required'),
  propertyAddress: z.string().min(1, 'Property address is required'),
  propertyType: PropertyTypeEnum.refine((val) => val !== undefined, {
    message: 'Please select a property type',
  }),

  // Buyer Information (will transfer to registered_title_owner when complete)
  buyerName: z.string().min(1, 'Buyer name is required'),
  buyerPhone: z
    .string()
    .regex(phoneRegex, 'Enter a valid phone number')
    .optional()
    .or(z.literal('')),
  buyerEmail: z
    .string()
    .email('Enter a valid email address')
    .optional()
    .or(z.literal('')),
  buyerAddress: z.string().max(500).optional().or(z.literal('')),
  buyerIdNumber: z.string().max(50).optional().or(z.literal('')),

  // Seller Information
  sellerName: z.string().min(1, 'Seller name is required'),
  sellerPhone: z
    .string()
    .regex(phoneRegex, 'Enter a valid phone number')
    .optional()
    .or(z.literal('')),
  sellerEmail: z
    .string()
    .email('Enter a valid email address')
    .optional()
    .or(z.literal('')),
  sellerAddress: z.string().max(500).optional().or(z.literal('')),

  // Broker/Witness Information
  brokerName: z.string().max(120).optional().or(z.literal('')),
  brokerPhone: z
    .string()
    .regex(phoneRegex, 'Enter a valid phone number')
    .optional()
    .or(z.literal('')),
  brokerEmail: z
    .string()
    .email('Enter a valid email address')
    .optional()
    .or(z.literal('')),
  brokerCompany: z.string().max(120).optional().or(z.literal('')),
  brokerLicenseNumber: z.string().max(50).optional().or(z.literal('')),
  isBrokerInvolved: z.boolean().default(false),

  // Financial Information
  askingPrice: z.number().positive('Asking price must be positive').optional(),
  negotiatedPrice: z.number().positive('Negotiated price must be positive').optional(),
  depositPaid: z.number().min(0, 'Deposit cannot be negative').optional(),

  // Legal and Administrative
  targetCompletionDate: z.string().optional(),
  legalRepresentative: z.string().optional(),
  financingSource: z.string().optional(),
  contractReference: z.string().optional(),
  titleDeedStatus: z.string().optional(),
  surveyStatus: z.string().optional(),

  // Investment Analysis
  expectedRentalIncome: z.number().min(0, 'Expected rental income cannot be negative').optional(),
  expectedRoi: z.number().min(0).max(100, 'ROI must be between 0-100%').optional(),
  riskAssessment: z.string().optional(),
  propertyConditionNotes: z.string().optional(),

  // Coordinates (optional but captured when available)
  lat: z
    .number({ invalid_type_error: 'Latitude must be a number' })
    .min(-90, 'Latitude must be >= -90')
    .max(90, 'Latitude must be <= 90')
    .optional(),
  lng: z
    .number({ invalid_type_error: 'Longitude must be a number' })
    .min(-180, 'Longitude must be >= -180')
    .max(180, 'Longitude must be <= 180')
    .optional(),

  // Succession fields
  isSuccessionPurchase: z.boolean().default(false),
  deceasedOwnerName: z.string().max(120).optional().or(z.literal('')),
  deceasedOwnerId: z.string().max(50).optional().or(z.literal('')),
  dateOfDeath: z.string().optional().or(z.literal('')),
  successionCourt: z.string().max(120).optional().or(z.literal('')),
  successionCaseNumber: z.string().max(50).optional().or(z.literal('')),
  successionNotes: z.string().max(1000).optional().or(z.literal('')),
})

export type PurchasePipelineFormValues = z.infer<typeof purchasePipelineSchema>

// Pipeline Stage Data Interface
export interface PipelineStageData {
  stage_id: number
  status: string
  started_date?: string
  completed_date?: string
  notes: string
  documents: string[]
}

// Purchase Item Interface
export interface PurchaseItem {
  id: string
  property_id?: string // Link to the actual property record
  property_name: string
  property_address: string
  property_type: string
  seller_name?: string
  seller_contact?: string
  broker_name?: string
  broker_contact?: string
  asking_price_kes?: number
  negotiated_price_kes?: number
  deposit_paid_kes?: number
  purchase_status: string
  target_completion_date?: string
  legal_representative?: string
  financing_source?: string
  contract_reference?: string
  // Enhanced location data from joined property table
  property_lat?: number | null
  property_lng?: number | null
  property_physical_address?: string
  title_deed_status?: string
  survey_status?: string
  expected_rental_income_kes?: number
  expected_roi_percentage?: number
  risk_assessment?: string
  property_condition_notes?: string
  current_stage?: number
  pipeline_stages?: PipelineStageData[]
  completed_property_id?: string
  // Succession fields
  is_succession_purchase?: boolean
  deceased_owner_name?: string
  deceased_owner_id?: string
  date_of_death?: string
  succession_court?: string
  succession_case_number?: string
  succession_notes?: string
  created_at: string
  updated_at: string
}

// Component Props Interfaces
export interface PurchasePipelineManagerProps {
  onPropertyTransferred?: (propertyId: string) => void
  searchTerm?: string
  onSearchChange?: (searchTerm: string) => void
  userRole?: string
}

export interface PurchaseListProps {
  purchases: PurchaseItem[]
  loading: boolean
  onAddPurchase: () => void
  onEditPurchase: (purchase: PurchaseItem) => void
  onTransferProperty: (purchase: PurchaseItem) => void
  onStageClick: (stageId: number, purchaseId: string) => void
  onStageUpdate: (
    purchaseId: string,
    stageId: number,
    newStatus: string,
    notes?: string,
    stageData?: any
  ) => Promise<void>
  transferringId: string | null
}


