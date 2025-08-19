import { z } from 'zod'

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
    name: "Initial Search & Evaluation",
    description: "Property identification and initial assessment",
    statusOptions: ["Not Started", "In Progress", "Completed", "On Hold"],
    requiredFields: ["propertyName", "propertyAddress", "propertyType"],
    estimatedDays: 7
  },
  {
    id: 2,
    name: "Survey & Mapping",
    description: "Beacons placement and site visit documentation",
    statusOptions: ["Not Started", "Scheduled", "In Progress", "Completed", "Issues Found"],
    estimatedDays: 14
  },
  {
    id: 3,
    name: "Legal Verification",
    description: "Witness verification and stakeholder meetings",
    statusOptions: ["Not Started", "Documents Requested", "Under Review", "Verified", "Issues Found"],
    estimatedDays: 21
  },
  {
    id: 4,
    name: "Agreement & Documentation",
    description: "Contract preparation and legal documentation",
    statusOptions: ["Not Started", "Drafting", "Under Review", "Finalized", "Amendments Needed"],
    estimatedDays: 10
  },
  {
    id: 5,
    name: "Financial Processing (Down Payment)",
    description: "Initial payment processing and confirmation",
    statusOptions: ["Not Started", "Pending", "Processed", "Failed", "Partial"],
    estimatedDays: 5
  },
  {
    id: 6,
    name: "Financial Processing (Subsequent Payments)",
    description: "Remaining payment installments processing",
    statusOptions: ["Not Started", "Pending", "In Progress", "Completed", "Overdue"],
    estimatedDays: 30
  },
  {
    id: 7,
    name: "Land Control Board Meeting & Transfer Forms",
    description: "LCB approval and seller signed transfer forms",
    statusOptions: ["Not Started", "Submitted", "Under Review", "LCB Approved & Forms Signed", "Issues Found"],
    estimatedDays: 45
  },
  {
    id: 8,
    name: "Title Registration",
    description: "Final title transfer and registration completion",
    statusOptions: ["Not Started", "In Progress", "Registered", "Completed"],
    estimatedDays: 14
  }
]

// Purchase pipeline schema
export const purchasePipelineSchema = z.object({
  propertyName: z.string().min(1, 'Property name is required'),
  propertyAddress: z.string().min(1, 'Property address is required'),
  propertyType: z.enum(['RESIDENTIAL', 'COMMERCIAL', 'LAND', 'MIXED_USE'], {
    errorMap: () => ({ message: 'Please select a property type' })
  }),
  sellerName: z.string().min(1, 'Seller name is required'),
  sellerPhone: z.string().regex(phoneRegex, 'Enter a valid phone number').optional().or(z.literal('')),
  sellerEmail: z.string().email('Enter a valid email').optional().or(z.literal('')),
  askingPrice: z.number().positive('Asking price must be positive').optional(),
  negotiatedPrice: z.number().positive('Negotiated price must be positive').optional(),
  depositPaid: z.number().min(0, 'Deposit cannot be negative').optional(),
  targetCompletionDate: z.string().optional(),
  legalRepresentative: z.string().optional(),
  financingSource: z.string().optional(),
  expectedRentalIncome: z.number().min(0, 'Expected rental income cannot be negative').optional(),
  expectedRoi: z.number().min(0).max(100, 'ROI must be between 0-100%').optional(),
  riskAssessment: z.string().optional(),
  propertyConditionNotes: z.string().optional(),
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
  property_name: string
  property_address: string
  property_type: string
  seller_name?: string
  seller_contact?: string
  asking_price_kes?: number
  negotiated_price_kes?: number
  deposit_paid_kes?: number
  purchase_status: string
  target_completion_date?: string
  legal_representative?: string
  financing_source?: string
  expected_rental_income_kes?: number
  expected_roi_percentage?: number
  risk_assessment?: string
  property_condition_notes?: string
  current_stage?: number
  pipeline_stages?: PipelineStageData[]
  overall_progress?: number
  completed_property_id?: string
  created_at: string
  updated_at: string
}

// Component Props Interfaces
export interface PurchasePipelineManagerProps {
  onPropertyTransferred?: (propertyId: string) => void
  searchTerm?: string
  onSearchChange?: (searchTerm: string) => void
}

export interface ProgressTrackerProps {
  currentStage: number
  stageData: PipelineStageData[]
  onStageClick: (stageId: number) => void
  overallProgress: number
  purchaseId: string
  onStageUpdate: (purchaseId: string, stageId: number, newStatus: string, notes?: string, stageData?: any) => Promise<void>
}

export interface StageModalProps {
  isOpen: boolean
  onClose: () => void
  stageId: number
  purchaseId: string
  stageData: PipelineStageData | undefined
  onStageUpdate: (purchaseId: string, stageId: number, newStatus: string, notes?: string, stageData?: any) => Promise<void>
}

export interface PurchaseListProps {
  purchases: PurchaseItem[]
  loading: boolean
  onAddPurchase: () => void
  onEditPurchase: (purchase: PurchaseItem) => void
  onTransferProperty: (purchase: PurchaseItem) => void
  onStageClick: (stageId: number, purchaseId: string) => void
  onStageUpdate: (purchaseId: string, stageId: number, newStatus: string, notes?: string, stageData?: any) => Promise<void>
  transferringId: string | null
}

export interface PurchaseFormProps {
  isOpen: boolean
  onClose: () => void
  editingPurchase: PurchaseItem | null
  onPurchaseCreated: () => void
}
