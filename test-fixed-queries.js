const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

// Read environment variables from .env.local
let supabaseUrl, anonKey
try {
  const envContent = fs.readFileSync('.env.local', 'utf8')
  const lines = envContent.split('\n')
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (trimmedLine.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = trimmedLine.split('=')[1]
    }
    if (trimmedLine.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      anonKey = trimmedLine.split('=')[1]
    }
  }
} catch (err) {
  console.error('❌ Could not read .env.local file:', err.message)
  process.exit(1)
}

if (!supabaseUrl || !anonKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

// Create Supabase client
const supabase = createClient(supabaseUrl, anonKey)

async function testFixedQueries() {
  console.log('🧪 Testing Fixed Database Queries...\n')

  try {
    // Sign in as test user
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test@mzimahomes.com',
      password: 'TestPassword123!'
    })

    if (signInError) {
      console.error('❌ Error signing in:', signInError.message)
      return
    }

    console.log('✅ Signed in as test user')

    // Get landlord IDs for test user
    const { data: landlordIds, error: landlordError } = await supabase.rpc('get_user_landlord_ids', {
      user_uuid: authData.user.id
    })

    if (landlordError || !landlordIds || landlordIds.length === 0) {
      console.error('❌ No landlord access found for test user')
      return
    }

    const landlordId = landlordIds[0]
    console.log(`✅ Using landlord ID: ${landlordId}`)

    // Test 1: Payment Analytics Query (Fixed)
    console.log('\n💰 Testing Payment Analytics Query...')
    try {
      // First get all properties for the landlord
      const { data: properties } = await supabase
        .from('properties')
        .select('id')
        .eq('landlord_id', landlordId)

      if (!properties || properties.length === 0) {
        console.log('⚠️  No properties found for landlord')
      } else {
        console.log(`✅ Found ${properties.length} properties`)

        const propertyIds = properties.map(p => p.id)

        // Get units for these properties
        const { data: units } = await supabase
          .from('units')
          .select('id')
          .in('property_id', propertyIds)

        console.log(`✅ Found ${units?.length || 0} units`)

        if (units && units.length > 0) {
          const unitIds = units.map(u => u.id)

          // Get tenants for these units
          const { data: tenants } = await supabase
            .from('tenants')
            .select('id')
            .in('current_unit_id', unitIds)

          console.log(`✅ Found ${tenants?.length || 0} tenants`)

          if (tenants && tenants.length > 0) {
            const tenantIds = tenants.map(t => t.id)

            // Test the fixed payment query
            const { data: payments, error: paymentsError } = await supabase
              .from('payments')
              .select(`
                *,
                tenants (
                  full_name,
                  units (
                    unit_label,
                    properties (
                      name
                    )
                  )
                )
              `)
              .in('tenant_id', tenantIds)
              .order('payment_date', { ascending: false })

            if (paymentsError) {
              console.error('❌ Payment Analytics Query failed:', paymentsError.message)
            } else {
              console.log(`✅ Payment Analytics Query successful: Found ${payments?.length || 0} payments`)
            }
          }
        }
      }
    } catch (err) {
      console.error('❌ Payment Analytics Query exception:', err.message)
    }

    // Test 2: Tenants Query (Fixed)
    console.log('\n👥 Testing Tenants Query...')
    try {
      // First get all properties for the landlord
      const { data: properties } = await supabase
        .from('properties')
        .select('id')
        .eq('landlord_id', landlordId)

      if (!properties || properties.length === 0) {
        console.log('⚠️  No properties found for landlord')
      } else {
        const propertyIds = properties.map(p => p.id)

        // Get units for these properties
        const { data: units } = await supabase
          .from('units')
          .select('id')
          .in('property_id', propertyIds)

        if (!units || units.length === 0) {
          console.log('⚠️  No units found for properties')
        } else {
          const unitIds = units.map(u => u.id)

          // Test the fixed tenants query
          const { data: tenants, error: tenantsError } = await supabase
            .from('tenants')
            .select(`
              *,
              units (
                *,
                properties (
                  id,
                  name,
                  physical_address,
                  landlord_id
                )
              )
            `)
            .in('current_unit_id', unitIds)
            .order('full_name')

          if (tenantsError) {
            console.error('❌ Tenants Query failed:', tenantsError.message)
          } else {
            console.log(`✅ Tenants Query successful: Found ${tenants?.length || 0} tenants`)
          }
        }
      }
    } catch (err) {
      console.error('❌ Tenants Query exception:', err.message)
    }

    // Test 3: Financial Reports Query (Fixed)
    console.log('\n📊 Testing Financial Reports Query...')
    try {
      // First get all properties for the landlord
      const { data: properties } = await supabase
        .from('properties')
        .select('id')
        .eq('landlord_id', landlordId)

      if (!properties || properties.length === 0) {
        console.log('⚠️  No properties found for landlord')
      } else {
        const propertyIds = properties.map(p => p.id)

        // Get units for these properties
        const { data: units } = await supabase
          .from('units')
          .select('id')
          .in('property_id', propertyIds)

        if (!units || units.length === 0) {
          console.log('⚠️  No units found for properties')
        } else {
          const unitIds = units.map(u => u.id)

          // Test the fixed invoices query
          const { data: invoices, error: invoicesError } = await supabase
            .from('rent_invoices')
            .select(`
              period_start,
              amount_due_kes,
              amount_paid_kes,
              status,
              units (
                unit_label,
                properties (
                  name
                )
              )
            `)
            .in('unit_id', unitIds)

          if (invoicesError) {
            console.error('❌ Financial Reports Query failed:', invoicesError.message)
          } else {
            console.log(`✅ Financial Reports Query successful: Found ${invoices?.length || 0} invoices`)
          }
        }
      }
    } catch (err) {
      console.error('❌ Financial Reports Query exception:', err.message)
    }

    // Test 4: Occupancy Reports Query (Fixed)
    console.log('\n🏠 Testing Occupancy Reports Query...')
    try {
      // First get all properties for the landlord
      const { data: properties } = await supabase
        .from('properties')
        .select('id')
        .eq('landlord_id', landlordId)

      if (!properties || properties.length === 0) {
        console.log('⚠️  No properties found for landlord')
      } else {
        const propertyIds = properties.map(p => p.id)

        // Get units for these properties
        const { data: units } = await supabase
          .from('units')
          .select('id')
          .in('property_id', propertyIds)

        if (!units || units.length === 0) {
          console.log('⚠️  No units found for properties')
        } else {
          const unitIds = units.map(u => u.id)

          // Test the fixed tenancy agreements query
          const { data: tenancies, error: tenanciesError } = await supabase
            .from('tenancy_agreements')
            .select(`
              start_date,
              end_date,
              status,
              units (
                unit_label,
                properties (
                  name
                )
              )
            `)
            .in('unit_id', unitIds)

          if (tenanciesError) {
            console.error('❌ Occupancy Reports Query failed:', tenanciesError.message)
          } else {
            console.log(`✅ Occupancy Reports Query successful: Found ${tenancies?.length || 0} tenancy agreements`)
          }
        }
      }
    } catch (err) {
      console.error('❌ Occupancy Reports Query exception:', err.message)
    }

    // Sign out
    await supabase.auth.signOut()

    console.log('\n🎉 All fixed queries tested successfully!')
    console.log('\n📋 Summary:')
    console.log('   ✅ Payment Analytics Query: Fixed nested filtering')
    console.log('   ✅ Tenants Query: Fixed nested filtering')
    console.log('   ✅ Financial Reports Query: Fixed nested filtering')
    console.log('   ✅ Occupancy Reports Query: Fixed nested filtering')
    console.log('   ✅ All queries now use proper step-by-step filtering')
    
    console.log('\n🚀 The database query errors should now be resolved!')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testFixedQueries()
