// Check what data actually exists in the database
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

async function checkExistingData() {
  console.log('🔍 Checking Existing Database Data...\n')
  
  try {
    // Check landlords
    console.log('1️⃣ Checking landlords...')
    const { data: landlords, error: landlordsError } = await supabase
      .from('landlords')
      .select('id, full_name, email')
    
    if (landlordsError) {
      console.log('❌ Error loading landlords:', landlordsError.message)
    } else {
      console.log(`✅ Found ${landlords?.length || 0} landlords:`)
      if (landlords && landlords.length > 0) {
        landlords.forEach(landlord => {
          console.log(`   - ${landlord.full_name} (${landlord.email}) - ID: ${landlord.id}`)
        })
      }
    }
    
    // Check properties
    console.log('\n2️⃣ Checking properties...')
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, name, landlord_id')
    
    if (propertiesError) {
      console.log('❌ Error loading properties:', propertiesError.message)
    } else {
      console.log(`✅ Found ${properties?.length || 0} properties:`)
      if (properties && properties.length > 0) {
        properties.forEach(property => {
          console.log(`   - ${property.name} (Landlord: ${property.landlord_id}) - ID: ${property.id}`)
        })
      }
    }
    
    // Check units
    console.log('\n3️⃣ Checking units...')
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('id, unit_label, property_id, is_active, monthly_rent_kes')
    
    if (unitsError) {
      console.log('❌ Error loading units:', unitsError.message)
    } else {
      console.log(`✅ Found ${units?.length || 0} units:`)
      if (units && units.length > 0) {
        units.forEach(unit => {
          console.log(`   - ${unit.unit_label} (Property: ${unit.property_id}, Active: ${unit.is_active}, Rent: KES ${unit.monthly_rent_kes})`)
        })
      }
    }
    
    // Check tenancy agreements
    console.log('\n4️⃣ Checking tenancy agreements...')
    const { data: tenancies, error: tenanciesError } = await supabase
      .from('tenancy_agreements')
      .select('id, unit_id, tenant_id, status')
    
    if (tenanciesError) {
      console.log('❌ Error loading tenancy agreements:', tenanciesError.message)
    } else {
      console.log(`✅ Found ${tenancies?.length || 0} tenancy agreements:`)
      if (tenancies && tenancies.length > 0) {
        tenancies.forEach(tenancy => {
          console.log(`   - Unit: ${tenancy.unit_id}, Tenant: ${tenancy.tenant_id}, Status: ${tenancy.status}`)
        })
      }
    }
    
    // Check tenants
    console.log('\n5️⃣ Checking tenants...')
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, full_name, current_unit_id')
    
    if (tenantsError) {
      console.log('❌ Error loading tenants:', tenantsError.message)
    } else {
      console.log(`✅ Found ${tenants?.length || 0} tenants:`)
      if (tenants && tenants.length > 0) {
        tenants.forEach(tenant => {
          console.log(`   - ${tenant.full_name} (Current Unit: ${tenant.current_unit_id || 'None'})`)
        })
      }
    }
    
    // Summary and recommendations
    console.log('\n📋 Summary and Recommendations:')
    
    if (!landlords || landlords.length === 0) {
      console.log('❌ No landlords found - need to create test data')
    } else if (!properties || properties.length === 0) {
      console.log('❌ No properties found - need to create test properties')
    } else if (!units || units.length === 0) {
      console.log('❌ No units found - need to create test units')
    } else {
      console.log('✅ Database has data - checking availability logic...')
      
      // Calculate available units
      const occupiedUnitIds = tenancies?.filter(t => t.status === 'ACTIVE').map(t => t.unit_id) || []
      const availableUnits = units?.filter(unit => 
        unit.is_active && !occupiedUnitIds.includes(unit.id)
      ) || []
      
      console.log(`   - Total units: ${units?.length || 0}`)
      console.log(`   - Active units: ${units?.filter(u => u.is_active).length || 0}`)
      console.log(`   - Occupied units: ${occupiedUnitIds.length}`)
      console.log(`   - Available units: ${availableUnits.length}`)
      
      if (availableUnits.length > 0) {
        console.log('   Available units:')
        availableUnits.forEach(unit => {
          console.log(`     - ${unit.unit_label} (KES ${unit.monthly_rent_kes}/month)`)
        })
      }
      
      // Check if the mock landlord ID matches any actual landlord
      const mockLandlordId = '11111111-1111-1111-1111-111111111111'
      const hasMatchingLandlord = landlords?.some(l => l.id === mockLandlordId)
      
      if (!hasMatchingLandlord && landlords && landlords.length > 0) {
        console.log(`\n⚠️ ISSUE IDENTIFIED: Mock landlord ID ${mockLandlordId} doesn't match any actual landlord`)
        console.log('   Actual landlord IDs:')
        landlords.forEach(landlord => {
          console.log(`     - ${landlord.id} (${landlord.full_name})`)
        })
        console.log('\n🔧 SOLUTION: Update the mock landlord ID in tenant-form.tsx to match an actual landlord')
      }
    }
    
  } catch (err) {
    console.error('❌ Check failed:', err.message)
  }
}

checkExistingData()
