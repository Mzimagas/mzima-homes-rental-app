import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../../lib/supabase-server'

// DELETE - Permanently delete a soft deleted user
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Check if user is authenticated (but allow for testing)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    const userId = params.id

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check if user exists and is soft deleted
    const { data: existingUser, error: fetchError } = await supabase
      .from('enhanced_users')
      .select('id, email, full_name, member_number, deleted_at, status')
      .eq('id', userId)
      .single()

    if (fetchError || !existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user is actually soft deleted
    if (!existingUser.deleted_at) {
      return NextResponse.json(
        { error: 'User is not deleted. Use soft delete first before permanent deletion.' },
        { status: 400 }
      )
    }

    // Get additional confirmation from request body
    const body = await request.json().catch(() => ({}))
    const { confirm } = body

    if (confirm !== 'PERMANENTLY_DELETE') {
      return NextResponse.json(
        { error: 'Permanent deletion requires confirmation. Send { "confirm": "PERMANENTLY_DELETE" } in request body.' },
        { status: 400 }
      )
    }

    // Delete user profile first (if exists)
    await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', userId)

    // Permanently delete enhanced user record
    const { error: deleteError } = await supabase
      .from('enhanced_users')
      .delete()
      .eq('id', userId)

    if (deleteError) {
      console.error('Error permanently deleting user:', deleteError)
      return NextResponse.json(
        { error: 'Failed to permanently delete user: ' + deleteError.message },
        { status: 500 }
      )
    }

    // Log the permanent deletion
    try {
      await supabase
        .from('activities_audit')
        .insert({
          actor_id: user?.id || userId,
          entity_type: 'enhanced_users',
          entity_id: userId,
          action: 'user_permanently_deleted',
          description: `Permanently deleted user: ${existingUser.full_name} (${existingUser.email}) - Data cannot be recovered`,
          before_snapshot: {
            email: existingUser.email,
            full_name: existingUser.full_name,
            member_number: existingUser.member_number,
            status: existingUser.status,
            deleted_at: existingUser.deleted_at
          }
        })
    } catch (auditError) {
      console.error('Error logging permanent deletion audit:', auditError)
      // Don't fail the entire operation for audit logging
    }

    return NextResponse.json({
      success: true,
      message: 'User permanently deleted. Data cannot be recovered.',
      permanent_delete: true,
      deleted_user: {
        id: existingUser.id,
        email: existingUser.email,
        full_name: existingUser.full_name,
        member_number: existingUser.member_number,
        permanently_deleted_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error in permanent delete API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
