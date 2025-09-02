/**
 * Tenant Management Validation Schemas
 * 
 * Extracted from TenantManagement.tsx to improve maintainability
 * and enable reuse across tenant-related components.
 */

import { z } from 'zod'

// Phone number validation regex
export const phoneRegex = /^\+?[0-9\s\-()]+$/

/**
 * Tenant form validation schema
 */
export const tenantSchema = z
  .object({
    full_name: z.string().min(1, 'Full name is required').max(120),
    phone: z.string().min(1, 'Phone is required').regex(phoneRegex, 'Enter a valid phone number'),
    alternate_phone: z
      .string()
      .regex(phoneRegex, 'Enter a valid phone number')
      .optional()
      .or(z.literal('')),
    email: z.string().email('Enter a valid email').optional().or(z.literal('')),
    national_id: z.string().min(1, 'National ID is required').max(40),
    employer: z.string().max(120).optional().or(z.literal('')),
    emergency_contact_name: z.string().max(120).optional().or(z.literal('')),
    emergency_contact_phone: z
      .string()
      .regex(phoneRegex, 'Enter a valid phone number')
      .optional()
      .or(z.literal('')),
    emergency_contact_relationship: z.string().max(60).optional().or(z.literal('')),
    emergency_contact_email: z.string().email('Enter a valid email').optional().or(z.literal('')),
    notes: z.string().optional().or(z.literal('')),
  })
  .refine(
    (val) => {
      // Emergency contact name and phone should be provided together
      const hasName = !!val.emergency_contact_name
      const hasPhone = !!val.emergency_contact_phone
      return (hasName && hasPhone) || (!hasName && !hasPhone)
    },
    {
      message: 'Emergency contact name and phone must be provided together',
      path: ['emergency_contact_name'],
    }
  )

/**
 * Lease form validation schema
 */
export const leaseSchema = z.object({
  tenant_id: z.string().min(1, 'Tenant is required'),
  unit_id: z.string().min(1, 'Unit is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  monthly_rent_kes: z.number().min(1, 'Monthly rent must be greater than 0'),
  security_deposit_kes: z.number().min(0, 'Security deposit must be 0 or greater'),
  notes: z.string().optional().or(z.literal('')),
})

// Type exports for use in components
export type TenantFormData = z.infer<typeof tenantSchema>
export type LeaseFormData = z.infer<typeof leaseSchema>

/**
 * Validation helper functions
 */
export const validateTenantForm = (data: unknown) => {
  return tenantSchema.safeParse(data)
}

export const validateLeaseForm = (data: unknown) => {
  return leaseSchema.safeParse(data)
}

/**
 * Form field validation helpers
 */
export const isValidPhone = (phone: string): boolean => {
  return phoneRegex.test(phone)
}

export const isValidEmail = (email: string): boolean => {
  if (!email) return true // Optional field
  return z.string().email().safeParse(email).success
}

/**
 * Emergency contact validation
 */
export const validateEmergencyContact = (name?: string, phone?: string): boolean => {
  const hasName = !!name?.trim()
  const hasPhone = !!phone?.trim()
  return (hasName && hasPhone) || (!hasName && !hasPhone)
}
