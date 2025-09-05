import {
  getPropertyPipelineType,
  getPropertyStatusForFilter,
  filterByPipeline,
  filterByStatus,
  filterByPropertyTypes,
  filterBySearchTerm,
  applyPropertyFilters,
  getFilterCounts,
  PropertyFilters
} from '../stage-filtering.utils'
import { PropertyWithLifecycle } from '../../types/property-management.types'

// Mock property data for testing
const mockProperties: PropertyWithLifecycle[] = [
  {
    id: '1',
    name: 'Test Property 1',
    physical_address: '123 Test Street',
    property_type: 'APARTMENT',
    property_source: 'DIRECT_ADDITION',
    lifecycle_status: 'RENTAL_READY',
    subdivision_status: 'NOT_STARTED',
    handover_status: 'NOT_STARTED',
    notes: 'Test notes'
  },
  {
    id: '2',
    name: 'Test Property 2',
    physical_address: '456 Purchase Ave',
    property_type: 'HOUSE',
    property_source: 'PURCHASE_PIPELINE',
    lifecycle_status: 'ACQUISITION',
    subdivision_status: 'NOT_STARTED',
    handover_status: 'NOT_STARTED',
    notes: 'Purchase pipeline property'
  },
  {
    id: '3',
    name: 'Subdivision Property',
    physical_address: '789 Subdivision Rd',
    property_type: 'LAND',
    property_source: 'DIRECT_ADDITION',
    lifecycle_status: 'SUBDIVISION',
    subdivision_status: 'SUB_DIVISION_STARTED',
    handover_status: 'NOT_STARTED',
    notes: 'Being subdivided'
  },
  {
    id: '4',
    name: 'Handover Property',
    physical_address: '321 Handover St',
    property_type: 'COMMERCIAL',
    property_source: 'DIRECT_ADDITION',
    lifecycle_status: 'HANDOVER',
    subdivision_status: 'NOT_STARTED',
    handover_status: 'IN_PROGRESS',
    notes: 'In handover process'
  }
] as PropertyWithLifecycle[]

describe('Property Filter Utils', () => {
  describe('getPropertyPipelineType', () => {
    it('should return subdivision for properties with subdivision status', () => {
      expect(getPropertyPipelineType(mockProperties[2])).toBe('subdivision')
    })

    it('should return handover for properties with handover status', () => {
      expect(getPropertyPipelineType(mockProperties[3])).toBe('handover')
    })

    it('should return purchase_pipeline for properties from purchase pipeline', () => {
      expect(getPropertyPipelineType(mockProperties[1])).toBe('purchase_pipeline')
    })

    it('should return direct_addition for direct addition properties', () => {
      expect(getPropertyPipelineType(mockProperties[0])).toBe('direct_addition')
    })
  })

  describe('getPropertyStatusForFilter', () => {
    it('should return active for properties in subdivision', () => {
      expect(getPropertyStatusForFilter(mockProperties[2])).toBe('active')
    })

    it('should return active for properties in handover', () => {
      expect(getPropertyStatusForFilter(mockProperties[3])).toBe('active')
    })

    it('should return active for normal properties', () => {
      expect(getPropertyStatusForFilter(mockProperties[0])).toBe('active')
    })
  })

  describe('filterByPipeline', () => {
    it('should return all properties when filter is "all"', () => {
      const result = filterByPipeline(mockProperties, 'all')
      expect(result).toHaveLength(4)
    })

    it('should filter by direct addition', () => {
      const result = filterByPipeline(mockProperties, 'direct_addition')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('should filter by purchase pipeline', () => {
      const result = filterByPipeline(mockProperties, 'purchase_pipeline')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('2')
    })

    it('should filter by subdivision', () => {
      const result = filterByPipeline(mockProperties, 'subdivision')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('3')
    })

    it('should filter by handover', () => {
      const result = filterByPipeline(mockProperties, 'handover')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('4')
    })
  })

  describe('filterByPropertyTypes', () => {
    it('should return all properties when no types specified', () => {
      const result = filterByPropertyTypes(mockProperties, [])
      expect(result).toHaveLength(4)
    })

    it('should filter by single property type', () => {
      const result = filterByPropertyTypes(mockProperties, ['APARTMENT'])
      expect(result).toHaveLength(1)
      expect(result[0].property_type).toBe('APARTMENT')
    })

    it('should filter by multiple property types', () => {
      const result = filterByPropertyTypes(mockProperties, ['APARTMENT', 'HOUSE'])
      expect(result).toHaveLength(2)
    })
  })

  describe('filterBySearchTerm', () => {
    it('should return all properties when search term is empty', () => {
      const result = filterBySearchTerm(mockProperties, '')
      expect(result).toHaveLength(4)
    })

    it('should filter by property name', () => {
      const result = filterBySearchTerm(mockProperties, 'Subdivision')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Subdivision Property')
    })

    it('should filter by address', () => {
      const result = filterBySearchTerm(mockProperties, 'Purchase Ave')
      expect(result).toHaveLength(1)
      expect(result[0].physical_address).toContain('Purchase Ave')
    })

    it('should filter by property type', () => {
      const result = filterBySearchTerm(mockProperties, 'APARTMENT')
      expect(result).toHaveLength(1)
    })

    it('should be case insensitive', () => {
      const result = filterBySearchTerm(mockProperties, 'subdivision')
      expect(result).toHaveLength(1)
    })
  })

  describe('applyPropertyFilters', () => {
    const filters: PropertyFilters = {
      pipeline: 'all',
      status: 'all',
      propertyTypes: [],
      searchTerm: ''
    }

    it('should apply all filters correctly', () => {
      const combinedFilters: PropertyFilters = {
        pipeline: 'direct_addition',
        status: 'active',
        propertyTypes: ['APARTMENT'],
        searchTerm: 'Test'
      }

      const result = applyPropertyFilters(mockProperties, combinedFilters)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('should return empty array when no properties match', () => {
      const strictFilters: PropertyFilters = {
        pipeline: 'purchase_pipeline',
        status: 'all',
        propertyTypes: ['APARTMENT'],
        searchTerm: ''
      }

      const result = applyPropertyFilters(mockProperties, strictFilters)
      expect(result).toHaveLength(0)
    })
  })

  describe('getFilterCounts', () => {
    it('should return correct counts for each pipeline type', () => {
      const counts = getFilterCounts(mockProperties)
      
      expect(counts.all).toBe(4)
      expect(counts.direct_addition).toBe(1)
      expect(counts.purchase_pipeline).toBe(1)
      expect(counts.subdivision).toBe(1)
      expect(counts.handover).toBe(1)
    })
  })
})
