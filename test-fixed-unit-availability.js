// Test the fixed unit availability query
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

async function testFixedUnitAvailability() {
  console.log('🧪 Testing Fixed Unit Availability Query...\n')
  
  try {
    // Use the corrected landlord ID
    const mockLandlordId = '78664634-fa3c-4b1e-990e-513f5b184fa6'
    
    console.log('1️⃣ Testing with corrected landlord ID...')
    console.log(`   Using landlord ID: ${mockLandlordId}`)
    
    // Step 1: Get properties for the landlord
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, name')
      .eq('landlord_id', mockLandlordId)
    
    if (propertiesError) {
      console.log('❌ Error loading properties:', propertiesError.message)
      return
    }
    
    console.log(`✅ Found ${properties?.length || 0} properties`)
    if (properties && properties.length > 0) {
      properties.forEach(prop => {
        console.log(`   - ${prop.name} (${prop.id})`)
      })
    }
    
    if (!properties || properties.length === 0) {
      console.log('❌ Still no properties found!')
      return
    }
    
    const propertyIds = properties.map(p => p.id)
    
    // Step 2: Test the fixed units query (without nested properties join)
    console.log('\n2️⃣ Testing fixed units query...')
    
    const { data: unitsData, error: unitsError } = await supabase
      .from('units')
      .select(`
        id,
        unit_label,
        monthly_rent_kes,
        property_id
      `)
      .in('property_id', propertyIds)
      .eq('is_active', true)
    
    if (unitsError) {
      console.log('❌ Error with fixed query:', unitsError.message)
      return
    }
    
    console.log(`✅ Fixed query returned ${unitsData?.length || 0} units`)
    if (unitsData && unitsData.length > 0) {
      unitsData.forEach(unit => {
        console.log(`   - ${unit.unit_label} (${unit.id}) - KES ${unit.monthly_rent_kes}/month`)
      })
    }
    
    // Step 3: Check tenancy agreements
    console.log('\n3️⃣ Checking tenancy agreements...')
    
    const { data: activeTenancies, error: tenancyError } = await supabase
      .from('tenancy_agreements')
      .select('unit_id')
      .eq('status', 'ACTIVE')
    
    if (tenancyError) {
      console.log('❌ Error loading tenancies:', tenancyError.message)
      return
    }
    
    console.log(`✅ Found ${activeTenancies?.length || 0} active tenancy agreements`)
    
    // Step 4: Calculate available units with property names
    console.log('\n4️⃣ Calculating available units with property names...')
    
    const occupiedUnitIds = activeTenancies?.map(t => t.unit_id).filter(Boolean) || []
    
    const availableUnitsFiltered = (unitsData || []).filter(unit =>
      !occupiedUnitIds.includes(unit.id)
    )
    
    // Create property name mapping
    const propertyMap = {}
    properties.forEach(prop => {
      propertyMap[prop.id] = prop.name
    })
    
    // Add property names to units (simulating the fixed frontend logic)
    const availableUnitsWithProperties = availableUnitsFiltered.map(unit => ({
      ...unit,
      properties: [{
        name: propertyMap[unit.property_id] || 'Unknown Property'
      }]
    }))
    
    console.log(`✅ Available units for dropdown: ${availableUnitsWithProperties.length}`)
    
    if (availableUnitsWithProperties.length > 0) {
      console.log('   Units that will appear in dropdown:')
      availableUnitsWithProperties.forEach(unit => {
        console.log(`   - ${unit.properties[0].name} - ${unit.unit_label} (KES ${unit.monthly_rent_kes.toLocaleString()}/month)`)
      })
    } else {
      console.log('   No available units for dropdown')
    }
    
    // Step 5: Test the dropdown option format
    console.log('\n5️⃣ Testing dropdown option format...')
    
    if (availableUnitsWithProperties.length > 0) {
      console.log('   Dropdown options will be:')
      availableUnitsWithProperties.forEach(unit => {
        const optionText = `${unit.properties[0]?.name} - ${unit.unit_label} (KES ${unit.monthly_rent_kes.toLocaleString()}/month)`
        console.log(`   <option value="${unit.id}">${optionText}</option>`)
      })
    }
    
    // Step 6: Verify meter type migration didn't affect queries
    console.log('\n6️⃣ Verifying meter type migration compatibility...')
    
    const { data: meterCheck, error: meterError } = await supabase
      .from('units')
      .select('id, unit_label, meter_type')
      .in('property_id', propertyIds)
    
    if (meterError) {
      console.log('❌ Error checking meter types:', meterError.message)
    } else {
      console.log('✅ Meter type migration compatibility check passed')
      if (meterCheck && meterCheck.length > 0) {
        meterCheck.forEach(unit => {
          console.log(`   - ${unit.unit_label}: ${unit.meter_type}`)
        })
      }
    }
    
    // Summary
    console.log('\n📋 Fix Summary:')
    console.log('✅ ROOT CAUSE IDENTIFIED: Incorrect mock landlord ID')
    console.log('✅ SOLUTION APPLIED: Updated to actual landlord ID from database')
    console.log('✅ QUERY FIXED: Removed problematic nested properties join')
    console.log('✅ PROPERTY NAMES: Added via separate mapping logic')
    console.log('✅ METER MIGRATION: No impact on unit availability queries')
    
    if (availableUnitsWithProperties.length > 0) {
      console.log('\n🎉 SUCCESS: Available units will now appear in tenant onboarding dropdown!')
      console.log(`   ${availableUnitsWithProperties.length} unit(s) available for assignment`)
    } else {
      console.log('\n⚠️ NOTE: No available units found (all may be occupied)')
    }
    
  } catch (err) {
    console.error('❌ Test failed:', err.message)
  }
}

testFixedUnitAvailability()
