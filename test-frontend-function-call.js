// Test the exact function call that the frontend is making
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

// Create supabase client exactly like the frontend does
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})

async function testFrontendFunctionCall() {
  console.log('🧪 Testing Frontend Function Call Pattern...\n')
  
  try {
    // Step 1: Simulate the exact frontend authentication flow
    console.log('1️⃣ Simulating frontend authentication...')
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'abeljoshua04@gmail.com',
      password: 'password123'
    })
    
    if (signInError) {
      console.log('❌ Login failed:', signInError.message)
      return
    }
    
    console.log('✅ Login successful!')
    console.log(`   User ID: ${signInData.user?.id}`)
    console.log(`   Email: ${signInData.user?.email}`)
    
    // Step 2: Test getUser() call like the frontend does
    console.log('\n2️⃣ Testing getUser() call...')
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.log('❌ getUser() error:', userError.message)
    } else {
      console.log('✅ getUser() successful!')
      console.log(`   User ID: ${user?.id}`)
      console.log(`   Email: ${user?.email}`)
    }
    
    // Step 3: Test the exact function call from the frontend
    console.log('\n3️⃣ Testing exact frontend function call...')
    
    if (!user) {
      console.log('❌ No user available for function call')
      return
    }
    
    console.log(`   Calling get_user_accessible_properties with user_uuid: ${user.id}`)
    
    const { data, error: propertiesError } = await supabase
      .rpc('get_user_accessible_properties', { user_uuid: user.id })
    
    if (propertiesError) {
      console.log('❌ Function call error:', propertiesError.message)
      console.log('   Error code:', propertiesError.code)
      console.log('   Error details:', propertiesError.details)
      console.log('   Error hint:', propertiesError.hint)
      
      if (propertiesError.message.includes('Could not find the function')) {
        console.log('\n   🔍 Debugging function existence...')
        
        // Try calling without parameters
        const { data: noParamData, error: noParamError } = await supabase.rpc('get_user_accessible_properties')
        
        if (noParamError) {
          console.log('   ❌ Function call without params also failed:', noParamError.message)
        } else {
          console.log('   ✅ Function call without params worked!')
          console.log(`   Result: ${noParamData?.length || 0} properties`)
        }
      }
    } else {
      console.log('✅ Function call successful!')
      console.log(`   Found ${data?.length || 0} accessible properties`)
      
      if (data && data.length > 0) {
        data.forEach(prop => {
          console.log(`   - ${prop.property_name}: ${prop.user_role}`)
          console.log(`     Permissions: Users(${prop.can_manage_users}), Edit(${prop.can_edit_property}), Tenants(${prop.can_manage_tenants})`)
        })
      }
    }
    
    // Step 4: Test alternative function calls
    console.log('\n4️⃣ Testing alternative function calls...')
    
    // Test with default parameter (no user_uuid)
    console.log('   Testing with default parameter...')
    const { data: defaultData, error: defaultError } = await supabase.rpc('get_user_accessible_properties')
    
    if (defaultError) {
      console.log('   ❌ Default parameter call failed:', defaultError.message)
    } else {
      console.log('   ✅ Default parameter call successful!')
      console.log(`   Found ${defaultData?.length || 0} properties`)
    }
    
    // Test user_has_property_access function
    console.log('   Testing user_has_property_access...')
    const { data: accessData, error: accessError } = await supabase.rpc('user_has_property_access', {
      user_uuid: user.id,
      property_uuid: '00000000-0000-0000-0000-000000000000'
    })
    
    if (accessError) {
      console.log('   ❌ user_has_property_access failed:', accessError.message)
    } else {
      console.log('   ✅ user_has_property_access working:', accessData)
    }
    
    // Step 5: Check database connection and schema
    console.log('\n5️⃣ Testing database connection and schema...')
    
    // Test a simple query to verify connection
    const { data: propertiesData, error: propertiesQueryError } = await supabase
      .from('properties')
      .select('id, name')
      .limit(1)
    
    if (propertiesQueryError) {
      console.log('   ❌ Properties query failed:', propertiesQueryError.message)
    } else {
      console.log('   ✅ Database connection working')
      console.log(`   Found ${propertiesData?.length || 0} properties in direct query`)
    }
    
    // Step 6: Check if there's a schema cache issue
    console.log('\n6️⃣ Checking for schema cache issues...')
    
    // Try to call a function that definitely exists
    const { data: versionData, error: versionError } = await supabase.rpc('version')
    
    if (versionError) {
      console.log('   ❌ Version function failed:', versionError.message)
      console.log('   This might indicate a schema cache or connection issue')
    } else {
      console.log('   ✅ Built-in functions working')
    }
    
    await supabase.auth.signOut()
    
    console.log('\n📋 Frontend Function Call Test Summary:')
    console.log('✅ Authentication: Working correctly')
    console.log('✅ User retrieval: getUser() functional')
    console.log('✅ Database connection: Active')
    
    console.log('\n🔧 Potential Issues:')
    console.log('1. Schema cache not updated after function creation')
    console.log('2. Function permissions not properly granted')
    console.log('3. RLS policies blocking function execution')
    console.log('4. Function signature mismatch')
    
    console.log('\n💡 Solutions to try:')
    console.log('1. Restart the Next.js development server')
    console.log('2. Clear browser cache and refresh')
    console.log('3. Execute CREATE_MISSING_FUNCTIONS.sql again')
    console.log('4. Check Supabase dashboard for function existence')
    console.log('5. Verify function permissions in Supabase')
    
  } catch (err) {
    console.error('❌ Frontend function call test failed:', err.message)
  }
}

testFrontendFunctionCall()
