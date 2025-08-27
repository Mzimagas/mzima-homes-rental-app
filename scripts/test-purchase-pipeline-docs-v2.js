/**
 * Test Script for Purchase Pipeline Documents V2
 * Tests the new expandable card-based document management system
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Verify environment variables are loaded
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error(
    'NEXT_PUBLIC_SUPABASE_URL:',
    process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'
  )
  console.error(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY:',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'
  )
  process.exit(1)
}

// Test data
const TEST_PURCHASE_ID = 'test-purchase-' + Date.now()
const TEST_STAGE_IDS = [1, 2, 3, 4, 5, 6, 7, 8]

// Document types configuration for testing
const PURCHASE_PIPELINE_DOC_TYPES = {
  1: [
    { key: 'photo_property', type: 'photo', label: 'Property Photos', required: true },
    { key: 'other_location_map', type: 'other', label: 'Location Map', required: true },
    { key: 'other_property_details', type: 'other', label: 'Property Details', required: true },
    { key: 'other_initial_valuation', type: 'other', label: 'Initial Valuation', required: false },
    {
      key: 'correspondence_seller',
      type: 'correspondence',
      label: 'Seller Communication',
      required: false,
    },
  ],
  2: [
    { key: 'survey_report', type: 'survey_report', label: 'Survey Report', required: true },
    { key: 'deed_plan_survey', type: 'deed_plan', label: 'Survey Map', required: true },
    { key: 'deed_plan_official', type: 'deed_plan', label: 'Deed Plan', required: true },
    { key: 'photo_beacons', type: 'photo', label: 'Beacon Photos', required: false },
    { key: 'other_site_visit', type: 'other', label: 'Site Visit Report', required: false },
  ],
  3: [
    { key: 'title', type: 'title', label: 'Title Deed', required: true },
    { key: 'legal_witness', type: 'legal', label: 'Witness Statements', required: true },
    { key: 'legal_opinion', type: 'legal_opinion', label: 'Legal Opinion', required: true },
    { key: 'other_meeting_minutes', type: 'other', label: 'Meeting Minutes', required: false },
    {
      key: 'correspondence_legal',
      type: 'correspondence',
      label: 'Legal Correspondence',
      required: false,
    },
  ],
}

async function testDocumentCreation() {
  console.log('🧪 Testing Document Creation...')

  try {
    // Test creating documents for different stages
    for (const stageId of [1, 2, 3]) {
      const docTypes = PURCHASE_PIPELINE_DOC_TYPES[stageId]

      for (const docType of docTypes.slice(0, 2)) {
        // Test first 2 doc types per stage
        const testDoc = {
          entity_type: 'purchase_stage',
          entity_id: `${TEST_PURCHASE_ID}_${stageId}`,
          doc_type: docType.type,
          title: docType.label,
          description: `Test ${docType.label} for stage ${stageId}`,
          file_path: `purchase_pipeline/${TEST_PURCHASE_ID}/${stageId}/${docType.key}/test_file.pdf`,
          file_url: `purchase_pipeline/${TEST_PURCHASE_ID}/${stageId}/${docType.key}/test_file.pdf`,
          file_name: 'test_file.pdf',
          file_size: 1024,
          file_size_bytes: 1024,
          file_type: 'application/pdf',
          mime_type: 'application/pdf',
          access_level: 'internal',
          is_current_version: true,
          uploaded_at: new Date().toISOString(),
          metadata: {
            stage_id: stageId,
            purchase_id: TEST_PURCHASE_ID,
            document_type_key: docType.key,
            document_type_label: docType.label,
            is_required: docType.required,
            category: docType.required ? 'required' : 'optional',
          },
        }

        const { data, error } = await supabase.from('documents').insert(testDoc).select()

        if (error) {
          console.error(`❌ Failed to create document for ${docType.label}:`, error)
          return false
        }

        console.log(`✅ Created test document: ${docType.label} (Stage ${stageId})`)
      }
    }

    return true
  } catch (error) {
    console.error('❌ Document creation test failed:', error)
    return false
  }
}

async function testDocumentRetrieval() {
  console.log('🔍 Testing Document Retrieval...')

  try {
    for (const stageId of [1, 2, 3]) {
      const { data: documents, error } = await supabase
        .from('documents')
        .select('*')
        .eq('entity_type', 'purchase_stage')
        .eq('entity_id', `${TEST_PURCHASE_ID}_${stageId}`)
        .eq('is_current_version', true)
        .order('uploaded_at', { ascending: false })

      if (error) {
        console.error(`❌ Failed to retrieve documents for stage ${stageId}:`, error)
        return false
      }

      console.log(`✅ Retrieved ${documents.length} documents for stage ${stageId}`)

      // Verify document structure
      for (const doc of documents) {
        if (!doc.metadata?.document_type_key) {
          console.error(`❌ Document missing document_type_key in metadata:`, doc.document_id)
          return false
        }

        if (!doc.metadata?.stage_id || doc.metadata.stage_id !== stageId) {
          console.error(`❌ Document has incorrect stage_id in metadata:`, doc.document_id)
          return false
        }
      }
    }

    return true
  } catch (error) {
    console.error('❌ Document retrieval test failed:', error)
    return false
  }
}

async function testDocumentGrouping() {
  console.log('📊 Testing Document Grouping by Type...')

  try {
    for (const stageId of [1, 2, 3]) {
      const { data: documents, error } = await supabase
        .from('documents')
        .select('*')
        .eq('entity_type', 'purchase_stage')
        .eq('entity_id', `${TEST_PURCHASE_ID}_${stageId}`)
        .eq('is_current_version', true)

      if (error) {
        console.error(`❌ Failed to retrieve documents for grouping test:`, error)
        return false
      }

      // Group documents by type key
      const groupedDocs = {}
      const docTypes = PURCHASE_PIPELINE_DOC_TYPES[stageId]

      // Initialize groups
      docTypes.forEach((docType) => {
        groupedDocs[docType.key] = []
      })

      // Group documents
      documents.forEach((doc) => {
        const matchingDocType = docTypes.find((dt) => {
          const docTypeKey = dt.key
          const dbDocType = doc.doc_type

          // Check if the key contains the doc type or metadata matches
          return (
            docTypeKey.includes(dbDocType) ||
            docTypeKey.startsWith(dbDocType) ||
            doc.metadata?.document_type_key === docTypeKey
          )
        })

        if (matchingDocType) {
          groupedDocs[matchingDocType.key].push(doc)
        }
      })

      // Verify grouping
      let totalGrouped = 0
      for (const [key, docs] of Object.entries(groupedDocs)) {
        totalGrouped += docs.length
        if (docs.length > 0) {
          console.log(`✅ Stage ${stageId} - ${key}: ${docs.length} document(s)`)
        }
      }

      if (totalGrouped !== documents.length) {
        console.error(`❌ Grouping mismatch: ${totalGrouped} grouped vs ${documents.length} total`)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('❌ Document grouping test failed:', error)
    return false
  }
}

async function testDocumentTypeConfiguration() {
  console.log('⚙️ Testing Document Type Configuration...')

  try {
    // Test that all stages have document types configured
    for (const stageId of TEST_STAGE_IDS) {
      const docTypes = PURCHASE_PIPELINE_DOC_TYPES[stageId]

      if (!docTypes || docTypes.length === 0) {
        console.log(
          `ℹ️ No document types configured for stage ${stageId} (expected for stages 4-8)`
        )
        continue
      }

      // Verify each document type has required fields
      for (const docType of docTypes) {
        if (!docType.key || !docType.type || !docType.label || docType.required === undefined) {
          console.error(`❌ Invalid document type configuration:`, docType)
          return false
        }
      }

      const requiredCount = docTypes.filter((dt) => dt.required).length
      const optionalCount = docTypes.filter((dt) => !dt.required).length

      console.log(
        `✅ Stage ${stageId}: ${docTypes.length} total (${requiredCount} required, ${optionalCount} optional)`
      )
    }

    return true
  } catch (error) {
    console.error('❌ Document type configuration test failed:', error)
    return false
  }
}

async function testCompatibilityWithExistingData() {
  console.log('🔄 Testing Compatibility with Existing Purchase Pipeline Data...')

  try {
    // Check if there are existing purchase pipeline documents
    const { data: existingDocs, error } = await supabase
      .from('documents')
      .select('*')
      .eq('entity_type', 'purchase_stage')
      .limit(5)

    if (error) {
      console.error('❌ Failed to check existing documents:', error)
      return false
    }

    if (existingDocs.length > 0) {
      console.log(`✅ Found ${existingDocs.length} existing purchase pipeline documents`)

      // Verify existing documents can be processed by new system
      for (const doc of existingDocs) {
        // Check if document has basic required fields
        if (!doc.entity_id || !doc.doc_type || !doc.file_path) {
          console.error(`❌ Existing document missing required fields:`, doc.document_id)
          return false
        }

        // Extract stage ID from entity_id (format: purchaseId_stageId)
        const entityIdParts = doc.entity_id.split('_')
        if (entityIdParts.length < 2) {
          console.error(`❌ Invalid entity_id format:`, doc.entity_id)
          return false
        }

        const stageId = parseInt(entityIdParts[entityIdParts.length - 1])
        if (isNaN(stageId) || stageId < 1 || stageId > 8) {
          console.error(`❌ Invalid stage ID extracted:`, stageId)
          return false
        }

        console.log(`✅ Existing document compatible: ${doc.title} (Stage ${stageId})`)
      }
    } else {
      console.log('ℹ️ No existing purchase pipeline documents found')
    }

    return true
  } catch (error) {
    console.error('❌ Compatibility test failed:', error)
    return false
  }
}

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...')

  try {
    const { error } = await supabase
      .from('documents')
      .delete()
      .like('entity_id', `${TEST_PURCHASE_ID}_%`)

    if (error) {
      console.error('❌ Failed to cleanup test data:', error)
      return false
    }

    console.log('✅ Test data cleaned up successfully')
    return true
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
    return false
  }
}

async function runAllTests() {
  console.log('🚀 Starting Purchase Pipeline Documents V2 Tests\n')

  const tests = [
    { name: 'Document Type Configuration', fn: testDocumentTypeConfiguration },
    { name: 'Document Creation', fn: testDocumentCreation },
    { name: 'Document Retrieval', fn: testDocumentRetrieval },
    { name: 'Document Grouping', fn: testDocumentGrouping },
    { name: 'Compatibility with Existing Data', fn: testCompatibilityWithExistingData },
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    console.log(`\n--- ${test.name} ---`)
    try {
      const result = await test.fn()
      if (result) {
        passed++
        console.log(`✅ ${test.name} PASSED`)
      } else {
        failed++
        console.log(`❌ ${test.name} FAILED`)
      }
    } catch (error) {
      failed++
      console.log(`❌ ${test.name} FAILED with error:`, error.message)
    }
  }

  // Cleanup
  console.log('\n--- Cleanup ---')
  await cleanupTestData()

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(50))
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`)

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Purchase Pipeline Documents V2 is ready for use.')
  } else {
    console.log('\n⚠️ Some tests failed. Please review the issues above.')
  }

  process.exit(failed === 0 ? 0 : 1)
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch((error) => {
    console.error('💥 Test runner failed:', error)
    process.exit(1)
  })
}

module.exports = {
  runAllTests,
  testDocumentCreation,
  testDocumentRetrieval,
  testDocumentGrouping,
  testDocumentTypeConfiguration,
  testCompatibilityWithExistingData,
  cleanupTestData,
}
