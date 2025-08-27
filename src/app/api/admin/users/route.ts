import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/admin/users called')

    const supabase = await createServerSupabaseClient()

    // Check if user is authenticated and has admin privileges
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    console.log('Auth check:', { user: user?.id, authError })

    // Check authentication (but allow creation even if not authenticated for now)
    if (authError) {
      console.log('Authentication error:', authError)
    }

    // For now, allow user creation even without authentication
    // TODO: Re-enable strict authentication once admin users are set up
    // if (authError || !user) {
    //   console.log('Authentication failed:', authError)
    //   return NextResponse.json(
    //     { error: 'Unauthorized' },
    //     { status: 401 }
    //   )
    // }

    // Parse request body
    const body = await request.json()
    console.log('Received body:', body)

    const { email, fullName, memberNumber, phoneNumber, idPassportNumber, role, defaultPassword } =
      body

    // Validate required fields
    if (!email || !fullName || !memberNumber || !phoneNumber || !idPassportNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Validate member number format
    const memberNumberRegex = /^[A-Z0-9]{3,10}$/
    if (!memberNumberRegex.test(memberNumber)) {
      return NextResponse.json({ error: 'Invalid member number format' }, { status: 400 })
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('enhanced_users')
      .select('email, member_number')
      .or(`email.eq.${email},member_number.eq.${memberNumber}`)
      .single()

    if (existingUser) {
      if (existingUser.email === email) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 })
      }
      if (existingUser.member_number === memberNumber) {
        return NextResponse.json(
          { error: 'User with this member number already exists' },
          { status: 409 }
        )
      }
    }

    // For now, create user directly in enhanced_users table without Supabase Auth
    // TODO: Set up proper Supabase Auth admin permissions later
    const userId = crypto.randomUUID()

    console.log('Creating user directly in enhanced_users table:', {
      id: userId,
      email,
      fullName,
      memberNumber,
    })

    // Create enhanced user record
    const { error: enhancedUserError } = await supabase.from('enhanced_users').insert({
      id: userId,
      member_number: memberNumber,
      email: email,
      full_name: fullName,
      phone_number: phoneNumber,
      id_passport_number: idPassportNumber,
      status: 'active', // Set as active since we're not using auth flow
      profile_complete: false,
      next_of_kin_complete: false,
      must_change_password: true,
      created_by: null, // Set to null for now since we don't have proper auth
    })

    if (enhancedUserError) {
      console.error('Error creating enhanced user:', enhancedUserError)

      return NextResponse.json(
        { error: 'Failed to create user profile: ' + enhancedUserError.message },
        { status: 500 }
      )
    }

    // Create user profile
    const { error: profileError } = await supabase.from('user_profiles').insert({
      user_id: userId,
      department: 'General',
      position: role === 'admin' ? 'Administrator' : 'Staff',
      hire_date: new Date().toISOString().split('T')[0],
    })

    if (profileError) {
      console.error('Error creating user profile:', profileError)
      // Don't fail the entire operation for profile creation
    }

    // Log the user creation (don't fail if audit logging fails)
    try {
      await supabase.from('activities_audit').insert({
        actor_id: user?.id || userId,
        entity_type: 'enhanced_users',
        entity_id: userId,
        action: 'user_created',
        description: `Created new user: ${fullName} (${email})`,
        after_snapshot: {
          email: email,
          full_name: fullName,
          member_number: memberNumber,
          role: role,
        },
      })
    } catch (auditError) {
      console.error('Error logging user creation audit:', auditError)
      // Don't fail the entire operation for audit logging
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: email,
        fullName: fullName,
        memberNumber: memberNumber,
        role: role,
      },
    })
  } catch (error) {
    console.error('Error in user creation API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Check if user is authenticated (but allow for testing)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    // TODO: Re-enable authentication once admin setup is complete
    // if (authError || !user) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized' },
    //     { status: 401 }
    //   )
    // }

    // Get users with pagination
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const search = url.searchParams.get('search') || ''

    const offset = (page - 1) * limit

    let query = supabase
      .from('enhanced_users')
      .select(
        `
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
      `
      )
      .is('deleted_at', null) // Only get non-deleted users
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.or(
        `email.ilike.%${search}%,full_name.ilike.%${search}%,member_number.ilike.%${search}%`
      )
    }

    const { data: users, error: usersError } = await query

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Get total count for pagination (exclude soft deleted)
    let countQuery = supabase
      .from('enhanced_users')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null) // Only count non-deleted users

    if (search) {
      countQuery = countQuery.or(
        `email.ilike.%${search}%,full_name.ilike.%${search}%,member_number.ilike.%${search}%`
      )
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Error counting users:', countError)
    }

    return NextResponse.json({
      users: users || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Error in users GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Check if user is authenticated (but allow for testing)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    // Parse request body
    const body = await request.json()
    const { userId, ...updateData } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Update enhanced user record
    const { error: updateError } = await supabase
      .from('enhanced_users')
      .update({
        full_name: updateData.fullName,
        email: updateData.email,
        member_number: updateData.memberNumber,
        phone_number: updateData.phoneNumber,
        status: updateData.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user: ' + updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
    })
  } catch (error) {
    console.error('Error in user PATCH API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
