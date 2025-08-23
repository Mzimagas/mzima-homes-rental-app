import { 
  UserPermissions, 
  SectionPermission, 
  PermissionLevel,
  Section,
  DetailPermission 
} from '../types'
import { DEFAULT_SECTIONS, createDefaultSectionPermission } from './permissionUtils'

// Role template configurations
export const ROLE_TEMPLATES = {
  admin: {
    name: 'Admin',
    icon: '👑',
    description: 'Full Access',
    defaultLevel: 'edit' as PermissionLevel,
    sections: {
      direct_addition: 'edit' as PermissionLevel,
      purchase_pipeline: 'edit' as PermissionLevel,
      subdivision_process: 'edit' as PermissionLevel,
      property_handover: 'edit' as PermissionLevel,
      audit_trail: 'view' as PermissionLevel
    }
  },
  supervisor: {
    name: 'Supervisor',
    icon: '👁️',
    description: 'View All',
    defaultLevel: 'view' as PermissionLevel,
    sections: {
      direct_addition: 'view' as PermissionLevel,
      purchase_pipeline: 'view' as PermissionLevel,
      subdivision_process: 'view' as PermissionLevel,
      property_handover: 'view' as PermissionLevel,
      audit_trail: 'view' as PermissionLevel
    }
  },
  staff: {
    name: 'Staff',
    icon: '📝',
    description: 'Clerical Work',
    defaultLevel: 'view' as PermissionLevel,
    sections: {
      direct_addition: 'edit' as PermissionLevel,
      purchase_pipeline: 'view' as PermissionLevel,
      subdivision_process: 'view' as PermissionLevel,
      property_handover: 'edit' as PermissionLevel,
      audit_trail: 'none' as PermissionLevel
    }
  },
  member: {
    name: 'Member',
    icon: '👤',
    description: 'Limited Access',
    defaultLevel: 'view' as PermissionLevel,
    sections: {
      direct_addition: 'view' as PermissionLevel,
      purchase_pipeline: 'none' as PermissionLevel,
      subdivision_process: 'none' as PermissionLevel,
      property_handover: 'view' as PermissionLevel,
      audit_trail: 'none' as PermissionLevel
    }
  }
} as const

// Apply role template to user permissions
export const applyRoleTemplate = (
  basePermissions: UserPermissions,
  templateKey: keyof typeof ROLE_TEMPLATES
): UserPermissions => {
  const template = ROLE_TEMPLATES[templateKey]
  
  const updatedSections: SectionPermission[] = DEFAULT_SECTIONS.map(section => {
    const level = template.sections[section] || template.defaultLevel
    return createDefaultSectionPermission(section, level)
  })

  return {
    ...basePermissions,
    sections: updatedSections
  }
}

// Set all sections to a specific permission level
export const setAllSectionsPermission = (
  basePermissions: UserPermissions,
  level: PermissionLevel
): UserPermissions => {
  const updatedSections: SectionPermission[] = basePermissions.sections.map(section => ({
    ...section,
    level,
    details: Object.keys(section.details).reduce((acc, key) => ({
      ...acc,
      [key]: level
    }), {} as Record<DetailPermission, PermissionLevel>)
  }))

  return {
    ...basePermissions,
    sections: updatedSections
  }
}

// Get role template info
export const getRoleTemplateInfo = (templateKey: keyof typeof ROLE_TEMPLATES) => {
  return ROLE_TEMPLATES[templateKey]
}

// Get all available role templates
export const getAllRoleTemplates = () => {
  return Object.entries(ROLE_TEMPLATES).map(([key, template]) => ({
    key: key as keyof typeof ROLE_TEMPLATES,
    ...template
  }))
}

// Check if permissions match a specific role template
export const matchesRoleTemplate = (
  permissions: UserPermissions,
  templateKey: keyof typeof ROLE_TEMPLATES
): boolean => {
  const template = ROLE_TEMPLATES[templateKey]
  
  return permissions.sections.every(section => {
    const expectedLevel = template.sections[section.section] || template.defaultLevel
    return section.level === expectedLevel
  })
}

// Get the closest matching role template
export const getClosestRoleTemplate = (permissions: UserPermissions): keyof typeof ROLE_TEMPLATES | null => {
  const templates = Object.keys(ROLE_TEMPLATES) as (keyof typeof ROLE_TEMPLATES)[]
  
  for (const templateKey of templates) {
    if (matchesRoleTemplate(permissions, templateKey)) {
      return templateKey
    }
  }
  
  return null
}
