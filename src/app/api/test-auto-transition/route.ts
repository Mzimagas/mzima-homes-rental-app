import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '../../../lib/supabase-server'

/**
 * Test endpoint to verify auto-transition functionality
 * This endpoint can be used to test the auto-transition system
 * with the existing properties that have missing handover records
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await getServerSupabase()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🧪 Testing auto-transition for missing handover properties...')

    // Find properties with IN_PROGRESS handover status but no handover pipeline records
    const { data: inProgressProperties, error: propertiesError } = await supabase
      .from('properties')
      .select(`
        id,
        name,
        handover_status,
        asking_price_kes,
        sale_price_kes
      `)
      .eq('handover_status', 'IN_PROGRESS')

    if (propertiesError) {
      return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 })
    }

    if (!inProgressProperties || inProgressProperties.length === 0) {
      return NextResponse.json({
        message: 'No IN_PROGRESS properties found',
        properties: []
      })
    }

    // Get existing handover pipeline records
    const { data: existingHandovers, error: handoverError } = await supabase
      .from('handover_pipeline')
      .select('property_id')

    if (handoverError) {
      return NextResponse.json({ error: 'Failed to fetch handover records' }, { status: 500 })
    }

    const existingHandoverPropertyIds = new Set(existingHandovers?.map(h => h.property_id) || [])
    
    // Find properties missing handover records
    const missingHandoverProperties = inProgressProperties.filter(
      prop => !existingHandoverPropertyIds.has(prop.id)
    )

    console.log('🔍 Found properties missing handover records:', {
      totalInProgress: inProgressProperties.length,
      existingHandovers: existingHandovers?.length || 0,
      missingHandovers: missingHandoverProperties.length,
      missingProperties: missingHandoverProperties.map(p => ({ id: p.id, name: p.name }))
    })

    if (missingHandoverProperties.length === 0) {
      return NextResponse.json({
        message: 'All IN_PROGRESS properties already have handover pipeline records',
        inProgressCount: inProgressProperties.length,
        existingHandoverCount: existingHandovers?.length || 0
      })
    }

    // For each missing property, find the client interest and attempt auto-transition
    const transitionResults = []

    for (const property of missingHandoverProperties) {
      try {
        // Find client interest for this property
        const { data: interests, error: interestError } = await supabase
          .from('client_property_interests')
          .select(`
            *,
            clients:client_id (
              id,
              full_name,
              email,
              phone
            )
          `)
          .eq('property_id', property.id)
          .eq('status', 'CONVERTED')
          .order('updated_at', { ascending: false })
          .limit(1)

        if (interestError || !interests || interests.length === 0) {
          console.warn(`⚠️ No CONVERTED client interest found for property ${property.name}`)
          transitionResults.push({
            propertyId: property.id,
            propertyName: property.name,
            success: false,
            error: 'No CONVERTED client interest found'
          })
          continue
        }

        const interest = interests[0]
        const client = interest.clients

        if (!client) {
          console.warn(`⚠️ No client found for interest ${interest.id}`)
          transitionResults.push({
            propertyId: property.id,
            propertyName: property.name,
            success: false,
            error: 'No client found for interest'
          })
          continue
        }

        // Determine trigger event based on interest data
        let triggerEvent = 'admin_manual'
        if (interest.agreement_signed_at) {
          triggerEvent = 'agreement_signed'
        } else if (interest.deposit_paid_at) {
          triggerEvent = 'deposit_paid'
        }

        console.log(`🔄 Attempting auto-transition for ${property.name} with trigger: ${triggerEvent}`)

        // Call the auto-transition API
        const transitionResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/clients/transition-to-handover`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': request.headers.get('Authorization') || '',
            'Cookie': request.headers.get('Cookie') || '',
          },
          body: JSON.stringify({
            propertyId: property.id,
            clientId: client.id,
            triggerEvent,
            interestId: interest.id,
            notes: `Test auto-transition for missing handover record - ${property.name}`
          })
        })

        const transitionData = await transitionResponse.json()

        if (transitionResponse.ok && transitionData.success) {
          console.log(`✅ Auto-transition successful for ${property.name}`)
          transitionResults.push({
            propertyId: property.id,
            propertyName: property.name,
            clientName: client.full_name,
            triggerEvent,
            success: true,
            handoverId: transitionData.handover?.id,
            currentStage: transitionData.details?.currentStage,
            progress: transitionData.details?.overallProgress
          })
        } else {
          console.error(`❌ Auto-transition failed for ${property.name}:`, transitionData.error)
          transitionResults.push({
            propertyId: property.id,
            propertyName: property.name,
            clientName: client.full_name,
            triggerEvent,
            success: false,
            error: transitionData.error || 'Unknown error'
          })
        }

      } catch (error) {
        console.error(`❌ Error processing property ${property.name}:`, error)
        transitionResults.push({
          propertyId: property.id,
          propertyName: property.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successCount = transitionResults.filter(r => r.success).length
    const failureCount = transitionResults.filter(r => !r.success).length

    console.log('🎯 Auto-transition test completed:', {
      totalAttempted: transitionResults.length,
      successful: successCount,
      failed: failureCount
    })

    return NextResponse.json({
      message: `Auto-transition test completed: ${successCount} successful, ${failureCount} failed`,
      summary: {
        totalInProgressProperties: inProgressProperties.length,
        propertiesMissingHandover: missingHandoverProperties.length,
        transitionAttempts: transitionResults.length,
        successful: successCount,
        failed: failureCount
      },
      results: transitionResults
    })

  } catch (error) {
    console.error('Test auto-transition error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
