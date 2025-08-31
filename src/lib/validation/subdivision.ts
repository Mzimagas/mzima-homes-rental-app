/**
 * Validation schemas for subdivision management
 */

import { z } from 'zod'

/**
 * Schema for subdivision form validation
 * Essential fields are required for proper change tracking
 */
export const subdivisionSchema = z.object({
  subdivisionName: z.string().min(1, 'Subdivision name is required'),
  totalPlotsPlanned: z.coerce.number().int().positive('Must be a positive number'),
  surveyorName: z.string().min(1, 'Surveyor name is required'),
  surveyorContact: z.string().min(1, 'Surveyor contact is required'),
  approvalAuthority: z.string().optional(),
  surveyCost: z.coerce.number().min(0, 'Survey cost must be 0 or positive'),
  approvalFees: z.coerce.number().min(0).optional(),
  expectedPlotValue: z.coerce.number().positive('Expected plot value must be positive'),
  targetCompletionDate: z.string().min(1, 'Target completion date is required'),
  subdivisionNotes: z.string().optional(),
})

/**
 * Schema for plot form validation
 */
export const plotSchema = z.object({
  plotNumber: z.string().min(1, 'Plot number is required'),
  plotSizeSqm: z.coerce.number().positive('Plot size must be positive'),
  estimatedValue: z.coerce.number().positive().optional(),
  plotNotes: z.string().optional(),
})

/**
 * Inferred types from schemas
 */
export type SubdivisionFormValues = z.infer<typeof subdivisionSchema>
export type PlotFormValues = z.infer<typeof plotSchema>

/**
 * Validation helper functions
 */
export const validateSubdivisionData = (data: unknown): SubdivisionFormValues => {
  return subdivisionSchema.parse(data)
}

export const validatePlotData = (data: unknown): PlotFormValues => {
  return plotSchema.parse(data)
}

/**
 * Safe validation that returns result with error handling
 */
export const safeValidateSubdivision = (data: unknown) => {
  return subdivisionSchema.safeParse(data)
}

export const safeValidatePlot = (data: unknown) => {
  return plotSchema.safeParse(data)
}
