#!/usr/bin/env node

/**
 * Script to create the documents storage bucket in Supabase
 * This fixes the issue where documents are not loading because the bucket doesn't exist
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createDocumentsBucket() {
  try {
    console.log('🔍 Checking if documents bucket exists...')
    
    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError)
      return false
    }
    
    const existingBucket = buckets.find(bucket => bucket.id === 'documents')
    
    if (existingBucket) {
      console.log('✅ Documents bucket already exists!')
      return true
    }
    
    console.log('📦 Creating documents storage bucket...')
    
    // Create the bucket
    const { data, error } = await supabase.storage.createBucket('documents', {
      public: false,
      allowedMimeTypes: [
        'application/pdf',
        'image/jpeg',
        'image/png', 
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ],
      fileSizeLimit: 52428800 // 50MB
    })
    
    if (error) {
      console.error('❌ Error creating bucket:', error)
      return false
    }
    
    console.log('✅ Documents bucket created successfully!')
    
    // Set up RLS policies for the bucket
    console.log('🔒 Setting up storage policies...')
    
    const policies = [
      {
        name: 'Users can upload documents',
        sql: `
          CREATE POLICY "Users can upload documents" ON storage.objects
          FOR INSERT WITH CHECK (
            bucket_id = 'documents' AND
            auth.role() = 'authenticated'
          );
        `
      },
      {
        name: 'Users can view their documents',
        sql: `
          CREATE POLICY "Users can view their documents" ON storage.objects
          FOR SELECT USING (
            bucket_id = 'documents' AND
            auth.role() = 'authenticated'
          );
        `
      },
      {
        name: 'Users can update their documents',
        sql: `
          CREATE POLICY "Users can update their documents" ON storage.objects
          FOR UPDATE USING (
            bucket_id = 'documents' AND
            auth.role() = 'authenticated'
          );
        `
      },
      {
        name: 'Users can delete their documents',
        sql: `
          CREATE POLICY "Users can delete their documents" ON storage.objects
          FOR DELETE USING (
            bucket_id = 'documents' AND
            auth.role() = 'authenticated'
          );
        `
      }
    ]
    
    for (const policy of policies) {
      try {
        const { error: policyError } = await supabase.rpc('exec_sql', {
          sql: policy.sql
        })
        
        if (policyError && !policyError.message.includes('already exists')) {
          console.warn(`⚠️  Warning creating policy "${policy.name}":`, policyError.message)
        } else {
          console.log(`✅ Policy "${policy.name}" created/verified`)
        }
      } catch (err) {
        console.warn(`⚠️  Warning with policy "${policy.name}":`, err.message)
      }
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return false
  }
}

async function main() {
  console.log('🚀 Setting up documents storage bucket...\n')
  
  const success = await createDocumentsBucket()
  
  if (success) {
    console.log('\n✅ Documents storage setup completed successfully!')
    console.log('📝 You can now upload and view documents in the application.')
  } else {
    console.log('\n❌ Failed to set up documents storage.')
    console.log('🔧 Please check your Supabase configuration and try again.')
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { createDocumentsBucket }
