#!/usr/bin/env node

/**
 * Script to create the property-docs storage bucket in Supabase
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

async function createPropertyDocsBucket() {
  try {
    console.log('🪣 Creating property-docs storage bucket...\n')
    
    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message)
      return false
    }
    
    const existingBucket = buckets.find(bucket => bucket.id === 'property-docs')
    
    if (existingBucket) {
      console.log('✅ property-docs bucket already exists')
      console.log(`   Created: ${existingBucket.created_at}`)
      console.log(`   Public: ${existingBucket.public}`)
      return true
    }
    
    // Create the bucket
    const { data, error } = await supabase.storage.createBucket('property-docs', {
      public: false, // Private bucket for security
      allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/heic',
        'image/gif'
      ],
      fileSizeLimit: 10485760 // 10MB limit
    })
    
    if (error) {
      console.error('❌ Error creating bucket:', error.message)
      return false
    }
    
    console.log('✅ property-docs bucket created successfully')
    console.log(`   Bucket ID: ${data.name}`)
    
    // Create storage policies for the bucket
    console.log('\n🔒 Setting up storage policies...')
    
    // Policy to allow authenticated users to upload files
    const uploadPolicy = `
      create policy "Authenticated users can upload property docs"
      on storage.objects for insert
      with check (
        bucket_id = 'property-docs' 
        and auth.role() = 'authenticated'
      );
    `
    
    // Policy to allow authenticated users to view files
    const selectPolicy = `
      create policy "Authenticated users can view property docs"
      on storage.objects for select
      using (
        bucket_id = 'property-docs' 
        and auth.role() = 'authenticated'
      );
    `
    
    // Policy to allow authenticated users to delete files
    const deletePolicy = `
      create policy "Authenticated users can delete property docs"
      on storage.objects for delete
      using (
        bucket_id = 'property-docs' 
        and auth.role() = 'authenticated'
      );
    `
    
    // Execute policies (Note: These would typically be run via SQL)
    console.log('ℹ️  Storage policies need to be created manually in Supabase dashboard:')
    console.log('   1. Go to Storage > Policies in Supabase dashboard')
    console.log('   2. Create policies for property-docs bucket:')
    console.log('      - Upload: authenticated users can insert')
    console.log('      - View: authenticated users can select')
    console.log('      - Delete: authenticated users can delete')
    
    return true
    
  } catch (error) {
    console.error('❌ Script failed:', error)
    return false
  }
}

async function testBucketAccess() {
  try {
    console.log('\n🧪 Testing bucket access...')
    
    // Test file upload
    const testContent = 'Test file for property-docs bucket'
    const testFile = new File([testContent], 'test.txt', { type: 'text/plain' })
    const testPath = `test/bucket-test-${Date.now()}.txt`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('property-docs')
      .upload(testPath, testFile)
    
    if (uploadError) {
      console.log('⚠️  Upload test failed (expected if policies not set):', uploadError.message)
    } else {
      console.log('✅ Upload test successful')
      
      // Clean up test file
      const { error: deleteError } = await supabase.storage
        .from('property-docs')
        .remove([testPath])
      
      if (!deleteError) {
        console.log('✅ Delete test successful')
      }
    }
    
  } catch (error) {
    console.log('⚠️  Bucket test failed:', error.message)
  }
}

async function main() {
  console.log('🚀 Property Docs Storage Bucket Setup\n')
  
  const success = await createPropertyDocsBucket()
  
  if (success) {
    await testBucketAccess()
    
    console.log('\n🎉 Storage bucket setup completed!')
    console.log('\n📋 Next steps:')
    console.log('   1. Set up storage policies in Supabase dashboard')
    console.log('   2. Test file uploads from the application')
    console.log('   3. Verify RLS policies are working correctly')
  } else {
    console.log('\n❌ Storage bucket setup failed')
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}
