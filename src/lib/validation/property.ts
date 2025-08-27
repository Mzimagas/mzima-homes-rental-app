import { z } from 'zod'

// Property type enum matching database
export const PropertyTypeEnum = z.enum([
  'HOME',
  'HOSTEL',
  'STALL',
  'RESIDENTIAL_LAND',
  'COMMERCIAL_LAND',
  'AGRICULTURAL_LAND',
  'MIXED_USE_LAND',
])

export const propertySchema = z
  .object({
    name: z.string().min(1, 'Property name is required').max(120),
    physical_address: z.string().max(250).optional().or(z.literal('')),
    property_type: PropertyTypeEnum.default('HOME'),
    lat: z.number().gte(-90).lte(90).optional(),
    lng: z.number().gte(-180).lte(180).optional(),
    notes: z.string().max(1000).optional().or(z.literal('')),
    default_billing_day: z.number().int().min(1).max(31).optional(),
    default_align_billing_to_start: z.boolean().default(true),
  })
  .refine(
    (val) => {
      // If one coordinate provided, require the other
      if (
        (val.lat !== undefined && val.lng === undefined) ||
        (val.lng !== undefined && val.lat === undefined)
      )
        return false
      return true
    },
    { message: 'Please provide both latitude and longitude, or leave both empty', path: ['lat'] }
  )

// Land-specific details schema
export const landDetailsSchema = z.object({
  totalAreaSqm: z.number().positive('Area must be positive').optional(),
  totalAreaAcres: z.number().positive('Area must be positive').optional(),
  frontageMeters: z.number().positive('Frontage must be positive').optional(),
  zoningClassification: z.string().max(100).optional(),
  titleDeedNumber: z.string().max(50).optional(),
  surveyPlanNumber: z.string().max(50).optional(),
  developmentPermitStatus: z.enum(['APPROVED', 'PENDING', 'NOT_REQUIRED', 'DENIED']).optional(),
  electricityAvailable: z.boolean().default(false),
  waterAvailable: z.boolean().default(false),
  sewerAvailable: z.boolean().default(false),
  roadAccessType: z.string().max(50).optional(),
  internetAvailable: z.boolean().default(false),
  topography: z.string().max(50).optional(),
  soilType: z.string().max(50).optional(),
  drainageStatus: z.string().max(100).optional(),
  salePriceKes: z.number().positive('Sale price must be positive').optional(),
  leasePricePerSqmKes: z.number().positive('Lease price must be positive').optional(),
  leaseDurationYears: z.number().int().positive('Lease duration must be positive').optional(),
  priceNegotiable: z.boolean().default(true),
  developmentPotential: z.string().max(500).optional(),
  nearbyLandmarks: z.array(z.string().max(100)).optional(),
  environmentalRestrictions: z.array(z.string().max(200)).optional(),
  buildingRestrictions: z.array(z.string().max(200)).optional(),
  easements: z.array(z.string().max(200)).optional(),
})

export type PropertyFormValues = z.infer<typeof propertySchema>
export type LandDetailsFormValues = z.infer<typeof landDetailsSchema>
export type PropertyType = z.infer<typeof PropertyTypeEnum>

// Helper functions
const normalizeType = (type: any): PropertyType => {
  const options = PropertyTypeEnum.options as readonly string[]
  if (typeof type === 'string' && (options as any).includes(type)) return type as PropertyType
  return 'HOME'
}

export const isLandProperty = (type: PropertyType): boolean => {
  const t = normalizeType(type)
  return ['RESIDENTIAL_LAND', 'COMMERCIAL_LAND', 'AGRICULTURAL_LAND', 'MIXED_USE_LAND'].includes(t)
}

export const getPropertyTypeLabel = (type: PropertyType): string => {
  const labels: Record<PropertyType, string> = {
    HOME: 'Homes',
    HOSTEL: 'Hostels',
    STALL: 'Stalls',
    RESIDENTIAL_LAND: 'Residential Land',
    COMMERCIAL_LAND: 'Commercial Land',
    AGRICULTURAL_LAND: 'Agricultural Land',
    MIXED_USE_LAND: 'Mixed-Use Land',
  }
  const key = normalizeType(type)
  return labels[key]
}

// Enhanced property schema with conditional validation
export const enhancedPropertySchema = propertySchema.refine(
  (data) => {
    // For land properties, certain fields might be required in the future
    if (isLandProperty(data.property_type)) {
      // Land-specific validation can be added here
      return true
    }
    return true
  },
  {
    message: 'Invalid property configuration for the selected type',
    path: ['property_type'],
  }
)

// Property type categories for UI grouping
export const getPropertyTypeCategory = (type: PropertyType): 'rental' | 'land' => {
  return isLandProperty(type) ? 'land' : 'rental'
}

// Property type icons mapping
export const getPropertyTypeIcon = (type: PropertyType): string => {
  const icons: Record<PropertyType, string> = {
    HOME: '🏠',
    HOSTEL: '🏢',
    STALL: '🏪',
    RESIDENTIAL_LAND: '🏞️',
    COMMERCIAL_LAND: '🏗️',
    AGRICULTURAL_LAND: '🌾',
    MIXED_USE_LAND: '🏘️',
  }
  const key = normalizeType(type)
  return icons[key]
}

// Property type colors for UI consistency
export const getPropertyTypeColor = (type: PropertyType): string => {
  const colors: Record<PropertyType, string> = {
    HOME: 'blue',
    HOSTEL: 'purple',
    STALL: 'green',
    RESIDENTIAL_LAND: 'amber',
    COMMERCIAL_LAND: 'orange',
    AGRICULTURAL_LAND: 'emerald',
    MIXED_USE_LAND: 'indigo',
  }
  const key = normalizeType(type)
  return colors[key]
}
