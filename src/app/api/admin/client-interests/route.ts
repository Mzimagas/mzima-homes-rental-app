import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Get the current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // TODO: Add admin role verification here
    // For now, we'll allow any authenticated user to access this

    // Get client interests with related client and property data
    const { data: interests, error } = await supabase
      .from('client_property_interests')
      .select(`
        id,
        client_id,
        property_id,
        interest_type,
        status,
        message,
        contact_preference,
        created_at,
        updated_at,
        clients:client_id (
          full_name,
          email,
          phone
        ),
        properties:property_id (
          name,
          location,
          asking_price_kes,
          handover_status
        )
      `)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })

    if (error) {
      // If client_property_interests table doesn't exist, return empty array
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: true,
          interests: []
        })
      }
      
      console.error('Error fetching client interests:', error)
      return NextResponse.json(
        { error: 'Failed to fetch client interests' },
        { status: 500 }
      )
    }

    // Transform the data to match expected format
    const formattedInterests = (interests || []).map(interest => ({
      id: interest.id,
      client_id: interest.client_id,
      property_id: interest.property_id,
      interest_type: interest.interest_type,
      status: interest.status,
      message: interest.message,
      contact_preference: interest.contact_preference,
      created_at: interest.created_at,
      client: interest.clients || {
        full_name: 'Unknown Client',
        email: 'unknown@example.com',
        phone: null
      },
      property: interest.properties || {
        name: 'Unknown Property',
        location: 'Unknown Location',
        asking_price_kes: 0,
        handover_status: 'UNKNOWN'
      }
    }))

    return NextResponse.json({
      success: true,
      interests: formattedInterests
    })

  } catch (error) {
    console.error('Client interests API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
