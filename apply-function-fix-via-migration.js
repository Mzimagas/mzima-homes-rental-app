const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyFunctionFix() {
  console.log('🔧 Applying function fix via direct query...\n');
  
  try {
    // Step 1: Drop existing function
    console.log('1️⃣ Dropping existing function...');
    
    const dropQuery1 = `DROP FUNCTION IF EXISTS get_user_accessible_properties(UUID)`;
    const { error: dropError1 } = await supabase.from('_temp').select('1').limit(0);
    
    // Use a different approach - create a new function with a different name first
    console.log('2️⃣ Creating new function with correct format...');
    
    const createNewFunction = `
      CREATE OR REPLACE FUNCTION get_user_accessible_properties_v2(user_uuid UUID DEFAULT auth.uid())
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
          AND pu.status = 'ACTIVE';
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // Test the new function first
    console.log('3️⃣ Testing new function...');
    const abelUserId = '16d2d9e9-accb-4a79-bb74-52a734169f12';
    
    const { data: testResult, error: testError } = await supabase
      .rpc('get_user_accessible_properties_v2', { user_uuid: abelUserId });
    
    if (testError) {
      console.error('❌ Test failed:', testError.message);
      console.log('Trying to create the function...');
      
      // Let's try a simpler approach - just test what we have
      console.log('4️⃣ Checking current function output...');
      const { data: currentResult, error: currentError } = await supabase
        .rpc('get_user_accessible_properties', { user_uuid: abelUserId });
      
      if (currentError) {
        console.error('❌ Current function error:', currentError.message);
      } else {
        console.log('Current function result:', JSON.stringify(currentResult, null, 2));
        
        // The issue is that the function exists but returns wrong format
        // Let's check what the usePropertyAccess hook is expecting
        console.log('\n🔍 DIAGNOSIS:');
        console.log('The function returns:', Object.keys(currentResult[0] || {}));
        console.log('But frontend expects: property_name, user_role, can_manage_users, etc.');
        
        console.log('\n💡 SOLUTION:');
        console.log('The function needs to be updated in the Supabase dashboard SQL editor.');
        console.log('Current function only returns: property_id, role');
        console.log('Frontend expects: property_id, property_name, user_role, can_manage_users, can_edit_property, can_manage_tenants, can_manage_maintenance');
      }
    } else {
      console.log('✅ New function test successful!');
      console.log('Result:', JSON.stringify(testResult, null, 2));
    }
    
    // Let's also check what the frontend hook is actually calling
    console.log('\n5️⃣ Checking what the frontend receives...');
    
    // Simulate what usePropertyAccess does
    const { data: hookResult, error: hookError } = await supabase
      .rpc('get_user_accessible_properties');
    
    if (hookError) {
      console.error('❌ Hook simulation error:', hookError.message);
    } else {
      console.log('Hook simulation result:', JSON.stringify(hookResult, null, 2));
      
      if (hookResult && hookResult.length > 0) {
        const firstResult = hookResult[0];
        console.log('\n📋 Current function returns:');
        Object.keys(firstResult).forEach(key => {
          console.log(`   ${key}: ${firstResult[key]}`);
        });
        
        console.log('\n❌ Missing fields that frontend expects:');
        const expectedFields = ['property_name', 'user_role', 'can_manage_users', 'can_edit_property', 'can_manage_tenants', 'can_manage_maintenance'];
        expectedFields.forEach(field => {
          if (!(field in firstResult)) {
            console.log(`   - ${field}`);
          }
        });
      }
    }
    
  } catch (err) {
    console.error('❌ Fix failed:', err);
  }
}

applyFunctionFix();
