const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function investigateAbelAccess() {
  console.log('🔍 Investigating Abel\'s access and role assignment...\n');
  
  try {
    // Step 1: Find Abel's user ID
    console.log('1️⃣ Finding Abel\'s user account...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message);
      return;
    }
    
    const abelUser = users.users.find(user => 
      user.email?.toLowerCase().includes('abel') || 
      user.user_metadata?.full_name?.toLowerCase().includes('abel')
    );
    
    if (!abelUser) {
      console.log('❌ Abel user not found in auth.users');
      console.log('Available users:');
      users.users.forEach(user => {
        console.log(`   - ${user.email} (ID: ${user.id})`);
      });
      return;
    }
    
    console.log(`✅ Found Abel: ${abelUser.email} (ID: ${abelUser.id})`);
    console.log(`   Full name: ${abelUser.user_metadata?.full_name || 'Not set'}`);
    console.log(`   Created: ${abelUser.created_at}`);
    console.log(`   Confirmed: ${abelUser.email_confirmed_at ? 'Yes' : 'No'}`);
    
    // Step 2: Check properties owned by Abel
    console.log(`\n2️⃣ Checking properties where Abel is landlord...`);
    const { data: ownedProperties, error: ownedError } = await supabase
      .from('properties')
      .select('id, name, physical_address, landlord_id, created_at')
      .eq('landlord_id', abelUser.id);
    
    if (ownedError) {
      console.error('❌ Error fetching owned properties:', ownedError.message);
    } else {
      console.log(`Found ${ownedProperties?.length || 0} properties owned by Abel:`);
      ownedProperties?.forEach(prop => {
        console.log(`   - ${prop.name} (ID: ${prop.id})`);
        console.log(`     Address: ${prop.physical_address}`);
        console.log(`     Created: ${prop.created_at}`);
      });
    }
    
    // Step 3: Check property_users entries for Abel
    console.log(`\n3️⃣ Checking property_users entries for Abel...`);
    const { data: propertyUsers, error: puError } = await supabase
      .from('property_users')
      .select(`
        id,
        property_id,
        role,
        status,
        accepted_at,
        invited_at,
        properties (
          name,
          physical_address
        )
      `)
      .eq('user_id', abelUser.id);
    
    if (puError) {
      console.error('❌ Error fetching property_users:', puError.message);
    } else {
      console.log(`Found ${propertyUsers?.length || 0} property_users entries for Abel:`);
      propertyUsers?.forEach(pu => {
        console.log(`   - Property: ${pu.properties?.name || 'Unknown'}`);
        console.log(`     Role: ${pu.role}`);
        console.log(`     Status: ${pu.status}`);
        console.log(`     Accepted: ${pu.accepted_at || 'Not accepted'}`);
        console.log(`     Property ID: ${pu.property_id}`);
        console.log('');
      });
    }
    
    // Step 4: Check get_user_accessible_properties function
    console.log(`4️⃣ Testing get_user_accessible_properties function...`);
    const { data: accessibleProps, error: accessError } = await supabase
      .rpc('get_user_accessible_properties', { user_uuid: abelUser.id });
    
    if (accessError) {
      console.error('❌ Error calling get_user_accessible_properties:', accessError.message);
    } else {
      console.log(`Function returned ${accessibleProps?.length || 0} accessible properties:`);
      accessibleProps?.forEach(prop => {
        console.log(`   - ${prop.property_name}`);
        console.log(`     Role: ${prop.user_role}`);
        console.log(`     Can manage users: ${prop.can_manage_users}`);
        console.log(`     Can edit property: ${prop.can_edit_property}`);
        console.log('');
      });
    }
    
    // Step 5: Identify the issue
    console.log('🔍 DIAGNOSIS:');
    if (ownedProperties && ownedProperties.length > 0) {
      if (!propertyUsers || propertyUsers.length === 0) {
        console.log('❌ ISSUE FOUND: Abel owns properties but has NO property_users entries!');
        console.log('   This means Abel was never added to the property_users table with OWNER role.');
        console.log('   This is why Abel shows "Unknown" role and cannot access user management.');
        
        console.log('\n🔧 SOLUTION: Need to create property_users entries for Abel with OWNER role.');
        return { needsFix: true, abelUserId: abelUser.id, ownedProperties };
      } else {
        const activeOwnerEntries = propertyUsers.filter(pu => pu.role === 'OWNER' && pu.status === 'ACTIVE');
        if (activeOwnerEntries.length === 0) {
          console.log('❌ ISSUE FOUND: Abel has property_users entries but none with OWNER role and ACTIVE status!');
          return { needsFix: true, abelUserId: abelUser.id, ownedProperties };
        } else {
          console.log('✅ Abel has proper OWNER entries in property_users table.');
          return { needsFix: false, abelUserId: abelUser.id };
        }
      }
    } else {
      console.log('❌ ISSUE: Abel doesn\'t own any properties in the properties table.');
      return { needsFix: false, abelUserId: abelUser.id };
    }
    
  } catch (err) {
    console.error('❌ Investigation failed:', err);
    return { needsFix: false, error: err.message };
  }
}

// Run the investigation
investigateAbelAccess().then(result => {
  if (result?.needsFix) {
    console.log('\n🚨 ACTION REQUIRED: Abel needs proper OWNER role assignment!');
  }
});
