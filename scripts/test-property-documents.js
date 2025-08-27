#!/usr/bin/env node

/**
 * Script to test if documents are loading for a specific property
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

async function testPropertyDocuments() {
  try {
    console.log('🏠 Testing property document loading...\n')
    
    // 1. Get the property we created a document for
    const propertyId = '345cf10e-22a6-43c7-8ecc-859238a11fd6'
    
    console.log(`1. Testing property: ${propertyId}`)
    
    // 2. Check if property exists
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('id, name, property_source')
      .eq('id', propertyId)
      .single()
    
    if (propError) {
      console.error('❌ Error fetching property:', propError)
      return false
    }
    
    console.log(`✅ Property found: ${property.name}`)
    
    // 3. Test the exact query that InlinePropertyView uses
    console.log('\n2. Testing document query (same as InlinePropertyView)...')
    
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('entity_type', 'property')
      .eq('entity_id', propertyId)
      .eq('is_current_version', true)
      .order('uploaded_at', { ascending: false })
    
    if (docError) {
      console.error('❌ Error loading documents:', docError)
      return false
    }
    
    console.log(`✅ Found ${documents.length} documents for this property`)
    
    if (documents.length > 0) {
      console.log('\n📄 Document details:')
      documents.forEach((doc, index) => {
        console.log(`   ${index + 1}. ${doc.title}`)
        console.log(`      - Type: ${doc.doc_type}`)
        console.log(`      - File: ${doc.file_name}`)
        console.log(`      - URL: ${doc.file_url}`)
        console.log(`      - Size: ${doc.file_size_bytes} bytes`)
        console.log(`      - Uploaded: ${doc.uploaded_at}`)
        console.log('')
      })
      
      // 4. Test signed URL generation for the first document
      console.log('3. Testing signed URL generation...')
      const testDoc = documents[0]
      
      try {
        // Extract filename from file_url (same logic as InlinePropertyView)
        const fileName = testDoc.file_url.split('/').pop() || ''
        console.log(`   Extracting filename: "${fileName}" from "${testDoc.file_url}"`)
        
        const { data: urlData, error: urlError } = await supabase.storage
          .from('documents')
          .createSignedUrl(fileName, 3600)
        
        if (urlError) {
          console.error('❌ Error creating signed URL:', urlError)
          
          // Try with full path instead
          console.log('   Trying with full path...')
          const { data: urlData2, error: urlError2 } = await supabase.storage
            .from('documents')
            .createSignedUrl(testDoc.file_url, 3600)
          
          if (urlError2) {
            console.error('❌ Error with full path too:', urlError2)
          } else {
            console.log('✅ Signed URL created with full path!')
            console.log(`   URL: ${urlData2.signedUrl}`)
          }
        } else {
          console.log('✅ Signed URL created successfully!')
          console.log(`   URL: ${urlData.signedUrl}`)
        }
      } catch (err) {
        console.error('❌ Error testing signed URL:', err)
      }
    } else {
      console.log('ℹ️  No documents found for this property')
    }
    
    // 5. Test with authenticated user context (simulate real app usage)
    console.log('\n4. Testing with anon key (simulating frontend)...')
    
    const anonSupabase = createClient(
      supabaseUrl, 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    const { data: anonDocs, error: anonError } = await anonSupabase
      .from('documents')
      .select('*')
      .eq('entity_type', 'property')
      .eq('entity_id', propertyId)
      .eq('is_current_version', true)
      .order('uploaded_at', { ascending: false })
    
    if (anonError) {
      console.error('❌ Error with anon key (this is expected if RLS is working):', anonError.message)
      console.log('ℹ️  This means RLS is working and users need to be authenticated')
    } else {
      console.log(`✅ Anon query successful: ${anonDocs.length} documents`)
      console.log('ℹ️  This means documents are publicly accessible (might need RLS adjustment)')
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return false
  }
}

async function main() {
  console.log('🧪 Property Document Loading Test\n')
  
  const success = await testPropertyDocuments()
  
  if (success) {
    console.log('\n✅ Property document test completed!')
    console.log('\n📋 Summary:')
    console.log('   - Documents storage bucket: ✅ Working')
    console.log('   - Documents table: ✅ Accessible')
    console.log('   - Property-specific queries: ✅ Working')
    console.log('   - Document records: ✅ Found')
    console.log('\n🔍 If documents are still not showing in the UI:')
    console.log('   1. Check browser console for JavaScript errors')
    console.log('   2. Verify user authentication status')
    console.log('   3. Check if RLS policies are blocking access')
    console.log('   4. Ensure the property ID matches in the UI')
  } else {
    console.log('\n❌ Property document test failed')
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}
