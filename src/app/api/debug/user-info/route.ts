import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug user info API called')
    
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
    console.log('🔍 User metadata:', user.user_metadata)

    // Check clients table
    const { data: clientRecord, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', user.id)
      .single()

    console.log('🔍 Clients table result:', { clientRecord, clientError })

    // Check enhanced_users table
    const { data: enhancedUser, error: enhancedError } = await supabase
      .from('enhanced_users')
      .select('*')
      .eq('id', user.id)
      .single()

    console.log('🔍 Enhanced users table result:', { enhancedUser, enhancedError })

    // Check enhanced_users with client type
    const { data: enhancedClient, error: enhancedClientError } = await supabase
      .from('enhanced_users')
      .select('*')
      .eq('id', user.id)
      .eq('user_type', 'client')
      .single()

    console.log('🔍 Enhanced users (client type) result:', { enhancedClient, enhancedClientError })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
        created_at: user.created_at
      },
      database_records: {
        clients_table: {
          data: clientRecord,
          error: clientError?.message
        },
        enhanced_users_table: {
          data: enhancedUser,
          error: enhancedError?.message
        },
        enhanced_users_client: {
          data: enhancedClient,
          error: enhancedClientError?.message
        }
      }
    })

  } catch (error) {
    console.error('Error in debug user info API:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
