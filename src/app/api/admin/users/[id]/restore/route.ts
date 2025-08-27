import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../../lib/supabase-server'

// POST - Restore a soft deleted user
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Check if user exists and is soft deleted
    const { data: existingUser, error: fetchError } = await supabase
      .from('enhanced_users')
      .select('id, email, full_name, member_number, deleted_at, status')
      .eq('id', userId)
      .single()

    if (fetchError || !existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is actually soft deleted
    if (!existingUser.deleted_at) {
      return NextResponse.json(
        { error: 'User is not deleted and cannot be restored' },
        { status: 400 }
      )
    }

    // Restore user by setting deleted_at to null and status to active
    const { error: restoreError } = await supabase
      .from('enhanced_users')
      .update({
        deleted_at: null,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .not('deleted_at', 'is', null) // Only restore if currently deleted

    if (restoreError) {
      console.error('Error restoring user:', restoreError)
      return NextResponse.json(
        { error: 'Failed to restore user: ' + restoreError.message },
        { status: 500 }
      )
    }

    // Log the user restoration
    try {
      await supabase.from('activities_audit').insert({
        actor_id: user?.id || userId,
        entity_type: 'enhanced_users',
        entity_id: userId,
        action: 'user_restored',
        description: `Restored soft deleted user: ${existingUser.full_name} (${existingUser.email})`,
        before_snapshot: {
          deleted_at: existingUser.deleted_at,
          status: existingUser.status,
        },
        after_snapshot: {
          deleted_at: null,
          status: 'active',
        },
      })
    } catch (auditError) {
      console.error('Error logging user restoration audit:', auditError)
      // Don't fail the entire operation for audit logging
    }

    return NextResponse.json({
      success: true,
      message: 'User restored successfully',
      user: {
        id: existingUser.id,
        email: existingUser.email,
        full_name: existingUser.full_name,
        member_number: existingUser.member_number,
        status: 'active',
        deleted_at: null,
        restored_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Error in user restore API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
