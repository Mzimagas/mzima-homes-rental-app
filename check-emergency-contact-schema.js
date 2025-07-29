// Check if emergency contact fields exist in the tenant schema
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

async function checkEmergencyContactSchema() {
  console.log('🔍 Checking Emergency Contact Schema in Tenants Table...\n')
  
  try {
    // Check current tenant table structure
    console.log('1️⃣ Checking current tenant table structure...')
    
    const { data: existingTenants, error: queryError } = await supabase
      .from('tenants')
      .select('*')
      .limit(1)
    
    if (queryError) {
      console.log('❌ Error querying tenants:', queryError.message)
      return
    }
    
    if (existingTenants && existingTenants.length > 0) {
      const tenant = existingTenants[0]
      console.log('✅ Current tenant table fields:')
      Object.keys(tenant).forEach(field => {
        console.log(`   - ${field}: ${typeof tenant[field]} (${tenant[field] || 'null'})`)
      })
      
      // Check for emergency contact fields
      const emergencyFields = Object.keys(tenant).filter(field => 
        field.toLowerCase().includes('emergency') || 
        field.toLowerCase().includes('contact') ||
        field.toLowerCase().includes('kin')
      )
      
      if (emergencyFields.length > 0) {
        console.log('\n✅ Found potential emergency contact fields:')
        emergencyFields.forEach(field => {
          console.log(`   - ${field}`)
        })
      } else {
        console.log('\n❌ No emergency contact fields found in current schema')
      }
    } else {
      console.log('ℹ️ No existing tenants found to check schema')
    }
    
    // Check database types file for tenant schema
    console.log('\n2️⃣ Checking database types definition...')
    
    try {
      const typesContent = fs.readFileSync('lib/types/database.ts', 'utf8')
      
      // Look for tenant table definition
      const tenantTableMatch = typesContent.match(/tenants:\s*{[\s\S]*?Row:\s*{([\s\S]*?)}/m)
      
      if (tenantTableMatch) {
        console.log('✅ Found tenant table definition in types:')
        const tenantFields = tenantTableMatch[1]
        
        // Check for emergency contact fields in types
        const hasEmergencyFields = tenantFields.includes('emergency') || 
                                  tenantFields.includes('contact') || 
                                  tenantFields.includes('kin')
        
        if (hasEmergencyFields) {
          console.log('   Emergency contact fields found in types definition')
        } else {
          console.log('   No emergency contact fields in types definition')
        }
        
        // Show relevant lines
        const lines = tenantFields.split('\n').filter(line => 
          line.trim() && !line.trim().startsWith('//')
        )
        lines.forEach(line => {
          if (line.trim()) {
            console.log(`   ${line.trim()}`)
          }
        })
      } else {
        console.log('❌ Could not find tenant table definition in types file')
      }
    } catch (err) {
      console.log('⚠️ Could not read database types file:', err.message)
    }
    
    // Test adding emergency contact fields
    console.log('\n3️⃣ Testing emergency contact field addition...')
    
    const testTenantData = {
      full_name: 'Emergency Contact Test Tenant',
      phone: '+254700000000',
      email: 'test@example.com',
      national_id: '12345678',
      status: 'ACTIVE'
    }
    
    // Try adding emergency contact fields
    const emergencyContactData = {
      ...testTenantData,
      emergency_contact_name: 'Jane Doe',
      emergency_contact_phone: '+254700000001',
      emergency_contact_relationship: 'Sister'
    }
    
    const { data: testTenant, error: testError } = await supabase
      .from('tenants')
      .insert(emergencyContactData)
      .select()
      .single()
    
    if (testError) {
      console.log('❌ Emergency contact fields do not exist in schema:', testError.message)
      console.log('   Need to add emergency contact fields to database')
    } else {
      console.log('✅ Emergency contact fields already exist!')
      console.log('   Fields successfully added:', Object.keys(testTenant))
      
      // Clean up test tenant
      await supabase.from('tenants').delete().eq('id', testTenant.id)
      console.log('✅ Test tenant cleaned up')
    }
    
    // Summary and recommendations
    console.log('\n📋 Emergency Contact Schema Analysis:')
    
    if (testError) {
      console.log('❌ RESULT: Emergency contact fields need to be added to database')
      console.log('📝 REQUIRED ACTIONS:')
      console.log('   1. Create database migration to add emergency contact fields')
      console.log('   2. Update database types definition')
      console.log('   3. Update tenant form to include emergency contact fields')
      console.log('   4. Update tenant creation logic')
      
      console.log('\n🔧 RECOMMENDED FIELDS TO ADD:')
      console.log('   - emergency_contact_name: TEXT')
      console.log('   - emergency_contact_phone: TEXT')
      console.log('   - emergency_contact_relationship: TEXT')
      console.log('   - emergency_contact_email: TEXT (optional)')
    } else {
      console.log('✅ RESULT: Emergency contact fields already exist')
      console.log('📝 REQUIRED ACTIONS:')
      console.log('   1. Update tenant form to include emergency contact fields')
      console.log('   2. Update tenant creation logic to use existing fields')
      console.log('   3. Test complete workflow')
    }
    
  } catch (err) {
    console.error('❌ Schema check failed:', err.message)
  }
}

checkEmergencyContactSchema()
