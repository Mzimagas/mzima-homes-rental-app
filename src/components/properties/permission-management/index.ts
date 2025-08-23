// Main component export
export { default as GranularPermissionManager } from './GranularPermissionManager'

// Component exports
export { default as PropertySelector } from './components/PropertySelector'
export { default as UserSelector } from './components/UserSelector'
export { default as PermissionAssignmentModal } from './components/PermissionAssignmentModal'
export { default as PermissionTable } from './components/PermissionTable'

// Hook exports
export { usePropertySelection } from './hooks/usePropertySelection'
export { useUserSelection } from './hooks/useUserSelection'
export { usePermissionManagement } from './hooks/usePermissionManagement'

// Utility exports
export * from './utils/permissionUtils'
export * from './utils/roleTemplates'

// Type exports
export * from './types'
