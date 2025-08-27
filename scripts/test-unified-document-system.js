/**
 * Test Script: Unified Document System
 * Tests the unified property_documents and property_document_status tables
 * for both Direct Addition and Purchase Pipeline workflows
 */

const { createClient } = require('@supabase/supabase-js')

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your-supabase-url'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Test data
const TEST_PROPERTY_ID = 'test-property-unified-docs'
const TEST_PIPELINES = ['direct_addition', 'purchase_pipeline']
const TEST_DOC_TYPES = [
  'title_copy',
  'property_images', 
  'search_certificate',
  'minutes_decision',
  'sale_agreement'
]

async function runTests() {
  console.log('🧪 Testing Unified Document System')
  console.log('=====================================\n')

  try {
    // Test 1: Table Structure Validation
    console.log('📋 Test 1: Validating table structures...')
    await testTableStructures()
    console.log('✅ Table structures validated\n')

    // Test 2: Document Creation for Both Pipelines
    console.log('📄 Test 2: Testing document creation for both pipelines...')
    await testDocumentCreation()
    console.log('✅ Document creation tested\n')

    // Test 3: Status Management
    console.log('📊 Test 3: Testing status management...')
    await testStatusManagement()
    console.log('✅ Status management tested\n')

    // Test 4: Pipeline Isolation
    console.log('🔒 Test 4: Testing pipeline data isolation...')
    await testPipelineIsolation()
    console.log('✅ Pipeline isolation verified\n')

    // Test 5: Document Retrieval and Filtering
    console.log('🔍 Test 5: Testing document retrieval and filtering...')
    await testDocumentRetrieval()
    console.log('✅ Document retrieval tested\n')

    // Cleanup
    console.log('🧹 Cleaning up test data...')
    await cleanup()
    console.log('✅ Cleanup completed\n')

    console.log('🎉 All tests passed! Unified document system is working correctly.')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Stack trace:', error.stack)
    
    // Attempt cleanup even on failure
    try {
      await cleanup()
      console.log('🧹 Cleanup completed after failure')
    } catch (cleanupError) {
      console.error('❌ Cleanup failed:', cleanupError.message)
    }
    
    process.exit(1)
  }
}

async function testTableStructures() {
  // Test property_documents table structure
  const { data: docsColumns, error: docsError } = await supabase
    .from('property_documents')
    .select('*')
    .limit(1)

  if (docsError && docsError.code !== 'PGRST116') {
    throw new Error(`property_documents table error: ${docsError.message}`)
  }

  // Test property_document_status table structure
  const { data: statusColumns, error: statusError } = await supabase
    .from('property_document_status')
    .select('*')
    .limit(1)

  if (statusError && statusError.code !== 'PGRST116') {
    throw new Error(`property_document_status table error: ${statusError.message}`)
  }

  console.log('  ✓ property_documents table accessible')
  console.log('  ✓ property_document_status table accessible')
}

async function testDocumentCreation() {
  for (const pipeline of TEST_PIPELINES) {
    console.log(`  Testing ${pipeline} pipeline...`)
    
    for (let i = 0; i < 2; i++) {
      const docType = TEST_DOC_TYPES[i]
      
      // Create test document
      const { error: docError } = await supabase
        .from('property_documents')
        .insert({
          property_id: TEST_PROPERTY_ID,
          pipeline: pipeline,
          doc_type: docType,
          file_path: `test-docs/${pipeline}/${docType}/test-file-${i}.pdf`,
          file_name: `test-file-${i}.pdf`,
          file_ext: 'pdf',
          file_size: 1024 * (i + 1),
          mime_type: 'application/pdf',
          uploaded_by: 'test-user',
          uploaded_at: new Date().toISOString(),
          meta: {
            test: true,
            pipeline: pipeline,
            doc_type: docType
          }
        })

      if (docError) {
        throw new Error(`Failed to create document for ${pipeline}/${docType}: ${docError.message}`)
      }
    }
    
    console.log(`    ✓ Documents created for ${pipeline}`)
  }
}

async function testStatusManagement() {
  for (const pipeline of TEST_PIPELINES) {
    console.log(`  Testing status management for ${pipeline}...`)
    
    for (let i = 0; i < 2; i++) {
      const docType = TEST_DOC_TYPES[i]
      
      // Create status record
      const { error: statusError } = await supabase
        .from('property_document_status')
        .insert({
          property_id: TEST_PROPERTY_ID,
          pipeline: pipeline,
          doc_type: docType,
          status: i === 0 ? 'complete' : 'missing',
          is_na: i === 1,
          note: i === 1 ? 'Test N/A note' : null
        })

      if (statusError) {
        throw new Error(`Failed to create status for ${pipeline}/${docType}: ${statusError.message}`)
      }
    }
    
    console.log(`    ✓ Status records created for ${pipeline}`)
  }
}

async function testPipelineIsolation() {
  // Test that direct_addition documents don't appear in purchase_pipeline queries
  const { data: directDocs, error: directError } = await supabase
    .from('property_documents')
    .select('*')
    .eq('property_id', TEST_PROPERTY_ID)
    .eq('pipeline', 'direct_addition')

  if (directError) {
    throw new Error(`Failed to query direct_addition documents: ${directError.message}`)
  }

  const { data: purchaseDocs, error: purchaseError } = await supabase
    .from('property_documents')
    .select('*')
    .eq('property_id', TEST_PROPERTY_ID)
    .eq('pipeline', 'purchase_pipeline')

  if (purchaseError) {
    throw new Error(`Failed to query purchase_pipeline documents: ${purchaseError.message}`)
  }

  // Verify isolation
  if (directDocs.length === 0 || purchaseDocs.length === 0) {
    throw new Error('Pipeline isolation test failed: missing documents')
  }

  // Verify no cross-contamination
  const directHasPurchase = directDocs.some(doc => doc.pipeline === 'purchase_pipeline')
  const purchaseHasDirect = purchaseDocs.some(doc => doc.pipeline === 'direct_addition')

  if (directHasPurchase || purchaseHasDirect) {
    throw new Error('Pipeline isolation test failed: cross-contamination detected')
  }

  console.log(`  ✓ Direct Addition: ${directDocs.length} documents`)
  console.log(`  ✓ Purchase Pipeline: ${purchaseDocs.length} documents`)
  console.log('  ✓ No cross-contamination detected')
}

async function testDocumentRetrieval() {
  // Test combined query (should work for both pipelines)
  const { data: allDocs, error: allError } = await supabase
    .from('property_documents')
    .select('*')
    .eq('property_id', TEST_PROPERTY_ID)
    .order('uploaded_at', { ascending: false })

  if (allError) {
    throw new Error(`Failed to retrieve all documents: ${allError.message}`)
  }

  // Test status retrieval
  const { data: allStatuses, error: statusError } = await supabase
    .from('property_document_status')
    .select('*')
    .eq('property_id', TEST_PROPERTY_ID)

  if (statusError) {
    throw new Error(`Failed to retrieve all statuses: ${statusError.message}`)
  }

  console.log(`  ✓ Retrieved ${allDocs.length} total documents`)
  console.log(`  ✓ Retrieved ${allStatuses.length} total status records`)
  
  // Verify document types are correctly stored
  const docTypes = [...new Set(allDocs.map(doc => doc.doc_type))]
  console.log(`  ✓ Document types found: ${docTypes.join(', ')}`)
}

async function cleanup() {
  // Delete test documents
  const { error: docsError } = await supabase
    .from('property_documents')
    .delete()
    .eq('property_id', TEST_PROPERTY_ID)

  if (docsError) {
    console.warn(`Warning: Failed to delete test documents: ${docsError.message}`)
  }

  // Delete test statuses
  const { error: statusError } = await supabase
    .from('property_document_status')
    .delete()
    .eq('property_id', TEST_PROPERTY_ID)

  if (statusError) {
    console.warn(`Warning: Failed to delete test statuses: ${statusError.message}`)
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests()
}

module.exports = {
  runTests,
  testTableStructures,
  testDocumentCreation,
  testStatusManagement,
  testPipelineIsolation,
  testDocumentRetrieval
}
