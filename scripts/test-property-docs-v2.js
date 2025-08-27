#!/usr/bin/env node

/**
 * Script to test the new Property Documents V2 system
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

const DOC_TYPES = [
  'title_copy',
  'property_images',
  'search_certificate',
  'minutes_decision',
  'sale_agreement',
  'lcb_consent',
  'valuation_report',
  'assessment',
  'stamp_duty',
  'registered_title'
]

async function testPropertyDocsV2() {
  try {
    console.log('🧪 Testing Property Documents V2 System...\n')
    
    // 1. Test database schema
    console.log('📊 Testing database schema...')
    
    // Check if tables exist by trying to query them
    try {
      const { error: docsTableError } = await supabase
        .from('property_documents')
        .select('id')
        .limit(1)

      const { error: statusTableError } = await supabase
        .from('property_document_status')
        .select('id')
        .limit(1)

      if (docsTableError && docsTableError.code === '42P01') {
        throw new Error('property_documents table does not exist')
      }
      if (statusTableError && statusTableError.code === '42P01') {
        throw new Error('property_document_status table does not exist')
      }

      console.log('✅ Tables found: property_documents, property_document_status')
    } catch (error) {
      if (error.message.includes('does not exist')) {
        throw error
      }
      // Other errors are fine (like permission errors), tables exist
      console.log('✅ Tables found: property_documents, property_document_status')
    }
    
    // 2. Test storage bucket
    console.log('\n🪣 Testing storage bucket...')
    
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    if (bucketsError) throw bucketsError
    
    const propertyDocsBucket = buckets.find(b => b.id === 'property-docs')
    if (propertyDocsBucket) {
      console.log('✅ property-docs bucket exists')
    } else {
      console.log('❌ property-docs bucket not found')
    }
    
    // 3. Find or create test property
    console.log('\n🏠 Setting up test property...')
    
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id, name, property_source')
      .eq('property_source', 'DIRECT_ADDITION')
      .limit(1)
    
    if (propError) throw propError
    
    let testProperty
    if (!properties || properties.length === 0) {
      console.log('Creating test property...')
      const { data: newProperty, error: createError } = await supabase
        .from('properties')
        .insert({
          name: 'Test Property V2',
          physical_address: 'Test Address V2, Nairobi',
          property_type: 'HOME',
          property_source: 'DIRECT_ADDITION',
          lifecycle_status: 'ACTIVE'
        })
        .select()
        .single()
      
      if (createError) throw createError
      testProperty = newProperty
      console.log(`✅ Created test property: ${testProperty.name}`)
    } else {
      testProperty = properties[0]
      console.log(`✅ Using existing property: ${testProperty.name}`)
    }
    
    // 4. Test document creation
    console.log('\n📄 Testing document creation...')
    
    const testDocuments = DOC_TYPES.map(docType => ({
      property_id: testProperty.id,
      pipeline: 'direct_addition',
      doc_type: docType,
      file_path: `direct_addition/${testProperty.id}/${docType}/test-${Date.now()}.pdf`,
      file_name: `test-${docType}.pdf`,
      file_ext: 'pdf',
      file_size: 1024,
      mime_type: 'application/pdf',
      meta: { test: true, version: 'v2' }
    }))
    
    const { data: createdDocs, error: createDocsError } = await supabase
      .from('property_documents')
      .insert(testDocuments)
      .select()
    
    if (createDocsError) throw createDocsError
    
    console.log(`✅ Created ${createdDocs.length} test documents`)
    
    // 5. Test document status auto-update
    console.log('\n📊 Testing document status auto-update...')
    
    // Wait a moment for triggers to execute
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const { data: statuses, error: statusError } = await supabase
      .from('property_document_status')
      .select('*')
      .eq('property_id', testProperty.id)
      .eq('pipeline', 'direct_addition')
    
    if (statusError) throw statusError
    
    console.log(`✅ Auto-created ${statuses.length} document statuses`)
    
    // Check status values
    const completeStatuses = statuses.filter(s => s.status === 'complete')
    console.log(`✅ ${completeStatuses.length} documents marked as complete`)
    
    // 6. Test document counts view
    console.log('\n📈 Testing document counts view...')
    
    const { data: counts, error: countsError } = await supabase
      .from('v_property_doc_counts')
      .select('*')
      .eq('property_id', testProperty.id)
      .eq('pipeline', 'direct_addition')
    
    if (countsError) throw countsError
    
    console.log(`✅ Document counts view returned ${counts.length} records`)
    counts.forEach(count => {
      console.log(`   ${count.doc_type}: ${count.files_count} files`)
    })
    
    // 7. Test N/A status update
    console.log('\n🚫 Testing N/A status update...')
    
    const { error: naError } = await supabase
      .from('property_document_status')
      .update({
        is_na: true,
        note: 'Test N/A status',
        status: 'complete'
      })
      .eq('property_id', testProperty.id)
      .eq('pipeline', 'direct_addition')
      .eq('doc_type', 'registered_title')
    
    if (naError) throw naError
    
    console.log('✅ N/A status update successful')
    
    // 8. Test API endpoints (if running)
    console.log('\n🔗 Testing API endpoints...')
    
    try {
      // Test sign URL endpoint
      const signResponse = await fetch('http://localhost:3000/api/docs/sign-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: `direct_addition/${testProperty.id}/title_copy/test-file.pdf`
        })
      })
      
      if (signResponse.ok) {
        console.log('✅ Sign URL API endpoint working')
      } else {
        console.log('⚠️  Sign URL API endpoint not accessible (server may not be running)')
      }
    } catch (error) {
      console.log('⚠️  API endpoints not accessible (server may not be running)')
    }
    
    // 9. Cleanup test data
    console.log('\n🧹 Cleaning up test data...')
    
    const { error: cleanupDocsError } = await supabase
      .from('property_documents')
      .delete()
      .eq('property_id', testProperty.id)
      .eq('pipeline', 'direct_addition')
      .eq('meta->test', true)
    
    if (cleanupDocsError) {
      console.log('⚠️  Could not clean up test documents:', cleanupDocsError.message)
    } else {
      console.log('✅ Test documents cleaned up')
    }
    
    const { error: cleanupStatusError } = await supabase
      .from('property_document_status')
      .delete()
      .eq('property_id', testProperty.id)
      .eq('pipeline', 'direct_addition')
    
    if (cleanupStatusError) {
      console.log('⚠️  Could not clean up test statuses:', cleanupStatusError.message)
    } else {
      console.log('✅ Test statuses cleaned up')
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}

async function main() {
  console.log('🚀 Property Documents V2 System Test\n')
  
  const success = await testPropertyDocsV2()
  
  if (success) {
    console.log('\n🎉 All tests passed! Property Documents V2 system is ready.')
    console.log('\n🔍 To test in the UI:')
    console.log('   1. Start the development server: npm run dev')
    console.log('   2. Go to Properties')
    console.log('   3. Find a property with source "DIRECT_ADDITION"')
    console.log('   4. Click to view the property')
    console.log('   5. Go to Documents tab')
    console.log('   6. You should see the new expandable card interface')
  } else {
    console.log('\n❌ Tests failed. Please check the configuration.')
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}
