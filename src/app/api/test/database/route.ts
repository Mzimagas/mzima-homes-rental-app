import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Database Test API - Starting')
    
    const supabase = await createServerSupabaseClient()
    console.log('✅ Database Test API - Supabase client created')

    // Test authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('🔐 Database Test API - Auth check:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError?.message
    })

    // Test basic table access
    const tests = []

    // Test properties table
    try {
      const { data: properties, error: propError } = await supabase
        .from('properties')
        .select('id, name')
        .limit(5)
      
      tests.push({
        table: 'properties',
        success: !propError,
        error: propError?.message,
        count: properties?.length || 0,
        sample: properties?.[0] || null
      })
    } catch (error) {
      tests.push({
        table: 'properties',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test clients table
    try {
      const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('id, full_name, email')
        .limit(5)
      
      tests.push({
        table: 'clients',
        success: !clientError,
        error: clientError?.message,
        count: clients?.length || 0,
        sample: clients?.[0] || null
      })
    } catch (error) {
      tests.push({
        table: 'clients',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test client_property_interests table
    try {
      const { data: interests, error: interestError } = await supabase
        .from('client_property_interests')
        .select('id, client_id, property_id, status')
        .limit(5)
      
      tests.push({
        table: 'client_property_interests',
        success: !interestError,
        error: interestError?.message,
        count: interests?.length || 0,
        sample: interests?.[0] || null
      })
    } catch (error) {
      tests.push({
        table: 'client_property_interests',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      auth: {
        authenticated: !!user,
        userId: user?.id,
        email: user?.email
      },
      tests
    })

  } catch (error) {
    console.error('❌ Database Test API - Error:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Database test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
