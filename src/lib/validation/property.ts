import { z } from 'zod'

export const propertySchema = z.object({
  name: z.string().min(1, 'Property name is required').max(120),
  physicalAddress: z.string().min(1, 'Physical address is required').max(250),
  lat: z.number().gte(-90).lte(90).optional(),
  lng: z.number().gte(-180).lte(180).optional(),
  notes: z.string().max(1000).optional().or(z.literal('')),
}).refine((val) => {
  // If one coordinate provided, require the other
  if ((val.lat !== undefined && val.lng === undefined) || (val.lng !== undefined && val.lat === undefined)) return false
  return true
}, { message: 'Please provide both latitude and longitude, or leave both empty', path: ['lat'] })

export type PropertyFormValues = z.infer<typeof propertySchema>

