import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../../lib/supabase-server'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerSupabaseClient()

    // Check if user is authenticated (but allow for testing)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    const userId = params.id
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Validate required fields
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('enhanced_users')
      .select('id')
      .eq('id', userId)
      .single()

    if (fetchError || !existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user activities
    const { data: activities, error: activitiesError } = await supabase
      .from('activities_audit')
      .select(
        `
        activity_id,
        action,
        description,
        created_at,
        ip_address,
        user_agent,
        before_snapshot,
        after_snapshot
      `
      )
      .or(`actor_id.eq.${userId},entity_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (activitiesError) {
      console.error('Error fetching user activities:', activitiesError)
      return NextResponse.json({ error: 'Failed to fetch user activities' }, { status: 500 })
    }

    // Transform activities data
    const transformedActivities = (activities || []).map((activity: any) => ({
      id: activity.activity_id,
      action: activity.action,
      description: activity.description,
      timestamp: activity.created_at,
      ipAddress: activity.ip_address,
      userAgent: activity.user_agent,
      beforeSnapshot: activity.before_snapshot,
      afterSnapshot: activity.after_snapshot,
    }))

    return NextResponse.json({
      activities: transformedActivities,
      pagination: {
        limit,
        offset,
        total: transformedActivities.length,
      },
    })
  } catch (error) {
    console.error('Error in user activities GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
