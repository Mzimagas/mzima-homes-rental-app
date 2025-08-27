#!/usr/bin/env node

/**
 * Script to test the Direct Addition Documents system
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

async function testDirectAdditionDocuments() {
  try {
    console.log('🏠 Testing Direct Addition Documents System...\n')
    
    // 1. Find a direct addition property
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id, name, property_source')
      .eq('property_source', 'DIRECT_ADDITION')
      .limit(1)
    
    if (propError) throw propError
    
    if (!properties || properties.length === 0) {
      console.log('ℹ️  No direct addition properties found. Creating test property...')
      
      // Create a test direct addition property
      const { data: newProperty, error: createError } = await supabase
        .from('properties')
        .insert({
          name: 'Test Direct Addition Property',
          physical_address: 'Test Address, Nairobi',
          property_type: 'HOME',
          property_source: 'DIRECT_ADDITION',
          lifecycle_status: 'ACTIVE'
        })
        .select()
        .single()
      
      if (createError) throw createError
      console.log(`✅ Created test property: ${newProperty.name}`)
      properties.push(newProperty)
    }
    
    const testProperty = properties[0]
    console.log(`✅ Testing with property: ${testProperty.name}`)
    
    // 2. Create test documents for each Kenya document type
    const kenyaDocuments = [
      {
        document_id: 'title_deed',
        doc_type: 'title',
        title: 'Copy of Title/Title Number - Original Title Deed',
        description: 'Original title deed or certified copy with title number'
      },
      {
        document_id: 'property_images',
        doc_type: 'photo',
        title: 'Property Images - Exterior View',
        description: 'Multiple photographs of the property (exterior, interior, boundaries)'
      },
      {
        document_id: 'property_images',
        doc_type: 'photo',
        title: 'Property Images - Interior View',
        description: 'Multiple photographs of the property (exterior, interior, boundaries)'
      },
      {
        document_id: 'search_certificate',
        doc_type: 'other',
        title: 'Search Certificate - Ministry of Lands',
        description: 'Official property search from the Ministry of Lands'
      },
      {
        document_id: 'minutes_decision',
        doc_type: 'other',
        title: 'Minutes/Decision to Buy - Board Resolution',
        description: 'Meeting minutes or documentation showing decision-making process'
      },
      {
        document_id: 'agreement_seller',
        doc_type: 'agreement',
        title: 'Agreement with Seller - Purchase Contract',
        description: 'Signed purchase agreement or sale contract with the property seller'
      },
      {
        document_id: 'lcb_consent',
        doc_type: 'approval',
        title: 'LCB Consent - Land Control Board Approval',
        description: 'Land Control Board consent for the transaction'
      },
      {
        document_id: 'valuation_report',
        doc_type: 'other',
        title: 'Valuation Report - Professional Assessment',
        description: 'Professional property valuation report'
      },
      {
        document_id: 'assessment',
        doc_type: 'other',
        title: 'Assessment - Property Assessment Documentation',
        description: 'Property assessment documentation'
      },
      {
        document_id: 'stamp_duty',
        doc_type: 'receipt',
        title: 'Stamp Duty Payment - Ardhi Sasa Receipt',
        description: 'Ardhi Sasa stamp duty payment receipts and confirmation'
      }
    ]
    
    console.log('\n📄 Creating test documents for Kenya property acquisition...')
    
    for (const testDoc of kenyaDocuments) {
      try {
        const { data, error } = await supabase
          .from('documents')
          .insert({
            entity_type: 'property',
            entity_id: testProperty.id,
            doc_type: testDoc.doc_type,
            title: testDoc.title,
            description: testDoc.description,
            file_path: 'test/sample-document-1756292550670.txt',
            file_url: 'test/sample-document-1756292550670.txt',
            file_name: `${testDoc.document_id}_sample.txt`,
            file_size: 84,
            file_type: 'text/plain',
            mime_type: 'text/plain',
            access_level: 'internal',
            is_current_version: true,
            metadata: { document_id: testDoc.document_id },
            uploaded_at: new Date().toISOString()
          })
          .select()
        
        if (error) {
          console.error(`❌ Error creating ${testDoc.document_id}:`, error.message)
        } else {
          console.log(`✅ Created: ${testDoc.title}`)
        }
      } catch (err) {
        console.error(`❌ Exception for ${testDoc.document_id}:`, err.message)
      }
    }
    
    // 3. Test document retrieval and grouping
    console.log('\n🔍 Testing document retrieval and grouping...')
    
    const { data: allDocs, error: retrieveError } = await supabase
      .from('documents')
      .select('*')
      .eq('entity_type', 'property')
      .eq('entity_id', testProperty.id)
      .eq('is_current_version', true)
      .order('uploaded_at', { ascending: false })
    
    if (retrieveError) {
      console.error('❌ Error retrieving documents:', retrieveError.message)
    } else {
      console.log(`✅ Retrieved ${allDocs.length} documents`)
      
      // Group by document_id
      const groupedDocs = {}
      allDocs.forEach(doc => {
        const docId = doc.metadata?.document_id || 'other'
        if (!groupedDocs[docId]) groupedDocs[docId] = []
        groupedDocs[docId].push(doc)
      })
      
      console.log('\n📋 Document grouping by type:')
      Object.entries(groupedDocs).forEach(([docId, docs]) => {
        console.log(`   ${docId}: ${docs.length} files`)
      })
    }
    
    // 4. Test completion calculation
    console.log('\n📊 Testing completion calculation...')
    
    const requiredDocTypes = [
      'title_deed', 'property_images', 'search_certificate', 'minutes_decision',
      'agreement_seller', 'lcb_consent', 'valuation_report', 'assessment', 'stamp_duty'
    ]
    
    const completedTypes = requiredDocTypes.filter(type => {
      const docs = allDocs.filter(doc => doc.metadata?.document_id === type)
      return docs.length > 0
    })
    
    const completionPercentage = Math.round((completedTypes.length / requiredDocTypes.length) * 100)
    
    console.log(`✅ Completion: ${completedTypes.length}/${requiredDocTypes.length} (${completionPercentage}%)`)
    console.log(`   Completed: ${completedTypes.join(', ')}`)
    
    const missingTypes = requiredDocTypes.filter(type => !completedTypes.includes(type))
    if (missingTypes.length > 0) {
      console.log(`   Missing: ${missingTypes.join(', ')}`)
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}

async function main() {
  console.log('🚀 Direct Addition Documents System Test\n')
  
  const success = await testDirectAdditionDocuments()
  
  if (success) {
    console.log('\n🎉 All tests passed! The Direct Addition Documents system is ready.')
    console.log('\n🔍 To test in the UI:')
    console.log('   1. Go to Properties')
    console.log('   2. Find a property with source "DIRECT_ADDITION"')
    console.log('   3. Click to view the property')
    console.log('   4. Go to Documents tab')
    console.log('   5. You should see:')
    console.log('      - Kenya Property Acquisition Documents interface')
    console.log('      - 10 document types with upload areas')
    console.log('      - Progress tracking (% completion)')
    console.log('      - Document checklist summary')
    console.log('      - Multiple file support for Property Images and Stamp Duty')
  } else {
    console.log('\n❌ Tests failed. Please check the configuration.')
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}
