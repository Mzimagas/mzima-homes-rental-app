import { createServerSupabaseClient } from './supabase-server'
import { User } from '@supabase/supabase-js'

export type UserType = 'client' | 'staff' | 'unknown'

export interface UserTypeInfo {
  type: UserType
  redirectPath: string
  metadata?: {
    isClient?: boolean
    isStaff?: boolean
    memberNumber?: string
    role?: string
    clientId?: string
  }
}

/**
 * Detects user type based on their presence in different tables and metadata
 */
export async function detectUserType(user: User): Promise<UserTypeInfo> {
  try {
    console.log('🔍 Starting user type detection for:', user.email, 'ID:', user.id)
    console.log('🔍 User metadata:', user.user_metadata)

    const supabase = await createServerSupabaseClient()

    // Check user metadata first for quick detection
    const userMetadata = user.user_metadata || {}

    // If user_metadata explicitly says 'client', they're a client
    if (userMetadata.user_type === 'client') {
      console.log('✅ User type detected from metadata: client')
      return {
        type: 'client',
        redirectPath: '/client-portal',
        metadata: {
          isClient: true,
          clientId: user.id
        }
      }
    }

    // Check if user exists in clients table (marketplace users)
    console.log('🔍 Checking clients table...')
    const { data: clientRecord, error: clientError } = await supabase
      .from('clients')
      .select('id, user_type, full_name')
      .eq('id', user.id)
      .single()

    console.log('🔍 Clients table result:', { clientRecord, clientError })

    if (!clientError && clientRecord) {
      console.log('✅ User type detected from clients table: client')
      return {
        type: 'client',
        redirectPath: '/client-portal',
        metadata: {
          isClient: true,
          clientId: clientRecord.id
        }
      }
    }

    // Check if user exists in enhanced_users table with client type
    const { data: enhancedUserClient, error: enhancedClientError } = await supabase
      .from('enhanced_users')
      .select('id, user_type, full_name, metadata')
      .eq('id', user.id)
      .eq('user_type', 'client')
      .single()

    if (!enhancedClientError && enhancedUserClient) {
      return {
        type: 'client',
        redirectPath: '/client-portal',
        metadata: {
          isClient: true,
          clientId: enhancedUserClient.id
        }
      }
    }

    // Check if user exists in enhanced_users table as staff
    const { data: staffRecord, error: staffError } = await supabase
      .from('enhanced_users')
      .select('id, member_number, full_name, status')
      .eq('id', user.id)
      .single()

    if (!staffError && staffRecord && staffRecord.member_number) {
      return {
        type: 'staff',
        redirectPath: '/dashboard',
        metadata: {
          isStaff: true,
          memberNumber: staffRecord.member_number
        }
      }
    }

    // Check auth.users metadata for any role indicators
    if (userMetadata.role || userMetadata.member_number) {
      return {
        type: 'staff',
        redirectPath: '/dashboard',
        metadata: {
          isStaff: true,
          role: userMetadata.role,
          memberNumber: userMetadata.member_number
        }
      }
    }

    // Default fallback - if we can't determine, assume client for marketplace users
    // This is safer as staff users should be explicitly created with proper records
    console.warn('Could not determine user type for user:', user.id, 'defaulting to client')
    
    return {
      type: 'client',
      redirectPath: '/client-portal',
      metadata: {
        isClient: true,
        clientId: user.id
      }
    }

  } catch (error) {
    console.error('Error detecting user type:', error)
    
    // Fallback to client on error
    return {
      type: 'client',
      redirectPath: '/client-portal',
      metadata: {
        isClient: true,
        clientId: user.id
      }
    }
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
        clientId: user.id
      }
    }
  }

  // Check for staff indicators
  if (userMetadata.role || userMetadata.member_number) {
    return {
      type: 'staff',
      redirectPath: '/dashboard',
      metadata: {
        isStaff: true,
        role: userMetadata.role,
        memberNumber: userMetadata.member_number
      }
    }
  }

  // Default to client for unknown users
  return {
    type: 'client',
    redirectPath: '/client-portal',
    metadata: {
      isClient: true,
      clientId: user.id
    }
  }
}
