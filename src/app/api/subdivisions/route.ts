import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Subdivision schema for validation
const subdivisionSchema = z.object({
  parcel_id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  total_plots_planned: z.number().int().positive('Total plots must be positive'),
  total_plots_created: z.number().int().min(0).optional(),
  status: z.enum(['planning', 'approved', 'in_progress', 'completed', 'on_hold']).default('planning'),
  project_manager: z.string().optional(),
  budget_estimate: z.number().positive().optional(),
  public_utility_area_ha: z.number().positive().optional(),
  approval_reference: z.string().optional(),
  start_date: z.string().optional(),
  completion_date: z.string().optional(),
  notes: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parcelId = searchParams.get('parcel_id')
    const status = searchParams.get('status')

    let query = supabase
      .from('subdivisions')
      .select(`
        *,
        parcels (
          lr_number,
          county,
          sub_county,
          locality,
          acreage_ha
        )
      `)
      .order('created_at', { ascending: false })

    // Apply filters if provided
    if (parcelId) {
      query = query.eq('parcel_id', parcelId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching subdivisions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch subdivisions', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data || [] })

  } catch (error) {
    console.error('Subdivisions API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the request body
    const validatedData = subdivisionSchema.parse(body)

    const { data, error } = await supabase
      .from('subdivisions')
      .insert([validatedData])
      .select(`
        *,
        parcels (
          lr_number,
          county,
          sub_county,
          locality,
          acreage_ha
        )
      `)
      .single()

    if (error) {
      console.error('Error creating subdivision:', error)
      return NextResponse.json(
        { error: 'Failed to create subdivision', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Subdivision creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subdivisionId = searchParams.get('id')

    if (!subdivisionId) {
      return NextResponse.json(
        { error: 'Subdivision ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    
    // Validate the request body (partial update)
    const validatedData = subdivisionSchema.partial().parse(body)

    const { data, error } = await supabase
      .from('subdivisions')
      .update(validatedData)
      .eq('subdivision_id', subdivisionId)
      .select(`
        *,
        parcels (
          lr_number,
          county,
          sub_county,
          locality,
          acreage_ha
        )
      `)
      .single()

    if (error) {
      console.error('Error updating subdivision:', error)
      return NextResponse.json(
        { error: 'Failed to update subdivision', details: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Subdivision not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Subdivision update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subdivisionId = searchParams.get('id')

    if (!subdivisionId) {
      return NextResponse.json(
        { error: 'Subdivision ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('subdivisions')
      .delete()
      .eq('subdivision_id', subdivisionId)

    if (error) {
      console.error('Error deleting subdivision:', error)
      return NextResponse.json(
        { error: 'Failed to delete subdivision', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Subdivision deleted successfully' })

  } catch (error) {
    console.error('Subdivision deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
