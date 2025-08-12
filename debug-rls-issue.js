const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugRLSIssue() {
  console.log('🔍 Debugging RLS issue for user_invitations table...');
  
  try {
    // Check if user_invitations table exists and is accessible
    console.log('\n1. Testing table access with service role...');
    const { data: tableData, error: tableError } = await supabase
      .from('user_invitations')
      .select('*')
      .limit(1);
      
    if (tableError) {
      console.error('❌ Error accessing user_invitations table:', tableError);
    } else {
      console.log('✅ user_invitations table accessible with service role');
      console.log('Sample data:', tableData);
    }
    
    // Check RLS policies
    console.log('\n2. Checking RLS policies...');
    const { data: policies, error: policyError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'user_invitations');
      
    if (policyError) {
      console.error('❌ Error checking policies:', policyError);
    } else {
      console.log('✅ RLS policies for user_invitations:');
      policies.forEach(policy => {
        console.log(`- ${policy.policyname}: ${policy.cmd}`);
        console.log(`  Condition: ${policy.qual}`);
      });
    }
    
    // Check if the specific user exists in property_users
    console.log('\n3. Checking user property access...');
    const userId = '16d2d9e9-accb-4a79-bb74-52a734169f12'; // From the error log
    const propertyId = '5d1b0278-0cf1-4b16-a3a9-8f940e9e76ca'; // From the error log
    
    const { data: userAccess, error: accessError } = await supabase
      .from('property_users')
      .select('*')
      .eq('user_id', userId)
      .eq('property_id', propertyId);
      
    if (accessError) {
      console.error('❌ Error checking user access:', accessError);
    } else {
      console.log('✅ User property access:', userAccess);
    }
    
    // Test the specific query that's failing
    console.log('\n4. Testing the failing query...');
    const { data: invitations, error: inviteError } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('property_id', propertyId)
      .eq('status', 'PENDING');
      
    if (inviteError) {
      console.error('❌ Error with invitation query:', inviteError);
    } else {
      console.log('✅ Invitation query successful:', invitations);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugRLSIssue().catch(console.error);
