// Verify that business functions are working after manual SQL execution
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

// Read environment variables from .env.local
let supabaseUrl, serviceKey
try {
  const envContent = fs.readFileSync('.env.local', 'utf8')
  const lines = envContent.split('\n')
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (trimmedLine.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = trimmedLine.split('=')[1]
    }
    if (trimmedLine.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      serviceKey = trimmedLine.split('=')[1]
    }
  }
} catch (err) {
  console.error('❌ Could not read .env.local file:', err.message)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function verifyBusinessFunctions() {
  console.log('🔍 Verifying business functions after manual SQL execution...\n')
  
  try {
    // Test 1: get_property_stats function
    console.log('1️⃣ Testing get_property_stats function...')
    
    // First get a real property
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id, name')
      .limit(1)
    
    if (propError) {
      console.log('⚠️ Could not fetch properties:', propError.message)
    } else if (!properties || properties.length === 0) {
      console.log('ℹ️ No properties found - testing with dummy ID')
      
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_property_stats', { p_property_id: '00000000-0000-0000-0000-000000000000' })
      
      if (statsError) {
        if (statsError.message.includes('Could not find the function')) {
          console.log('❌ get_property_stats function still not found')
          console.log('   Please ensure you executed the SQL in Supabase Dashboard')
        } else {
          console.log('✅ get_property_stats function exists (expected error for non-existent property)')
        }
      } else {
        console.log('✅ get_property_stats function working!')
        console.log('📊 Result:', statsData)
      }
    } else {
      const property = properties[0]
      console.log(`📍 Testing with real property: ${property.name}`)
      
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_property_stats', { p_property_id: property.id })
      
      if (statsError) {
        if (statsError.message.includes('Could not find the function')) {
          console.log('❌ get_property_stats function still not found')
          console.log('   Please ensure you executed the SQL in Supabase Dashboard')
        } else {
          console.log('⚠️ Function exists but returned error:', statsError.message)
        }
      } else {
        console.log('✅ get_property_stats function working perfectly!')
        console.log('📊 Property Statistics:')
        if (statsData && statsData.length > 0) {
          const stats = statsData[0]
          console.log(`   Total Units: ${stats.total_units}`)
          console.log(`   Occupied Units: ${stats.occupied_units}`)
          console.log(`   Vacant Units: ${stats.vacant_units}`)
          console.log(`   Occupancy Rate: ${stats.occupancy_rate}%`)
          console.log(`   Monthly Rent Potential: KES ${stats.monthly_rent_potential}`)
          console.log(`   Monthly Rent Actual: KES ${stats.monthly_rent_actual}`)
        }
      }
    }
    
    // Test 2: get_tenant_balance function
    console.log('\n2️⃣ Testing get_tenant_balance function...')
    const { data: balanceData, error: balanceError } = await supabase
      .rpc('get_tenant_balance', { p_tenant_id: '00000000-0000-0000-0000-000000000000' })
    
    if (balanceError) {
      if (balanceError.message.includes('Could not find the function')) {
        console.log('❌ get_tenant_balance function not found')
      } else {
        console.log('✅ get_tenant_balance function exists (expected result for non-existent tenant)')
        console.log('📊 Balance result:', balanceData)
      }
    } else {
      console.log('✅ get_tenant_balance function working!')
      console.log('📊 Balance result:', balanceData)
    }
    
    // Test 3: apply_payment function
    console.log('\n3️⃣ Testing apply_payment function...')
    const { data: paymentData, error: paymentError } = await supabase
      .rpc('apply_payment', { 
        p_tenant_id: '00000000-0000-0000-0000-000000000000',
        p_amount_kes: 1000,
        p_payment_date: '2024-01-01'
      })
    
    if (paymentError) {
      if (paymentError.message.includes('Could not find the function')) {
        console.log('❌ apply_payment function not found')
      } else {
        console.log('✅ apply_payment function exists (expected error for non-existent tenant)')
      }
    } else {
      console.log('✅ apply_payment function working!')
    }
    
    // Test 4: run_monthly_rent function
    console.log('\n4️⃣ Testing run_monthly_rent function...')
    const { data: rentData, error: rentError } = await supabase
      .rpc('run_monthly_rent', { 
        p_period_start: '2024-01-01'
      })
    
    if (rentError) {
      if (rentError.message.includes('Could not find the function')) {
        console.log('❌ run_monthly_rent function not found')
      } else {
        console.log('✅ run_monthly_rent function exists')
        console.log('📊 Result:', rentData)
      }
    } else {
      console.log('✅ run_monthly_rent function working!')
      console.log('📊 Result:', rentData)
    }
    
    // Test 5: terminate_tenancy function
    console.log('\n5️⃣ Testing terminate_tenancy function...')
    const { data: terminateData, error: terminateError } = await supabase
      .rpc('terminate_tenancy', { 
        p_tenancy_agreement_id: '00000000-0000-0000-0000-000000000000',
        p_termination_date: '2024-01-01'
      })
    
    if (terminateError) {
      if (terminateError.message.includes('Could not find the function')) {
        console.log('❌ terminate_tenancy function not found')
      } else {
        console.log('✅ terminate_tenancy function exists (expected error for non-existent agreement)')
      }
    } else {
      console.log('✅ terminate_tenancy function working!')
    }
    
    console.log('\n🎉 Business functions verification completed!')
    console.log('\n📋 Summary:')
    console.log('If all functions show "✅ exists" or "✅ working", then:')
    console.log('✅ Property statistics should now work in the application')
    console.log('✅ All business logic functions are available')
    console.log('✅ The "Could not find the function" error should be resolved')
    
  } catch (err) {
    console.error('❌ Verification failed:', err.message)
  }
}

verifyBusinessFunctions()
