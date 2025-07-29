// Test if the get_user_accessible_properties function exists and works
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

// Read environment variables from .env.local
let supabaseUrl, supabaseAnonKey
try {
  const envContent = fs.readFileSync('.env.local', 'utf8')
  const lines = envContent.split('\n')
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (trimmedLine.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = trimmedLine.split('=')[1]
    }
    if (trimmedLine.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = trimmedLine.split('=')[1]
    }
  }
} catch (err) {
  console.error('❌ Could not read .env.local file:', err.message)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testMissingFunction() {
  console.log('🔍 Testing get_user_accessible_properties Function...\n')
  
  try {
    // Test 1: Check if function exists by calling it
    console.log('1️⃣ Testing function existence...')
    
    const { data: testResult, error: testError } = await supabase.rpc('get_user_accessible_properties', {
      user_uuid: '00000000-0000-0000-0000-000000000000'
    })
    
    if (testError) {
      console.log('❌ Function test error:', testError.message)
      
      if (testError.message.includes('Could not find the function')) {
        console.log('   Function does not exist in database')
        console.log('   Need to execute CREATE_MISSING_FUNCTIONS.sql')
      } else if (testError.message.includes('infinite recursion')) {
        console.log('   Function exists but has RLS recursion issues')
        console.log('   Need to execute FIX_RLS_RECURSION.sql')
      } else {
        console.log('   Function exists but has other issues')
      }
    } else {
      console.log('✅ Function exists and working!')
      console.log(`   Returns ${testResult?.length || 0} properties for test user`)
    }
    
    // Test 2: Login as Abel and test function
    console.log('\n2️⃣ Testing with Abel\'s authentication...')
    
    const { data: abelSignIn, error: abelSignInError } = await supabase.auth.signInWithPassword({
      email: 'abeljoshua04@gmail.com',
      password: 'password123'
    })
    
    if (abelSignInError) {
      console.log('❌ Abel login failed:', abelSignInError.message)
    } else {
      console.log('✅ Abel login successful!')
      
      // Test function with Abel's authentication
      const { data: abelProperties, error: abelPropsError } = await supabase.rpc('get_user_accessible_properties')
      
      if (abelPropsError) {
        console.log('❌ Abel function call error:', abelPropsError.message)
        
        if (abelPropsError.message.includes('Could not find the function')) {
          console.log('   CONFIRMED: Function missing from database')
        } else if (abelPropsError.message.includes('infinite recursion')) {
          console.log('   CONFIRMED: RLS recursion issue')
        }
      } else {
        console.log('✅ Function working for Abel!')
        console.log(`   Abel has access to ${abelProperties?.length || 0} properties`)
        
        if (abelProperties && abelProperties.length > 0) {
          abelProperties.forEach(prop => {
            console.log(`   - ${prop.property_name}: ${prop.user_role}`)
          })
        }
      }
      
      await supabase.auth.signOut()
    }
    
    // Test 3: Check other related functions
    console.log('\n3️⃣ Testing other multi-user functions...')
    
    const functionsToTest = [
      'user_has_property_access',
      'get_user_property_role', 
      'user_has_permission'
    ]
    
    for (const funcName of functionsToTest) {
      try {
        console.log(`   Testing ${funcName}...`)
        
        let testResult, testError
        const testUUID = '00000000-0000-0000-0000-000000000000'
        
        if (funcName === 'user_has_property_access' || funcName === 'get_user_property_role') {
          ({ data: testResult, error: testError } = await supabase.rpc(funcName, {
            user_uuid: testUUID,
            property_uuid: testUUID
          }))
        } else if (funcName === 'user_has_permission') {
          ({ data: testResult, error: testError } = await supabase.rpc(funcName, {
            user_uuid: testUUID,
            property_uuid: testUUID,
            permission_name: 'view_property'
          }))
        }
        
        if (testError) {
          if (testError.message.includes('Could not find the function')) {
            console.log(`   ❌ ${funcName}: Missing`)
          } else {
            console.log(`   ⚠️ ${funcName}: Error - ${testError.message}`)
          }
        } else {
          console.log(`   ✅ ${funcName}: Working`)
        }
      } catch (err) {
        console.log(`   ❌ ${funcName}: Exception - ${err.message}`)
      }
    }
    
    console.log('\n📋 Function Test Summary:')
    console.log('The frontend error indicates get_user_accessible_properties is missing')
    console.log('This function is essential for the usePropertyAccess hook')
    console.log('')
    console.log('🔧 Solution:')
    console.log('1. Execute CREATE_MISSING_FUNCTIONS.sql in Supabase SQL Editor')
    console.log('2. This will create all missing functions and setup Abel\'s access')
    console.log('3. Test the frontend again after applying the SQL')
    console.log('')
    console.log('📁 Files to execute in order:')
    console.log('   1. CREATE_MISSING_FUNCTIONS.sql (creates functions)')
    console.log('   2. FIX_RLS_RECURSION.sql (fixes policy recursion)')
    console.log('')
    console.log('🎯 Expected result:')
    console.log('   - Abel\'s dashboard will show real property data')
    console.log('   - No more "Could not find the function" errors')
    console.log('   - Property creation will work without access denied errors')
    
  } catch (err) {
    console.error('❌ Function test failed:', err.message)
  }
}

testMissingFunction()
