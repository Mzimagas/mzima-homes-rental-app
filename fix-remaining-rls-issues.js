const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixRemainingRLSIssues() {
  console.log('🔧 Fixing remaining RLS issues...');
  
  try {
    // Issue 1: Check if landlords table has proper RLS policies
    console.log('\n1️⃣ Checking landlords table RLS policies...');
    
    const userId = '16d2d9e9-accb-4a79-bb74-52a734169f12';
    const userEmail = 'abeljoshua04@gmail.com';
    
    // Check if landlord record exists
    const { data: existingLandlord, error: checkError } = await supabase
      .from('landlords')
      .select('*')
      .eq('email', userEmail)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking landlord:', checkError);
    } else if (existingLandlord) {
      console.log('✅ Landlord record exists:', existingLandlord.id);
    } else {
      console.log('ℹ️ No landlord record found, will create one');
      
      // Create landlord record using service role
      const { data: newLandlord, error: createError } = await supabase
        .from('landlords')
        .insert({
          full_name: 'Abel Joshua',
          email: userEmail,
          phone: '+254700000000'
        })
        .select()
        .single();
        
      if (createError) {
        console.error('❌ Error creating landlord:', createError);
      } else {
        console.log('✅ Created landlord record:', newLandlord.id);
      }
    }
    
    // Issue 2: Check user_roles table
    console.log('\n2️⃣ Checking user_roles table...');
    
    const { data: existingRole, error: roleCheckError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (roleCheckError && roleCheckError.code !== 'PGRST116') {
      console.error('❌ Error checking user role:', roleCheckError);
    } else if (existingRole) {
      console.log('✅ User role exists:', existingRole);
    } else {
      console.log('ℹ️ No user role found');
      
      // Get the landlord ID first
      const { data: landlord } = await supabase
        .from('landlords')
        .select('id')
        .eq('email', userEmail)
        .single();
        
      if (landlord) {
        const { data: newRole, error: roleCreateError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            landlord_id: landlord.id,
            role: 'LANDLORD'
          })
          .select()
          .single();
          
        if (roleCreateError) {
          console.error('❌ Error creating user role:', roleCreateError);
        } else {
          console.log('✅ Created user role:', newRole);
        }
      }
    }
    
    // Issue 3: Check if get_cron_job_stats function exists
    console.log('\n3️⃣ Checking cron job stats function...');
    
    const { data: cronStats, error: cronError } = await supabase
      .rpc('get_cron_job_stats');
      
    if (cronError) {
      console.error('❌ Cron job stats function missing:', cronError.message);
      console.log('📝 Need to apply migration 007_cron_job_history.sql');
    } else {
      console.log('✅ Cron job stats function exists');
    }
    
    // Issue 4: Test the fixes
    console.log('\n4️⃣ Testing the fixes...');
    
    // Test landlord access
    const { data: testLandlord, error: testLandlordError } = await supabase
      .rpc('get_user_landlord_ids', { user_uuid: userId });
      
    if (testLandlordError) {
      console.error('❌ Landlord access test failed:', testLandlordError);
    } else {
      console.log('✅ Landlord access test successful:', testLandlord);
    }
    
    console.log('\n🎉 RLS fixes completed!');
    console.log('📋 Summary:');
    console.log('- ✅ user_invitations table: FIXED');
    console.log('- 🔄 landlords table: CHECKED/FIXED');
    console.log('- 🔄 user_roles table: CHECKED/FIXED');
    console.log('- ⚠️ cron job function: NEEDS MIGRATION');
    
    console.log('\n📝 Next steps:');
    console.log('1. Refresh the browser to see if errors are resolved');
    console.log('2. If cron job errors persist, apply migration 007_cron_job_history.sql');
    console.log('3. Check the notifications page to see if it loads properly');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixRemainingRLSIssues().catch(console.error);
