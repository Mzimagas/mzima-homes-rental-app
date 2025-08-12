const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Use the same client configuration as the browser
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testBrowserAuthErrors() {
  console.log('🔍 Testing browser authentication errors...');
  console.log('Using anon key (same as browser):', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...');
  
  try {
    // Step 1: Try to authenticate with the known user
    console.log('\n1. Attempting to sign in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'abeljoshua04@gmail.com',
      password: 'password123' // You might need to adjust this
    });
    
    if (signInError) {
      console.error('❌ Sign in failed:', signInError.message);
      console.log('⚠️ Cannot test authenticated queries without valid credentials');
      
      // Test unauthenticated queries to see RLS blocking
      console.log('\n2. Testing unauthenticated queries (should fail with RLS)...');
      
      const { data: unauthProps, error: unauthError } = await supabase
        .from('properties')
        .select(`
          id,
          name,
          units (
            id,
            unit_label,
            tenants (
              id,
              full_name
            )
          )
        `)
        .limit(1);
      
      if (unauthError) {
        console.error('❌ Unauthenticated query failed (expected):');
        console.dir(unauthError, { depth: null });
        console.error('❌ Error details:', JSON.stringify(unauthError, null, 2));
        
        if ('message' in unauthError || 'code' in unauthError) {
          console.error('🔎 Supabase Error Details:', {
            message: unauthError.message,
            code: unauthError.code,
            hint: unauthError.hint,
            details: unauthError.details,
          });
        }
        
        // Check if this is the infinite recursion error
        if (unauthError.message && unauthError.message.includes('infinite recursion')) {
          console.log('🚨 FOUND THE ISSUE: Infinite recursion still exists for authenticated users!');
          console.log('🔧 The RLS policies need to be fixed for the anon/authenticated role');
        }
      } else {
        console.log('⚠️ Unauthenticated query unexpectedly worked');
      }
      
      return;
    }
    
    console.log('✅ Sign in successful:', signInData.user?.email);
    
    // Step 2: Test the exact queries that the dashboard makes
    console.log('\n2. Testing authenticated dashboard queries...');
    
    // Test get_user_accessible_properties
    const { data: accessibleProps, error: accessError } = await supabase.rpc('get_user_accessible_properties');
    
    if (accessError) {
      console.error('❌ get_user_accessible_properties failed:');
      console.dir(accessError, { depth: null });
      console.error('❌ Error details:', JSON.stringify(accessError, null, 2));
      
      if ('message' in accessError || 'code' in accessError) {
        console.error('🔎 Supabase Error Details:', {
          message: accessError.message,
          code: accessError.code,
          hint: accessError.hint,
          details: accessError.details,
        });
      }
      
      if (accessError.message && accessError.message.includes('infinite recursion')) {
        console.log('🚨 FOUND THE ISSUE: get_user_accessible_properties has infinite recursion!');
      }
    } else {
      console.log('✅ get_user_accessible_properties works:', accessibleProps?.length || 0, 'properties');
    }
    
    // Test properties query with authentication
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select(`
        id,
        name,
        physical_address,
        units (
          id,
          unit_label,
          monthly_rent_kes,
          is_active,
          tenants (
            id,
            full_name,
            status
          )
        )
      `)
      .limit(1);

    if (propertiesError) {
      console.error('❌ Authenticated properties query failed:');
      console.dir(propertiesError, { depth: null });
      console.error('❌ Error details:', JSON.stringify(propertiesError, null, 2));
      
      if ('message' in propertiesError || 'code' in propertiesError) {
        console.error('🔎 Supabase Error Details:', {
          message: propertiesError.message,
          code: propertiesError.code,
          hint: propertiesError.hint,
          details: propertiesError.details,
        });
      }
      
      if (propertiesError.message && propertiesError.message.includes('infinite recursion')) {
        console.log('🚨 FOUND THE ISSUE: Properties query has infinite recursion for authenticated users!');
        console.log('🔧 The RLS policies are still recursive for the authenticated role');
      }
    } else {
      console.log('✅ Authenticated properties query works:', properties?.length || 0, 'properties');
    }
    
    // Step 3: Sign out
    await supabase.auth.signOut();
    console.log('✅ Signed out');
    
  } catch (err) {
    console.error('❌ Test exception:', err);
  }
}

testBrowserAuthErrors();
