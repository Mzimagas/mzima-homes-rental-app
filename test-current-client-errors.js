const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testCurrentErrors() {
  console.log('🔍 Testing current client-side errors...');
  
  try {
    // Test the exact query that the dashboard is making
    console.log('1. Testing dashboard query with client credentials...');
    
    // First get the current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
      return;
    }
    
    if (!session) {
      console.log('⚠️ No active session - need to authenticate first');
      return;
    }
    
    console.log('✅ Active session for:', session.user.email);
    
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
      console.error('❌ Properties query failed:');
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
    } else {
      console.log('✅ Properties query works:', properties?.length || 0, 'properties');
    }
    
  } catch (err) {
    console.error('❌ Test exception:', err);
  }
}

testCurrentErrors();
