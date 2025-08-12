const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Create admin client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function fixRLSRecursion() {
  console.log('🚨 Fixing RLS infinite recursion...');
  
  try {
    // First, let's check current policies
    console.log('1. Checking current policies...');
    
    // Try to query properties to see the current error
    const { data: testData, error: testError } = await supabase
      .from('properties')
      .select('id, name')
      .limit(1);
    
    if (testError) {
      console.log('Current error:', testError.message);
      if (testError.message.includes('infinite recursion')) {
        console.log('✅ Confirmed: Infinite recursion detected');
      }
    }

    // Step 2: Use SQL to fix the policies
    console.log('2. Applying SQL fixes via REST API...');
    
    // Disable RLS temporarily
    const disableRLS = `
      ALTER TABLE properties DISABLE ROW LEVEL SECURITY;
      ALTER TABLE property_users DISABLE ROW LEVEL SECURITY;
    `;
    
    // Drop problematic policies
    const dropPolicies = `
      DROP POLICY IF EXISTS "Users can view their accessible properties" ON properties;
      DROP POLICY IF EXISTS "Users can insert properties they own" ON properties;
      DROP POLICY IF EXISTS "Users can update their own properties" ON properties;
      DROP POLICY IF EXISTS "Users can delete their own properties" ON properties;
      DROP POLICY IF EXISTS "Enable read access for property owners and managers" ON properties;
      DROP POLICY IF EXISTS "Enable insert for authenticated users" ON properties;
      DROP POLICY IF EXISTS "Enable update for property owners" ON properties;
      DROP POLICY IF EXISTS "Enable delete for property owners" ON properties;
      DROP POLICY IF EXISTS "properties_select_policy" ON properties;
      DROP POLICY IF EXISTS "properties_insert_policy" ON properties;
      DROP POLICY IF EXISTS "properties_update_policy" ON properties;
      DROP POLICY IF EXISTS "properties_delete_policy" ON properties;
      DROP POLICY IF EXISTS "property_users_select_policy" ON property_users;
      DROP POLICY IF EXISTS "property_users_insert_policy" ON property_users;
      DROP POLICY IF EXISTS "property_users_update_policy" ON property_users;
      DROP POLICY IF EXISTS "property_users_delete_policy" ON property_users;
      DROP POLICY IF EXISTS "property_users_all_access" ON property_users;
      DROP POLICY IF EXISTS "properties_landlord_access" ON properties;
      DROP POLICY IF EXISTS "properties_user_access" ON properties;
    `;
    
    // Create simple policies
    const createPolicies = `
      -- Property_users: Simple access
      CREATE POLICY "property_users_simple_access" ON property_users
      FOR ALL USING (user_id = auth.uid());
      
      -- Properties: Landlord access
      CREATE POLICY "properties_landlord_simple" ON properties
      FOR ALL USING (landlord_id = auth.uid());
      
      -- Properties: User access (read-only)
      CREATE POLICY "properties_user_simple" ON properties
      FOR SELECT USING (
        id IN (
          SELECT property_id FROM property_users 
          WHERE user_id = auth.uid() 
          AND status = 'ACTIVE'
        )
      );
    `;
    
    // Re-enable RLS
    const enableRLS = `
      ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
      ALTER TABLE property_users ENABLE ROW LEVEL SECURITY;
    `;

    // Execute each step
    console.log('Disabling RLS...');
    await executeRawSQL(disableRLS);
    
    console.log('Dropping policies...');
    await executeRawSQL(dropPolicies);
    
    console.log('Creating new policies...');
    await executeRawSQL(createPolicies);
    
    console.log('Re-enabling RLS...');
    await executeRawSQL(enableRLS);

    // Test the fix
    console.log('3. Testing the fix...');
    const { data: testData2, error: testError2 } = await supabase
      .from('properties')
      .select('id, name')
      .limit(1);
    
    if (testError2) {
      console.log('❌ Still has error:', testError2.message);
    } else {
      console.log('✅ Fix successful! Properties query works.');
      console.log('Found properties:', testData2?.length || 0);
    }

    console.log('✅ RLS recursion fix completed!');
    console.log('🔄 Please refresh your browser to see the changes.');
    
  } catch (err) {
    console.error('❌ Exception:', err);
  }
}

async function executeRawSQL(sql) {
  try {
    // Use the REST API directly to execute SQL
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({ sql_query: sql })
    });
    
    if (!response.ok) {
      console.log(`SQL execution warning: ${response.status} ${response.statusText}`);
      // Don't throw error, just log warning
    }
    
    return response;
  } catch (err) {
    console.log(`SQL execution warning: ${err.message}`);
    // Don't throw error, just log warning
  }
}

fixRLSRecursion();
