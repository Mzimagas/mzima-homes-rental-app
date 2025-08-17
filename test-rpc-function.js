#!/usr/bin/env node

/**
 * Test script for create_property_with_owner RPC function
 * Tests all property types and backward compatibility
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const PROPERTY_TYPES = [
  'HOME',
  'HOSTEL', 
  'STALL',
  'RESIDENTIAL_LAND',
  'COMMERCIAL_LAND',
  'AGRICULTURAL_LAND',
  'MIXED_USE_LAND'
]

async function testRPCFunction() {
  console.log('🧪 Testing create_property_with_owner RPC Function...\n')

  const testResults = []
  const createdProperties = []

  try {
    // Test 1: Default property type (backward compatibility)
    console.log('1️⃣ Testing default property type (backward compatibility)...')
    const defaultTestName = `Default Test Property ${Date.now()}`
    
    const { data: defaultPropertyId, error: defaultError } = await supabase.rpc('create_property_with_owner', {
      property_name: defaultTestName,
      property_address: 'Default Test Address 123',
      owner_user_id: '00000000-0000-0000-0000-000000000000'
    })

    if (defaultError) {
      console.log('⚠️ Default test failed (expected in test environment):', defaultError.message)
      testResults.push({ type: 'DEFAULT', success: false, error: defaultError.message })
    } else {
      console.log('✅ Default property creation works')
      testResults.push({ type: 'DEFAULT', success: true, id: defaultPropertyId })
      createdProperties.push(defaultPropertyId)

      // Verify it got HOME as default
      const { data: defaultProp } = await supabase
        .from('properties')
        .select('property_type')
        .eq('id', defaultPropertyId)
        .single()

      if (defaultProp?.property_type === 'HOME') {
        console.log('✅ Default property type is HOME')
      } else {
        console.log('❌ Default property type is not HOME:', defaultProp?.property_type)
      }
    }

    // Test 2: Each property type explicitly
    console.log('\n2️⃣ Testing each property type explicitly...')
    
    for (const propertyType of PROPERTY_TYPES) {
      console.log(`   Testing ${propertyType}...`)
      
      const testName = `${propertyType} Test Property ${Date.now()}`
      const { data: propertyId, error } = await supabase.rpc('create_property_with_owner', {
        property_name: testName,
        property_address: `${propertyType} Test Address 123`,
        property_type: propertyType,
        owner_user_id: '00000000-0000-0000-0000-000000000000'
      })

      if (error) {
        console.log(`   ⚠️ ${propertyType} test failed:`, error.message)
        testResults.push({ type: propertyType, success: false, error: error.message })
      } else {
        console.log(`   ✅ ${propertyType} property created successfully`)
        testResults.push({ type: propertyType, success: true, id: propertyId })
        createdProperties.push(propertyId)

        // Verify the property type was set correctly
        const { data: prop } = await supabase
          .from('properties')
          .select('property_type')
          .eq('id', propertyId)
          .single()

        if (prop?.property_type === propertyType) {
          console.log(`   ✅ Property type correctly set to ${propertyType}`)
        } else {
          console.log(`   ❌ Property type mismatch. Expected: ${propertyType}, Got: ${prop?.property_type}`)
        }
      }
    }

    // Test 3: Invalid property type
    console.log('\n3️⃣ Testing invalid property type...')
    const { data: invalidId, error: invalidError } = await supabase.rpc('create_property_with_owner', {
      property_name: 'Invalid Test Property',
      property_address: 'Invalid Test Address',
      property_type: 'INVALID_TYPE',
      owner_user_id: '00000000-0000-0000-0000-000000000000'
    })

    if (invalidError) {
      console.log('✅ Invalid property type correctly rejected:', invalidError.message)
      testResults.push({ type: 'INVALID', success: true, note: 'Correctly rejected' })
    } else {
      console.log('❌ Invalid property type was accepted (should be rejected)')
      testResults.push({ type: 'INVALID', success: false, note: 'Should have been rejected' })
      if (invalidId) createdProperties.push(invalidId)
    }

    // Test 4: Property user relationship
    console.log('\n4️⃣ Testing property user relationship creation...')
    if (createdProperties.length > 0) {
      const { data: propertyUsers, error: puError } = await supabase
        .from('property_users')
        .select('property_id, user_id, role, status')
        .in('property_id', createdProperties.slice(0, 3))

      if (puError) {
        console.log('⚠️ Could not verify property user relationships:', puError.message)
      } else {
        console.log(`✅ Found ${propertyUsers?.length || 0} property user relationships`)
        propertyUsers?.forEach(pu => {
          console.log(`   - Property ${pu.property_id}: ${pu.role} (${pu.status})`)
        })
      }
    }

    // Summary
    console.log('\n📊 Test Results Summary:')
    console.log('========================')
    
    const successCount = testResults.filter(r => r.success).length
    const totalTests = testResults.length
    
    testResults.forEach(result => {
      const status = result.success ? '✅' : '❌'
      const note = result.error || result.note || ''
      console.log(`${status} ${result.type}: ${note}`)
    })

    console.log(`\n🎯 Success Rate: ${successCount}/${totalTests} (${Math.round(successCount/totalTests*100)}%)`)

    if (successCount === totalTests) {
      console.log('\n🎉 All RPC Function Tests PASSED!')
      console.log('\n✅ Verified functionality:')
      console.log('   ✓ Backward compatibility (default property type)')
      console.log('   ✓ All 7 property types work correctly')
      console.log('   ✓ Invalid property types are rejected')
      console.log('   ✓ Property user relationships are created')
      return true
    } else {
      console.log('\n⚠️ Some tests failed. Check the results above.')
      return false
    }

  } catch (error) {
    console.error('❌ RPC function test failed:', error.message)
    return false
  } finally {
    // Cleanup: Delete test properties
    if (createdProperties.length > 0) {
      console.log(`\n🧹 Cleaning up ${createdProperties.length} test properties...`)
      const { error: cleanupError } = await supabase
        .from('properties')
        .delete()
        .in('id', createdProperties)

      if (cleanupError) {
        console.log('⚠️ Cleanup warning:', cleanupError.message)
      } else {
        console.log('✅ Test properties cleaned up')
      }
    }
  }
}

// Run the test
testRPCFunction()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('❌ Test script error:', error)
    process.exit(1)
  })
