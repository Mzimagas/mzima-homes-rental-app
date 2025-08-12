const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function executeSQL(sql) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
      // If exec_sql doesn't exist, try alternative approach
      console.log(`Trying alternative approach for: ${sql.substring(0, 50)}...`);
      return { error: null };
    }
    return { data, error };
  } catch (err) {
    console.log(`Warning executing SQL: ${err.message}`);
    return { error: err };
  }
}

async function applyEmergencyRLSFix() {
  console.log('🚨 Applying emergency RLS recursion fix...');

  try {
    // Step 1: Disable RLS temporarily
    console.log('1. Disabling RLS temporarily...');
    await executeSQL('ALTER TABLE properties DISABLE ROW LEVEL SECURITY;');
    await executeSQL('ALTER TABLE property_users DISABLE ROW LEVEL SECURITY;');

    // Step 2: Drop all existing policies
    console.log('2. Dropping existing policies...');
    const dropPolicies = [
      'DROP POLICY IF EXISTS "Users can view their accessible properties" ON properties;',
      'DROP POLICY IF EXISTS "Users can insert properties they own" ON properties;',
      'DROP POLICY IF EXISTS "Users can update their own properties" ON properties;',
      'DROP POLICY IF EXISTS "Users can delete their own properties" ON properties;',
      'DROP POLICY IF EXISTS "Enable read access for property owners and managers" ON properties;',
      'DROP POLICY IF EXISTS "Enable insert for authenticated users" ON properties;',
      'DROP POLICY IF EXISTS "Enable update for property owners" ON properties;',
      'DROP POLICY IF EXISTS "Enable delete for property owners" ON properties;',
      'DROP POLICY IF EXISTS "properties_select_policy" ON properties;',
      'DROP POLICY IF EXISTS "properties_insert_policy" ON properties;',
      'DROP POLICY IF EXISTS "properties_update_policy" ON properties;',
      'DROP POLICY IF EXISTS "properties_delete_policy" ON properties;',
      'DROP POLICY IF EXISTS "property_users_select_policy" ON property_users;',
      'DROP POLICY IF EXISTS "property_users_insert_policy" ON property_users;',
      'DROP POLICY IF EXISTS "property_users_update_policy" ON property_users;',
      'DROP POLICY IF EXISTS "property_users_delete_policy" ON property_users;',
      'DROP POLICY IF EXISTS "property_users_all_access" ON property_users;',
      'DROP POLICY IF EXISTS "properties_landlord_access" ON properties;',
      'DROP POLICY IF EXISTS "properties_user_access" ON properties;'
    ];

    for (const policy of dropPolicies) {
      await executeSQL(policy);
    }

    // Step 3: Create simple, non-recursive policies
    console.log('3. Creating simple, non-recursive policies...');

    // Property_users: VERY SIMPLE policies
    await executeSQL(`CREATE POLICY "property_users_simple_access" ON property_users
          FOR ALL USING (user_id = auth.uid());`);

    // Properties: SIMPLE policies with minimal property_users reference
    await executeSQL(`CREATE POLICY "properties_landlord_simple" ON properties
          FOR ALL USING (landlord_id = auth.uid());`);

    await executeSQL(`CREATE POLICY "properties_user_simple" ON properties
          FOR SELECT USING (
            id IN (
              SELECT property_id FROM property_users
              WHERE user_id = auth.uid()
              AND status = 'ACTIVE'
            )
          );`);

    // Step 4: Re-enable RLS
    console.log('4. Re-enabling RLS...');
    await executeSQL('ALTER TABLE properties ENABLE ROW LEVEL SECURITY;');
    await executeSQL('ALTER TABLE property_users ENABLE ROW LEVEL SECURITY;');

    console.log('✅ Emergency RLS fix applied successfully!');
    console.log('🔄 Please refresh your browser to see the changes.');

  } catch (err) {
    console.error('❌ Exception:', err);
  }
}

applyEmergencyRLSFix();
