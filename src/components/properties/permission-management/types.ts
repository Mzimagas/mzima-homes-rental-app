// Permission Management Types and Interfaces

export type PermissionLevel = 'view' | 'edit' | 'none'
export type DetailPermission = 'basic_info' | 'location' | 'financials' | 'documents'
export type Section = 'direct_addition' | 'purchase_pipeline' | 'subdivision_process' | 'property_handover' | 'audit_trail'
export type RoleTemplate = 'admin' | 'supervisor' | 'staff' | 'member'
export type LifecycleStage = 'global' | 'purchase_pipeline' | 'subdivision' | 'handover'

export interface SectionPermission {
  section: Section
  level: PermissionLevel
  details: Record<DetailPermission, PermissionLevel>
}

export interface UserPermissions {
  userId: string
  email: string
  propertyId?: string // For property-specific permissions
  sections: SectionPermission[]
  isGlobal: boolean
  assignedAt?: string
  assignedBy?: string
  status?: 'active' | 'pending' | 'expired'
}

export interface User {
  id: string
  email: string
  name?: string
  role?: string
  isActive?: boolean
}

export interface PermissionOption {
  value: string
  label: string
  available: boolean
  recommended?: boolean
  warning?: string
}

export interface FilterState {
  roleTemplate: RoleTemplate | 'all'
  scope: 'all' | 'global' | 'property'
  level: PermissionLevel | 'all'
  section: Section | 'all'
}

export interface FeedbackMessage {
  type: 'success' | 'error' | 'warning'
  message: string
}

export interface PropertySelectionState {
  selectedProperty: string
  showDropdown: boolean
  searchTerm: string
  loadingProperties: boolean
  properties: any[]
}

export interface UserSelectionState {
  selectedUsers: string[]
  showDropdown: boolean
  searchTerm: string
  availableUsers: User[]
  loadingUsers: boolean
}

export interface PermissionAssignmentState {
  showModal: boolean
  isAssigning: boolean
  newUserEmail: string
  formErrors: string[]
  feedback: FeedbackMessage | null
}
