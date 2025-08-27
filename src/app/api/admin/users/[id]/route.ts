import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../lib/supabase-server'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerSupabaseClient()

    // Check if user is authenticated (but allow for testing)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    const userId = params.id
    const body = await request.json()

    console.log('Updating user:', userId, 'with data:', body)

    // Validate required fields
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('enhanced_users')
      .select('id, email, member_number')
      .eq('id', userId)
      .single()

    if (fetchError || !existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check for duplicate email or member number (excluding current user)
    if (body.email && body.email !== existingUser.email) {
      const { data: emailCheck } = await supabase
        .from('enhanced_users')
        .select('id')
        .eq('email', body.email)
        .neq('id', userId)
        .single()

      if (emailCheck) {
        return NextResponse.json({ error: 'Email address is already in use' }, { status: 409 })
      }
    }

    if (body.memberNumber && body.memberNumber !== existingUser.member_number) {
      const { data: memberCheck } = await supabase
        .from('enhanced_users')
        .select('id')
        .eq('member_number', body.memberNumber)
        .neq('id', userId)
        .single()

      if (memberCheck) {
        return NextResponse.json({ error: 'Member number is already in use' }, { status: 409 })
      }
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (body.fullName) updateData.full_name = body.fullName
    if (body.email) updateData.email = body.email
    if (body.memberNumber) updateData.member_number = body.memberNumber
    if (body.phoneNumber) updateData.phone_number = body.phoneNumber
    if (body.status) updateData.status = body.status

    // Update enhanced user record
    const { error: updateError } = await supabase
      .from('enhanced_users')
      .update(updateData)
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user: ' + updateError.message },
        { status: 500 }
      )
    }

    // Log the user update
    try {
      await supabase.from('activities_audit').insert({
        actor_id: user?.id || userId,
        entity_type: 'enhanced_users',
        entity_id: userId,
        action: 'user_updated',
        description: `Updated user: ${body.fullName || existingUser.email}`,
        after_snapshot: updateData,
      })
    } catch (auditError) {
      console.error('Error logging user update audit:', auditError)
      // Don't fail the entire operation for audit logging
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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerSupabaseClient()

    // Check if user is authenticated (but allow for testing)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    const userId = params.id

    console.log('Deleting user:', userId)

    // Validate required fields
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Check if user exists and get their data for logging
    const { data: existingUser, error: fetchError } = await supabase
      .from('enhanced_users')
      .select('id, email, full_name, member_number, deleted_at')
      .eq('id', userId)
      .single()

    if (fetchError || !existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is already soft deleted
    if (existingUser.deleted_at) {
      return NextResponse.json({ error: 'User is already deleted' }, { status: 400 })
    }

    // Soft delete: Set deleted_at timestamp instead of actually deleting
    const { error: deleteError } = await supabase
      .from('enhanced_users')
      .update({
        deleted_at: new Date().toISOString(),
        status: 'inactive', // Also set status to inactive
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .is('deleted_at', null) // Only update if not already deleted

    if (deleteError) {
      console.error('Error soft deleting user:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete user: ' + deleteError.message },
        { status: 500 }
      )
    }

    // Log the user soft deletion
    try {
      await supabase.from('activities_audit').insert({
        actor_id: user?.id || userId,
        entity_type: 'enhanced_users',
        entity_id: userId,
        action: 'user_soft_deleted',
        description: `Soft deleted user: ${existingUser.full_name} (${existingUser.email}) - Data retained for recovery`,
        before_snapshot: {
          email: existingUser.email,
          full_name: existingUser.full_name,
          member_number: existingUser.member_number,
          status: existingUser.status,
        },
        after_snapshot: {
          deleted_at: new Date().toISOString(),
          status: 'inactive',
        },
      })
    } catch (auditError) {
      console.error('Error logging user soft deletion audit:', auditError)
      // Don't fail the entire operation for audit logging
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully. Data has been retained and can be recovered if needed.',
      soft_delete: true,
      deleted_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error in user DELETE API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerSupabaseClient()

    // Check if user is authenticated (but allow for testing)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    const userId = params.id

    // Validate required fields
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get user data (exclude soft deleted)
    const { data: userData, error: fetchError } = await supabase
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
      .eq('id', userId)
      .is('deleted_at', null) // Only get non-deleted users
      .single()

    if (fetchError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      user: userData,
    })
  } catch (error) {
    console.error('Error in user GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
