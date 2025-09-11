import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase-server'

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { full_name, phone_number, notes, next_of_kin } = body

    // First, find the client record for this auth user
    const { data: clientRecord, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (clientError || !clientRecord) {
      console.error('Client record not found for user:', user.id, clientError)
      return NextResponse.json(
        { error: 'Client record not found' },
        { status: 404 }
      )
    }

    // Update the client profile using the client record ID
    // Note: database column is 'phone' not 'phone_number'
    const { data: updatedClient, error: updateError } = await supabase
      .from('clients')
      .update({
        full_name,
        phone: phone_number, // Map phone_number to phone column
        notes,
        next_of_kin,
        updated_at: new Date().toISOString()
      })
      .eq('id', clientRecord.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating client profile:', updateError)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      client: updatedClient
    })

  } catch (error) {
    console.error('Error in profile update:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // First, find the client record for this auth user
    const { data: clientRecord, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    if (clientError || !clientRecord) {
      console.error('Error fetching client profile:', clientError)
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      client: clientRecord
    })

  } catch (error) {
    console.error('Error in profile fetch:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
