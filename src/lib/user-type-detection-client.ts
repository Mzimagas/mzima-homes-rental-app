import type { User } from '@supabase/supabase-js'

export interface UserTypeInfo {
  type: 'staff' | 'client'
  redirectPath: string
  metadata: {
    isStaff?: boolean
    isClient?: boolean
    memberNumber?: string
    role?: string
    clientId?: string
    detectedFromEmail?: boolean
  }
}

/**
 * Client-side user type detection based on user metadata only
 * (for use in components where we can't make server calls)
 */
export function detectUserTypeFromMetadata(user: User): UserTypeInfo {
  const userMetadata = user.user_metadata || {}

  // Check for explicit client type
  if (userMetadata.user_type === 'client') {
    return {
      type: 'client',
      redirectPath: '/client-portal',
      metadata: {
        isClient: true,
        clientId: user.id,
      },
    }
  }

  // Check for staff indicators
  if (userMetadata.role || userMetadata.member_number || userMetadata.user_type === 'staff') {
    return {
      type: 'staff',
      redirectPath: '/dashboard',
      metadata: {
        isStaff: true,
        role: userMetadata.role,
        memberNumber: userMetadata.member_number,
      },
    }
  }

  // Check if user has admin-like email patterns (client-side version)
  const adminEmailPatterns = [
    /@(admin|staff|management|kodirent)\./i,
    /admin@/i,
    /staff@/i,
    /manager@/i,
  ]

  const hasAdminEmail = adminEmailPatterns.some((pattern) => pattern.test(user.email || ''))

  if (hasAdminEmail) {
    return {
      type: 'staff',
      redirectPath: '/dashboard',
      metadata: {
        isStaff: true,
        detectedFromEmail: true,
      },
    }
  }

  // Default to client for unknown users (safer for marketplace)
  return {
    type: 'client',
    redirectPath: '/client-portal',
    metadata: {
      isClient: true,
      clientId: user.id,
    },
  }
}
