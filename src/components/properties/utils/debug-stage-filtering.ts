/**
 * Debug utilities for stage filtering
 * Use this to verify stage filtering is working correctly
 */

import { DOC_TYPES } from '../../../lib/constants/document-types'
import { 
  getFilteredDocTypes, 
  getWorkflowType, 
  SUBDIVISION_DOC_KEYS,
  REGULAR_DOC_KEYS,
  type WorkflowType 
} from './stage-filtering.utils'

/**
 * Debug function to check document filtering for all workflow types
 */
export function debugStageFiltering() {
  console.log('🔍 DEBUG: Stage Filtering Analysis')
  console.log('=====================================')
  
  // Test property objects
  const testProperties = {
    directAddition: {
      id: 'test-1',
      property_source: 'DIRECT_ADDITION',
      subdivision_status: 'NOT_STARTED',
      handover_status: 'NOT_STARTED'
    },
    purchasePipeline: {
      id: 'test-2', 
      property_source: 'PURCHASE_PIPELINE',
      subdivision_status: 'NOT_STARTED',
      handover_status: 'NOT_STARTED'
    },
    handover: {
      id: 'test-3',
      property_source: 'DIRECT_ADDITION',
      subdivision_status: 'NOT_STARTED',
      handover_status: 'HANDOVER_STARTED'
    },
    subdivision: {
      id: 'test-4',
      property_source: 'DIRECT_ADDITION',
      subdivision_status: 'SUB_DIVISION_STARTED',
      handover_status: 'NOT_STARTED'
    }
  }
  
  // Test each workflow type
  Object.entries(testProperties).forEach(([name, property]) => {
    const workflowType = getWorkflowType(property as any)
    const filteredDocs = getFilteredDocTypes(workflowType)
    const docKeys = filteredDocs.map(d => d.key)
    
    console.log(`\n📋 ${name.toUpperCase()} (${workflowType})`)
    console.log(`   Total docs: ${filteredDocs.length}/${DOC_TYPES.length}`)
    console.log(`   Has registered_title: ${docKeys.includes('registered_title') ? '✅' : '❌'}`)
    console.log(`   Document keys:`, docKeys)
  })
  
  // Check for registered_title specifically
  console.log('\n🏆 REGISTERED_TITLE ANALYSIS')
  console.log('==============================')
  console.log(`In SUBDIVISION_DOC_KEYS: ${SUBDIVISION_DOC_KEYS.includes('registered_title') ? '✅' : '❌'}`)
  console.log(`In REGULAR_DOC_KEYS: ${REGULAR_DOC_KEYS.includes('registered_title') ? '✅' : '❌'}`)
  
  // Test subdivision-only filtering
  const subdivisionOnlyDocs = SUBDIVISION_DOC_KEYS.filter(key => key !== 'registered_title')
  console.log(`\nSubdivision-only docs (excluding registered_title):`, subdivisionOnlyDocs)
  
  // Test regular workflow filtering
  const regularWorkflowDocs = DOC_TYPES.filter(docType => {
    return !subdivisionOnlyDocs.includes(docType.key)
  }).map(d => d.key)
  
  console.log(`\nRegular workflow docs (should include registered_title):`)
  console.log(`   Count: ${regularWorkflowDocs.length}`)
  console.log(`   Has registered_title: ${regularWorkflowDocs.includes('registered_title') ? '✅' : '❌'}`)
  console.log(`   Keys:`, regularWorkflowDocs)
  
  return {
    testProperties,
    subdivisionOnlyDocs,
    regularWorkflowDocs
  }
}

/**
 * Quick test function to verify registered_title appears in regular workflows
 */
export function testRegisteredTitleVisibility() {
  const workflows: WorkflowType[] = ['direct_addition', 'purchase_pipeline', 'handover']
  
  console.log('🏆 Testing registered_title visibility in regular workflows:')
  
  workflows.forEach(workflow => {
    const filteredDocs = getFilteredDocTypes(workflow)
    const hasRegisteredTitle = filteredDocs.some(doc => doc.key === 'registered_title')
    console.log(`   ${workflow}: ${hasRegisteredTitle ? '✅' : '❌'}`)
  })
  
  // Test subdivision workflow
  const subdivisionDocs = getFilteredDocTypes('subdivision')
  const subdivisionHasTitle = subdivisionDocs.some(doc => doc.key === 'registered_title')
  console.log(`   subdivision: ${subdivisionHasTitle ? '✅' : '❌'}`)
  
  return {
    regularWorkflowsHaveTitle: workflows.every(w => 
      getFilteredDocTypes(w).some(doc => doc.key === 'registered_title')
    ),
    subdivisionHasTitle
  }
}

// Auto-run debug when imported in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Only run in browser and development mode
  setTimeout(() => {
    console.log('🚀 Auto-running stage filtering debug...')
    debugStageFiltering()
    testRegisteredTitleVisibility()
  }, 1000)
}
