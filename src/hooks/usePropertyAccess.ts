// Hook for managing multi-user property access
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase-client'

export type UserRole = 'OWNER' | 'PROPERTY_MANAGER' | 'LEASING_AGENT' | 'MAINTENANCE_COORDINATOR' | 'VIEWER'

export interface AccessibleProperty {
  property_id: string
  property_name: string
  user_role: UserRole
  permissions?: any
  can_manage_users: boolean
  can_edit_property: boolean
  can_manage_tenants: boolean
  can_manage_maintenance: boolean
}

export interface PropertyAccess {
  properties: AccessibleProperty[]
  loading: boolean
  error: string | null
  currentProperty: AccessibleProperty | null
  setCurrentProperty: (property: AccessibleProperty | null) => void
  refreshAccess: () => Promise<void>
  hasPermission: (propertyId: string, permission: string) => boolean
  canManageUsers: (propertyId: string) => boolean
  canEditProperty: (propertyId: string) => boolean
  canManageTenants: (propertyId: string) => boolean
  canManageMaintenance: (propertyId: string) => boolean
}

export function usePropertyAccess(): PropertyAccess {
  const [properties, setProperties] = useState<AccessibleProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentProperty, setCurrentProperty] = useState<AccessibleProperty | null>(null)

  // supabase client is imported above

  const fetchAccessibleProperties = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        throw new Error(`Authentication error: ${userError.message}`)
      }

      if (!user) {
        throw new Error('No authenticated user found')
      }

      // Call the database function to get accessible properties
      const { data, error: propertiesError } = await supabase
        .rpc('get_user_accessible_properties', { user_uuid: user.id })

      if (propertiesError) {
        throw new Error(`Failed to fetch accessible properties: ${propertiesError.message}`)
      }

      const accessibleProperties: AccessibleProperty[] = data || []
      setProperties(accessibleProperties)

      // Set current property if none is set and we have properties
      if (!currentProperty && accessibleProperties.length > 0) {
        setCurrentProperty(accessibleProperties[0])
      }

      // If current property is set but not in the new list, clear it
      if (currentProperty && !accessibleProperties.find(p => p.property_id === currentProperty.property_id)) {
        setCurrentProperty(null)
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error fetching accessible properties:', err)
    } finally {
      setLoading(false)
    }
  }

  const refreshAccess = async () => {
    await fetchAccessibleProperties()
  }

  const hasPermission = (propertyId: string, permission: string): boolean => {
    const property = properties.find(p => p.property_id === propertyId)
    if (!property) return false

    // Check role-based permissions
    switch (permission) {
      case 'manage_users':
        return property.can_manage_users
      case 'edit_property':
        return property.can_edit_property
      case 'manage_tenants':
        return property.can_manage_tenants
      case 'manage_maintenance':
        return property.can_manage_maintenance
      case 'view_property':
        return true // All roles can view
      default:
        return false
    }
  }

  const canManageUsers = (propertyId: string): boolean => {
    return hasPermission(propertyId, 'manage_users')
  }

  const canEditProperty = (propertyId: string): boolean => {
    return hasPermission(propertyId, 'edit_property')
  }

  const canManageTenants = (propertyId: string): boolean => {
    return hasPermission(propertyId, 'manage_tenants')
  }

  const canManageMaintenance = (propertyId: string): boolean => {
    return hasPermission(propertyId, 'manage_maintenance')
  }

  // Fetch accessible properties on mount
  useEffect(() => {
    fetchAccessibleProperties()
  }, [])

  return {
    properties,
    loading,
    error,
    currentProperty,
    setCurrentProperty,
    refreshAccess,
    hasPermission,
    canManageUsers,
    canEditProperty,
    canManageTenants,
    canManageMaintenance
  }
}

// Helper hook for checking permissions on the current property
export function useCurrentPropertyPermissions() {
  const { currentProperty, hasPermission } = usePropertyAccess()

  const checkPermission = (permission: string): boolean => {
    if (!currentProperty) return false
    return hasPermission(currentProperty.property_id, permission)
  }

  return {
    currentProperty,
    canManageUsers: checkPermission('manage_users'),
    canEditProperty: checkPermission('edit_property'),
    canManageTenants: checkPermission('manage_tenants'),
    canManageMaintenance: checkPermission('manage_maintenance'),
    userRole: currentProperty?.user_role || null,
    isOwner: currentProperty?.user_role === 'OWNER',
    isPropertyManager: currentProperty?.user_role === 'PROPERTY_MANAGER',
    isLeasingAgent: currentProperty?.user_role === 'LEASING_AGENT',
    isMaintenanceCoordinator: currentProperty?.user_role === 'MAINTENANCE_COORDINATOR',
    isViewer: currentProperty?.user_role === 'VIEWER'
  }
}

// Helper function to get role display name
export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case 'OWNER':
      return 'Owner'
    case 'PROPERTY_MANAGER':
      return 'Property Manager'
    case 'LEASING_AGENT':
      return 'Leasing Agent'
    case 'MAINTENANCE_COORDINATOR':
      return 'Maintenance Coordinator'
    case 'VIEWER':
      return 'Viewer'
    default:
      return 'Unknown'
  }
}

// Helper function to get role description
export function getRoleDescription(role: UserRole): string {
  switch (role) {
    case 'OWNER':
      return 'Full access to all property management features including user management'
    case 'PROPERTY_MANAGER':
      return 'Operational management of tenants, units, maintenance, and reports'
    case 'LEASING_AGENT':
      return 'Tenant management only - create and edit tenants and tenancy agreements'
    case 'MAINTENANCE_COORDINATOR':
      return 'Maintenance requests only - view and manage maintenance issues'
    case 'VIEWER':
      return 'Read-only access to view all property data'
    default:
      return 'Unknown role'
  }
}
