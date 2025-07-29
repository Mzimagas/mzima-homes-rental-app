// Check the tenancy_agreements table schema
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

async function checkTenancySchema() {
  console.log('🔍 Checking Tenancy Agreements Table Schema...\n')
  
  try {
    // Check existing tenancy agreements to see the schema
    console.log('1️⃣ Checking existing tenancy agreements...')
    
    const { data: existingTenancies, error: queryError } = await supabase
      .from('tenancy_agreements')
      .select('*')
      .limit(1)
    
    if (queryError) {
      console.log('❌ Error querying tenancy agreements:', queryError.message)
    } else if (existingTenancies && existingTenancies.length > 0) {
      console.log('✅ Found existing tenancy agreement structure:')
      console.log('   Fields:', Object.keys(existingTenancies[0]))
    } else {
      console.log('ℹ️ No existing tenancy agreements found')
    }
    
    // Try to create a minimal tenancy agreement to see what fields are required
    console.log('\n2️⃣ Testing minimal tenancy agreement creation...')
    
    const minimalTenancyData = {
      tenant_id: '00000000-0000-0000-0000-000000000000', // Dummy ID
      unit_id: '00000000-0000-0000-0000-000000000000', // Dummy ID
      status: 'ACTIVE'
    }
    
    const { data: testTenancy, error: minimalError } = await supabase
      .from('tenancy_agreements')
      .insert(minimalTenancyData)
      .select()
      .single()
    
    if (minimalError) {
      console.log('❌ Minimal tenancy creation failed:', minimalError.message)
      console.log('   This helps us understand what fields are required')
    } else {
      console.log('✅ Minimal tenancy created successfully')
      console.log('   Available fields in response:', Object.keys(testTenancy))
      
      // Clean up
      await supabase.from('tenancy_agreements').delete().eq('id', testTenancy.id)
      console.log('✅ Test tenancy cleaned up')
    }
    
    // Check what the tenant form is trying to create
    console.log('\n3️⃣ Checking tenant form tenancy creation logic...')
    
    console.log('   Fields used in tenant form for tenancy creation:')
    console.log('   - tenant_id (from created tenant)')
    console.log('   - unit_id (from selected unit)')
    console.log('   - monthly_rent_kes (from selected unit) ← This might not exist in schema')
    console.log('   - start_date (current date)')
    console.log('   - status (ACTIVE)')
    
  } catch (err) {
    console.error('❌ Schema check failed:', err.message)
  }
}

checkTenancySchema()
