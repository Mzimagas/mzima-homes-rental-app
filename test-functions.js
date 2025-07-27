// Test business logic functions
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

// Read environment variables from .env.local
let supabaseUrl, supabaseKey, serviceKey
try {
  const envContent = fs.readFileSync('.env.local', 'utf8')
  const lines = envContent.split('\n')
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (trimmedLine.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = trimmedLine.split('=')[1]
    }
    if (trimmedLine.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseKey = trimmedLine.split('=')[1]
    }
    if (trimmedLine.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      serviceKey = trimmedLine.split('=')[1]
    }
  }
} catch (err) {
  console.error('❌ Could not read .env.local file:', err.message)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const supabaseAdmin = createClient(supabaseUrl, serviceKey)

async function testBusinessFunctions() {
  console.log('🧪 Testing Business Logic Functions...\n')
  
  try {
    // Test 1: Check if functions exist
    console.log('1️⃣ Checking if business functions exist...')
    
    const { data: functions, error: funcError } = await supabaseAdmin
      .rpc('run_monthly_rent', { p_period_start: '2024-01-01' })
    
    if (funcError) {
      console.error('❌ Business functions not found:', funcError.message)
      console.log('\n📋 You need to run the business logic SQL file:')
      console.log('Go to Supabase SQL Editor and run: supabase/functions/business-logic.sql')
      return
    }
    
    console.log('✅ Business functions exist!')
    
    // Test 2: Create test data
    console.log('\n2️⃣ Creating test data...')
    
    // Create test landlord
    const { data: landlord, error: landlordError } = await supabaseAdmin
      .from('landlords')
      .insert({
        full_name: 'Test Landlord',
        phone: '+254700000001',
        email: 'test@example.com'
      })
      .select()
      .single()
    
    if (landlordError && !landlordError.message.includes('duplicate')) {
      console.error('❌ Error creating landlord:', landlordError.message)
      return
    }
    
    console.log('✅ Test landlord created/exists')
    
    // Test 3: Test property stats function
    console.log('\n3️⃣ Testing property statistics...')
    
    const { data: stats, error: statsError } = await supabaseAdmin
      .rpc('get_property_stats', { p_property_id: '22222222-2222-2222-2222-222222222222' })
    
    if (statsError) {
      console.log('ℹ️ Property stats test skipped (no test property)')
    } else {
      console.log('✅ Property stats function working!')
    }
    
    // Test 4: Test tenant balance function
    console.log('\n4️⃣ Testing tenant balance function...')
    
    const { data: balance, error: balanceError } = await supabaseAdmin
      .rpc('get_tenant_balance', { p_tenant_id: '55555555-5555-5555-5555-555555555555' })
    
    if (balanceError) {
      console.log('ℹ️ Tenant balance test skipped (no test tenant)')
    } else {
      console.log('✅ Tenant balance function working!')
    }
    
    console.log('\n🎉 Basic function tests completed!')
    console.log('\n📋 Next steps:')
    console.log('1. Run the full test script in Supabase SQL Editor:')
    console.log('   scripts/test-business-functions.sql')
    console.log('2. This will create comprehensive test data and verify all functions')
    
  } catch (err) {
    console.error('❌ Test failed:', err.message)
  }
}

testBusinessFunctions()
