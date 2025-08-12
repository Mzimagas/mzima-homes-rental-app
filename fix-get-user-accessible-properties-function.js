const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixGetUserAccessiblePropertiesFunction() {
  console.log('🔧 Fixing get_user_accessible_properties function...\n');
  
  try {
    // Step 1: Drop existing function
    console.log('1️⃣ Dropping existing function...');
    const dropFunction = `
      DROP FUNCTION IF EXISTS get_user_accessible_properties(UUID);
      DROP FUNCTION IF EXISTS get_user_accessible_properties();
    `;
    
    const { error: dropError } = await supabase.rpc('exec_sql', { sql_query: dropFunction });
    if (dropError) {
      console.log('⚠️ Drop function warning:', dropError.message);
    } else {
      console.log('✅ Existing functions dropped');
    }
    
    // Step 2: Create the correct function that matches frontend expectations
    console.log('\n2️⃣ Creating correct function...');
    const createFunction = `
      CREATE OR REPLACE FUNCTION get_user_accessible_properties(user_uuid UUID DEFAULT auth.uid())
      RETURNS TABLE(
        property_id UUID,
        property_name TEXT,
        user_role user_role,
        can_manage_users BOOLEAN,
        can_edit_property BOOLEAN,
        can_manage_tenants BOOLEAN,
        can_manage_maintenance BOOLEAN
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          p.id as property_id,
          p.name as property_name,
          pu.role as user_role,
          (pu.role = 'OWNER') as can_manage_users,
          (pu.role IN ('OWNER', 'PROPERTY_MANAGER')) as can_edit_property,
          (pu.role IN ('OWNER', 'PROPERTY_MANAGER', 'LEASING_AGENT')) as can_manage_tenants,
          (pu.role IN ('OWNER', 'PROPERTY_MANAGER', 'MAINTENANCE_COORDINATOR')) as can_manage_maintenance
        FROM properties p
        JOIN property_users pu ON p.id = pu.property_id
        WHERE pu.user_id = user_uuid
          AND pu.status = 'ACTIVE'
        
        UNION
        
        -- Also include properties where user is the direct landlord (for backward compatibility)
        SELECT 
          p.id as property_id,
          p.name as property_name,
          'OWNER'::user_role as user_role,
          true as can_manage_users,
          true as can_edit_property,
          true as can_manage_tenants,
          true as can_manage_maintenance
        FROM properties p
        WHERE p.landlord_id = user_uuid
          AND NOT EXISTS (
            SELECT 1 FROM property_users pu2 
            WHERE pu2.property_id = p.id AND pu2.user_id = user_uuid
          );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    const { error: createError } = await supabase.rpc('exec_sql', { sql_query: createFunction });
    if (createError) {
      console.error('❌ Error creating function:', createError.message);
      return;
    }
    
    console.log('✅ Function created successfully');
    
    // Step 3: Grant permissions
    console.log('\n3️⃣ Granting permissions...');
    const grantPermissions = `
      GRANT EXECUTE ON FUNCTION get_user_accessible_properties TO authenticated;
      GRANT EXECUTE ON FUNCTION get_user_accessible_properties TO service_role;
    `;
    
    const { error: grantError } = await supabase.rpc('exec_sql', { sql_query: grantPermissions });
    if (grantError) {
      console.log('⚠️ Grant permissions warning:', grantError.message);
    } else {
      console.log('✅ Permissions granted');
    }
    
    // Step 4: Test the function with Abel's ID
    console.log('\n4️⃣ Testing function with Abel\'s ID...');
    const abelUserId = '16d2d9e9-accb-4a79-bb74-52a734169f12';
    
    const { data: testResult, error: testError } = await supabase
      .rpc('get_user_accessible_properties', { user_uuid: abelUserId });
    
    if (testError) {
      console.error('❌ Test failed:', testError.message);
    } else {
      console.log('✅ Function test successful!');
      console.log('Result:', JSON.stringify(testResult, null, 2));
      
      if (testResult && testResult.length > 0) {
        const result = testResult[0];
        console.log('\n📋 Abel\'s access summary:');
        console.log(`   Property: ${result.property_name}`);
        console.log(`   Role: ${result.user_role}`);
        console.log(`   Can manage users: ${result.can_manage_users}`);
        console.log(`   Can edit property: ${result.can_edit_property}`);
        console.log(`   Can manage tenants: ${result.can_manage_tenants}`);
        console.log(`   Can manage maintenance: ${result.can_manage_maintenance}`);
      }
    }
    
    console.log('\n🎉 Function fix completed!');
    console.log('✅ Abel should now have proper OWNER permissions');
    console.log('🔄 Please refresh the browser to see the changes');
    
  } catch (err) {
    console.error('❌ Fix failed:', err);
  }
}

fixGetUserAccessiblePropertiesFunction();
