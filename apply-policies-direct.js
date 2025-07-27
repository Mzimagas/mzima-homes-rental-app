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

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

// Create Supabase admin client
const supabaseAdmin = createClient(supabaseUrl, serviceKey)

async function applyPoliciesDirect() {
  console.log('🔧 Applying RLS Policies Directly...\n')

  try {
    // Test if we can execute SQL directly
    console.log('1. Testing SQL execution...')
    const { data: testResult, error: testError } = await supabaseAdmin
      .rpc('exec', { sql: 'SELECT 1 as test;' })
    
    if (testError) {
      console.log('⚠️  Direct SQL execution not available, using alternative approach...')
      
      // Alternative: Use the REST API to check and create policies
      console.log('\n2. Checking current RLS status...')
      
      // Check if properties table has RLS enabled
      const { data: propertiesInfo, error: propertiesError } = await supabaseAdmin
        .from('information_schema.tables')
        .select('table_name, row_security')
        .eq('table_name', 'properties')
        .eq('table_schema', 'public')
        .single()
      
      if (propertiesError) {
        console.log('⚠️  Could not check table info:', propertiesError.message)
      } else {
        console.log(`✅ Properties table RLS status: ${propertiesInfo?.row_security || 'Unknown'}`)
      }

      // Test property creation with current user
      console.log('\n3. Testing property creation permissions...')
      
      // First, sign in as test user
      const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
        email: 'test@mzimahomes.com',
        password: 'TestPassword123!'
      })
      
      if (authError) {
        console.error('❌ Could not sign in as test user:', authError.message)
        return
      }
      
      console.log(`✅ Signed in as: ${authData.user.email}`)
      
      // Get landlord IDs for this user
      const { data: landlordIds, error: landlordError } = await supabaseAdmin.rpc('get_user_landlord_ids', {
        user_uuid: authData.user.id
      })
      
      if (landlordError) {
        console.error('❌ Could not get landlord IDs:', landlordError.message)
        return
      }
      
      console.log(`✅ User landlord IDs: ${JSON.stringify(landlordIds)}`)
      
      if (!landlordIds || landlordIds.length === 0) {
        console.error('❌ User has no landlord access')
        return
      }
      
      // Try to create a test property
      const testPropertyName = `Test Property - ${Date.now()}`
      const { data: testProperty, error: propertyError } = await supabaseAdmin
        .from('properties')
        .insert({
          landlord_id: landlordIds[0],
          name: testPropertyName,
          physical_address: 'Test Address, Nairobi'
        })
        .select()
        .single()
      
      if (propertyError) {
        console.error('❌ Property creation failed:', propertyError.message)
        console.log('\n🔧 This indicates RLS policies need to be applied manually.')
        console.log('\n📋 Please apply the following SQL in Supabase Dashboard > SQL Editor:')
        console.log('\n```sql')
        console.log('-- Enable RLS on properties table')
        console.log('ALTER TABLE properties ENABLE ROW LEVEL SECURITY;')
        console.log('')
        console.log('-- Create property policies')
        console.log('CREATE POLICY "Users can view properties for their landlords" ON properties')
        console.log('  FOR SELECT USING (landlord_id = ANY(get_user_landlord_ids(auth.uid())));')
        console.log('')
        console.log('CREATE POLICY "Users can create properties for their landlords" ON properties')
        console.log('  FOR INSERT WITH CHECK (landlord_id = ANY(get_user_landlord_ids(auth.uid())));')
        console.log('')
        console.log('CREATE POLICY "Users can update properties for their landlords" ON properties')
        console.log('  FOR UPDATE USING (landlord_id = ANY(get_user_landlord_ids(auth.uid())));')
        console.log('')
        console.log('CREATE POLICY "Users can delete properties for their landlords" ON properties')
        console.log('  FOR DELETE USING (landlord_id = ANY(get_user_landlord_ids(auth.uid())));')
        console.log('')
        console.log('-- Enable RLS on units table')
        console.log('ALTER TABLE units ENABLE ROW LEVEL SECURITY;')
        console.log('')
        console.log('-- Create unit policies')
        console.log('CREATE POLICY "Users can view units for their properties" ON units')
        console.log('  FOR SELECT USING (')
        console.log('    property_id IN (')
        console.log('      SELECT id FROM properties WHERE landlord_id = ANY(get_user_landlord_ids(auth.uid()))')
        console.log('    )')
        console.log('  );')
        console.log('')
        console.log('CREATE POLICY "Users can create units for their properties" ON units')
        console.log('  FOR INSERT WITH CHECK (')
        console.log('    property_id IN (')
        console.log('      SELECT id FROM properties WHERE landlord_id = ANY(get_user_landlord_ids(auth.uid()))')
        console.log('    )')
        console.log('  );')
        console.log('')
        console.log('CREATE POLICY "Users can update units for their properties" ON units')
        console.log('  FOR UPDATE USING (')
        console.log('    property_id IN (')
        console.log('      SELECT id FROM properties WHERE landlord_id = ANY(get_user_landlord_ids(auth.uid()))')
        console.log('    )')
        console.log('  );')
        console.log('')
        console.log('CREATE POLICY "Users can delete units for their properties" ON units')
        console.log('  FOR DELETE USING (')
        console.log('    property_id IN (')
        console.log('      SELECT id FROM properties WHERE landlord_id = ANY(get_user_landlord_ids(auth.uid()))')
        console.log('    )')
        console.log('  );')
        console.log('```')
        
      } else {
        console.log(`✅ Property creation successful: ${testProperty.name} (ID: ${testProperty.id})`)
        
        // Clean up test property
        await supabaseAdmin.from('properties').delete().eq('id', testProperty.id)
        console.log('🧹 Cleaned up test property')
        
        console.log('\n🎉 Property permissions are working correctly!')
      }
      
      // Sign out
      await supabaseAdmin.auth.signOut()
      
    } else {
      console.log('✅ Direct SQL execution available')
      // Continue with direct SQL execution approach
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

applyPoliciesDirect()
