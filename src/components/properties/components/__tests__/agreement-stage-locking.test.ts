/**
 * Agreement Stage Sub-Stage Locking Tests
 * Tests for the sequential locking system within step 5 (Agreement with Seller Documents)
 */

import { renderHook } from '@testing-library/react'

// Mock the agreement stage documents order
const AGREEMENT_STAGE_DOCUMENTS = [
  'original_title_deed',    // Sub-stage 1: Must be completed first
  'seller_id_passport',     // Sub-stage 2: Requires sub-stage 1
  'spousal_consent',        // Sub-stage 3: Requires sub-stages 1-2
  'spouse_id_kra',          // Sub-stage 4: Requires sub-stages 1-3
  'signed_lra33',           // Sub-stage 5: Requires sub-stages 1-4
]

// Mock implementation of the locking functions
function isAgreementSubStageLocked(docKey: string, documentStates: Record<string, any>): boolean {
  if (!AGREEMENT_STAGE_DOCUMENTS.includes(docKey)) return false
  
  const currentIndex = AGREEMENT_STAGE_DOCUMENTS.indexOf(docKey)
  if (currentIndex === 0) return false // First sub-stage is never locked
  
  // Check if all previous sub-stages are completed
  for (let i = 0; i < currentIndex; i++) {
    const prevDocKey = AGREEMENT_STAGE_DOCUMENTS[i]
    const prevState = documentStates[prevDocKey]
    const hasFiles = prevState?.documents?.length > 0
    const isNA = prevState?.status?.is_na || false
    
    if (!hasFiles && !isNA) {
      return true // Previous sub-stage not completed, so current is locked
    }
  }
  
  return false // All previous sub-stages completed
}

function getNextRequiredAgreementSubStage(documentStates: Record<string, any>): string | null {
  for (const docKey of AGREEMENT_STAGE_DOCUMENTS) {
    const state = documentStates[docKey]
    const hasFiles = state?.documents?.length > 0
    const isNA = state?.status?.is_na || false
    
    if (!hasFiles && !isNA) {
      return docKey // This is the next required sub-stage
    }
  }
  return null // All sub-stages completed
}

describe('Agreement Stage Sub-Stage Locking', () => {
  describe('isAgreementSubStageLocked', () => {
    it('should never lock the first sub-stage (original_title_deed)', () => {
      const documentStates = {}
      const isLocked = isAgreementSubStageLocked('original_title_deed', documentStates)
      expect(isLocked).toBe(false)
    })

    it('should lock sub-stage 2 when sub-stage 1 is not completed', () => {
      const documentStates = {
        'original_title_deed': { documents: [], status: { is_na: false } }
      }
      const isLocked = isAgreementSubStageLocked('seller_id_passport', documentStates)
      expect(isLocked).toBe(true)
    })

    it('should unlock sub-stage 2 when sub-stage 1 is completed with files', () => {
      const documentStates = {
        'original_title_deed': { documents: [{ id: '1', file_name: 'title.pdf' }], status: { is_na: false } }
      }
      const isLocked = isAgreementSubStageLocked('seller_id_passport', documentStates)
      expect(isLocked).toBe(false)
    })

    it('should unlock sub-stage 2 when sub-stage 1 is marked as N/A', () => {
      const documentStates = {
        'original_title_deed': { documents: [], status: { is_na: true } }
      }
      const isLocked = isAgreementSubStageLocked('seller_id_passport', documentStates)
      expect(isLocked).toBe(false)
    })

    it('should lock sub-stage 3 when sub-stage 1 is complete but sub-stage 2 is not', () => {
      const documentStates = {
        'original_title_deed': { documents: [{ id: '1' }], status: { is_na: false } },
        'seller_id_passport': { documents: [], status: { is_na: false } }
      }
      const isLocked = isAgreementSubStageLocked('spousal_consent', documentStates)
      expect(isLocked).toBe(true)
    })

    it('should unlock sub-stage 3 when both sub-stages 1 and 2 are complete', () => {
      const documentStates = {
        'original_title_deed': { documents: [{ id: '1' }], status: { is_na: false } },
        'seller_id_passport': { documents: [{ id: '2' }], status: { is_na: false } }
      }
      const isLocked = isAgreementSubStageLocked('spousal_consent', documentStates)
      expect(isLocked).toBe(false)
    })

    it('should lock sub-stage 5 when previous sub-stages are incomplete', () => {
      const documentStates = {
        'original_title_deed': { documents: [{ id: '1' }], status: { is_na: false } },
        'seller_id_passport': { documents: [{ id: '2' }], status: { is_na: false } },
        'spousal_consent': { documents: [], status: { is_na: false } }, // Incomplete
        'spouse_id_kra': { documents: [], status: { is_na: false } }
      }
      const isLocked = isAgreementSubStageLocked('signed_lra33', documentStates)
      expect(isLocked).toBe(true)
    })

    it('should unlock sub-stage 5 when all previous sub-stages are complete', () => {
      const documentStates = {
        'original_title_deed': { documents: [{ id: '1' }], status: { is_na: false } },
        'seller_id_passport': { documents: [{ id: '2' }], status: { is_na: false } },
        'spousal_consent': { documents: [{ id: '3' }], status: { is_na: false } },
        'spouse_id_kra': { documents: [], status: { is_na: true } } // N/A counts as complete
      }
      const isLocked = isAgreementSubStageLocked('signed_lra33', documentStates)
      expect(isLocked).toBe(false)
    })

    it('should return false for non-agreement documents', () => {
      const documentStates = {}
      const isLocked = isAgreementSubStageLocked('property_images', documentStates)
      expect(isLocked).toBe(false)
    })
  })

  describe('getNextRequiredAgreementSubStage', () => {
    it('should return first sub-stage when nothing is completed', () => {
      const documentStates = {}
      const nextStage = getNextRequiredAgreementSubStage(documentStates)
      expect(nextStage).toBe('original_title_deed')
    })

    it('should return second sub-stage when first is completed', () => {
      const documentStates = {
        'original_title_deed': { documents: [{ id: '1' }], status: { is_na: false } }
      }
      const nextStage = getNextRequiredAgreementSubStage(documentStates)
      expect(nextStage).toBe('seller_id_passport')
    })

    it('should return third sub-stage when first two are completed', () => {
      const documentStates = {
        'original_title_deed': { documents: [{ id: '1' }], status: { is_na: false } },
        'seller_id_passport': { documents: [], status: { is_na: true } } // N/A counts as complete
      }
      const nextStage = getNextRequiredAgreementSubStage(documentStates)
      expect(nextStage).toBe('spousal_consent')
    })

    it('should return null when all sub-stages are completed', () => {
      const documentStates = {
        'original_title_deed': { documents: [{ id: '1' }], status: { is_na: false } },
        'seller_id_passport': { documents: [{ id: '2' }], status: { is_na: false } },
        'spousal_consent': { documents: [{ id: '3' }], status: { is_na: false } },
        'spouse_id_kra': { documents: [], status: { is_na: true } },
        'signed_lra33': { documents: [{ id: '4' }], status: { is_na: false } }
      }
      const nextStage = getNextRequiredAgreementSubStage(documentStates)
      expect(nextStage).toBe(null)
    })

    it('should skip completed stages and return the next incomplete one', () => {
      const documentStates = {
        'original_title_deed': { documents: [{ id: '1' }], status: { is_na: false } },
        'seller_id_passport': { documents: [{ id: '2' }], status: { is_na: false } },
        'spousal_consent': { documents: [], status: { is_na: false } }, // Incomplete
        'spouse_id_kra': { documents: [{ id: '4' }], status: { is_na: false } }, // This shouldn't matter
        'signed_lra33': { documents: [{ id: '5' }], status: { is_na: false } } // This shouldn't matter
      }
      const nextStage = getNextRequiredAgreementSubStage(documentStates)
      expect(nextStage).toBe('spousal_consent')
    })
  })

  describe('Sequential Locking Integration', () => {
    it('should enforce strict sequential order', () => {
      const documentStates = {}
      
      // Initially, only first sub-stage should be unlocked
      expect(isAgreementSubStageLocked('original_title_deed', documentStates)).toBe(false)
      expect(isAgreementSubStageLocked('seller_id_passport', documentStates)).toBe(true)
      expect(isAgreementSubStageLocked('spousal_consent', documentStates)).toBe(true)
      expect(isAgreementSubStageLocked('spouse_id_kra', documentStates)).toBe(true)
      expect(isAgreementSubStageLocked('signed_lra33', documentStates)).toBe(true)
      
      // Complete first sub-stage
      documentStates['original_title_deed'] = { documents: [{ id: '1' }], status: { is_na: false } }
      
      // Now second sub-stage should be unlocked
      expect(isAgreementSubStageLocked('seller_id_passport', documentStates)).toBe(false)
      expect(isAgreementSubStageLocked('spousal_consent', documentStates)).toBe(true)
      expect(isAgreementSubStageLocked('spouse_id_kra', documentStates)).toBe(true)
      expect(isAgreementSubStageLocked('signed_lra33', documentStates)).toBe(true)
    })
  })
})
