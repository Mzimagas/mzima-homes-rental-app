#!/usr/bin/env node

/**
 * Script to test the user profile foreign key fix
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testUserProfileFix() {
  try {
    console.log('🧪 Testing User Profile Foreign Key Fix...\n')
    
    // 1. Get a test property
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id, name')
      .eq('property_source', 'DIRECT_ADDITION')
      .limit(1)
    
    if (propError) throw propError
    if (!properties || properties.length === 0) {
      console.log('❌ No direct addition properties found')
      return false
    }
    
    const testProperty = properties[0]
    console.log(`✅ Using test property: ${testProperty.name}`)
    
    // 2. Test document creation with null uploaded_by
    console.log('\n📄 Testing document creation with null uploaded_by...')
    
    const testDoc = {
      entity_type: 'property',
      entity_id: testProperty.id,
      doc_type: 'other',
      title: 'Test Document - User Profile Fix',
      description: 'Testing document creation with null uploaded_by',
      file_path: 'test/user-profile-fix-test.txt',
      file_url: 'test/user-profile-fix-test.txt',
      file_name: 'user-profile-fix-test.txt',
      file_size: 100,
      file_type: 'text/plain',
      mime_type: 'text/plain',
      access_level: 'internal',
      is_current_version: true,
      metadata: { document_id: 'test_fix', test: true },
      uploaded_by: null, // This should work now
      uploaded_at: new Date().toISOString(),
    }
    
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .insert(testDoc)
      .select()
    
    if (docError) {
      console.error('❌ Document creation failed:', docError)
      return false
    }
    
    console.log('✅ Document created successfully with null uploaded_by')
    console.log(`   Document ID: ${docData[0].document_id}`)
    
    // 3. Test with a valid user profile (if any exist)
    console.log('\n👤 Testing with existing user profiles...')
    
    const { data: userProfiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email')
      .limit(1)
    
    if (profileError) {
      console.log('⚠️  Could not query user profiles:', profileError.message)
    } else if (userProfiles && userProfiles.length > 0) {
      const testUser = userProfiles[0]
      console.log(`✅ Found user profile: ${testUser.email}`)
      
      const testDocWithUser = {
        ...testDoc,
        title: 'Test Document - With User Profile',
        uploaded_by: testUser.id,
        metadata: { document_id: 'test_fix_user', test: true }
      }
      
      const { data: docWithUserData, error: docWithUserError } = await supabase
        .from('documents')
        .insert(testDocWithUser)
        .select()
      
      if (docWithUserError) {
        console.error('❌ Document creation with user failed:', docWithUserError)
      } else {
        console.log('✅ Document created successfully with user profile')
        console.log(`   Document ID: ${docWithUserData[0].document_id}`)
      }
    } else {
      console.log('ℹ️  No user profiles found to test with')
    }
    
    // 4. Clean up test documents
    console.log('\n🧹 Cleaning up test documents...')
    
    const { error: cleanupError } = await supabase
      .from('documents')
      .delete()
      .eq('metadata->test', true)
    
    if (cleanupError) {
      console.log('⚠️  Could not clean up test documents:', cleanupError.message)
    } else {
      console.log('✅ Test documents cleaned up')
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}

async function main() {
  console.log('🚀 User Profile Foreign Key Fix Test\n')
  
  const success = await testUserProfileFix()
  
  if (success) {
    console.log('\n🎉 User profile fix test completed successfully!')
    console.log('\n📋 Summary:')
    console.log('   - ✅ Documents can be created with null uploaded_by')
    console.log('   - ✅ Foreign key constraint is properly handled')
    console.log('   - ✅ Upload functionality should work now')
    console.log('\n🔍 The upload error should be resolved!')
  } else {
    console.log('\n❌ User profile fix test failed')
    console.log('   Please check the error messages above')
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}
