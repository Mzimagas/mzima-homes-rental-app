import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase-server'
import { z } from 'zod'

const interestStatusSchema = z.object({
  propertyIds: z.array(z.string().uuid('Invalid property ID')).optional(),
  propertyId: z.string().uuid('Invalid property ID').optional(),
}).refine(data => data.propertyIds || data.propertyId, {
  message: "Either propertyIds or propertyId must be provided"
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = interestStatusSchema.parse(body)

    const supabase = await createServerSupabaseClient()

    // Get the current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const propertyIds = validatedData.propertyIds || [validatedData.propertyId!]

    // Map auth user -> client.id
    const { data: clientRecord, error: clientErr } = await supabase
      .from('clients')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (clientErr || !clientRecord) {
      // No client record yet => no interests
      const empty = propertyIds.reduce((acc, pid) => {
        acc[pid] = { hasInterest: false, interestType: null, createdAt: null }
        return acc
      }, {} as Record<string, any>)
      return NextResponse.json({ success: true, interests: empty })
    }

    // Get interest status for the properties for CURRENT client
    const { data: interests, error: interestError } = await supabase
      .from('client_property_interests')
      .select('property_id, status, interest_type, created_at')
      .eq('client_id', clientRecord.id)
      .in('property_id', propertyIds)
      .eq('status', 'ACTIVE')

    if (interestError) {
      console.error('Error fetching interest status:', interestError)
      return NextResponse.json(
        { error: 'Failed to fetch interest status' },
        { status: 500 }
      )
    }

    // Get total ACTIVE interests count per property (all clients)
    const { data: allInterests, error: allErr } = await supabase
      .from('client_property_interests')
      .select('property_id, client_id')
      .in('property_id', propertyIds)
      .eq('status', 'ACTIVE')

    if (allErr) {
      console.error('Error fetching interest counts:', allErr)
    }

    const counts = (allInterests || []).reduce((acc: Record<string, number>, row: any) => {
      acc[row.property_id] = (acc[row.property_id] || 0) + 1
      return acc
    }, {})

    // Create a map of property ID to interest status
    const interestMap = (interests || []).reduce((acc, interest) => {
      acc[interest.property_id] = {
        hasInterest: true,
        interestType: interest.interest_type,
        createdAt: interest.created_at
      }
      return acc
    }, {} as Record<string, any>)

    // Fill in properties without interest and attach counts
    const result = propertyIds.reduce((acc, propertyId) => {
      const hasInterest = !!interestMap[propertyId]
      const totalCount = counts[propertyId] || 0
      acc[propertyId] = {
        hasInterest,
        interestType: interestMap[propertyId]?.interestType || null,
        createdAt: interestMap[propertyId]?.createdAt || null,
        totalInterested: totalCount,
        othersInterested: hasInterest ? Math.max(0, totalCount - 1) : totalCount
      }
      return acc
    }, {} as Record<string, any>)

    return NextResponse.json({
      success: true,
      interests: result
    })

  } catch (error) {
    console.error('Error in interest status API:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')

    if (!propertyId) {
      return NextResponse.json(
        { error: 'Property ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Get the current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get interest status for the property
    const { data: interest, error: interestError } = await supabase
      .from('client_property_interests')
      .select('property_id, status, interest_type, created_at')
      .eq('client_id', user.id)
      .eq('property_id', propertyId)
      .eq('status', 'ACTIVE')
      .single()

    if (interestError && interestError.code !== 'PGRST116') {
      console.error('Error fetching interest status:', interestError)
      return NextResponse.json(
        { error: 'Failed to fetch interest status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      hasInterest: !!interest,
      interestType: interest?.interest_type || null,
      createdAt: interest?.created_at || null
    })

  } catch (error) {
    console.error('Error in interest status API:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
