import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

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

    // Get client record
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, full_name')
      .eq('auth_user_id', user.id)
      .single()

    if (clientError || !client) {
      return NextResponse.json({
        agreementGenerated: false,
        agreementSigned: false,
        signature: null
      })
    }

    // Check if client has an interest in this property
    const { data: interest, error: interestError } = await supabase
      .from('client_property_interests')
      .select('id, status, notes')
      .eq('client_id', client.id)
      .eq('property_id', propertyId)
      .in('status', ['ACTIVE', 'COMMITTED', 'CONVERTED'])
      .single()

    if (interestError || !interest) {
      return NextResponse.json({
        agreementGenerated: false,
        agreementSigned: false,
        signature: null
      })
    }

    // For now, we'll determine agreement state based on the interest status
    // COMMITTED status means agreement has been generated and signed
    // ACTIVE status means interest exists but agreement may not be signed yet
    
    const agreementGenerated = true // If interest exists, we can generate agreement
    const agreementSigned = interest.status === 'COMMITTED'
    
    // Try to extract signature from notes if available
    let signature = null
    if (agreementSigned && interest.notes) {
      // Look for signature in notes (this is a temporary solution)
      const signatureMatch = interest.notes.match(/Signature:\s*(.+)/i)
      if (signatureMatch) {
        signature = signatureMatch[1].trim()
      } else {
        signature = client.full_name // Fallback to client name
      }
    }

    return NextResponse.json({
      agreementGenerated,
      agreementSigned,
      signature
    })

  } catch (error) {
    console.error('Agreement status check error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check agreement status' },
      { status: 500 }
    )
  }
}
