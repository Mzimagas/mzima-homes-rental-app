import { z } from 'zod'

// Enhanced payment validation schema with comprehensive validation rules
export const paymentSchema = z.object({
  tenantId: z.string().uuid({ message: 'Please select a tenant' }),
  unitId: z.string().uuid({ message: 'Please select a unit' }).optional(),
  amount: z
    .number()
    .positive('Enter a valid amount')
    .min(1, 'Amount must be at least 1 KES')
    .max(10000000, 'Amount cannot exceed 10,000,000 KES')
    .refine((val) => Number.isFinite(val), 'Amount must be a valid number')
    .refine((val) => val % 0.01 === 0 || val % 1 === 0, 'Amount can have at most 2 decimal places'),
  paymentDate: z
    .string()
    .min(1, 'Payment date is required')
    .refine((date) => {
      const paymentDate = new Date(date)
      const today = new Date()
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(today.getFullYear() - 1)
      const oneWeekFromNow = new Date()
      oneWeekFromNow.setDate(today.getDate() + 7)

      return paymentDate >= oneYearAgo && paymentDate <= oneWeekFromNow
    }, 'Payment date must be within the last year and not more than a week in the future'),
  method: z.enum(['MPESA', 'CASH', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'], {
    message: 'Please select a valid payment method',
  }),
  txRef: z
    .string()
    .max(120, 'Transaction reference cannot exceed 120 characters')
    .optional()
    .or(z.literal(''))
    .refine((val) => {
      if (!val || val === '') return true
      // Basic validation for transaction reference format
      return /^[A-Za-z0-9\-_.]+$/.test(val)
    }, 'Transaction reference can only contain letters, numbers, hyphens, underscores, and periods'),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional().or(z.literal('')),
})

// Enhanced payment method validation with method-specific rules
export const paymentMethodValidation = {
  MPESA: z.object({
    txRef: z
      .string()
      .min(1, 'M-Pesa transaction code is required')
      .regex(
        /^[A-Z0-9]{10}$/,
        'M-Pesa transaction code must be 10 characters (letters and numbers)'
      ),
  }),
  BANK_TRANSFER: z.object({
    txRef: z
      .string()
      .min(1, 'Bank reference number is required')
      .min(5, 'Bank reference must be at least 5 characters'),
  }),
  CHEQUE: z.object({
    txRef: z
      .string()
      .min(1, 'Cheque number is required')
      .regex(/^[0-9]{6,12}$/, 'Cheque number must be 6-12 digits'),
  }),
  CASH: z.object({
    txRef: z.string().optional(),
  }),
  OTHER: z.object({
    txRef: z.string().optional(),
    notes: z.string().min(1, 'Please provide details in notes for other payment methods'),
  }),
}

// Payment status enum for tracking
export const PaymentStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const

export type PaymentFormValues = z.infer<typeof paymentSchema>
export type PaymentMethod = PaymentFormValues['method']
export type PaymentStatusType = (typeof PaymentStatus)[keyof typeof PaymentStatus]

// Validation function for method-specific requirements
export function validatePaymentByMethod(payment: PaymentFormValues): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  try {
    switch (payment.method) {
      case 'MPESA':
        paymentMethodValidation.MPESA.parse({ txRef: payment.txRef })
        break
      case 'BANK_TRANSFER':
        paymentMethodValidation.BANK_TRANSFER.parse({ txRef: payment.txRef })
        break
      case 'CHEQUE':
        paymentMethodValidation.CHEQUE.parse({ txRef: payment.txRef })
        break
      case 'OTHER':
        paymentMethodValidation.OTHER.parse({ txRef: payment.txRef, notes: payment.notes })
        break
      case 'CASH':
        // Cash payments don't require transaction reference
        break
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      errors.push(...error.issues.map((e) => e.message))
    }
  }

  // Basic sanity: if unitId provided, it's fine; if not, we rely on tenantId
  return { isValid: errors.length === 0, errors }
}
