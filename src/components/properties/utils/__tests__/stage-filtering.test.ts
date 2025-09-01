/**
 * Stage Filtering Tests
 * Tests for dynamic stage filtering based on property workflow type
 */

import {
  getWorkflowType,
  getStageRange,
  getFilteredDocTypes,
  getStageNumbers,
  isStageVisible,
  getDisplayStageNumber,
  getActualStageNumber,
  getStageConfig,
  getOverriddenStageRange,
  isDocTypeAllowedForWorkflow,
  getStageFilteringSummary,
  SUBDIVISION_DOC_KEYS,
  REGULAR_DOC_KEYS,
  type WorkflowType
} from '../stage-filtering.utils'
import { DOC_TYPES } from '../../../../lib/constants/document-types'

// Mock property data for testing
const createMockProperty = (overrides: any = {}) => ({
  id: 'test-property-id',
  name: 'Test Property',
  property_source: 'DIRECT_ADDITION',
  subdivision_status: 'NOT_STARTED',
  handover_status: 'NOT_STARTED',
  ...overrides
})

describe('Stage Filtering Utils', () => {
  describe('getWorkflowType', () => {
    it('should return subdivision for active subdivision status', () => {
      const property = createMockProperty({ subdivision_status: 'SUB_DIVISION_STARTED' })
      expect(getWorkflowType(property)).toBe('subdivision')
    })

    it('should return handover for active handover status', () => {
      const property = createMockProperty({ handover_status: 'HANDOVER_STARTED' })
      expect(getWorkflowType(property)).toBe('handover')
    })

    it('should return purchase_pipeline for PURCHASE_PIPELINE source', () => {
      const property = createMockProperty({ property_source: 'PURCHASE_PIPELINE' })
      expect(getWorkflowType(property)).toBe('purchase_pipeline')
    })

    it('should return direct_addition as default', () => {
      const property = createMockProperty()
      expect(getWorkflowType(property)).toBe('direct_addition')
    })

    it('should prioritize subdivision over handover', () => {
      const property = createMockProperty({ 
        subdivision_status: 'SUB_DIVISION_STARTED',
        handover_status: 'HANDOVER_STARTED'
      })
      expect(getWorkflowType(property)).toBe('subdivision')
    })
  })

  describe('getStageRange', () => {
    it('should return 1-10 for direct_addition', () => {
      const range = getStageRange('direct_addition')
      expect(range).toEqual({ min: 1, max: 10 })
    })

    it('should return 1-10 for purchase_pipeline', () => {
      const range = getStageRange('purchase_pipeline')
      expect(range).toEqual({ min: 1, max: 10 })
    })

    it('should return 1-10 for handover', () => {
      const range = getStageRange('handover')
      expect(range).toEqual({ min: 1, max: 10 })
    })

    it('should return 10-16 for subdivision', () => {
      const range = getStageRange('subdivision')
      expect(range).toEqual({ min: 10, max: 16 })
    })
  })

  describe('getFilteredDocTypes', () => {
    it('should filter out subdivision docs for regular workflows', () => {
      const workflows: WorkflowType[] = ['direct_addition', 'purchase_pipeline', 'handover']
      
      workflows.forEach(workflow => {
        const filtered = getFilteredDocTypes(workflow)
        const hasSubdivisionDocs = filtered.some(doc => SUBDIVISION_DOC_KEYS.includes(doc.key))
        expect(hasSubdivisionDocs).toBe(false)
      })
    })

    it('should only include subdivision docs for subdivision workflow', () => {
      const filtered = getFilteredDocTypes('subdivision')
      const allAreSubdivisionDocs = filtered.every(doc => SUBDIVISION_DOC_KEYS.includes(doc.key))
      expect(allAreSubdivisionDocs).toBe(true)
      expect(filtered.length).toBe(SUBDIVISION_DOC_KEYS.length)
    })

    it('should maintain correct document count for regular workflows', () => {
      const filtered = getFilteredDocTypes('direct_addition')
      // Regular workflows exclude subdivision-only docs but keep registered_title
      const subdivisionOnlyDocs = SUBDIVISION_DOC_KEYS.filter(key => key !== 'registered_title')
      const expectedCount = DOC_TYPES.length - subdivisionOnlyDocs.length
      expect(filtered.length).toBe(expectedCount)
    })
  })

  describe('getStageNumbers', () => {
    it('should return [1,2,3,4,5,6,7,8,9,10] for regular workflows', () => {
      const workflows: WorkflowType[] = ['direct_addition', 'purchase_pipeline', 'handover']
      
      workflows.forEach(workflow => {
        const numbers = getStageNumbers(workflow)
        expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      })
    })

    it('should return [10,11,12,13,14,15,16] for subdivision workflow', () => {
      const numbers = getStageNumbers('subdivision')
      expect(numbers).toEqual([10, 11, 12, 13, 14, 15, 16])
    })
  })

  describe('isStageVisible', () => {
    it('should show stages 1-10 for regular workflows', () => {
      const workflows: WorkflowType[] = ['direct_addition', 'purchase_pipeline', 'handover']
      
      workflows.forEach(workflow => {
        // Stages 1-10 should be visible
        for (let i = 1; i <= 10; i++) {
          expect(isStageVisible(i, workflow)).toBe(true)
        }
        
        // Stages 10-16 should be hidden
        for (let i = 10; i <= 16; i++) {
          expect(isStageVisible(i, workflow)).toBe(false)
        }
      })
    })

    it('should show stages 10-16 for subdivision workflow', () => {
      // Stages 1-9 should be hidden
      for (let i = 1; i <= 9; i++) {
        expect(isStageVisible(i, 'subdivision')).toBe(false)
      }

      // Stages 10-16 should be visible
      for (let i = 10; i <= 16; i++) {
        expect(isStageVisible(i, 'subdivision')).toBe(true)
      }
    })
  })

  describe('getDisplayStageNumber', () => {
    it('should return same number for regular workflows', () => {
      const workflows: WorkflowType[] = ['direct_addition', 'purchase_pipeline', 'handover']
      
      workflows.forEach(workflow => {
        for (let i = 1; i <= 10; i++) {
          expect(getDisplayStageNumber(i, workflow)).toBe(i)
        }
      })
    })

    it('should map 10-16 to 1-7 for subdivision workflow', () => {
      const mapping = [
        [10, 1], [11, 2], [12, 3], [13, 4], [14, 5], [15, 6], [16, 7]
      ]

      mapping.forEach(([actual, display]) => {
        expect(getDisplayStageNumber(actual, 'subdivision')).toBe(display)
      })
    })
  })

  describe('getActualStageNumber', () => {
    it('should return same number for regular workflows', () => {
      const workflows: WorkflowType[] = ['direct_addition', 'purchase_pipeline', 'handover']
      
      workflows.forEach(workflow => {
        for (let i = 1; i <= 10; i++) {
          expect(getActualStageNumber(i, workflow)).toBe(i)
        }
      })
    })

    it('should map 1-7 to 10-16 for subdivision workflow', () => {
      const mapping = [
        [1, 10], [2, 11], [3, 12], [4, 13], [5, 14], [6, 15], [7, 16]
      ]

      mapping.forEach(([display, actual]) => {
        expect(getActualStageNumber(display, 'subdivision')).toBe(actual)
      })
    })
  })

  describe('getStageConfig', () => {
    it('should return correct config for subdivision property', () => {
      const property = createMockProperty({ subdivision_status: 'SUB_DIVISION_STARTED' })
      const config = getStageConfig(property)
      
      expect(config.workflowType).toBe('subdivision')
      expect(config.stageRange).toEqual({ min: 10, max: 16 })
      expect(config.displayRange).toEqual({ min: 1, max: 7 })
      expect(config.visibleStageCount).toBe(7)
      expect(config.docTypes.length).toBe(SUBDIVISION_DOC_KEYS.length)
    })

    it('should return correct config for regular property', () => {
      const property = createMockProperty()
      const config = getStageConfig(property)
      
      expect(config.workflowType).toBe('direct_addition')
      expect(config.stageRange).toEqual({ min: 1, max: 10 })
      expect(config.displayRange).toEqual({ min: 1, max: 10 })
      expect(config.visibleStageCount).toBe(10)
      expect(config.docTypes.length).toBe(DOC_TYPES.length - SUBDIVISION_DOC_KEYS.length)
    })
  })

  describe('isDocTypeAllowedForWorkflow', () => {
    it('should allow regular docs for regular workflows', () => {
      const workflows: WorkflowType[] = ['direct_addition', 'purchase_pipeline', 'handover']
      const regularDocKey = REGULAR_DOC_KEYS[0]
      
      workflows.forEach(workflow => {
        expect(isDocTypeAllowedForWorkflow(regularDocKey, workflow)).toBe(true)
      })
    })

    it('should not allow subdivision-only docs for regular workflows', () => {
      const workflows: WorkflowType[] = ['direct_addition', 'purchase_pipeline', 'handover']
      const subdivisionOnlyDocs = SUBDIVISION_DOC_KEYS.filter(key => key !== 'registered_title')
      const subdivisionOnlyDocKey = subdivisionOnlyDocs[0]

      workflows.forEach(workflow => {
        expect(isDocTypeAllowedForWorkflow(subdivisionOnlyDocKey, workflow)).toBe(false)
      })
    })

    it('should allow registered_title for both regular and subdivision workflows', () => {
      const allWorkflows: WorkflowType[] = ['direct_addition', 'purchase_pipeline', 'handover', 'subdivision']

      allWorkflows.forEach(workflow => {
        expect(isDocTypeAllowedForWorkflow('registered_title', workflow)).toBe(true)
      })
    })

    it('should allow subdivision docs for subdivision workflow', () => {
      SUBDIVISION_DOC_KEYS.forEach(docKey => {
        expect(isDocTypeAllowedForWorkflow(docKey, 'subdivision')).toBe(true)
      })
    })

    it('should not allow regular-only docs for subdivision workflow', () => {
      const regularOnlyDocs = REGULAR_DOC_KEYS.filter(key => key !== 'registered_title')
      regularOnlyDocs.forEach(docKey => {
        expect(isDocTypeAllowedForWorkflow(docKey, 'subdivision')).toBe(false)
      })
    })
  })

  describe('getStageFilteringSummary', () => {
    it('should provide correct summary for subdivision property', () => {
      const property = createMockProperty({ subdivision_status: 'SUB_DIVISION_STARTED' })
      const summary = getStageFilteringSummary(property)
      
      expect(summary.workflowType).toBe('subdivision')
      expect(summary.stageRange).toBe('10-16')
      expect(summary.displayRange).toBe('1-7')
      expect(summary.documentCount).toBe(SUBDIVISION_DOC_KEYS.length)
      expect(summary.visibleDocuments).toEqual(SUBDIVISION_DOC_KEYS)
      const regularOnlyDocs = REGULAR_DOC_KEYS.filter(key => key !== 'registered_title')
      expect(summary.hiddenDocuments).toEqual(regularOnlyDocs)
    })

    it('should provide correct summary for regular property', () => {
      const property = createMockProperty()
      const summary = getStageFilteringSummary(property)
      
      expect(summary.workflowType).toBe('direct_addition')
      expect(summary.stageRange).toBe('1-10')
      expect(summary.displayRange).toBe('1-10')
      expect(summary.documentCount).toBe(REGULAR_DOC_KEYS.length)
      expect(summary.visibleDocuments).toEqual(REGULAR_DOC_KEYS)
      const subdivisionOnlyDocs = SUBDIVISION_DOC_KEYS.filter(key => key !== 'registered_title')
      expect(summary.hiddenDocuments).toEqual(subdivisionOnlyDocs)
    })
  })
})
