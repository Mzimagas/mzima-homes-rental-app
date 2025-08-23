import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../lib/supabase-server'

// GET - List all soft deleted users
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Check if user is authenticated (but allow for testing)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const search = url.searchParams.get('search') || ''
    
    const offset = (page - 1) * limit

    // Get soft deleted users
    let query = supabase
      .from('enhanced_users')
      .select(`
        id,
        member_number,
        email,
        full_name,
        phone_number,
        status,
        profile_complete,
        created_at,
        last_login,
        deleted_at
      `)
      .not('deleted_at', 'is', null) // Only get deleted users
      .order('deleted_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%,member_number.ilike.%${search}%`)
    }

    const { data: users, error: usersError } = await query

    if (usersError) {
      console.error('Error fetching deleted users:', usersError)
      return NextResponse.json(
        { error: 'Failed to fetch deleted users' },
        { status: 500 }
      )
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('enhanced_users')
      .select('id', { count: 'exact', head: true })
      .not('deleted_at', 'is', null) // Only count deleted users

    if (search) {
      countQuery = countQuery.or(`email.ilike.%${search}%,full_name.ilike.%${search}%,member_number.ilike.%${search}%`)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Error counting deleted users:', countError)
      return NextResponse.json(
        { error: 'Failed to count deleted users' },
        { status: 500 }
      )
    }

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      users: users || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages
      }
    })

  } catch (error) {
    console.error('Error in deleted users GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Bulk operations on deleted users (restore or permanent delete)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Check if user is authenticated (but allow for testing)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    const body = await request.json()
    const { action, userIds } = body

    if (!action || !userIds || !Array.isArray(userIds)) {
      return NextResponse.json(
        { error: 'Missing required fields: action and userIds array' },
        { status: 400 }
      )
    }

    if (!['restore', 'permanent_delete'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "restore" or "permanent_delete"' },
        { status: 400 }
      )
    }

    const results = []

    for (const userId of userIds) {
      try {
        if (action === 'restore') {
          // Restore user by setting deleted_at to null and status to active
          const { error: restoreError } = await supabase
            .from('enhanced_users')
            .update({ 
              deleted_at: null,
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .not('deleted_at', 'is', null) // Only restore if currently deleted

          if (restoreError) {
            results.push({ userId, success: false, error: restoreError.message })
          } else {
            results.push({ userId, success: true, action: 'restored' })
            
            // Log the restoration
            await supabase
              .from('activities_audit')
              .insert({
                actor_id: user?.id || userId,
                entity_type: 'enhanced_users',
                entity_id: userId,
                action: 'user_restored',
                description: `Restored soft deleted user: ${userId}`,
                after_snapshot: {
                  deleted_at: null,
                  status: 'active'
                }
              })
          }
        } else if (action === 'permanent_delete') {
          // Get user data before permanent deletion
          const { data: userData } = await supabase
            .from('enhanced_users')
            .select('email, full_name, member_number')
            .eq('id', userId)
            .single()

          // Permanently delete user and related data
          await supabase
            .from('user_profiles')
            .delete()
            .eq('user_id', userId)

          const { error: deleteError } = await supabase
            .from('enhanced_users')
            .delete()
            .eq('id', userId)

          if (deleteError) {
            results.push({ userId, success: false, error: deleteError.message })
          } else {
            results.push({ userId, success: true, action: 'permanently_deleted' })
            
            // Log the permanent deletion
            await supabase
              .from('activities_audit')
              .insert({
                actor_id: user?.id || userId,
                entity_type: 'enhanced_users',
                entity_id: userId,
                action: 'user_permanently_deleted',
                description: `Permanently deleted user: ${userData?.full_name} (${userData?.email}) - Data cannot be recovered`,
                before_snapshot: userData
              })
          }
        }
      } catch (err) {
        results.push({ userId, success: false, error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    return NextResponse.json({
      success: true,
      action,
      results,
      summary: {
        total: userIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    })

  } catch (error) {
    console.error('Error in deleted users POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
