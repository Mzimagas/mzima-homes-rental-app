import { z } from 'zod'

const phoneRegex = /^\+?[0-9\s\-()]+$/

export const tenantCreateSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(120),
  phone: z.string().min(1, 'Phone is required').regex(phoneRegex, 'Enter a valid phone number'),
  alternate_phone: z.string().regex(phoneRegex, 'Enter a valid phone number').optional().nullable(),
  email: z.string().email('Enter a valid email').optional().nullable(),
  national_id: z.string().min(1, 'National ID is required').max(40),
  notes: z.string().optional().nullable(),
  emergency_contact_name: z.string().max(120).optional().nullable(),
  emergency_contact_phone: z.string().regex(phoneRegex, 'Enter a valid phone number').optional().nullable(),
  emergency_contact_relationship: z.string().max(60).optional().nullable(),
  emergency_contact_email: z.string().email('Enter a valid email').optional().nullable(),
  current_unit_id: z.string().uuid().optional().nullable(),
  monthly_rent_kes: z.coerce.number().positive('Monthly rent must be positive').optional().nullable(),
  align_billing_to_start: z.boolean().default(true).optional(),
  billing_day: z.coerce.number().int().min(1, 'Day must be 1-31').max(31, 'Day must be 1-31').optional().nullable(),
}).refine((val) => {
  // Emergency contact name and phone should be provided together
  const hasName = !!val.emergency_contact_name
  const hasPhone = !!val.emergency_contact_phone
  return (hasName && hasPhone) || (!hasName && !hasPhone)
}, { message: 'Emergency contact name and phone must be provided together', path: ['emergency_contact_name'] })

export const tenantUpdateSchema = tenantCreateSchema.partial().extend({
  id: z.string().uuid(),
})

export const tenantMoveSchema = z.object({
  new_unit_id: z.string().uuid('Please select a valid unit'),
  monthly_rent_kes: z.coerce.number().positive('Monthly rent must be positive').optional().nullable(),
  move_date: z.string().min(1, 'Move date is required').refine((date) => {
    const moveDate = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return moveDate >= today
  }, 'Move date cannot be in the past'),
  reason: z.string().max(500, 'Reason must be less than 500 characters').optional().nullable(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional().nullable(),
  end_current_agreement: z.boolean().default(true),
  align_billing_to_start: z.boolean().default(true),
  billing_day: z.coerce.number().int().min(1, 'Day must be 1-31').max(31, 'Day must be 1-31').optional().nullable(),
}).refine((data) => {
  // If monthly rent is provided, it should be reasonable (between 1000 and 1000000 KES)
  if (data.monthly_rent_kes !== null && data.monthly_rent_kes !== undefined) {
    return data.monthly_rent_kes >= 1000 && data.monthly_rent_kes <= 1000000
  }
  return true
}, {
  message: 'Monthly rent should be between 1,000 and 1,000,000 KES',
  path: ['monthly_rent_kes']
})

export type TenantCreateInput = z.infer<typeof tenantCreateSchema>
export type TenantUpdateInput = z.infer<typeof tenantUpdateSchema>
export type TenantMoveInput = z.infer<typeof tenantMoveSchema>

