import { z } from 'zod'

const phoneRegex = /^\+?[0-9\s\-()]+$/

export const tenantSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(120),
  phone: z.string().min(1, 'Phone number is required').regex(phoneRegex, 'Enter a valid phone number'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  nationalId: z.string().max(40).optional().or(z.literal('')),
  emergencyContactName: z.string().max(120).optional().or(z.literal('')),
  emergencyContactPhone: z.string().regex(phoneRegex, 'Enter a valid phone number').optional().or(z.literal('')),
  emergencyContactRelationship: z.string().max(60).optional().or(z.literal('')),
  emergencyContactEmail: z.string().email('Enter a valid email').optional().or(z.literal('')),
  unitId: z.string().uuid().optional().or(z.literal('')),
}).refine((val) => {
  // Emergency contact name and phone should be provided together
  const hasName = !!val.emergencyContactName
  const hasPhone = !!val.emergencyContactPhone
  return (hasName && hasPhone) || (!hasName && !hasPhone)
}, { message: 'Emergency contact name and phone must be provided together', path: ['emergencyContactName'] })

export type TenantFormValues = z.infer<typeof tenantSchema>

