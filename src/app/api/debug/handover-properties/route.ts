import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Debug: Checking handover properties in database')
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Get all properties with their handover status
    const { data: allProperties, error: allError } = await supabase
      .from('properties')
      .select(`
        id,
        name,
        handover_status,
        handover_date,
        lifecycle_status,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    if (allError) {
      console.error('Error fetching all properties:', allError)
      return NextResponse.json(
        { error: 'Failed to fetch properties', details: allError },
        { status: 500 }
      )
    }

    // Get properties with handover status IN_PROGRESS or COMPLETED
    const { data: handoverProperties, error: handoverError } = await supabase
      .from('properties')
      .select(`
        id,
        name,
        handover_status,
        handover_date,
        lifecycle_status,
        created_at
      `)
      .in('handover_status', ['IN_PROGRESS', 'COMPLETED'])
      .order('created_at', { ascending: false })

    if (handoverError) {
      console.error('Error fetching handover properties:', handoverError)
      return NextResponse.json(
        { error: 'Failed to fetch handover properties', details: handoverError },
        { status: 500 }
      )
    }

    // Count properties by handover status
    const statusCounts = (allProperties || []).reduce((acc, prop) => {
      const status = prop.handover_status || 'NULL'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log('🔍 Debug results:')
    console.log('- Total properties:', allProperties?.length || 0)
    console.log('- Handover properties (IN_PROGRESS/COMPLETED):', handoverProperties?.length || 0)
    console.log('- Status counts:', statusCounts)

    return NextResponse.json({
      success: true,
      summary: {
        total_properties: allProperties?.length || 0,
        handover_properties: handoverProperties?.length || 0,
        status_counts: statusCounts
      },
      all_properties: allProperties?.map(p => ({
        id: p.id,
        name: p.name,
        handover_status: p.handover_status,
        handover_date: p.handover_date,
        lifecycle_status: p.lifecycle_status
      })) || [],
      handover_properties: handoverProperties?.map(p => ({
        id: p.id,
        name: p.name,
        handover_status: p.handover_status,
        handover_date: p.handover_date,
        lifecycle_status: p.lifecycle_status
      })) || []
    })

  } catch (error) {
    console.error('Unexpected error in handover properties debug API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
}
