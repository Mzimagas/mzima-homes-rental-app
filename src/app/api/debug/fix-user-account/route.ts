import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Fix user account API called')
    
    const supabase = await createServerSupabaseClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    console.log('🔧 Fixing account for user:', user.email, 'ID:', user.id)

    const fixes = []
    const errors = []

    // 1. Ensure client record exists and is properly linked
    const { data: existingClient, error: clientLookupError } = await supabase
      .from('clients')
      .select('id, auth_user_id, full_name, email, status')
      .eq('auth_user_id', user.id)
      .single()

    if (clientLookupError && clientLookupError.code === 'PGRST116') {
      // No client record exists, create one
      console.log('🔧 Creating missing client record')
      
      const { data: newClient, error: createError } = await supabase
        .from('clients')
        .insert([{
          auth_user_id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email,
          phone: user.user_metadata?.phone || null,
          registration_source: 'account_fix',
          status: 'ACTIVE',
          email_verified: user.email_confirmed_at ? true : false,
          phone_verified: false
        }])
        .select('id, full_name, email')
        .single()

      if (createError) {
        errors.push(`Failed to create client record: ${createError.message}`)
      } else {
        fixes.push(`Created client record: ${newClient.id}`)
      }
    } else if (existingClient) {
      fixes.push(`Client record exists: ${existingClient.id}`)
      
      // Update client record with latest auth user data if needed
      const updates: any = {}
      let needsUpdate = false

      if (existingClient.email !== user.email) {
        updates.email = user.email
        needsUpdate = true
      }

      if (user.user_metadata?.full_name && existingClient.full_name !== user.user_metadata.full_name) {
        updates.full_name = user.user_metadata.full_name
        needsUpdate = true
      }

      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('clients')
          .update(updates)
          .eq('id', existingClient.id)

        if (updateError) {
          errors.push(`Failed to update client record: ${updateError.message}`)
        } else {
          fixes.push(`Updated client record with latest auth data`)
        }
      }
    }

    // 2. Check for duplicate client records with same email
    const { data: duplicateClients, error: duplicateError } = await supabase
      .from('clients')
      .select('id, auth_user_id, full_name, email, created_at, status')
      .eq('email', user.email)

    if (!duplicateError && duplicateClients && duplicateClients.length > 1) {
      console.log('🔧 Found duplicate client records:', duplicateClients.length)
      
      // Keep the one linked to current auth user, or the oldest one
      const currentUserClient = duplicateClients.find(c => c.auth_user_id === user.id)
      const keepClient = currentUserClient || duplicateClients.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )[0]

      const duplicatesToRemove = duplicateClients.filter(c => c.id !== keepClient.id)

      for (const duplicate of duplicatesToRemove) {
        // Move property interests to the kept client record
        const { error: moveInterestsError } = await supabase
          .from('client_property_interests')
          .update({ client_id: keepClient.id })
          .eq('client_id', duplicate.id)

        if (moveInterestsError) {
          errors.push(`Failed to move interests from duplicate ${duplicate.id}: ${moveInterestsError.message}`)
        } else {
          fixes.push(`Moved property interests from duplicate client ${duplicate.id}`)
        }

        // Delete the duplicate client record
        const { error: deleteError } = await supabase
          .from('clients')
          .delete()
          .eq('id', duplicate.id)

        if (deleteError) {
          errors.push(`Failed to delete duplicate client ${duplicate.id}: ${deleteError.message}`)
        } else {
          fixes.push(`Deleted duplicate client record ${duplicate.id}`)
        }
      }
    }

    // 3. Verify property interests are accessible
    const { data: finalClient } = await supabase
      .from('clients')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (finalClient) {
      const { data: interests, error: interestsError } = await supabase
        .from('client_property_interests')
        .select('id, property_id, status')
        .eq('client_id', finalClient.id)

      if (!interestsError) {
        fixes.push(`Verified ${interests?.length || 0} property interests are accessible`)
      } else {
        errors.push(`Failed to verify property interests: ${interestsError.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name
      },
      fixes,
      errors,
      summary: {
        fixes_applied: fixes.length,
        errors_encountered: errors.length
      }
    })

  } catch (error) {
    console.error('Error in fix user account API:', error)
    
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
