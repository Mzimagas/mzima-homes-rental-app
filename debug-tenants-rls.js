const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugTenantsRLS() {
  console.log('🔍 Debugging tenants table RLS...');
  
  try {
    // First, test the current query that's failing
    console.log('1. Testing current failing query...');
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select(`
        id,
        name,
        physical_address,
        units (
          id,
          unit_label,
          monthly_rent_kes,
          is_active,
          tenants (
            id,
            full_name,
            status
          )
        )
      `)
      .limit(1);

    if (propertiesError) {
      console.error("❌ Current query failed:");
      console.dir(propertiesError, { depth: null });
      console.error("❌ Error details:", JSON.stringify(propertiesError, null, 2));
      
      // If it's a Supabase error structure
      if ('message' in propertiesError || 'code' in propertiesError) {
        console.error("🔎 Supabase Error Details:", {
          message: propertiesError.message,
          code: propertiesError.code,
          hint: propertiesError.hint,
          details: propertiesError.details,
        });
      }
    } else {
      console.log('✅ Current query works! Found properties:', properties?.length);
      return;
    }

    // Test 2: Check if it's specifically the tenants join
    console.log('\n2. Testing without tenants join...');
    const { data: propertiesNoTenants, error: noTenantsError } = await supabase
      .from('properties')
      .select(`
        id,
        name,
        physical_address,
        units (
          id,
          unit_label,
          monthly_rent_kes,
          is_active
        )
      `)
      .limit(1);

    if (noTenantsError) {
      console.error("❌ Query without tenants also failed:", noTenantsError.message);
    } else {
      console.log('✅ Query without tenants works! This confirms tenants table is the issue.');
    }

    // Test 3: Check tenants table directly
    console.log('\n3. Testing tenants table directly...');
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, full_name, status')
      .limit(5);

    if (tenantsError) {
      console.error("❌ Direct tenants query failed:");
      console.dir(tenantsError, { depth: null });
      console.error("❌ Tenants error details:", JSON.stringify(tenantsError, null, 2));
    } else {
      console.log('✅ Direct tenants query works! Found tenants:', tenants?.length);
    }

    // Test 4: Check current RLS policies on tenants
    console.log('\n4. Checking current RLS policies...');
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'tenants');

    if (policiesError) {
      console.log('Warning: Could not check policies:', policiesError.message);
    } else {
      console.log('Current tenants policies:', policies?.length || 0);
      policies?.forEach(policy => {
        console.log(`  - ${policy.policyname}: ${policy.cmd} - ${policy.qual}`);
      });
    }

    // Test 5: Apply temporary debug policy
    console.log('\n5. Applying temporary debug RLS policy...');
    
    // First, try to create a permissive policy for debugging
    const debugPolicySQL = `
      -- TEMP: Allow full SELECT access for debugging
      CREATE POLICY "debug_allow_select_tenants"
      ON tenants
      FOR SELECT
      TO authenticated
      USING (true);
    `;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
        },
        body: JSON.stringify({ sql_query: debugPolicySQL })
      });
      
      if (response.ok) {
        console.log('✅ Debug policy applied successfully');
      } else {
        console.log('⚠️ Could not apply debug policy via REST API');
      }
    } catch (err) {
      console.log('⚠️ Could not apply debug policy:', err.message);
    }

    // Test 6: Try the original query again
    console.log('\n6. Testing original query after debug policy...');
    const { data: propertiesAfter, error: afterError } = await supabase
      .from('properties')
      .select(`
        id,
        name,
        physical_address,
        units (
          id,
          unit_label,
          monthly_rent_kes,
          is_active,
          tenants (
            id,
            full_name,
            status
          )
        )
      `)
      .limit(1);

    if (afterError) {
      console.error("❌ Query still fails after debug policy:");
      console.dir(afterError, { depth: null });
    } else {
      console.log('✅ Query works after debug policy! Found properties:', propertiesAfter?.length);
      console.log('🎉 RLS on tenants table was the issue!');
    }

  } catch (err) {
    console.error('❌ Debug script error:', err);
  }
}

debugTenantsRLS();
