import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug user duplicates API called')
    
    const supabase = await createServerSupabaseClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    console.log('🔍 Current user:', user.email, 'ID:', user.id)

    // Check for duplicate auth users with same email
    const { data: authUsers, error: authUsersError } = await supabase
      .from('auth.users')
      .select('id, email, created_at, user_metadata, email_confirmed_at')
      .eq('email', user.email)

    console.log('🔍 Auth users with same email:', authUsers?.length || 0)

    // Check all client records for this email
    const { data: clientsByEmail, error: clientsByEmailError } = await supabase
      .from('clients')
      .select('id, auth_user_id, full_name, email, created_at, status')
      .eq('email', user.email)

    console.log('🔍 Client records with same email:', clientsByEmail?.length || 0)

    // Check client record for current auth user
    const { data: currentUserClient, error: currentUserClientError } = await supabase
      .from('clients')
      .select('id, auth_user_id, full_name, email, created_at, status')
      .eq('auth_user_id', user.id)

    console.log('🔍 Client record for current auth user:', currentUserClient?.length || 0)

    // Check property interests for current user's client records
    let propertyInterests = []
    if (currentUserClient && currentUserClient.length > 0) {
      const clientIds = currentUserClient.map(c => c.id)
      const { data: interests, error: interestsError } = await supabase
        .from('client_property_interests')
        .select(`
          id,
          client_id,
          property_id,
          status,
          interest_type,
          created_at,
          properties!inner(id, name, physical_address)
        `)
        .in('client_id', clientIds)

      propertyInterests = interests || []
    }

    // Check for orphaned property interests (client_id not in clients table)
    const { data: orphanedInterests, error: orphanedError } = await supabase
      .from('client_property_interests')
      .select(`
        id,
        client_id,
        property_id,
        status,
        created_at
      `)
      .not('client_id', 'in', `(SELECT id FROM clients)`)

    console.log('🔍 Orphaned property interests:', orphanedInterests?.length || 0)

    return NextResponse.json({
      success: true,
      current_user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
        created_at: user.created_at,
        email_confirmed_at: user.email_confirmed_at
      },
      analysis: {
        auth_users_with_same_email: authUsers?.length || 0,
        client_records_with_same_email: clientsByEmail?.length || 0,
        client_records_for_current_user: currentUserClient?.length || 0,
        property_interests_count: propertyInterests.length,
        orphaned_interests_count: orphanedInterests?.length || 0
      },
      detailed_data: {
        auth_users: authUsers || [],
        clients_by_email: clientsByEmail || [],
        current_user_clients: currentUserClient || [],
        property_interests: propertyInterests,
        orphaned_interests: orphanedInterests || []
      },
      errors: {
        auth_users_error: authUsersError?.message,
        clients_by_email_error: clientsByEmailError?.message,
        current_user_client_error: currentUserClientError?.message,
        orphaned_error: orphanedError?.message
      }
    })

  } catch (error) {
    console.error('Error in debug user duplicates API:', error)
    
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
