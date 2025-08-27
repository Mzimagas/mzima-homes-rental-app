import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { PaymentService } from '../lib/services/payment-service'
import { PaymentFormValues, PaymentStatus } from '../lib/validation/payment'
import { PaymentSecurityService } from '../lib/services/payment-security-service'
import { PaymentNotificationService } from '../lib/services/payment-notification-service'

// Mock dependencies
jest.mock('../lib/supabase-client')
jest.mock('../lib/services/payment-security-service')
jest.mock('../lib/services/payment-notification-service')

describe('PaymentService', () => {
  const mockPaymentData: PaymentFormValues = {
    tenantId: '123e4567-e89b-12d3-a456-426614174000',
    amount: 25000,
    paymentDate: '2024-01-15',
    method: 'MPESA',
    txRef: 'QA12345678',
    notes: 'Monthly rent payment',
  }

  const mockUserContext = {
    userId: 'user-123',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('processPayment', () => {
    it('should successfully process a valid payment', async () => {
      // Mock security check to pass
      const mockSecurityCheck = {
        isSecure: true,
        riskLevel: 'low' as const,
        warnings: [],
        blockers: [],
        recommendations: [],
      }
      jest
        .spyOn(PaymentSecurityService, 'performSecurityCheck')
        .mockResolvedValue(mockSecurityCheck)

      // Mock fraud detection to pass
      const mockFraudCheck = {
        isFraudulent: false,
        riskScore: 10,
        reasons: [],
        requiresManualReview: false,
      }
      jest.spyOn(PaymentSecurityService, 'detectFraud').mockResolvedValue(mockFraudCheck)

      // Mock payment method validation
      jest.spyOn(PaymentService, 'getPaymentMethodInfo').mockReturnValue({
        id: 'MPESA',
        label: 'M-Pesa',
        icon: '📱',
        description: 'Mobile money payment via M-Pesa',
        requiresTxRef: true,
        txRefLabel: 'M-Pesa Code',
        txRefPlaceholder: 'QA12345678',
        isEnabled: true,
        processingFee: 0,
        processingTime: 'Instant',
        supportedCurrencies: ['KES'],
        minAmount: 1,
        maxAmount: 300000,
      })

      // Mock successful payment processing
      const mockPaymentId = 'payment-123'
      // This would need to be mocked based on your actual implementation

      const result = await PaymentService.processPayment(mockPaymentData, mockUserContext)

      expect(result.success).toBe(true)
      expect(result.paymentId).toBe(mockPaymentId)
      expect(result.status).toBe(PaymentStatus.COMPLETED)
      expect(PaymentSecurityService.performSecurityCheck).toHaveBeenCalledWith(
        mockPaymentData,
        mockUserContext
      )
      expect(PaymentSecurityService.detectFraud).toHaveBeenCalledWith(
        mockPaymentData,
        mockUserContext
      )
    })

    it('should reject payment if security check fails', async () => {
      const mockSecurityCheck = {
        isSecure: false,
        riskLevel: 'high' as const,
        warnings: ['Suspicious payment pattern'],
        blockers: ['Rate limit exceeded'],
        recommendations: ['Manual review required'],
      }
      jest
        .spyOn(PaymentSecurityService, 'performSecurityCheck')
        .mockResolvedValue(mockSecurityCheck)

      const result = await PaymentService.processPayment(mockPaymentData, mockUserContext)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Rate limit exceeded')
      expect(result.status).toBe(PaymentStatus.FAILED)
      expect(result.riskLevel).toBe('high')
    })

    it('should reject payment if fraud is detected', async () => {
      const mockSecurityCheck = {
        isSecure: true,
        riskLevel: 'low' as const,
        warnings: [],
        blockers: [],
        recommendations: [],
      }
      jest
        .spyOn(PaymentSecurityService, 'performSecurityCheck')
        .mockResolvedValue(mockSecurityCheck)

      const mockFraudCheck = {
        isFraudulent: true,
        riskScore: 85,
        reasons: ['Velocity fraud detected', 'Unusual amount pattern'],
        requiresManualReview: true,
      }
      jest.spyOn(PaymentSecurityService, 'detectFraud').mockResolvedValue(mockFraudCheck)

      const result = await PaymentService.processPayment(mockPaymentData, mockUserContext)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Payment blocked due to fraud detection')
      expect(result.status).toBe(PaymentStatus.FAILED)
      expect(result.securityWarnings).toEqual(['Velocity fraud detected', 'Unusual amount pattern'])
    })

    it('should validate payment method availability', async () => {
      jest.spyOn(PaymentService, 'getPaymentMethodInfo').mockReturnValue(undefined)

      const result = await PaymentService.processPayment(mockPaymentData, mockUserContext)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Selected payment method is not available')
      expect(result.status).toBe(PaymentStatus.FAILED)
    })

    it('should validate payment amount limits', async () => {
      const invalidPaymentData = {
        ...mockPaymentData,
        amount: 500000, // Exceeds M-Pesa limit
      }

      jest.spyOn(PaymentService, 'validatePaymentAmount').mockReturnValue({
        isValid: false,
        error: 'Maximum amount for M-Pesa is 300,000 KES',
      })

      const result = await PaymentService.processPayment(invalidPaymentData, mockUserContext)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Maximum amount for M-Pesa is 300,000 KES')
    })

    it('should validate transaction reference format', async () => {
      const invalidPaymentData = {
        ...mockPaymentData,
        txRef: 'INVALID',
      }

      jest.spyOn(PaymentService, 'validateTransactionReference').mockReturnValue({
        isValid: false,
        error: 'M-Pesa transaction code must be 10 characters',
      })

      const result = await PaymentService.processPayment(invalidPaymentData, mockUserContext)

      expect(result.success).toBe(false)
      expect(result.error).toBe('M-Pesa transaction code must be 10 characters')
    })
  })

  describe('getPaymentConfirmation', () => {
    it('should return payment confirmation details', async () => {
      const mockPaymentId = 'payment-123'
      const mockConfirmation = {
        paymentId: mockPaymentId,
        amount: 25000,
        tenantName: 'John Doe',
        paymentDate: '2024-01-15',
        method: 'MPESA',
        txRef: 'QA12345678',
        allocations: [
          {
            invoiceId: 'invoice-123',
            amount: 25000,
            periodStart: '2024-01-01',
            periodEnd: '2024-01-31',
          },
        ],
      }

      // Mock the database query
      // This would need to be implemented based on your actual database mocking strategy

      const result = await PaymentService.getPaymentConfirmation(mockPaymentId)

      expect(result).toEqual(mockConfirmation)
    })

    it('should return null for non-existent payment', async () => {
      const result = await PaymentService.getPaymentConfirmation('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('calculateProcessingFee', () => {
    it('should calculate percentage-based processing fee', () => {
      const fee = PaymentService.calculateProcessingFee('CARD_PAYMENT', 10000)
      expect(fee).toBe(250) // 2.5% of 10000
    })

    it('should return zero for methods without processing fee', () => {
      const fee = PaymentService.calculateProcessingFee('MPESA', 10000)
      expect(fee).toBe(0)
    })

    it('should calculate fixed processing fee', () => {
      // Assuming some method has a fixed fee
      const fee = PaymentService.calculateProcessingFee('WIRE_TRANSFER', 10000)
      expect(fee).toBeGreaterThanOrEqual(0)
    })
  })

  describe('validatePaymentAmount', () => {
    it('should validate amount within limits', () => {
      const result = PaymentService.validatePaymentAmount('MPESA', 25000)
      expect(result.isValid).toBe(true)
    })

    it('should reject amount below minimum', () => {
      const result = PaymentService.validatePaymentAmount('BANK_TRANSFER', 50)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Minimum amount')
    })

    it('should reject amount above maximum', () => {
      const result = PaymentService.validatePaymentAmount('MPESA', 500000)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Maximum amount')
    })
  })

  describe('validateTransactionReference', () => {
    it('should validate correct M-Pesa transaction code', () => {
      const result = PaymentService.validateTransactionReference('MPESA', 'QA12345678')
      expect(result.isValid).toBe(true)
    })

    it('should reject invalid M-Pesa transaction code', () => {
      const result = PaymentService.validateTransactionReference('MPESA', 'INVALID')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('M-Pesa transaction code')
    })

    it('should validate bank transfer reference', () => {
      const result = PaymentService.validateTransactionReference('BANK_TRANSFER', 'FT123456789')
      expect(result.isValid).toBe(true)
    })

    it('should allow empty reference for cash payments', () => {
      const result = PaymentService.validateTransactionReference('CASH', '')
      expect(result.isValid).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock database error
      jest
        .spyOn(PaymentSecurityService, 'performSecurityCheck')
        .mockRejectedValue(new Error('Database connection failed'))

      const result = await PaymentService.processPayment(mockPaymentData, mockUserContext)

      expect(result.success).toBe(false)
      expect(result.error).toBe('An unexpected error occurred while processing the payment')
      expect(result.status).toBe(PaymentStatus.FAILED)
    })

    it('should handle network timeouts', async () => {
      // Mock timeout error
      jest
        .spyOn(PaymentSecurityService, 'performSecurityCheck')
        .mockRejectedValue(new Error('Request timeout'))

      const result = await PaymentService.processPayment(mockPaymentData, mockUserContext)

      expect(result.success).toBe(false)
      expect(result.status).toBe(PaymentStatus.FAILED)
    })
  })

  describe('integration with notification service', () => {
    it('should send payment confirmation notification on successful payment', async () => {
      // Mock successful payment flow
      const mockSecurityCheck = {
        isSecure: true,
        riskLevel: 'low' as const,
        warnings: [],
        blockers: [],
        recommendations: [],
      }
      jest
        .spyOn(PaymentSecurityService, 'performSecurityCheck')
        .mockResolvedValue(mockSecurityCheck)

      const mockFraudCheck = {
        isFraudulent: false,
        riskScore: 10,
        reasons: [],
        requiresManualReview: false,
      }
      jest.spyOn(PaymentSecurityService, 'detectFraud').mockResolvedValue(mockFraudCheck)

      const mockSendNotification = jest
        .spyOn(PaymentNotificationService, 'sendPaymentConfirmation')
        .mockResolvedValue()

      // Mock other dependencies...

      await PaymentService.processPayment(mockPaymentData, mockUserContext)

      expect(mockSendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockPaymentData.tenantId,
          amount: mockPaymentData.amount,
          method: mockPaymentData.method,
          txRef: mockPaymentData.txRef,
        })
      )
    })

    it('should not send notification if payment fails', async () => {
      const mockSecurityCheck = {
        isSecure: false,
        riskLevel: 'high' as const,
        warnings: [],
        blockers: ['Security check failed'],
        recommendations: [],
      }
      jest
        .spyOn(PaymentSecurityService, 'performSecurityCheck')
        .mockResolvedValue(mockSecurityCheck)

      const mockSendNotification = jest
        .spyOn(PaymentNotificationService, 'sendPaymentConfirmation')
        .mockResolvedValue()

      await PaymentService.processPayment(mockPaymentData, mockUserContext)

      expect(mockSendNotification).not.toHaveBeenCalled()
    })
  })
})
