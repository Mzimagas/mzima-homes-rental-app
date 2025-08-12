const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function provideRLSFixGuidance() {
  console.log('🔧 RLS Fix Guidance for user_invitations table...');
  
  try {
    console.log('\n📋 Problem Analysis:');
    console.log('- The user_invitations table has an RLS policy that references auth.users');
    console.log('- This causes "permission denied for table users" error');
    console.log('- The policy should use auth.email() instead of (SELECT email FROM auth.users WHERE id = auth.uid())');
    
    // Test current access
    console.log('\n🧪 Testing current access with service role...');
    const { data: serviceRoleTest, error: serviceError } = await supabase
      .from('user_invitations')
      .select('*')
      .limit(1);
      
    if (serviceError) {
      console.error('❌ Service role access failed:', serviceError);
    } else {
      console.log('✅ Service role can access user_invitations');
    }
    
    // Test with anon key (simulating user context)
    console.log('\n🧪 Testing with anon key...');
    const anonSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    const { data: anonTest, error: anonError } = await anonSupabase
      .from('user_invitations')
      .select('*')
      .limit(1);
      
    if (anonError) {
      console.error('❌ Anon access failed (expected):', anonError.message);
      console.log('This confirms the RLS policy issue');
    } else {
      console.log('✅ Anon access works (unexpected)');
    }
    
    console.log('\n📝 MANUAL FIX INSTRUCTIONS:');
    console.log('='.repeat(50));
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to Database > Tables > user_invitations');
    console.log('3. Click on the "RLS" tab');
    console.log('4. Find the policy "Users can view invitations sent to their email"');
    console.log('5. Click "Edit" on that policy');
    console.log('6. In the policy definition, change:');
    console.log('   FROM: email = (SELECT email FROM auth.users WHERE id = auth.uid())');
    console.log('   TO:   email = auth.email()');
    console.log('7. Click "Save" to apply the changes');
    console.log('8. Refresh your browser and try again');
    
    console.log('\n🔗 Direct link to Supabase dashboard:');
    const projectId = process.env.NEXT_PUBLIC_SUPABASE_URL.split('//')[1].split('.')[0];
    console.log(`https://supabase.com/dashboard/project/${projectId}/database/tables`);
    
    console.log('\n📋 Alternative: SQL Commands to run in Supabase SQL Editor:');
    console.log('='.repeat(50));
    console.log(`-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON user_invitations;

-- Create the corrected policy
CREATE POLICY "Users can view invitations sent to their email" ON user_invitations
FOR SELECT USING (
  email = auth.email()
);`);
    
    console.log('\n🧪 Testing with a sample invitation...');
    
    const testInvitation = {
      property_id: '5d1b0278-0cf1-4b16-a3a9-8f940e9e76ca',
      email: 'test@example.com',
      role: 'VIEWER',
      invited_by: '16d2d9e9-accb-4a79-bb74-52a734169f12',
      status: 'PENDING'
    };
    
    const { data: insertTest, error: insertError } = await supabase
      .from('user_invitations')
      .insert(testInvitation)
      .select();
      
    if (insertError) {
      console.error('❌ Test insertion failed:', insertError);
    } else {
      console.log('✅ Test invitation created successfully');
      
      // Clean up the test invitation
      await supabase
        .from('user_invitations')
        .delete()
        .eq('id', insertTest[0].id);
      console.log('🧹 Test invitation cleaned up');
    }
    
    console.log('\n🎯 Expected Result:');
    console.log('After applying the fix, the UserManagement component should be able to');
    console.log('query the user_invitations table without getting permission denied errors.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

provideRLSFixGuidance().catch(console.error);
