import supabase, { clientBusinessFunctions } from '../supabase-client'
import {
  PaymentFormValues,
  PaymentStatus,
  PaymentStatusType,
  validatePaymentByMethod,
} from '../validation/payment'
import {
  getPaymentMethod,
  validatePaymentAmount,
  validateTransactionReference,
  calculateProcessingFee,
  getEnabledPaymentMethods,
} from '../config/payment-methods'
import { PaymentNotificationService } from './payment-notification-service'
import { PaymentSecurityService } from './payment-security-service'

export interface PaymentResult {
  success: boolean
  paymentId?: string
  error?: string
  validationErrors?: string[]
  status?: PaymentStatusType
  securityWarnings?: string[]
  requiresManualReview?: boolean
  riskLevel?: 'low' | 'medium' | 'high'
}

export interface PaymentConfirmation {
  paymentId: string
  amount: number
  tenantName: string
  paymentDate: string
  method: string
  txRef?: string
  paidByName?: string
  paidByContact?: string
  allocations: {
    invoiceId: string
    amount: number
    periodStart: string
    periodEnd: string
  }[]
}

export class PaymentService {
  /**
   * Process a payment with enhanced validation and error handling
   */
  static async processPayment(
    paymentData: PaymentFormValues,
    userContext?: {
      userId?: string
      ipAddress?: string
      userAgent?: string
    }
  ): Promise<PaymentResult> {
    try {
      // Step 1: Perform security check
      const securityCheck = await PaymentSecurityService.performSecurityCheck(
        paymentData,
        userContext || {}
      )

      if (!securityCheck.isSecure) {
        return {
          success: false,
          error: securityCheck.blockers.join('; '),
          status: PaymentStatus.FAILED,
          securityWarnings: securityCheck.warnings,
          riskLevel: securityCheck.riskLevel,
        }
      }

      // Step 2: Perform fraud detection
      const fraudCheck = await PaymentSecurityService.detectFraud(paymentData, userContext || {})

      if (fraudCheck.isFraudulent) {
        return {
          success: false,
          error: 'Payment blocked due to fraud detection',
          status: PaymentStatus.FAILED,
          securityWarnings: fraudCheck.reasons,
          riskLevel: 'high',
        }
      }

      // Step 3: Validate payment method exists and is enabled
      const paymentMethod = getPaymentMethod(paymentData.method)
      if (!paymentMethod || !paymentMethod.isEnabled) {
        return {
          success: false,
          error: 'Selected payment method is not available',
          status: PaymentStatus.FAILED,
        }
      }

      // Step 4: Validate payment amount for the method
      const amountValidation = validatePaymentAmount(paymentData.method, paymentData.amount)
      if (!amountValidation.isValid) {
        return {
          success: false,
          error: amountValidation.error,
          status: PaymentStatus.FAILED,
        }
      }

      // Step 5: Validate transaction reference for the method
      const txRefValidation = validateTransactionReference(
        paymentData.method,
        paymentData.txRef || ''
      )
      if (!txRefValidation.isValid) {
        return {
          success: false,
          error: txRefValidation.error,
          status: PaymentStatus.FAILED,
        }
      }

      // Step 6: Validate payment data using schema
      const validationResult = validatePaymentByMethod(paymentData)
      if (!validationResult.isValid) {
        return {
          success: false,
          validationErrors: validationResult.errors,
          status: PaymentStatus.FAILED,
        }
      }

      // Step 7: Verify tenant exists and get balance
      const tenantValidation = await this.validateTenant(paymentData.tenantId)
      if (!tenantValidation.isValid) {
        return {
          success: false,
          error: tenantValidation.error,
          status: PaymentStatus.FAILED,
        }
      }

      // Step 8: Check for duplicate transaction reference
      if (paymentData.txRef) {
        const duplicateCheck = await this.checkDuplicateTransaction(
          paymentData.txRef,
          paymentData.method
        )
        if (duplicateCheck.isDuplicate) {
          return {
            success: false,
            error: `A payment with transaction reference "${paymentData.txRef}" already exists`,
            status: PaymentStatus.FAILED,
          }
        }
      }

      // Step 9: Calculate processing fee if applicable
      const processingFee = calculateProcessingFee(paymentData.method, paymentData.amount)
      const totalAmount = paymentData.amount + processingFee

      // Step 10: Process the payment
      const { data: paymentId, error } = await clientBusinessFunctions.applyPayment(
        paymentData.tenantId,
        Number(totalAmount), // Include processing fee in total
        paymentData.paymentDate,
        paymentData.method,
        paymentData.txRef || undefined,
        undefined,
        {
          unitId: paymentData.unitId,
          paidByName: paymentData.paidByName || undefined,
          paidByContact: paymentData.paidByContact || undefined,
          paidByRole: paymentData.paidByRole as any,
          notifyPayer: paymentData.notifyPayer || false,
        }
      )

      if (error) {
        return {
          success: false,
          error: this.mapDatabaseError(error),
          status: PaymentStatus.FAILED,
        }
      }

      // Step 9: Get tenant and property information for notifications
      const tenantInfo = await this.getTenantInfo(paymentData.tenantId)

      // Step 10: Log successful payment
      await this.logPaymentActivity(paymentId, 'PAYMENT_CREATED', {
        ...paymentData,
        processingFee,
        totalAmount,
      })

      // Step 11: Send payment confirmation notification
      if (tenantInfo) {
        await PaymentNotificationService.sendPaymentConfirmation({
          paymentId,
          tenantId: paymentData.tenantId,
          tenantName: tenantInfo.full_name,
          amount: paymentData.amount,
          paymentDate: paymentData.paymentDate,
          method: paymentData.method,
          txRef: paymentData.txRef,
          propertyName: tenantInfo.propertyName,
          unitLabel: tenantInfo.unitLabel,
          paidByName: paymentData.paidByName,
          paidByContact: paymentData.paidByContact,
          notifyPayer: paymentData.notifyPayer,
        })
      }

      return {
        success: true,
        paymentId,
        status: PaymentStatus.COMPLETED,
        securityWarnings: securityCheck.warnings,
        requiresManualReview: fraudCheck.requiresManualReview,
        riskLevel: securityCheck.riskLevel,
      }
    } catch (error) {
      console.error('Payment processing error:', error)
      return {
        success: false,
        error: 'An unexpected error occurred while processing the payment',
        status: PaymentStatus.FAILED,
      }
    }
  }

  /**
   * Get payment confirmation details
   */
  static async getPaymentConfirmation(paymentId: string): Promise<PaymentConfirmation | null> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(
          `
          *,
          tenants (
            full_name
          ),
          payment_allocations (
            amount_kes,
            rent_invoices (
              id,
              period_start,
              period_end
            )
          )
        `
        )
        .eq('id', paymentId)
        .single()

      if (error || !data) {
        console.error('Error fetching payment confirmation:', error)
        return null
      }

      return {
        paymentId: data.id,
        amount: data.amount_kes,
        tenantName: data.tenants?.full_name || 'Unknown Tenant',
        paymentDate: data.payment_date,
        method: data.method,
        txRef: data.tx_ref,
        paidByName: data.paid_by_name,
        paidByContact: data.paid_by_contact,
        allocations:
          data.payment_allocations?.map((allocation: any) => ({
            invoiceId: allocation.rent_invoices.id,
            amount: allocation.amount_kes,
            periodStart: allocation.rent_invoices.period_start,
            periodEnd: allocation.rent_invoices.period_end,
          })) || [],
      }
    } catch (error) {
      console.error('Error getting payment confirmation:', error)
      return null
    }
  }

  /**
   * Validate tenant exists and is active
   */
  private static async validateTenant(
    tenantId: string
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, status, full_name')
        .eq('id', tenantId)
        .single()

      if (error || !data) {
        return { isValid: false, error: 'Tenant not found' }
      }

      if (data.status !== 'ACTIVE') {
        return { isValid: false, error: 'Cannot process payment for inactive tenant' }
      }

      return { isValid: true }
    } catch (error) {
      return { isValid: false, error: 'Error validating tenant' }
    }
  }

  /**
   * Get tenant information including property and unit details
   */
  private static async getTenantInfo(tenantId: string): Promise<{
    full_name: string
    email?: string
    phone?: string
    propertyName?: string
    unitLabel?: string
  } | null> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select(
          `
          full_name,
          email,
          phone,
          units (
            unit_label,
            properties (
              name
            )
          )
        `
        )
        .eq('id', tenantId)
        .single()

      if (error || !data) {
        return null
      }

      return {
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        propertyName: data.units?.[0]?.properties?.name,
        unitLabel: data.units?.[0]?.unit_label,
      }
    } catch (error) {
      console.error('Error getting tenant info:', error)
      return null
    }
  }

  /**
   * Check for duplicate transaction reference
   */
  private static async checkDuplicateTransaction(
    txRef: string,
    method: string
  ): Promise<{ isDuplicate: boolean }> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('id')
        .eq('tx_ref', txRef)
        .eq('method', method)
        .limit(1)

      return { isDuplicate: !error && data && data.length > 0 }
    } catch (error) {
      // If we can't check, assume it's not a duplicate to avoid blocking valid payments
      return { isDuplicate: false }
    }
  }

  /**
   * Map database errors to user-friendly messages
   */
  private static mapDatabaseError(error: string): string {
    const errorLower = error.toLowerCase()

    if (errorLower.includes('payment amount must be positive')) {
      return 'Payment amount must be greater than zero'
    }

    if (errorLower.includes('tenant not found')) {
      return 'The selected tenant could not be found'
    }

    if (errorLower.includes('constraint') || errorLower.includes('foreign key')) {
      return 'Invalid payment data. Please check your inputs and try again'
    }

    if (errorLower.includes('timeout') || errorLower.includes('connection')) {
      return 'Connection timeout. Please check your internet connection and try again'
    }

    // Default generic error message
    return 'Unable to process payment. Please try again or contact support if the problem persists'
  }

  /**
   * Log payment activity for audit trail
   */
  private static async logPaymentActivity(
    paymentId: string,
    action: string,
    paymentData: PaymentFormValues
  ): Promise<void> {
    try {
      // This would integrate with your audit logging system
      console.log('Payment activity logged:', {
        paymentId,
        action,
        amount: paymentData.amount,
        method: paymentData.method,
        timestamp: new Date().toISOString(),
      })

      // TODO: Implement actual audit logging to database or external service
    } catch (error) {
      // Don't fail the payment if logging fails
      console.error('Failed to log payment activity:', error)
    }
  }

  /**
   * Get payment method display information
   */
  static getPaymentMethodInfo(method: string) {
    return getPaymentMethod(method)
  }

  /**
   * Get all enabled payment methods
   */
  static getEnabledPaymentMethods() {
    return getEnabledPaymentMethods()
  }

  /**
   * Calculate processing fee for a payment
   */
  static calculateProcessingFee(method: string, amount: number): number {
    return calculateProcessingFee(method, amount)
  }

  /**
   * Validate payment amount for specific method
   */
  static validatePaymentAmount(method: string, amount: number) {
    return validatePaymentAmount(method, amount)
  }

  /**
   * Validate transaction reference for specific method
   */
  static validateTransactionReference(method: string, txRef: string) {
    return validateTransactionReference(method, txRef)
  }
}
