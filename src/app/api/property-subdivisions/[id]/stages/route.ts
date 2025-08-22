import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// PATCH /api/property-subdivisions/[id]/stages - Update subdivision pipeline stages
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient(supabaseUrl, serviceKey)
    const { id: subdivisionId } = await params
    const body = await request.json()
    const { pipeline_stages, current_stage, overall_progress } = body

    console.log('Updating subdivision stages:', {
      subdivisionId,
      current_stage,
      overall_progress,
      stages_count: pipeline_stages?.length
    })

    // Validate required fields
    if (!pipeline_stages || !Array.isArray(pipeline_stages)) {
      return NextResponse.json(
        { error: 'pipeline_stages is required and must be an array' },
        { status: 400 }
      )
    }

    if (typeof current_stage !== 'number' || typeof overall_progress !== 'number') {
      return NextResponse.json(
        { error: 'current_stage and overall_progress must be numbers' },
        { status: 400 }
      )
    }

    // Check if subdivision exists
    const { data: subdivision, error: subdivisionError } = await supabase
      .from('property_subdivisions')
      .select('id, original_property_id')
      .eq('id', subdivisionId)
      .single()

    if (subdivisionError || !subdivision) {
      console.error('Subdivision not found:', subdivisionError)
      return NextResponse.json(
        { error: 'Subdivision not found' },
        { status: 404 }
      )
    }

    // Update subdivision stages
    const { data: updatedSubdivision, error: updateError } = await supabase
      .from('property_subdivisions')
      .update({
        pipeline_stages,
        current_stage,
        overall_progress,
        updated_at: new Date().toISOString()
      })
      .eq('id', subdivisionId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating subdivision stages:', updateError)
      return NextResponse.json(
        { error: 'Failed to update subdivision stages' },
        { status: 500 }
      )
    }

    console.log('Successfully updated subdivision stages')
    return NextResponse.json(updatedSubdivision)

  } catch (error) {
    console.error('Error in subdivision stages PATCH:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/property-subdivisions/[id]/stages - Get subdivision pipeline stages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient(supabaseUrl, serviceKey)
    const { id: subdivisionId } = await params

    // Get subdivision with stages
    const { data: subdivision, error: subdivisionError } = await supabase
      .from('property_subdivisions')
      .select('*')
      .eq('id', subdivisionId)
      .single()

    if (subdivisionError || !subdivision) {
      console.error('Subdivision not found:', subdivisionError)
      return NextResponse.json(
        { error: 'Subdivision not found' },
        { status: 404 }
      )
    }



    return NextResponse.json(subdivision)

  } catch (error) {
    console.error('Error in subdivision stages GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
