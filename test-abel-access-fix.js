const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAbelAccessFix() {
  console.log('🧪 Testing Abel\'s access after frontend fix...\n');
  
  try {
    const abelUserId = '16d2d9e9-accb-4a79-bb74-52a734169f12';
    
    // Step 1: Test the raw function output
    console.log('1️⃣ Testing raw function output...');
    const { data: rawData, error: rawError } = await supabase
      .rpc('get_user_accessible_properties', { user_uuid: abelUserId });
    
    if (rawError) {
      console.error('❌ Raw function error:', rawError.message);
      return;
    }
    
    console.log('Raw function result:', JSON.stringify(rawData, null, 2));
    
    // Step 2: Simulate what the frontend hook does (now uses data directly)
    console.log('\n2️⃣ Simulating frontend transformation...');

    // The function now returns the correct format, use it directly
    const accessibleProperties = (rawData || []).map(item => ({
      property_id: item.property_id,
      property_name: item.property_name,
      user_role: item.user_role,
      can_manage_users: item.can_manage_users,
      can_edit_property: item.can_edit_property,
      can_manage_tenants: item.can_manage_tenants,
      can_manage_maintenance: item.can_manage_maintenance
    }));
    
    console.log('Transformed result:', JSON.stringify(accessibleProperties, null, 2));
    
    // Step 3: Check Abel's permissions
    console.log('\n3️⃣ Abel\'s permissions summary:');
    
    if (accessibleProperties.length === 0) {
      console.log('❌ No accessible properties found for Abel');
      return;
    }
    
    const property = accessibleProperties[0];
    console.log(`✅ Property: ${property.property_name}`);
    console.log(`✅ Role: ${property.user_role}`);
    console.log(`✅ Can manage users: ${property.can_manage_users ? 'YES' : 'NO'}`);
    console.log(`✅ Can edit property: ${property.can_edit_property ? 'YES' : 'NO'}`);
    console.log(`✅ Can manage tenants: ${property.can_manage_tenants ? 'YES' : 'NO'}`);
    console.log(`✅ Can manage maintenance: ${property.can_manage_maintenance ? 'YES' : 'NO'}`);
    
    // Step 4: Verify user management access
    console.log('\n4️⃣ User Management Access Check:');
    
    if (property.can_manage_users) {
      console.log('🎉 SUCCESS! Abel now has user management permissions!');
      console.log('✅ Abel should be able to:');
      console.log('   - See "User Management" in the navigation menu');
      console.log('   - Access the "User Management" tab in property details');
      console.log('   - Invite and manage users for the property');
      console.log('   - Assign roles to other users');
    } else {
      console.log('❌ ISSUE: Abel still does not have user management permissions');
      console.log(`   Current role: ${property.user_role}`);
      console.log('   Expected role: OWNER');
    }
    
    // Step 5: Check navigation visibility
    console.log('\n5️⃣ Navigation Menu Visibility:');
    const canManageAnyUsers = accessibleProperties.some(prop => prop.can_manage_users);
    console.log(`Can manage users on any property: ${canManageAnyUsers ? 'YES' : 'NO'}`);
    
    if (canManageAnyUsers) {
      console.log('✅ "User Management" menu item should be visible');
    } else {
      console.log('❌ "User Management" menu item will be hidden');
    }
    
    console.log('\n🎯 FINAL RESULT:');
    if (property.can_manage_users) {
      console.log('🎉 Abel\'s access has been FIXED!');
      console.log('🔄 Please refresh the browser to see the changes');
      console.log('📱 Abel should now see user management features');
    } else {
      console.log('❌ Abel\'s access still needs fixing');
      console.log('🔧 Additional database changes may be required');
    }
    
  } catch (err) {
    console.error('❌ Test failed:', err);
  }
}

testAbelAccessFix();
