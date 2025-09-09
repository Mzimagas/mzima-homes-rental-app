import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase-server'
import { detectUserType } from '../../../../lib/user-type-detection'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 User type API called')

    const supabase = await createServerSupabaseClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    console.log('🔍 Auth check result:', { user: user?.email, authError })
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Detect user type
    const userTypeInfo = await detectUserType(user)
    
    console.log('🔍 User type detection for:', user.email, 'Result:', userTypeInfo)
    
    return NextResponse.json({
      success: true,
      userType: userTypeInfo.type,
      redirectPath: userTypeInfo.redirectPath,
      metadata: userTypeInfo.metadata,
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata
      }
    })

  } catch (error) {
    console.error('Error in user type detection API:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
