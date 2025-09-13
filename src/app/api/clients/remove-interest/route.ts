import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase-server'
import { z } from 'zod'

const removeInterestSchema = z.object({
  propertyId: z.string().uuid('Invalid property ID'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = removeInterestSchema.parse(body)

    const supabase = await createServerSupabaseClient()

    // Get the current authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Resolve client_id from auth user
    const { data: clientRecord } = await supabase
      .from('clients')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!clientRecord) {
      return NextResponse.json({ error: 'Client record not found' }, { status: 404 })
    }

    // Check if interest exists and get property commitment status
    const { data: existingInterest, error: checkError } = await supabase
      .from('client_property_interests')
      .select(
        `
        id,
        status,
        properties!inner (
          id,
          name,
          committed_client_id
        )
      `
      )
      .eq('client_id', clientRecord.id)
      .eq('property_id', validatedData.propertyId)
      .eq('status', 'ACTIVE')
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing interest:', checkError)
      return NextResponse.json({ error: 'Failed to check interest status' }, { status: 500 })
    }

    if (!existingInterest) {
      return NextResponse.json(
        { error: 'No active interest found for this property' },
        { status: 404 }
      )
    }

    // Check if property is committed to this client - prevent removal if committed
    const property = existingInterest.properties
    if (property.committed_client_id === clientRecord.id) {
      return NextResponse.json(
        {
          error:
            'Cannot remove interest from a committed property. Please contact support if you need to cancel your commitment.',
        },
        { status: 400 }
      )
    }

    // Update interest status to INACTIVE instead of deleting
    const { error: updateError } = await supabase
      .from('client_property_interests')
      .update({
        status: 'INACTIVE',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingInterest.id)

    if (updateError) {
      console.error('Error removing interest:', updateError)
      return NextResponse.json({ error: 'Failed to remove interest' }, { status: 500 })
    }

    // Create admin notification about removed interest
    await createAdminNotification(supabase, user.id, validatedData.propertyId, 'INTEREST_REMOVED')

    return NextResponse.json({
      success: true,
      message: 'Interest removed successfully',
    })
  } catch (error) {
    console.error('Error in remove interest API:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function createAdminNotification(
  supabase: any,
  clientId: string,
  propertyId: string,
  type: string
) {
  try {
    // Get client and property details for notification
    const [clientResult, propertyResult] = await Promise.all([
      supabase.from('clients').select('full_name').eq('id', clientId).single(),
      supabase.from('properties').select('name').eq('id', propertyId).single(),
    ])

    const clientName = clientResult.data?.full_name || 'Unknown Client'
    const propertyName = propertyResult.data?.name || 'Unknown Property'

    const notificationData = {
      type: 'CLIENT_INTEREST_REMOVED',
      title: 'Property Interest Removed',
      message: `${clientName} has removed interest in ${propertyName}`,
      data: {
        client_id: clientId,
        property_id: propertyId,
        client_name: clientName,
        property_name: propertyName,
      },
      created_at: new Date().toISOString(),
      is_read: false,
      priority: 'NORMAL',
    }

    const { error } = await supabase.from('admin_notifications').insert([notificationData])

    if (error) {
      console.warn('Failed to create admin notification:', error)
    }
  } catch (error) {
    console.warn('Error creating admin notification:', error)
  }
}
