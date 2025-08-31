/**
 * Type definitions for subdivision management
 */

export interface Property {
  id: string
  name: string
  physical_address: string
  property_type: string
  total_area_sqm?: number | null
  total_area_acres?: number | null
  lifecycle_status: string
  subdivision_status?: string | null
  lat?: number | null
  lng?: number | null

  // Fields referenced in the card components
  expected_rental_income_kes?: number | null
  purchase_completion_date?: string | null
  subdivision_date?: string | null
}

export interface SubdivisionItem {
  id: string
  original_property_id: string
  subdivision_name: string
  total_plots_planned: number
  total_plots_created: number
  subdivision_status: string
  target_completion_date?: string | null
  created_at: string

  // Fields used in getChanges / updates
  surveyor_name?: string | null
  surveyor_contact?: string | null
  approval_authority?: string | null
  survey_cost_kes?: number | null
  approval_fees_kes?: number | null
  expected_plot_value_kes?: number | null
  subdivision_notes?: string | null

  // Joined relation
  properties?: Property
}

export interface SubdivisionPlot {
  id: string
  subdivision_id: string
  plot_number: string
  plot_size_sqm?: number | null
  plot_size_acres?: number | null
  estimated_value_kes?: number | null
  plot_status: string
  plot_notes?: string | null
  created_property_id?: string | null
  created_at: string
  updated_at: string
}

export interface SubdivisionFormData {
  subdivisionName: string
  totalPlotsPlanned: number
  surveyorName: string
  surveyorContact: string
  surveyCost: number
  expectedPlotValue: number
  targetCompletionDate: string
  approvalAuthority?: string
  approvalFees?: number
  subdivisionNotes?: string
}

export interface PlotFormData {
  plotNumber: string
  plotSizeSqm: number
  estimatedValue?: number
  plotNotes?: string
}

export interface SubdivisionError {
  message: string
  code?: string
  details?: any
}

export interface LoadingState {
  subdivisions: boolean
  plots: boolean
  creating: boolean
  updating: boolean
  deleting: boolean
}

export interface ErrorState {
  subdivisions: SubdivisionError | null
  plots: SubdivisionError | null
  form: SubdivisionError | null
}

export interface SubdivisionPipelineProps {
  properties: Property[]
  onPropertyCreated?: (propertyId: string) => void
  onSearchChange?: (term: string) => void
  searchTerm?: string
}

export interface PropertySubdivisionCardProps {
  property: Property
  subdivision?: SubdivisionItem
  onStartSubdivision: (property: Property) => void
  onEditSubdivision: (property: Property, subdivision: SubdivisionItem) => void
  onViewHistory: (subdivisionId: string) => void
  onPropertyCreated: () => void
  canEdit: boolean
}

export interface SubdivisionFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: SubdivisionFormData) => Promise<void>
  property?: Property | null
  subdivision?: SubdivisionItem | null
  isLoading?: boolean
  error?: SubdivisionError | null
}

export interface PlotFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: PlotFormData) => Promise<void>
  plot?: SubdivisionPlot | null
  isLoading?: boolean
  error?: SubdivisionError | null
}

export type SubdivisionStatus = 'planned' | 'in_progress' | 'completed' | 'on_hold'
export type PlotStatus = 'planned' | 'surveyed' | 'approved' | 'property_created' | 'sold'
