import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Validation schema
const makeAvailableSchema = z.object({
  propertyId: z.string().uuid('Invalid property ID format'),
})

/**
 * Make Property Available in Marketplace
 * Moves property from NOT_STARTED to AWAITING_START status
 * This makes the property visible and available for client interest in the marketplace
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, serviceKey)
    
    // Parse and validate request body
    const body = await request.json()
    const validatedData = makeAvailableSchema.parse(body)

    console.log('🏠 Making property available in marketplace:', validatedData.propertyId)

    // Get property details
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, name, handover_status, committed_client_id, reservation_status')
      .eq('id', validatedData.propertyId)
      .single()

    if (propertyError || !property) {
      console.error('Property fetch error:', propertyError)
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // Check if property is in correct state to be made available
    if (property.handover_status !== 'NOT_STARTED') {
      return NextResponse.json(
        { 
          error: `Property cannot be made available. Current status: ${property.handover_status}. Only properties with NOT_STARTED status can be made available.` 
        },
        { status: 400 }
      )
    }

    // Check if property is already committed or reserved
    if (property.committed_client_id || property.reservation_status) {
      return NextResponse.json(
        { 
          error: 'Property is already committed or reserved to a client' 
        },
        { status: 400 }
      )
    }

    // Update property to AWAITING_START status
    const { error: updateError } = await supabase
      .from('properties')
      .update({
        handover_status: 'AWAITING_START',
        updated_at: new Date().toISOString()
      })
      .eq('id', validatedData.propertyId)

    if (updateError) {
      console.error('Property update error:', updateError)
      return NextResponse.json(
        { error: `Failed to update property status: ${updateError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Property made available in marketplace:', property.name)

    return NextResponse.json({
      success: true,
      message: `Property "${property.name}" is now available in marketplace`,
      property: {
        id: property.id,
        name: property.name,
        handover_status: 'AWAITING_START',
        is_marketplace_visible: true
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Make property available API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
