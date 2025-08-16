import { z } from 'zod'

export const paymentSchema = z.object({
  tenantId: z.string().uuid({ message: 'Please select a tenant' }),
  amount: z.coerce.number().positive('Enter a valid amount'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  method: z.enum(['MPESA','CASH','BANK_TRANSFER','CHEQUE','OTHER']),
  txRef: z.string().max(120).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
})

export type PaymentFormValues = z.infer<typeof paymentSchema>

