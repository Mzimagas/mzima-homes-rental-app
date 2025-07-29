// Test script to debug unit availability query issues
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

async function testUnitAvailabilityQuery() {
  console.log('🧪 Testing Unit Availability Query...\n')
  
  try {
    const mockLandlordId = '11111111-1111-1111-1111-111111111111'
    
    // Step 1: Check if landlord exists and has properties
    console.log('1️⃣ Checking landlord and properties...')
    
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, name, landlord_id')
      .eq('landlord_id', mockLandlordId)
    
    if (propertiesError) {
      console.log('❌ Error loading properties:', propertiesError.message)
      return
    }
    
    console.log(`✅ Found ${properties?.length || 0} properties for landlord`)
    if (properties && properties.length > 0) {
      properties.forEach(prop => {
        console.log(`   - ${prop.name} (${prop.id})`)
      })
    }
    
    if (!properties || properties.length === 0) {
      console.log('⚠️ No properties found - this explains why no units appear!')
      return
    }
    
    const propertyIds = properties.map(p => p.id)
    
    // Step 2: Test the original problematic query
    console.log('\n2️⃣ Testing original problematic query...')
    
    const { data: unitsData, error: unitsError } = await supabase
      .from('units')
      .select(`
        id,
        unit_label,
        monthly_rent_kes,
        property_id,
        properties (
          name
        )
      `)
      .in('property_id', propertyIds)
      .eq('is_active', true)
    
    if (unitsError) {
      console.log('❌ Error with original query:', unitsError.message)
      console.log('   This is likely the root cause of the dropdown issue!')
    } else {
      console.log(`✅ Original query returned ${unitsData?.length || 0} units`)
      if (unitsData && unitsData.length > 0) {
        unitsData.forEach(unit => {
          console.log(`   - ${unit.unit_label} in ${unit.properties?.name || 'Unknown Property'}`)
        })
      }
    }
    
    // Step 3: Test corrected query without nested properties
    console.log('\n3️⃣ Testing corrected query without nested properties...')
    
    const { data: unitsDataCorrected, error: unitsCorrectedError } = await supabase
      .from('units')
      .select(`
        id,
        unit_label,
        monthly_rent_kes,
        property_id,
        is_active
      `)
      .in('property_id', propertyIds)
      .eq('is_active', true)
    
    if (unitsCorrectedError) {
      console.log('❌ Error with corrected query:', unitsCorrectedError.message)
    } else {
      console.log(`✅ Corrected query returned ${unitsDataCorrected?.length || 0} units`)
      if (unitsDataCorrected && unitsDataCorrected.length > 0) {
        unitsDataCorrected.forEach(unit => {
          console.log(`   - ${unit.unit_label} (${unit.id})`)
        })
      }
    }
    
    // Step 4: Get property names separately and combine
    console.log('\n4️⃣ Testing separate property name lookup...')
    
    if (unitsDataCorrected && unitsDataCorrected.length > 0) {
      const propertyMap = {}
      properties.forEach(prop => {
        propertyMap[prop.id] = prop.name
      })
      
      const unitsWithPropertyNames = unitsDataCorrected.map(unit => ({
        ...unit,
        propertyName: propertyMap[unit.property_id] || 'Unknown Property'
      }))
      
      console.log('✅ Units with property names:')
      unitsWithPropertyNames.forEach(unit => {
        console.log(`   - ${unit.unit_label} in ${unit.propertyName}`)
      })
    }
    
    // Step 5: Check tenancy agreements
    console.log('\n5️⃣ Checking tenancy agreements...')
    
    const { data: activeTenancies, error: tenancyError } = await supabase
      .from('tenancy_agreements')
      .select('unit_id, tenant_id, status')
      .eq('status', 'ACTIVE')
    
    if (tenancyError) {
      console.log('❌ Error loading tenancies:', tenancyError.message)
    } else {
      console.log(`✅ Found ${activeTenancies?.length || 0} active tenancy agreements`)
      if (activeTenancies && activeTenancies.length > 0) {
        activeTenancies.forEach(tenancy => {
          console.log(`   - Unit ${tenancy.unit_id} occupied by tenant ${tenancy.tenant_id}`)
        })
      }
    }
    
    // Step 6: Calculate available units
    console.log('\n6️⃣ Calculating available units...')
    
    if (unitsDataCorrected) {
      const occupiedUnitIds = activeTenancies?.map(t => t.unit_id).filter(Boolean) || []
      
      const availableUnits = unitsDataCorrected.filter(unit =>
        !occupiedUnitIds.includes(unit.id)
      )
      
      console.log(`✅ Available units: ${availableUnits.length}`)
      if (availableUnits.length > 0) {
        const propertyMap = {}
        properties.forEach(prop => {
          propertyMap[prop.id] = prop.name
        })
        
        availableUnits.forEach(unit => {
          const propertyName = propertyMap[unit.property_id] || 'Unknown Property'
          console.log(`   - ${unit.unit_label} in ${propertyName} (KES ${unit.monthly_rent_kes}/month)`)
        })
      } else {
        console.log('   No available units found')
      }
    }
    
    // Step 7: Test if recent migration affected anything
    console.log('\n7️⃣ Checking if recent meter migration affected queries...')
    
    const { data: meterTypeCheck, error: meterError } = await supabase
      .from('units')
      .select('id, unit_label, meter_type')
      .in('property_id', propertyIds)
      .limit(5)
    
    if (meterError) {
      console.log('❌ Error checking meter types:', meterError.message)
    } else {
      console.log('✅ Meter type migration check:')
      if (meterTypeCheck && meterTypeCheck.length > 0) {
        meterTypeCheck.forEach(unit => {
          console.log(`   - ${unit.unit_label}: ${unit.meter_type}`)
        })
      }
    }
    
    // Summary
    console.log('\n📋 Summary and Recommendations:')
    
    if (!properties || properties.length === 0) {
      console.log('❌ ROOT CAUSE: No properties found for landlord')
      console.log('   - Check if landlord ID is correct')
      console.log('   - Verify properties exist in database')
    } else if (unitsError) {
      console.log('❌ ROOT CAUSE: Query error in units selection')
      console.log('   - The nested properties join is likely failing')
      console.log('   - Recommend using separate queries for units and properties')
    } else if (!unitsDataCorrected || unitsDataCorrected.length === 0) {
      console.log('❌ ROOT CAUSE: No units found for properties')
      console.log('   - Check if units exist for the properties')
      console.log('   - Verify units are marked as active')
    } else {
      console.log('✅ Query structure is working')
      console.log('   - Units are being found correctly')
      console.log('   - Available units calculation is working')
      console.log('   - Issue may be in frontend component rendering')
    }
    
  } catch (err) {
    console.error('❌ Test failed:', err.message)
  }
}

testUnitAvailabilityQuery()
