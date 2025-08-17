#!/usr/bin/env node

/**
 * Test script for API endpoints with property type parameters
 * Tests public units API and property type filtering
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testAPIEndpoints() {
  console.log('🧪 Testing API Endpoints with Property Type Parameters...\n')

  const testResults = []
  const createdProperties = []

  try {
    // Setup: Create test properties with different types
    console.log('🔧 Setting up test data...')
    
    const testProperties = [
      { name: 'Test Home Property', address: 'Home Test Address', type: 'HOME' },
      { name: 'Test Hostel Property', address: 'Hostel Test Address', type: 'HOSTEL' },
      { name: 'Test Stall Property', address: 'Stall Test Address', type: 'STALL' }
    ]

    for (const prop of testProperties) {
      const { data: propertyId, error } = await supabase.rpc('create_property_with_owner', {
        property_name: prop.name,
        property_address: prop.address,
        property_type: prop.type,
        owner_user_id: '00000000-0000-0000-0000-000000000000'
      })

      if (!error && propertyId) {
        createdProperties.push({ id: propertyId, type: prop.type, name: prop.name })
        console.log(`   ✅ Created ${prop.type} property: ${propertyId}`)
      } else {
        console.log(`   ⚠️ Failed to create ${prop.type} property:`, error?.message)
      }
    }

    // Test 1: Public Units API without property type filter
    console.log('\n1️⃣ Testing public units API without property type filter...')
    
    const { data: allUnits, error: allUnitsError } = await supabase
      .from('view_public_vacant_units')
      .select('*')
      .limit(10)

    if (allUnitsError) {
      console.log('   ❌ Failed to fetch all units:', allUnitsError.message)
      testResults.push({
        test: 'public_units_all',
        success: false,
        error: allUnitsError.message
      })
    } else {
      console.log(`   ✅ Fetched ${allUnits.length} units without filter`)
      testResults.push({
        test: 'public_units_all',
        success: true,
        count: allUnits.length
      })
    }

    // Test 2: Public Units API with property type filters
    console.log('\n2️⃣ Testing public units API with property type filters...')
    
    const propertyTypes = ['HOME', 'HOSTEL', 'STALL']
    
    for (const propertyType of propertyTypes) {
      const { data: filteredUnits, error: filterError } = await supabase
        .from('view_public_vacant_units')
        .select('*')
        .eq('property_type', propertyType)
        .limit(10)

      if (filterError) {
        console.log(`   ❌ Failed to filter ${propertyType} units:`, filterError.message)
        testResults.push({
          test: 'public_units_filtered',
          type: propertyType,
          success: false,
          error: filterError.message
        })
      } else {
        console.log(`   ✅ Fetched ${filteredUnits.length} ${propertyType} units`)
        testResults.push({
          test: 'public_units_filtered',
          type: propertyType,
          success: true,
          count: filteredUnits.length
        })

        // Verify all returned units have the correct property type
        const wrongTypeUnits = filteredUnits.filter(unit => unit.property_type !== propertyType)
        if (wrongTypeUnits.length > 0) {
          console.log(`   ⚠️ Found ${wrongTypeUnits.length} units with wrong property type`)
          testResults.push({
            test: 'property_type_consistency',
            type: propertyType,
            success: false,
            error: `${wrongTypeUnits.length} units with wrong type`
          })
        } else {
          console.log(`   ✅ All ${propertyType} units have correct property type`)
          testResults.push({
            test: 'property_type_consistency',
            type: propertyType,
            success: true
          })
        }
      }
    }

    // Test 3: Properties API with property type filtering
    console.log('\n3️⃣ Testing properties API with property type filtering...')
    
    for (const propertyType of propertyTypes) {
      const { data: properties, error: propError } = await supabase
        .from('properties')
        .select('id, name, property_type, physical_address')
        .eq('property_type', propertyType)
        .limit(10)

      if (propError) {
        console.log(`   ❌ Failed to filter ${propertyType} properties:`, propError.message)
        testResults.push({
          test: 'properties_filtered',
          type: propertyType,
          success: false,
          error: propError.message
        })
      } else {
        console.log(`   ✅ Fetched ${properties.length} ${propertyType} properties`)
        testResults.push({
          test: 'properties_filtered',
          type: propertyType,
          success: true,
          count: properties.length
        })

        // Verify all returned properties have the correct type
        const wrongTypeProps = properties.filter(prop => prop.property_type !== propertyType)
        if (wrongTypeProps.length > 0) {
          console.log(`   ❌ Found ${wrongTypeProps.length} properties with wrong type`)
          testResults.push({
            test: 'properties_type_consistency',
            type: propertyType,
            success: false,
            error: `${wrongTypeProps.length} properties with wrong type`
          })
        } else {
          console.log(`   ✅ All ${propertyType} properties have correct type`)
          testResults.push({
            test: 'properties_type_consistency',
            type: propertyType,
            success: true
          })
        }
      }
    }

    // Test 4: Invalid property type handling
    console.log('\n4️⃣ Testing invalid property type handling...')
    
    const { data: invalidUnits, error: invalidError } = await supabase
      .from('view_public_vacant_units')
      .select('*')
      .eq('property_type', 'INVALID_TYPE')
      .limit(10)

    if (invalidError) {
      console.log('   ✅ Invalid property type correctly rejected:', invalidError.message)
      testResults.push({
        test: 'invalid_property_type',
        success: true,
        note: 'Correctly rejected'
      })
    } else {
      console.log(`   ✅ Invalid property type returned ${invalidUnits.length} units (expected 0)`)
      testResults.push({
        test: 'invalid_property_type',
        success: invalidUnits.length === 0,
        count: invalidUnits.length
      })
    }

    // Test 5: Property type enum validation in database
    console.log('\n5️⃣ Testing property type enum validation in database...')
    
    try {
      const { error: enumError } = await supabase
        .from('properties')
        .insert({
          name: 'Invalid Type Test',
          physical_address: 'Test Address',
          property_type: 'INVALID_ENUM_VALUE',
          landlord_id: '00000000-0000-0000-0000-000000000000'
        })

      if (enumError) {
        console.log('   ✅ Database correctly rejected invalid enum value:', enumError.message)
        testResults.push({
          test: 'database_enum_validation',
          success: true,
          note: 'Correctly rejected invalid enum'
        })
      } else {
        console.log('   ❌ Database accepted invalid enum value (should be rejected)')
        testResults.push({
          test: 'database_enum_validation',
          success: false,
          error: 'Invalid enum value was accepted'
        })
      }
    } catch (error) {
      console.log('   ✅ Database enum validation working:', error.message)
      testResults.push({
        test: 'database_enum_validation',
        success: true,
        note: 'Enum validation working'
      })
    }

    // Test 6: Property creation with all valid types
    console.log('\n6️⃣ Testing property creation with all valid property types...')
    
    const allPropertyTypes = ['HOME', 'HOSTEL', 'STALL', 'RESIDENTIAL_LAND', 'COMMERCIAL_LAND', 'AGRICULTURAL_LAND', 'MIXED_USE_LAND']
    
    for (const propertyType of allPropertyTypes) {
      const testName = `API Test ${propertyType} ${Date.now()}`
      const { data: propertyId, error: createError } = await supabase.rpc('create_property_with_owner', {
        property_name: testName,
        property_address: `${propertyType} API Test Address`,
        property_type: propertyType,
        owner_user_id: '00000000-0000-0000-0000-000000000000'
      })

      if (createError) {
        console.log(`   ❌ Failed to create ${propertyType} property:`, createError.message)
        testResults.push({
          test: 'api_property_creation',
          type: propertyType,
          success: false,
          error: createError.message
        })
      } else {
        console.log(`   ✅ Created ${propertyType} property via API: ${propertyId}`)
        testResults.push({
          test: 'api_property_creation',
          type: propertyType,
          success: true,
          id: propertyId
        })
        createdProperties.push({ id: propertyId, type: propertyType, name: testName })
      }
    }

    // Summary
    console.log('\n📊 API Endpoint Test Results:')
    console.log('==============================')
    
    const successCount = testResults.filter(r => r.success).length
    const totalTests = testResults.length
    
    // Group results by test type
    const testGroups = testResults.reduce((acc, result) => {
      if (!acc[result.test]) acc[result.test] = []
      acc[result.test].push(result)
      return acc
    }, {})

    Object.entries(testGroups).forEach(([testType, results]) => {
      console.log(`\n${testType.toUpperCase().replace('_', ' ')} Tests:`)
      results.forEach(result => {
        const status = result.success ? '✅' : '❌'
        const name = result.type || result.note || 'Test'
        const detail = result.error || (result.count !== undefined ? `${result.count} items` : '')
        console.log(`${status} ${name}${detail ? ` (${detail})` : ''}`)
      })
    })

    console.log(`\n🎯 Overall Success Rate: ${successCount}/${totalTests} (${Math.round(successCount/totalTests*100)}%)`)

    if (successCount === totalTests) {
      console.log('\n🎉 All API Endpoint Tests PASSED!')
      console.log('\n✅ Verified functionality:')
      console.log('   ✓ Public units API works with and without property type filters')
      console.log('   ✓ Property type filtering returns correct results')
      console.log('   ✓ Property type consistency is maintained')
      console.log('   ✓ Invalid property types are handled correctly')
      console.log('   ✓ Database enum validation is working')
      console.log('   ✓ Property creation API works for all property types')
      return true
    } else {
      console.log('\n⚠️ Some API tests failed. Check the results above.')
      return false
    }

  } catch (error) {
    console.error('❌ API endpoint test failed:', error.message)
    return false
  } finally {
    // Cleanup: Delete test properties
    if (createdProperties.length > 0) {
      console.log(`\n🧹 Cleaning up ${createdProperties.length} test properties...`)
      const propertyIds = createdProperties.map(p => p.id)
      
      const { error: cleanupError } = await supabase
        .from('properties')
        .delete()
        .in('id', propertyIds)

      if (cleanupError) {
        console.log('⚠️ Cleanup warning:', cleanupError.message)
      } else {
        console.log('✅ Test properties cleaned up')
      }
    }
  }
}

// Run the test
testAPIEndpoints()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('❌ Test script error:', error)
    process.exit(1)
  })
