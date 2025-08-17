#!/usr/bin/env node

/**
 * Test script for property form validation
 * Tests Zod schema validation for property types and edge cases
 */

const { z } = require('zod')

// Import validation schemas (simulated since we can't import from TypeScript directly)
const PropertyTypeEnum = z.enum([
  'HOME',
  'HOSTEL', 
  'STALL',
  'RESIDENTIAL_LAND',
  'COMMERCIAL_LAND',
  'AGRICULTURAL_LAND',
  'MIXED_USE_LAND'
])

const propertySchema = z.object({
  name: z.string().min(1, 'Property name is required').max(120),
  physicalAddress: z.string().min(1, 'Physical address is required').max(250),
  propertyType: PropertyTypeEnum.default('HOME'),
  lat: z.number().gte(-90).lte(90).optional(),
  lng: z.number().gte(-180).lte(180).optional(),
  notes: z.string().max(1000).optional().or(z.literal('')),
}).refine((val) => {
  // If one coordinate provided, require the other
  if ((val.lat !== undefined && val.lng === undefined) || (val.lng !== undefined && val.lat === undefined)) return false
  return true
}, { message: 'Please provide both latitude and longitude, or leave both empty', path: ['lat'] })

// Helper functions
const isLandProperty = (type) => {
  return ['RESIDENTIAL_LAND', 'COMMERCIAL_LAND', 'AGRICULTURAL_LAND', 'MIXED_USE_LAND'].includes(type)
}

const getPropertyTypeLabel = (type) => {
  const labels = {
    'HOME': 'Homes',
    'HOSTEL': 'Hostels',
    'STALL': 'Stalls',
    'RESIDENTIAL_LAND': 'Residential Land',
    'COMMERCIAL_LAND': 'Commercial Land',
    'AGRICULTURAL_LAND': 'Agricultural Land',
    'MIXED_USE_LAND': 'Mixed-Use Land'
  }
  return labels[type] || type
}

async function testFormValidation() {
  console.log('🧪 Testing Property Form Validation...\n')

  const testResults = []

  try {
    // Test 1: Valid property data for each type
    console.log('1️⃣ Testing valid property data for each type...')
    
    const validTestCases = [
      {
        name: 'Sunset Apartments',
        physicalAddress: '123 Main Street, Nairobi',
        propertyType: 'HOME',
        lat: -1.2921,
        lng: 36.8219,
        notes: 'Beautiful apartment complex'
      },
      {
        name: 'University Hostel',
        physicalAddress: '456 Campus Road, Nairobi',
        propertyType: 'HOSTEL',
        notes: 'Student accommodation'
      },
      {
        name: 'Market Stall 15',
        physicalAddress: 'Gikomba Market, Nairobi',
        propertyType: 'STALL'
      },
      {
        name: 'Residential Plot 1234',
        physicalAddress: 'Karen, Nairobi',
        propertyType: 'RESIDENTIAL_LAND',
        lat: -1.3197,
        lng: 36.7076
      },
      {
        name: 'Commercial Land Westlands',
        physicalAddress: 'Westlands, Nairobi',
        propertyType: 'COMMERCIAL_LAND'
      },
      {
        name: 'Farm Land Kiambu',
        physicalAddress: 'Kiambu County',
        propertyType: 'AGRICULTURAL_LAND'
      },
      {
        name: 'Mixed Development Site',
        physicalAddress: 'Kilimani, Nairobi',
        propertyType: 'MIXED_USE_LAND'
      }
    ]

    for (const testCase of validTestCases) {
      try {
        const result = propertySchema.parse(testCase)
        console.log(`   ✅ ${getPropertyTypeLabel(testCase.propertyType)} validation passed`)
        testResults.push({
          test: 'valid_data',
          type: testCase.propertyType,
          success: true,
          data: testCase
        })
      } catch (error) {
        console.log(`   ❌ ${getPropertyTypeLabel(testCase.propertyType)} validation failed:`, error.errors)
        testResults.push({
          test: 'valid_data',
          type: testCase.propertyType,
          success: false,
          error: error.errors
        })
      }
    }

    // Test 2: Invalid property data (edge cases)
    console.log('\n2️⃣ Testing invalid property data (edge cases)...')
    
    const invalidTestCases = [
      {
        name: 'Missing Name Test',
        data: {
          name: '',
          physicalAddress: '123 Test Street',
          propertyType: 'HOME'
        },
        expectedError: 'Property name is required'
      },
      {
        name: 'Missing Address Test',
        data: {
          name: 'Test Property',
          physicalAddress: '',
          propertyType: 'HOME'
        },
        expectedError: 'Physical address is required'
      },
      {
        name: 'Invalid Property Type Test',
        data: {
          name: 'Test Property',
          physicalAddress: '123 Test Street',
          propertyType: 'INVALID_TYPE'
        },
        expectedError: 'Invalid enum value'
      },
      {
        name: 'Name Too Long Test',
        data: {
          name: 'A'.repeat(121),
          physicalAddress: '123 Test Street',
          propertyType: 'HOME'
        },
        expectedError: 'String must contain at most 120 character(s)'
      },
      {
        name: 'Address Too Long Test',
        data: {
          name: 'Test Property',
          physicalAddress: 'A'.repeat(251),
          propertyType: 'HOME'
        },
        expectedError: 'String must contain at most 250 character(s)'
      },
      {
        name: 'Invalid Latitude Test',
        data: {
          name: 'Test Property',
          physicalAddress: '123 Test Street',
          propertyType: 'HOME',
          lat: 91,
          lng: 36.8219
        },
        expectedError: 'Number must be less than or equal to 90'
      },
      {
        name: 'Invalid Longitude Test',
        data: {
          name: 'Test Property',
          physicalAddress: '123 Test Street',
          propertyType: 'HOME',
          lat: -1.2921,
          lng: 181
        },
        expectedError: 'Number must be less than or equal to 180'
      },
      {
        name: 'Incomplete Coordinates Test',
        data: {
          name: 'Test Property',
          physicalAddress: '123 Test Street',
          propertyType: 'HOME',
          lat: -1.2921
          // lng missing
        },
        expectedError: 'Please provide both latitude and longitude'
      },
      {
        name: 'Notes Too Long Test',
        data: {
          name: 'Test Property',
          physicalAddress: '123 Test Street',
          propertyType: 'HOME',
          notes: 'A'.repeat(1001)
        },
        expectedError: 'String must contain at most 1000 character(s)'
      }
    ]

    for (const testCase of invalidTestCases) {
      try {
        const result = propertySchema.parse(testCase.data)
        console.log(`   ❌ ${testCase.name} should have failed but passed`)
        testResults.push({
          test: 'invalid_data',
          name: testCase.name,
          success: false,
          error: 'Should have failed validation'
        })
      } catch (error) {
        const errorMessage = error.errors[0]?.message || error.message
        if (errorMessage.includes(testCase.expectedError) || testCase.expectedError.includes(errorMessage)) {
          console.log(`   ✅ ${testCase.name} correctly rejected: ${errorMessage}`)
          testResults.push({
            test: 'invalid_data',
            name: testCase.name,
            success: true,
            expectedError: testCase.expectedError,
            actualError: errorMessage
          })
        } else {
          console.log(`   ⚠️ ${testCase.name} rejected with unexpected error: ${errorMessage}`)
          testResults.push({
            test: 'invalid_data',
            name: testCase.name,
            success: false,
            expectedError: testCase.expectedError,
            actualError: errorMessage
          })
        }
      }
    }

    // Test 3: Property type helper functions
    console.log('\n3️⃣ Testing property type helper functions...')
    
    const helperTests = [
      {
        name: 'isLandProperty for rental types',
        test: () => {
          const rentalTypes = ['HOME', 'HOSTEL', 'STALL']
          return rentalTypes.every(type => !isLandProperty(type))
        }
      },
      {
        name: 'isLandProperty for land types',
        test: () => {
          const landTypes = ['RESIDENTIAL_LAND', 'COMMERCIAL_LAND', 'AGRICULTURAL_LAND', 'MIXED_USE_LAND']
          return landTypes.every(type => isLandProperty(type))
        }
      },
      {
        name: 'getPropertyTypeLabel returns correct labels',
        test: () => {
          const testCases = [
            { type: 'HOME', expected: 'Homes' },
            { type: 'RESIDENTIAL_LAND', expected: 'Residential Land' },
            { type: 'INVALID', expected: 'INVALID' }
          ]
          return testCases.every(tc => getPropertyTypeLabel(tc.type) === tc.expected)
        }
      }
    ]

    for (const helperTest of helperTests) {
      try {
        const result = helperTest.test()
        if (result) {
          console.log(`   ✅ ${helperTest.name} passed`)
          testResults.push({
            test: 'helper_functions',
            name: helperTest.name,
            success: true
          })
        } else {
          console.log(`   ❌ ${helperTest.name} failed`)
          testResults.push({
            test: 'helper_functions',
            name: helperTest.name,
            success: false
          })
        }
      } catch (error) {
        console.log(`   ❌ ${helperTest.name} threw error:`, error.message)
        testResults.push({
          test: 'helper_functions',
          name: helperTest.name,
          success: false,
          error: error.message
        })
      }
    }

    // Test 4: Default values
    console.log('\n4️⃣ Testing default values...')
    
    const defaultTest = {
      name: 'Test Property',
      physicalAddress: '123 Test Street'
      // propertyType omitted to test default
    }

    try {
      const result = propertySchema.parse(defaultTest)
      if (result.propertyType === 'HOME') {
        console.log(`   ✅ Default property type is HOME`)
        testResults.push({
          test: 'defaults',
          name: 'Default property type',
          success: true
        })
      } else {
        console.log(`   ❌ Default property type is ${result.propertyType}, expected HOME`)
        testResults.push({
          test: 'defaults',
          name: 'Default property type',
          success: false,
          error: `Got ${result.propertyType}, expected HOME`
        })
      }
    } catch (error) {
      console.log(`   ❌ Default value test failed:`, error.errors)
      testResults.push({
        test: 'defaults',
        name: 'Default property type',
        success: false,
        error: error.errors
      })
    }

    // Summary
    console.log('\n📊 Form Validation Test Results:')
    console.log('=================================')
    
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
        const name = result.name || result.type || 'Test'
        const note = result.error ? ` (${result.error})` : ''
        console.log(`${status} ${name}${note}`)
      })
    })

    console.log(`\n🎯 Overall Success Rate: ${successCount}/${totalTests} (${Math.round(successCount/totalTests*100)}%)`)

    if (successCount === totalTests) {
      console.log('\n🎉 All Form Validation Tests PASSED!')
      console.log('\n✅ Verified functionality:')
      console.log('   ✓ All property types validate correctly')
      console.log('   ✓ Required fields are enforced')
      console.log('   ✓ Field length limits are respected')
      console.log('   ✓ Coordinate validation works properly')
      console.log('   ✓ Invalid property types are rejected')
      console.log('   ✓ Helper functions work correctly')
      console.log('   ✓ Default values are applied')
      return true
    } else {
      console.log('\n⚠️ Some validation tests failed. Check the results above.')
      return false
    }

  } catch (error) {
    console.error('❌ Form validation test failed:', error.message)
    return false
  }
}

// Run the test
testFormValidation()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('❌ Test script error:', error)
    process.exit(1)
  })
