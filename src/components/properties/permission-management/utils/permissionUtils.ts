import {
  UserPermissions,
  SectionPermission,
  PermissionLevel,
  Section,
  DetailPermission,
  RoleTemplate,
  PermissionOption,
} from '../types'

// Default section permissions
export const DEFAULT_SECTIONS: Section[] = [
  'direct_addition',
  'purchase_pipeline',
  'subdivision_process',
  'property_handover',
  'audit_trail',
]

export const DEFAULT_DETAIL_PERMISSIONS: DetailPermission[] = [
  'basic_info',
  'location',
  'financials',
  'documents',
]

// Create default section permission
export const createDefaultSectionPermission = (
  section: Section,
  level: PermissionLevel = 'none'
): SectionPermission => {
  // Audit trail doesn't have detail permissions - it's just about viewing logs
  if (section === 'audit_trail') {
    return {
      section,
      level,
      details: {} as Record<DetailPermission, PermissionLevel>,
    }
  }

  // Other sections have the standard detail permissions
  return {
    section,
    level,
    details: {
      basic_info: level,
      location: level,
      financials: level,
      documents: level,
    },
  }
}

// Create default user permissions
export const createDefaultUserPermissions = (
  userId: string,
  email: string,
  isGlobal: boolean = false
): UserPermissions => ({
  userId,
  email,
  sections: DEFAULT_SECTIONS.map((section) => createDefaultSectionPermission(section)),
  isGlobal,
  status: 'active',
})

// Get role template classification for a permission
export const getRoleTemplate = (permission: UserPermissions): string => {
  // Check for specific role template patterns
  const editSections = permission.sections.filter((s) => s.level === 'edit').map((s) => s.section)
  const viewSections = permission.sections.filter((s) => s.level === 'view').map((s) => s.section)

  // Admin: Full edit access to most sections
  if (editSections.length >= 4 && permission.isGlobal) {
    return 'Admin'
  }

  // Supervisor: View access to all, edit to some
  if (viewSections.length >= 4 && editSections.length >= 2) {
    return 'Supervisor'
  }

  // Staff: Limited edit access
  if (editSections.length >= 1 && editSections.length <= 2) {
    return 'Staff'
  }

  // Member: Mostly view access
  if (viewSections.length >= 1 && editSections.length === 0) {
    return 'Member'
  }

  return 'Custom'
}

// Validate email format
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Generate permission summary
export const getPermissionSummary = (permission: UserPermissions): string => {
  const editCount = permission.sections.filter((s) => s.level === 'edit').length
  const viewCount = permission.sections.filter((s) => s.level === 'view').length

  if (editCount === 0 && viewCount === 0) return 'No permissions'
  if (editCount === 0) return `View only (${viewCount} sections)`
  if (viewCount === 0) return `Edit only (${editCount} sections)`
  return `Edit: ${editCount}, View: ${viewCount}`
}

// Check if user has any permissions
export const hasAnyPermissions = (permission: UserPermissions): boolean => {
  return permission.sections.some((s) => s.level !== 'none')
}

// Get available scope options based on role template
export const getAvailableScopeOptions = (
  filterRoleTemplate: RoleTemplate | 'all'
): PermissionOption[] => {
  const baseOptions = [
    { value: 'all', label: 'All Scopes', available: true },
    { value: 'global', label: '🌐 Global Permissions', available: true },
    { value: 'property', label: '🏠 Property-Specific', available: true },
  ]

  // Role-based scope restrictions
  if (filterRoleTemplate === 'admin') {
    return baseOptions.map((opt) => ({
      ...opt,
      recommended: opt.value === 'global',
      available: opt.value !== 'property',
    }))
  }

  if (filterRoleTemplate === 'member') {
    return baseOptions.map((opt) => ({
      ...opt,
      recommended: opt.value === 'property',
      available: opt.value !== 'global',
    }))
  }

  return baseOptions.map((opt) => ({ ...opt, recommended: false }))
}

// Get available level options based on role template
export const getAvailableLevelOptions = (
  filterRoleTemplate: RoleTemplate | 'all'
): PermissionOption[] => {
  const baseOptions = [
    { value: 'all', label: 'All Levels', available: true },
    { value: 'edit', label: '✏️ Edit Access', available: true },
    { value: 'view', label: '👁️ View Only', available: true },
    { value: 'none', label: '🚫 No Access', available: true },
  ]

  // Role-based level restrictions
  if (filterRoleTemplate === 'supervisor') {
    return baseOptions.map((opt) => ({
      ...opt,
      recommended: opt.value === 'edit',
      available: opt.value !== 'view',
    }))
  }

  if (filterRoleTemplate === 'member') {
    return baseOptions.map((opt) => ({
      ...opt,
      recommended: opt.value === 'view',
      available: opt.value !== 'edit',
    }))
  }

  if (filterRoleTemplate === 'staff') {
    return baseOptions.map((opt) => ({
      ...opt,
      recommended: opt.value === 'view',
      available: opt.value !== 'edit',
    }))
  }

  return baseOptions.map((opt) => ({ ...opt, recommended: false }))
}
