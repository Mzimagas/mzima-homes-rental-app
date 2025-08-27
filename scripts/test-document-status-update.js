#!/usr/bin/env node

/**
 * Script to test document status update functionality
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

async function testDocumentStatusUpdate() {
  try {
    console.log('🧪 Testing Document Status Update...\n')
    
    // 1. Find a test property
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id, name, property_source')
      .eq('property_source', 'DIRECT_ADDITION')
      .limit(1)
    
    if (propError) throw propError
    
    if (!properties || properties.length === 0) {
      console.log('❌ No direct addition properties found')
      return false
    }
    
    const testProperty = properties[0]
    console.log(`✅ Using test property: ${testProperty.name}`)
    
    // 2. Test inserting a new status record
    console.log('\n📝 Testing status record insertion...')
    
    const testDocType = 'title_copy'
    const { data: insertData, error: insertError } = await supabase
      .from('property_document_status')
      .insert({
        property_id: testProperty.id,
        pipeline: 'direct_addition',
        doc_type: testDocType,
        is_na: false,
        note: 'Test note for status update',
        status: 'missing'
      })
      .select()
    
    if (insertError) {
      console.error('❌ Insert error:', insertError)
      throw insertError
    }
    
    console.log('✅ Status record inserted successfully')
    
    // 3. Test updating the status record
    console.log('\n📝 Testing status record update...')
    
    const { data: updateData, error: updateError } = await supabase
      .from('property_document_status')
      .update({
        is_na: true,
        note: 'Updated test note - marked as N/A',
        status: 'complete',
        updated_at: new Date().toISOString()
      })
      .eq('property_id', testProperty.id)
      .eq('pipeline', 'direct_addition')
      .eq('doc_type', testDocType)
      .select()
    
    if (updateError) {
      console.error('❌ Update error:', updateError)
      throw updateError
    }
    
    console.log('✅ Status record updated successfully')
    
    // 4. Test upsert operation (the one used in the component)
    console.log('\n📝 Testing upsert operation...')
    
    const { data: upsertData, error: upsertError } = await supabase
      .from('property_document_status')
      .upsert({
        property_id: testProperty.id,
        pipeline: 'direct_addition',
        doc_type: 'property_images',
        is_na: false,
        note: 'Test upsert operation',
        status: 'missing'
      })
      .select()
    
    if (upsertError) {
      console.error('❌ Upsert error:', upsertError)
      throw upsertError
    }
    
    console.log('✅ Upsert operation successful')
    
    // 5. Test the exact operation from the component
    console.log('\n📝 Testing component-style operation...')
    
    // First check if record exists
    const { data: existingStatus, error: selectError } = await supabase
      .from('property_document_status')
      .select('*')
      .eq('property_id', testProperty.id)
      .eq('pipeline', 'direct_addition')
      .eq('doc_type', 'search_certificate')
      .single()
    
    if (selectError && selectError.code !== 'PGRST116') {
      console.error('❌ Select error:', selectError)
      throw selectError
    }
    
    let result
    if (existingStatus) {
      console.log('   Updating existing record...')
      result = await supabase
        .from('property_document_status')
        .update({
          is_na: true,
          note: 'Component-style update test',
          status: 'complete',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingStatus.id)
    } else {
      console.log('   Inserting new record...')
      result = await supabase
        .from('property_document_status')
        .insert({
          property_id: testProperty.id,
          pipeline: 'direct_addition',
          doc_type: 'search_certificate',
          is_na: true,
          note: 'Component-style insert test',
          status: 'complete'
        })
    }
    
    if (result.error) {
      console.error('❌ Component-style operation error:', result.error)
      throw result.error
    }
    
    console.log('✅ Component-style operation successful')
    
    // 6. Cleanup test data
    console.log('\n🧹 Cleaning up test data...')
    
    const { error: cleanupError } = await supabase
      .from('property_document_status')
      .delete()
      .eq('property_id', testProperty.id)
      .eq('pipeline', 'direct_addition')
      .in('doc_type', ['title_copy', 'property_images', 'search_certificate'])
    
    if (cleanupError) {
      console.log('⚠️  Could not clean up test data:', cleanupError.message)
    } else {
      console.log('✅ Test data cleaned up')
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}

async function main() {
  console.log('🚀 Document Status Update Test\n')
  
  const success = await testDocumentStatusUpdate()
  
  if (success) {
    console.log('\n🎉 All tests passed! Document status update is working.')
    console.log('\n📋 The error in the UI might be due to:')
    console.log('   1. Network connectivity issues')
    console.log('   2. Authentication problems')
    console.log('   3. RLS policy restrictions')
    console.log('   4. Client-side data formatting issues')
    console.log('\n🔍 Check the browser console for more detailed error information.')
  } else {
    console.log('\n❌ Tests failed. Please check the configuration.')
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}
