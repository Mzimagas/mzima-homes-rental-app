import { z } from 'zod'

export interface PaymentMethodConfig {
  id: string
  label: string
  icon: string
  description: string
  requiresTxRef: boolean
  txRefLabel: string
  txRefPlaceholder: string
  txRefValidation?: z.ZodSchema
  isEnabled: boolean
  processingFee?: number
  processingTime: string
  instructions?: string[]
  supportedCurrencies: string[]
  minAmount?: number
  maxAmount?: number
}

// Enhanced payment method configurations
export const PAYMENT_METHODS: Record<string, PaymentMethodConfig> = {
  MPESA: {
    id: 'MPESA',
    label: 'M-Pesa',
    icon: '📱',
    description: 'Mobile money payment via Safaricom M-Pesa',
    requiresTxRef: true,
    txRefLabel: 'M-Pesa Transaction Code',
    txRefPlaceholder: 'QA12345678',
    txRefValidation: z
      .string()
      .min(10, 'M-Pesa transaction code must be 10 characters')
      .max(10, 'M-Pesa transaction code must be 10 characters')
      .regex(
        /^[A-Z0-9]{10}$/,
        'M-Pesa transaction code must contain only uppercase letters and numbers'
      ),
    isEnabled: true,
    processingFee: 0,
    processingTime: 'Instant',
    instructions: [
      'Go to M-Pesa menu on your phone',
      'Select "Lipa na M-Pesa"',
      'Select "Pay Bill"',
      'Enter business number: 123456',
      'Enter account number: Your tenant ID',
      'Enter amount and confirm',
      'Copy the transaction code (starts with Q)',
    ],
    supportedCurrencies: ['KES'],
    minAmount: 1,
    maxAmount: 300000,
  },

  AIRTEL_MONEY: {
    id: 'AIRTEL_MONEY',
    label: 'Airtel Money',
    icon: '📲',
    description: 'Mobile money payment via Airtel Money',
    requiresTxRef: true,
    txRefLabel: 'Airtel Money Transaction ID',
    txRefPlaceholder: 'AM123456789',
    txRefValidation: z
      .string()
      .min(8, 'Airtel Money transaction ID must be at least 8 characters')
      .max(15, 'Airtel Money transaction ID cannot exceed 15 characters')
      .regex(/^[A-Z0-9]+$/, 'Transaction ID must contain only uppercase letters and numbers'),
    isEnabled: true,
    processingFee: 0,
    processingTime: 'Instant',
    instructions: [
      'Dial *334# on your Airtel line',
      'Select "Pay Bills"',
      'Enter business number: 123456',
      'Enter amount and confirm',
      'Copy the transaction ID',
    ],
    supportedCurrencies: ['KES'],
    minAmount: 1,
    maxAmount: 150000,
  },

  BANK_TRANSFER: {
    id: 'BANK_TRANSFER',
    label: 'Bank Transfer',
    icon: '🏦',
    description: 'Direct bank transfer or online banking',
    requiresTxRef: true,
    txRefLabel: 'Bank Reference Number',
    txRefPlaceholder: 'FT123456789',
    txRefValidation: z
      .string()
      .min(5, 'Bank reference must be at least 5 characters')
      .max(30, 'Bank reference cannot exceed 30 characters')
      .regex(
        /^[A-Z0-9\-_]+$/,
        'Bank reference can only contain letters, numbers, hyphens, and underscores'
      ),
    isEnabled: true,
    processingFee: 0,
    processingTime: '1-3 business days',
    instructions: [
      'Log into your online banking or visit your bank',
      'Transfer to: Account Name - Property Management',
      'Account Number: 1234567890',
      'Bank: KCB Bank',
      'Reference: Your tenant ID',
      'Copy the transaction reference number',
    ],
    supportedCurrencies: ['KES', 'USD'],
    minAmount: 100,
    maxAmount: 10000000,
  },

  CHEQUE: {
    id: 'CHEQUE',
    label: 'Cheque',
    icon: '📝',
    description: 'Payment by bank cheque',
    requiresTxRef: true,
    txRefLabel: 'Cheque Number',
    txRefPlaceholder: '123456',
    txRefValidation: z
      .string()
      .min(6, 'Cheque number must be at least 6 digits')
      .max(12, 'Cheque number cannot exceed 12 digits')
      .regex(/^[0-9]+$/, 'Cheque number must contain only numbers'),
    isEnabled: true,
    processingFee: 0,
    processingTime: '3-5 business days',
    instructions: [
      'Write cheque payable to: Property Management Ltd',
      'Write the amount clearly in words and figures',
      'Sign the cheque',
      'Deliver to office or authorized agent',
      'Keep the cheque number for reference',
    ],
    supportedCurrencies: ['KES'],
    minAmount: 1000,
    maxAmount: 5000000,
  },

  CASH: {
    id: 'CASH',
    label: 'Cash',
    icon: '💵',
    description: 'Cash payment at office',
    requiresTxRef: false,
    txRefLabel: 'Receipt Number',
    txRefPlaceholder: 'Optional receipt number',
    isEnabled: true,
    processingFee: 0,
    processingTime: 'Instant',
    instructions: [
      'Visit our office during business hours',
      'Bring exact amount or change will be provided',
      'Request for official receipt',
      'Keep receipt for your records',
    ],
    supportedCurrencies: ['KES'],
    minAmount: 1,
    maxAmount: 500000,
  },

  CARD_PAYMENT: {
    id: 'CARD_PAYMENT',
    label: 'Card Payment',
    icon: '💳',
    description: 'Credit or debit card payment',
    requiresTxRef: true,
    txRefLabel: 'Authorization Code',
    txRefPlaceholder: 'AUTH123456',
    txRefValidation: z
      .string()
      .min(6, 'Authorization code must be at least 6 characters')
      .max(20, 'Authorization code cannot exceed 20 characters')
      .regex(/^[A-Z0-9]+$/, 'Authorization code must contain only uppercase letters and numbers'),
    isEnabled: false, // Disabled until payment gateway is integrated
    processingFee: 0.025, // 2.5% processing fee
    processingTime: 'Instant',
    instructions: [
      'Use our secure online payment portal',
      'Enter your card details',
      'Confirm payment amount',
      'Copy the authorization code',
    ],
    supportedCurrencies: ['KES', 'USD'],
    minAmount: 100,
    maxAmount: 1000000,
  },

  OTHER: {
    id: 'OTHER',
    label: 'Other',
    icon: '🔄',
    description: 'Other payment method (specify in notes)',
    requiresTxRef: false,
    txRefLabel: 'Reference',
    txRefPlaceholder: 'Payment reference',
    isEnabled: true,
    processingFee: 0,
    processingTime: 'Varies',
    instructions: [
      'Contact our office to arrange alternative payment',
      'Provide payment details in the notes section',
      'Obtain confirmation from our staff',
    ],
    supportedCurrencies: ['KES'],
    minAmount: 1,
    maxAmount: 10000000,
  },
}

// Get enabled payment methods
export function getEnabledPaymentMethods(): PaymentMethodConfig[] {
  return Object.values(PAYMENT_METHODS).filter((method) => method.isEnabled)
}

// Get payment method by ID
export function getPaymentMethod(id: string): PaymentMethodConfig | undefined {
  return PAYMENT_METHODS[id]
}

// Validate payment amount for method
export function validatePaymentAmount(
  methodId: string,
  amount: number
): { isValid: boolean; error?: string } {
  const method = getPaymentMethod(methodId)
  if (!method) {
    return { isValid: false, error: 'Invalid payment method' }
  }

  if (method.minAmount && amount < method.minAmount) {
    return {
      isValid: false,
      error: `Minimum amount for ${method.label} is ${method.minAmount} KES`,
    }
  }

  if (method.maxAmount && amount > method.maxAmount) {
    return {
      isValid: false,
      error: `Maximum amount for ${method.label} is ${method.maxAmount.toLocaleString()} KES`,
    }
  }

  return { isValid: true }
}

// Calculate processing fee
export function calculateProcessingFee(methodId: string, amount: number): number {
  const method = getPaymentMethod(methodId)
  if (!method || !method.processingFee) {
    return 0
  }

  // If processing fee is a percentage (< 1), calculate percentage
  if (method.processingFee < 1) {
    return Math.round(amount * method.processingFee * 100) / 100
  }

  // Otherwise, it's a fixed fee
  return method.processingFee
}

// Get payment method options for form select
export function getPaymentMethodOptions() {
  return getEnabledPaymentMethods().map((method) => ({
    value: method.id,
    label: `${method.icon} ${method.label}`,
    description: method.description,
  }))
}

// Validate transaction reference for specific method
export function validateTransactionReference(
  methodId: string,
  txRef: string
): { isValid: boolean; error?: string } {
  const method = getPaymentMethod(methodId)
  if (!method) {
    return { isValid: false, error: 'Invalid payment method' }
  }

  // If transaction reference is required but not provided
  if (method.requiresTxRef && (!txRef || txRef.trim() === '')) {
    return {
      isValid: false,
      error: `${method.txRefLabel} is required for ${method.label} payments`,
    }
  }

  // If transaction reference is provided and method has validation
  if (txRef && method.txRefValidation) {
    try {
      method.txRefValidation.parse(txRef)
      return { isValid: true }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          error: error.issues[0]?.message || 'Invalid transaction reference format',
        }
      }
    }
  }

  return { isValid: true }
}
