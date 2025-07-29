// Test if get_property_stats function exists and create it if missing
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

async function testAndCreatePropertyStats() {
  console.log('🔍 Testing get_property_stats function availability...\n')
  
  try {
    // First, test if the function exists by trying to call it
    console.log('1️⃣ Testing if get_property_stats function exists...')
    const { data: testData, error: testError } = await supabase
      .rpc('get_property_stats', { p_property_id: '00000000-0000-0000-0000-000000000000' })
    
    if (testError && testError.message.includes('Could not find the function')) {
      console.log('❌ get_property_stats function does not exist')
      console.log('📝 Function needs to be created in the database\n')
      
      console.log('🔧 MANUAL STEPS REQUIRED:')
      console.log('1. Go to your Supabase Dashboard: https://supabase.com/dashboard')
      console.log('2. Select your project')
      console.log('3. Navigate to SQL Editor')
      console.log('4. Copy and paste the following SQL:\n')
      
      // Read and display the migration SQL
      const migrationSQL = fs.readFileSync('supabase/migrations/010_business_functions.sql', 'utf8')
      console.log('--- COPY THIS SQL TO SUPABASE SQL EDITOR ---')
      console.log(migrationSQL)
      console.log('--- END OF SQL ---\n')
      
      console.log('5. Click "Run" to execute the SQL')
      console.log('6. After successful execution, run this script again to verify\n')
      
    } else if (testError) {
      console.log('⚠️ Function exists but returned error (expected for non-existent property):', testError.message)
      console.log('✅ get_property_stats function is available!')
      
      // Test with a real property if available
      await testWithRealProperty()
      
    } else {
      console.log('✅ get_property_stats function is working!')
      console.log('📊 Test result:', testData)
    }
    
  } catch (err) {
    console.error('❌ Test failed:', err.message)
  }
}

async function testWithRealProperty() {
  console.log('\n2️⃣ Testing with real property data...')
  
  try {
    // Get a real property ID
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id, name')
      .limit(1)
    
    if (propError) {
      console.log('⚠️ Could not fetch properties:', propError.message)
      return
    }
    
    if (!properties || properties.length === 0) {
      console.log('ℹ️ No properties found in database')
      return
    }
    
    const property = properties[0]
    console.log(`📍 Testing with property: ${property.name} (${property.id})`)
    
    const { data: statsData, error: statsError } = await supabase
      .rpc('get_property_stats', { p_property_id: property.id })
    
    if (statsError) {
      console.log('❌ Property stats error:', statsError.message)
    } else {
      console.log('✅ Property stats retrieved successfully!')
      console.log('📊 Statistics:', JSON.stringify(statsData, null, 2))
    }
    
  } catch (err) {
    console.error('❌ Real property test failed:', err.message)
  }
}

testAndCreatePropertyStats()
