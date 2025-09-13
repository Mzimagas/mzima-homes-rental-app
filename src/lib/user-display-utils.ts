/**
 * Utility functions for extracting and displaying user information
 */

import type { User } from '@supabase/supabase-js'

/**
 * Extracts the display name from a Supabase user object
 * Handles both string and object formats for full_name in user metadata
 */
export function getUserDisplayName(user: User | null | undefined): string {
  if (!user) return 'User'

  // Check raw_user_meta_data first (this is what Supabase actually uses)
  const rawMetadata = user.raw_user_meta_data || {}
  
  // Handle case where full_name is an object (like in client registration)
  if (rawMetadata.full_name) {
    if (typeof rawMetadata.full_name === 'string') {
      return rawMetadata.full_name
    } else if (typeof rawMetadata.full_name === 'object' && rawMetadata.full_name.full_name) {
      return rawMetadata.full_name.full_name
    }
  }

  // Fallback to user_metadata (for compatibility)
  const userMetadata = user.user_metadata || {}
  if (userMetadata.full_name) {
    if (typeof userMetadata.full_name === 'string') {
      return userMetadata.full_name
    } else if (typeof userMetadata.full_name === 'object' && userMetadata.full_name.full_name) {
      return userMetadata.full_name.full_name
    }
  }

  // Extract name from email as last resort
  if (user.email) {
    const emailPart = user.email.split('@')[0]
    // Capitalize first letter and replace dots/underscores with spaces
    return emailPart
      .replace(/[._]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  return 'User'
}

/**
 * Gets the user's first name for informal display
 */
export function getUserFirstName(user: User | null | undefined): string {
  const fullName = getUserDisplayName(user)
  return fullName.split(' ')[0]
}

/**
 * Gets user initials for avatar display
 */
export function getUserInitials(user: User | null | undefined): string {
  const displayName = getUserDisplayName(user)
  
  if (displayName === 'User') {
    return user?.email?.charAt(0).toUpperCase() || 'U'
  }

  return displayName
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Gets user phone number from metadata
 */
export function getUserPhone(user: User | null | undefined): string | null {
  if (!user) return null

  // Check raw_user_meta_data first
  const rawMetadata = user.raw_user_meta_data || {}
  
  // Handle case where phone is in nested full_name object
  if (rawMetadata.full_name && typeof rawMetadata.full_name === 'object' && rawMetadata.full_name.phone) {
    return rawMetadata.full_name.phone
  }

  // Check direct phone field
  if (rawMetadata.phone) {
    return rawMetadata.phone
  }

  // Fallback to user_metadata
  const userMetadata = user.user_metadata || {}
  if (userMetadata.phone) {
    return userMetadata.phone
  }

  return null
}

/**
 * Gets user type from metadata
 */
export function getUserType(user: User | null | undefined): 'client' | 'staff' | 'admin' | null {
  if (!user) return null

  // Check raw_user_meta_data first
  const rawMetadata = user.raw_user_meta_data || {}
  
  // Handle case where user_type is in nested full_name object
  if (rawMetadata.full_name && typeof rawMetadata.full_name === 'object' && rawMetadata.full_name.user_type) {
    return rawMetadata.full_name.user_type
  }

  // Check direct user_type field
  if (rawMetadata.user_type) {
    return rawMetadata.user_type
  }

  // Fallback to user_metadata
  const userMetadata = user.user_metadata || {}
  if (userMetadata.user_type) {
    return userMetadata.user_type
  }

  return null
}
