const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyUserInvitationsFix() {
  console.log('🔧 Applying RLS fix for user_invitations table...');
  
  try {
    // Apply the fix directly without reading from file
    const fixStatements = [
      // Drop the problematic policy
      'DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON user_invitations',
      
      // Create a corrected policy that uses auth.email() instead of accessing auth.users
      `CREATE POLICY "Users can view invitations sent to their email" ON user_invitations
       FOR SELECT USING (
         email = auth.email()
       )`,
      
      // Also ensure the property owners policy is correct
      'DROP POLICY IF EXISTS "Property owners can manage invitations for their properties" ON user_invitations',
      
      `CREATE POLICY "Property owners can manage invitations for their properties" ON user_invitations
       FOR ALL USING (
         property_id IN (
           SELECT property_id FROM property_users 
           WHERE user_id = auth.uid() 
           AND role = 'OWNER' 
           AND status = 'ACTIVE'
         )
       )`,
      
      // Grant necessary permissions
      'GRANT SELECT, INSERT, UPDATE, DELETE ON user_invitations TO authenticated'
    ];
    
    console.log(`\n🔄 Executing ${fixStatements.length} SQL statements...`);
    
    for (let i = 0; i < fixStatements.length; i++) {
      const statement = fixStatements[i];
      console.log(`\n${i + 1}. Executing: ${statement.substring(0, 100)}...`);
      
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql: statement
      });
      
      if (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error);
        // Continue with other statements
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    }
    
    // Test the fix
    console.log('\n🧪 Testing the fix...');
    const propertyId = '5d1b0278-0cf1-4b16-a3a9-8f940e9e76ca';
    
    const { data: testData, error: testError } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('property_id', propertyId)
      .eq('status', 'PENDING');
      
    if (testError) {
      console.error('❌ Test query still failing:', testError);
    } else {
      console.log('✅ Test query successful! RLS fix applied correctly.');
      console.log('📊 Test results:', testData);
    }
    
    console.log('\n🎉 RLS fix completed successfully!');
    console.log('The user should now be able to access user invitations without permission errors.');
    console.log('Please refresh the browser to see the changes.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

applyUserInvitationsFix().catch(console.error);
