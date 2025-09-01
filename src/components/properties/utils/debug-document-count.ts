/**
 * Debug script to analyze document counts and filtering
 */

import { DOC_TYPES } from '../../../lib/constants/document-types'
import { 
  getFilteredDocTypes, 
  SUBDIVISION_DOC_KEYS,
  REGULAR_DOC_KEYS,
  type WorkflowType 
} from './stage-filtering.utils'

export function debugDocumentCounts() {
  console.log('🔍 DOCUMENT COUNT ANALYSIS')
  console.log('==========================')
  
  // Total document count
  console.log(`\n📊 TOTAL DOCUMENTS: ${DOC_TYPES.length}`)
  console.log('All document keys:', DOC_TYPES.map(d => d.key))
  
  // Required vs Optional
  const requiredDocs = DOC_TYPES.filter(d => d.required)
  const optionalDocs = DOC_TYPES.filter(d => !d.required)
  console.log(`\n✅ REQUIRED DOCUMENTS: ${requiredDocs.length}`)
  console.log('Required keys:', requiredDocs.map(d => d.key))
  console.log(`\n⚪ OPTIONAL DOCUMENTS: ${optionalDocs.length}`)
  console.log('Optional keys:', optionalDocs.map(d => d.key))
  
  // Subdivision document analysis
  console.log(`\n🏗️ SUBDIVISION DOCUMENTS: ${SUBDIVISION_DOC_KEYS.length}`)
  console.log('Subdivision keys:', SUBDIVISION_DOC_KEYS)
  
  // Regular document analysis
  console.log(`\n🏠 REGULAR DOCUMENTS: ${REGULAR_DOC_KEYS.length}`)
  console.log('Regular keys:', REGULAR_DOC_KEYS)
  
  // Workflow filtering analysis
  const workflows: WorkflowType[] = ['direct_addition', 'purchase_pipeline', 'handover', 'subdivision']
  
  workflows.forEach(workflow => {
    const filteredDocs = getFilteredDocTypes(workflow)
    const requiredFiltered = filteredDocs.filter(d => d.required)
    
    console.log(`\n📋 ${workflow.toUpperCase()} WORKFLOW:`)
    console.log(`   Total filtered docs: ${filteredDocs.length}`)
    console.log(`   Required filtered docs: ${requiredFiltered.length}`)
    console.log(`   Document keys:`, filteredDocs.map(d => d.key))
    console.log(`   Required keys:`, requiredFiltered.map(d => d.key))
  })
  
  // Check for overlaps and issues
  console.log('\n🔍 OVERLAP ANALYSIS:')
  const subdivisionOnlyDocs = SUBDIVISION_DOC_KEYS.filter(key => key !== 'registered_title')
  console.log(`Subdivision-only docs (excluding registered_title): ${subdivisionOnlyDocs.length}`)
  console.log('Subdivision-only keys:', subdivisionOnlyDocs)
  
  // Check if registered_title appears in both
  console.log(`\nregistered_title in SUBDIVISION_DOC_KEYS: ${SUBDIVISION_DOC_KEYS.includes('registered_title')}`)
  console.log(`registered_title in REGULAR_DOC_KEYS: ${REGULAR_DOC_KEYS.includes('registered_title')}`)
  
  // Manual count verification
  console.log('\n🧮 MANUAL COUNT VERIFICATION:')
  
  // Count regular workflow documents manually
  const manualRegularCount = DOC_TYPES.filter(doc => {
    const subdivisionOnlyKeys = SUBDIVISION_DOC_KEYS.filter(key => key !== 'registered_title')
    return !subdivisionOnlyKeys.includes(doc.key)
  })
  
  console.log(`Manual regular workflow count: ${manualRegularCount.length}`)
  console.log(`Manual regular required count: ${manualRegularCount.filter(d => d.required).length}`)
  
  // Count subdivision workflow documents manually
  const manualSubdivisionCount = DOC_TYPES.filter(doc => {
    return SUBDIVISION_DOC_KEYS.includes(doc.key)
  })
  
  console.log(`Manual subdivision workflow count: ${manualSubdivisionCount.length}`)
  console.log(`Manual subdivision required count: ${manualSubdivisionCount.filter(d => d.required).length}`)
  
  return {
    totalDocs: DOC_TYPES.length,
    requiredDocs: requiredDocs.length,
    optionalDocs: optionalDocs.length,
    subdivisionDocs: SUBDIVISION_DOC_KEYS.length,
    regularDocs: REGULAR_DOC_KEYS.length,
    manualRegularCount: manualRegularCount.length,
    manualRegularRequired: manualRegularCount.filter(d => d.required).length,
    manualSubdivisionCount: manualSubdivisionCount.length,
    manualSubdivisionRequired: manualSubdivisionCount.filter(d => d.required).length
  }
}

// Auto-run in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  setTimeout(() => {
    console.log('🚀 Auto-running document count debug...')
    debugDocumentCounts()
  }, 2000)
}
