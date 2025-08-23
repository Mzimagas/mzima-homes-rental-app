'use client'

// This component has been refactored into smaller, maintainable components
// The new implementation is located in ../permission-management/
import { GranularPermissionManager as RefactoredGranularPermissionManager } from '../permission-management'

/**
 * GranularPermissionManager Component
 * 
 * This component has been refactored from a monolithic 2,100+ line component
 * into smaller, focused sub-components for better maintainability:
 * 
 * - PropertySelector: Handles property selection with lifecycle filtering
 * - UserSelector: Manages user selection and search
 * - PermissionAssignmentModal: Modal for detailed permission assignment
 * - PermissionTable: Displays and manages existing permissions
 * 
 * Custom hooks for state management:
 * - usePropertySelection: Property management state
 * - useUserSelection: User selection logic
 * - usePermissionManagement: Permission CRUD operations
 * 
 * Utility functions:
 * - permissionUtils: Helper functions for permissions
 * - roleTemplates: Role template logic and application
 * 
 * All existing functionality is preserved including:
 * - Lifecycle-based filtering (Purchase Pipeline, Subdivision, Handover)
 * - Role templates (Admin, Supervisor, Staff, Member)
 * - Bulk operations and permission management
 * - Property and user search functionality
 */
export default function GranularPermissionManager() {
  return <RefactoredGranularPermissionManager />
}
