/**
 * Utility functions for subdivision management
 */

// Constants
export const SQM_TO_ACRE = 0.000247105
export const HECTARE_TO_SQM = 10000
export const DEFAULT_PLOT_SIZE_HECTARES = 0.045

/**
 * Convert square meters to acres
 */
export const toAcres = (sqm: number | null | undefined): number | null =>
  typeof sqm === 'number' ? sqm * SQM_TO_ACRE : null

/**
 * Convert hectares to square meters
 */
export const hectaresToSqm = (hectares: number | null | undefined): number | null =>
  typeof hectares === 'number' ? hectares * HECTARE_TO_SQM : null

/**
 * Convert square meters to hectares
 */
export const sqmToHectares = (sqm: number | null | undefined): number | null =>
  typeof sqm === 'number' ? sqm / HECTARE_TO_SQM : null

/**
 * Format currency in KES
 */
export const formatKES = (amount: number | null | undefined): string => {
  if (typeof amount !== 'number') return 'N/A'
  return `KES ${amount.toLocaleString()}`
}

/**
 * Format date for display
 */
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A'
  try {
    return new Date(dateString).toLocaleDateString()
  } catch {
    return 'Invalid Date'
  }
}

/**
 * Get status color classes for subdivision status
 */
export const getSubdivisionStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'planned':
      return 'bg-blue-100 text-blue-800'
    case 'in_progress':
      return 'bg-yellow-100 text-yellow-800'
    case 'completed':
      return 'bg-green-100 text-green-800'
    case 'on_hold':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

/**
 * Get status color classes for plot status
 */
export const getPlotStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'planned':
      return 'bg-blue-100 text-blue-800'
    case 'surveyed':
      return 'bg-yellow-100 text-yellow-800'
    case 'approved':
      return 'bg-green-100 text-green-800'
    case 'property_created':
      return 'bg-purple-100 text-purple-800'
    case 'sold':
      return 'bg-emerald-100 text-emerald-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

/**
 * Validate if subdivision tables exist based on error
 */
export const isTableNotFoundError = (error: any): boolean => {
  if (!error?.message) return false
  return /relation .*property_subdivisions.* does not exist/i.test(error.message)
}

/**
 * Compare two objects and return changed fields
 */
export const getChangedFields = <T extends Record<string, any>>(
  original: T,
  updated: T
): { hasChanges: boolean; changes: Partial<T>; changedFields: string[] } => {
  const changes: Partial<T> = {}
  const changedFields: string[] = []

  for (const key in updated) {
    if (JSON.stringify(original[key]) !== JSON.stringify(updated[key])) {
      changes[key] = updated[key]
      changedFields.push(key)
    }
  }

  return {
    hasChanges: changedFields.length > 0,
    changes,
    changedFields
  }
}
