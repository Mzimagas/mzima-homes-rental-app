#!/usr/bin/env node

/**
 * Script to test document functionality and create sample documents
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

async function testDocuments() {
  try {
    console.log('🔍 Testing documents functionality...\n')
    
    // 1. Check if documents bucket exists
    console.log('1. Checking documents bucket...')
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    
    if (bucketError) {
      console.error('❌ Error listing buckets:', bucketError)
      return false
    }
    
    const documentsBucket = buckets.find(b => b.id === 'documents')
    if (!documentsBucket) {
      console.error('❌ Documents bucket not found')
      return false
    }
    console.log('✅ Documents bucket exists')
    
    // 2. Check documents table structure
    console.log('\n2. Checking documents table...')
    const { data: tableCheck, error: tableError } = await supabase
      .from('documents')
      .select('*')
      .limit(1)
    
    if (tableError) {
      console.error('❌ Error accessing documents table:', tableError)
      return false
    }
    console.log('✅ Documents table accessible')
    
    // 3. Check for existing documents
    console.log('\n3. Checking existing documents...')
    const { data: existingDocs, error: docsError } = await supabase
      .from('documents')
      .select('id, title, entity_type, entity_id, file_url, uploaded_at')
      .limit(5)
    
    if (docsError) {
      console.error('❌ Error querying documents:', docsError)
      return false
    }
    
    console.log(`✅ Found ${existingDocs.length} existing documents`)
    if (existingDocs.length > 0) {
      console.log('   Sample documents:')
      existingDocs.forEach(doc => {
        console.log(`   - ${doc.title} (${doc.entity_type}/${doc.entity_id})`)
      })
    }
    
    // 4. Check storage files
    console.log('\n4. Checking storage files...')
    const { data: files, error: filesError } = await supabase.storage
      .from('documents')
      .list('', { limit: 10 })
    
    if (filesError) {
      console.error('❌ Error listing storage files:', filesError)
      return false
    }
    
    console.log(`✅ Found ${files.length} files in storage`)
    if (files.length > 0) {
      console.log('   Sample files:')
      files.forEach(file => {
        console.log(`   - ${file.name} (${file.metadata?.size || 'unknown size'})`)
      })
    }
    
    // 5. Test creating a signed URL for an existing file
    if (files.length > 0) {
      console.log('\n5. Testing signed URL generation...')
      const testFile = files[0]
      const { data: urlData, error: urlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(testFile.name, 60)
      
      if (urlError) {
        console.error('❌ Error creating signed URL:', urlError)
      } else {
        console.log('✅ Signed URL generated successfully')
      }
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return false
  }
}

async function createSampleDocument() {
  try {
    console.log('\n📄 Creating sample document...')
    
    // Create a simple text file
    const sampleContent = 'This is a sample document for testing purposes.\nCreated at: ' + new Date().toISOString()
    const blob = new Blob([sampleContent], { type: 'text/plain' })
    const file = new File([blob], 'sample-document.txt', { type: 'text/plain' })
    
    // Upload to storage
    const filePath = `test/sample-document-${Date.now()}.txt`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file)
    
    if (uploadError) {
      console.error('❌ Error uploading sample file:', uploadError)
      return false
    }
    
    console.log('✅ Sample file uploaded to storage')
    
    // Create database record
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .insert({
        entity_type: 'test',
        entity_id: '00000000-0000-0000-0000-000000000000',
        doc_type: 'other',
        title: 'Sample Test Document',
        description: 'A sample document created for testing',
        file_url: filePath,
        file_path: filePath,
        file_name: 'sample-document.txt',
        file_size: file.size,
        file_size_bytes: file.size,
        file_type: 'text/plain',
        mime_type: 'text/plain',
        is_current_version: true,
        uploaded_at: new Date().toISOString()
      })
      .select()
    
    if (docError) {
      console.error('❌ Error creating document record:', docError)
      return false
    }
    
    console.log('✅ Sample document record created')
    return true
    
  } catch (error) {
    console.error('❌ Error creating sample document:', error)
    return false
  }
}

async function main() {
  console.log('🧪 Document System Test\n')
  
  const testResult = await testDocuments()
  
  if (testResult) {
    console.log('\n✅ All document tests passed!')
    
    // Optionally create a sample document
    const createSample = await createSampleDocument()
    if (createSample) {
      console.log('\n🎉 Sample document created successfully!')
    }
  } else {
    console.log('\n❌ Some tests failed. Please check the configuration.')
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}
