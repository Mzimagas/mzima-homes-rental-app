const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Create both service role and anon clients
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function debugUserInvitationsRLS() {
  console.log('🔍 Debugging user_invitations RLS policies...');
  
  try {
    // 1. Check what RLS policies exist using direct SQL
    console.log('\n1. Checking RLS policies...');
    const { data: policies, error: policyError } = await supabaseAdmin
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'user_invitations');
      
    if (policyError) {
      console.error('❌ Error checking policies:', policyError);
      
      // Try using raw SQL
      const { data: sqlPolicies, error: sqlError } = await supabaseAdmin
        .rpc('sql', {
          query: `
            SELECT 
              policyname,
              cmd,
              roles,
              qual,
              with_check
            FROM pg_policies 
            WHERE tablename = 'user_invitations'
            ORDER BY policyname;
          `
        });
        
      if (sqlError) {
        console.error('❌ SQL query also failed:', sqlError);
      } else {
        console.log('✅ RLS policies (via SQL):', sqlPolicies);
      }
    } else {
      console.log('✅ RLS policies for user_invitations:');
      policies.forEach(policy => {
        console.log(`\n- Policy: ${policy.policyname}`);
        console.log(`  Command: ${policy.cmd}`);
        console.log(`  Roles: ${policy.roles}`);
        console.log(`  Condition: ${policy.qual}`);
      });
    }
    
    // 2. Test with authenticated user context
    console.log('\n2. Testing with authenticated user...');
    
    // First, sign in as the user
    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email: 'abeljoshua04@gmail.com',
      password: 'password123' // You might need to adjust this
    });
    
    if (authError) {
      console.error('❌ Auth error:', authError);
      console.log('ℹ️ Skipping authenticated tests...');
    } else {
      console.log('✅ Authenticated as:', authData.user.email);
      
      // Test the failing query
      const propertyId = '5d1b0278-0cf1-4b16-a3a9-8f940e9e76ca';
      const { data: invitations, error: inviteError } = await supabaseAnon
        .from('user_invitations')
        .select('*')
        .eq('property_id', propertyId)
        .eq('status', 'PENDING');
        
      if (inviteError) {
        console.error('❌ Invitation query failed:', inviteError);
        console.log('Error details:', {
          code: inviteError.code,
          message: inviteError.message,
          details: inviteError.details,
          hint: inviteError.hint
        });
      } else {
        console.log('✅ Invitation query successful:', invitations);
      }
    }
    
    // 3. Check if the issue is with the auth.users reference in RLS policy
    console.log('\n3. Testing auth.users access...');
    const { data: authUsers, error: authUsersError } = await supabaseAdmin
      .from('auth.users')
      .select('id, email')
      .limit(1);
      
    if (authUsersError) {
      console.error('❌ Cannot access auth.users:', authUsersError);
      console.log('ℹ️ This might be the root cause of the RLS policy failure');
    } else {
      console.log('✅ auth.users accessible:', authUsers);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugUserInvitationsRLS().catch(console.error);
