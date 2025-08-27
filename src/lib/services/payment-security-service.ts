import supabase from '../supabase-client'
import { PaymentFormValues } from '../validation/payment'

export interface SecurityCheckResult {
  isSecure: boolean
  riskLevel: 'low' | 'medium' | 'high'
  warnings: string[]
  blockers: string[]
  recommendations: string[]
}

export interface FraudDetectionResult {
  isFraudulent: boolean
  riskScore: number // 0-100
  reasons: string[]
  requiresManualReview: boolean
}

export interface AuditLogEntry {
  id?: string
  event_type: string
  user_id?: string
  tenant_id?: string
  payment_id?: string
  ip_address?: string
  user_agent?: string
  details: any
  risk_level?: string
  created_at?: string
}

export class PaymentSecurityService {
  /**
   * Perform comprehensive security check on payment
   */
  static async performSecurityCheck(
    paymentData: PaymentFormValues,
    userContext: {
      userId?: string
      ipAddress?: string
      userAgent?: string
    }
  ): Promise<SecurityCheckResult> {
    const warnings: string[] = []
    const blockers: string[] = []
    const recommendations: string[] = []
    let riskLevel: 'low' | 'medium' | 'high' = 'low'

    try {
      // 1. Check for suspicious payment patterns
      const patternCheck = await this.checkSuspiciousPatterns(paymentData, userContext)
      if (patternCheck.isSuspicious) {
        warnings.push(...patternCheck.warnings)
        if (patternCheck.riskLevel === 'high') {
          riskLevel = 'high'
        } else if (patternCheck.riskLevel === 'medium' && riskLevel === 'low') {
          riskLevel = 'medium'
        }
      }

      // 2. Validate payment amount against tenant's typical payments
      const amountCheck = await this.validatePaymentAmount(paymentData)
      if (amountCheck.isUnusual) {
        warnings.push(amountCheck.warning)
        if (amountCheck.riskLevel === 'high') {
          riskLevel = 'high'
        } else if (amountCheck.riskLevel === 'medium' && riskLevel === 'low') {
          riskLevel = 'medium'
        }
      }

      // 3. Check for duplicate transactions
      const duplicateCheck = await this.checkDuplicateTransactions(paymentData)
      if (duplicateCheck.isDuplicate) {
        blockers.push('Duplicate transaction detected')
        riskLevel = 'high'
      }

      // 4. Validate transaction reference format and authenticity
      const txRefCheck = await this.validateTransactionReference(paymentData)
      if (!txRefCheck.isValid) {
        warnings.push(txRefCheck.warning)
        if (txRefCheck.riskLevel === 'medium' && riskLevel === 'low') {
          riskLevel = 'medium'
        }
      }

      // 5. Check payment timing (unusual hours, frequency)
      const timingCheck = this.checkPaymentTiming(paymentData)
      if (timingCheck.isUnusual) {
        warnings.push(timingCheck.warning)
        if (timingCheck.riskLevel === 'medium' && riskLevel === 'low') {
          riskLevel = 'medium'
        }
      }

      // 6. Rate limiting check
      const rateLimitCheck = await this.checkRateLimit(paymentData.tenantId, userContext)
      if (rateLimitCheck.isExceeded) {
        blockers.push('Rate limit exceeded. Please wait before making another payment.')
        riskLevel = 'high'
      }

      // Generate recommendations based on findings
      if (riskLevel === 'high') {
        recommendations.push('Manual review required before processing')
        recommendations.push('Verify payment details with tenant directly')
      } else if (riskLevel === 'medium') {
        recommendations.push('Additional verification recommended')
        recommendations.push('Monitor for follow-up suspicious activity')
      }

      // Log security check
      await this.logSecurityEvent({
        event_type: 'payment_security_check',
        tenant_id: paymentData.tenantId,
        ip_address: userContext.ipAddress,
        user_agent: userContext.userAgent,
        details: {
          riskLevel,
          warningsCount: warnings.length,
          blockersCount: blockers.length,
          amount: paymentData.amount,
          method: paymentData.method,
        },
        risk_level: riskLevel,
      })

      return {
        isSecure: blockers.length === 0,
        riskLevel,
        warnings,
        blockers,
        recommendations,
      }
    } catch (error) {
      console.error('Security check failed:', error)

      // Fail secure - if security check fails, treat as high risk
      return {
        isSecure: false,
        riskLevel: 'high',
        warnings: ['Security check failed'],
        blockers: ['Unable to verify payment security'],
        recommendations: ['Manual review required'],
      }
    }
  }

  /**
   * Detect potential fraud in payment
   */
  static async detectFraud(
    paymentData: PaymentFormValues,
    userContext: {
      userId?: string
      ipAddress?: string
      userAgent?: string
    }
  ): Promise<FraudDetectionResult> {
    let riskScore = 0
    const reasons: string[] = []

    try {
      // 1. Check for velocity fraud (too many payments in short time)
      const velocityCheck = await this.checkVelocityFraud(paymentData.tenantId)
      riskScore += velocityCheck.riskScore
      if (velocityCheck.reasons.length > 0) {
        reasons.push(...velocityCheck.reasons)
      }

      // 2. Check for amount anomalies
      const amountAnomaly = await this.checkAmountAnomaly(paymentData)
      riskScore += amountAnomaly.riskScore
      if (amountAnomaly.reasons.length > 0) {
        reasons.push(...amountAnomaly.reasons)
      }

      // 3. Check for suspicious transaction references
      const txRefFraud = this.checkTransactionReferenceFraud(paymentData)
      riskScore += txRefFraud.riskScore
      if (txRefFraud.reasons.length > 0) {
        reasons.push(...txRefFraud.reasons)
      }

      // 4. Check for IP/location anomalies (if available)
      if (userContext.ipAddress) {
        const locationCheck = await this.checkLocationAnomaly(
          paymentData.tenantId,
          userContext.ipAddress
        )
        riskScore += locationCheck.riskScore
        if (locationCheck.reasons.length > 0) {
          reasons.push(...locationCheck.reasons)
        }
      }

      // 5. Check for device/browser anomalies
      if (userContext.userAgent) {
        const deviceCheck = this.checkDeviceAnomaly(userContext.userAgent)
        riskScore += deviceCheck.riskScore
        if (deviceCheck.reasons.length > 0) {
          reasons.push(...deviceCheck.reasons)
        }
      }

      // Cap risk score at 100
      riskScore = Math.min(riskScore, 100)

      const isFraudulent = riskScore >= 80
      const requiresManualReview = riskScore >= 60

      // Log fraud detection result
      await this.logSecurityEvent({
        event_type: 'fraud_detection',
        tenant_id: paymentData.tenantId,
        ip_address: userContext.ipAddress,
        user_agent: userContext.userAgent,
        details: {
          riskScore,
          isFraudulent,
          requiresManualReview,
          reasons,
          amount: paymentData.amount,
          method: paymentData.method,
        },
        risk_level: isFraudulent ? 'high' : requiresManualReview ? 'medium' : 'low',
      })

      return {
        isFraudulent,
        riskScore,
        reasons,
        requiresManualReview,
      }
    } catch (error) {
      console.error('Fraud detection failed:', error)

      // Fail secure - if fraud detection fails, require manual review
      return {
        isFraudulent: false,
        riskScore: 60,
        reasons: ['Fraud detection system unavailable'],
        requiresManualReview: true,
      }
    }
  }

  /**
   * Log security events for audit trail
   */
  static async logSecurityEvent(event: AuditLogEntry): Promise<void> {
    try {
      // In a real implementation, this would go to a dedicated audit log table
      // For now, we'll use console logging and could extend to external services

      const logEntry = {
        ...event,
        created_at: new Date().toISOString(),
        id: crypto.randomUUID(),
      }

      console.log('Security Event Logged:', logEntry)

      // TODO: Implement actual audit logging to database or external service
      // This could include:
      // - Database audit table
      // - External SIEM system
      // - Cloud logging service (AWS CloudTrail, Google Cloud Audit Logs)
    } catch (error) {
      console.error('Failed to log security event:', error)
      // Don't fail the main operation if logging fails
    }
  }

  /**
   * Check for suspicious payment patterns
   */
  private static async checkSuspiciousPatterns(
    paymentData: PaymentFormValues,
    userContext: any
  ): Promise<{ isSuspicious: boolean; warnings: string[]; riskLevel: 'low' | 'medium' | 'high' }> {
    const warnings: string[] = []
    let riskLevel: 'low' | 'medium' | 'high' = 'low'

    // Check for round numbers (potential fraud indicator)
    if (paymentData.amount % 1000 === 0 && paymentData.amount >= 10000) {
      warnings.push('Payment amount is a round number')
      riskLevel = 'medium'
    }

    // Check for payments outside business hours
    const hour = new Date().getHours()
    if (hour < 6 || hour > 22) {
      warnings.push('Payment made outside normal business hours')
      riskLevel = 'medium'
    }

    // Check for weekend payments (depending on business rules)
    const dayOfWeek = new Date().getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      warnings.push('Payment made on weekend')
      // This might be normal, so keep risk low
    }

    return {
      isSuspicious: warnings.length > 0,
      warnings,
      riskLevel,
    }
  }

  /**
   * Validate payment amount against historical data
   */
  private static async validatePaymentAmount(
    paymentData: PaymentFormValues
  ): Promise<{ isUnusual: boolean; warning: string; riskLevel: 'low' | 'medium' | 'high' }> {
    try {
      // Get tenant's payment history to establish baseline
      const { data: recentPayments } = await supabase
        .from('payments')
        .select('amount_kes')
        .eq('tenant_id', paymentData.tenantId)
        .order('payment_date', { ascending: false })
        .limit(10)

      if (!recentPayments || recentPayments.length === 0) {
        return {
          isUnusual: false,
          warning: '',
          riskLevel: 'low',
        }
      }

      const amounts = recentPayments.map((p) => p.amount_kes)
      const avgAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length
      const maxAmount = Math.max(...amounts)
      const minAmount = Math.min(...amounts)

      // Check if current payment is significantly different
      const currentAmount = paymentData.amount

      if (currentAmount > maxAmount * 2) {
        return {
          isUnusual: true,
          warning: 'Payment amount is significantly higher than usual',
          riskLevel: 'high',
        }
      }

      if (currentAmount > avgAmount * 1.5) {
        return {
          isUnusual: true,
          warning: 'Payment amount is higher than average',
          riskLevel: 'medium',
        }
      }

      if (currentAmount < minAmount * 0.5) {
        return {
          isUnusual: true,
          warning: 'Payment amount is significantly lower than usual',
          riskLevel: 'medium',
        }
      }

      return {
        isUnusual: false,
        warning: '',
        riskLevel: 'low',
      }
    } catch (error) {
      console.error('Error validating payment amount:', error)
      return {
        isUnusual: false,
        warning: '',
        riskLevel: 'low',
      }
    }
  }

  /**
   * Check for duplicate transactions
   */
  private static async checkDuplicateTransactions(
    paymentData: PaymentFormValues
  ): Promise<{ isDuplicate: boolean }> {
    try {
      if (!paymentData.txRef) {
        return { isDuplicate: false }
      }

      const { data: existingPayments } = await supabase
        .from('payments')
        .select('id')
        .eq('tx_ref', paymentData.txRef)
        .eq('method', paymentData.method)
        .limit(1)

      return {
        isDuplicate: existingPayments && existingPayments.length > 0,
      }
    } catch (error) {
      console.error('Error checking duplicate transactions:', error)
      return { isDuplicate: false }
    }
  }

  /**
   * Validate transaction reference authenticity
   */
  private static async validateTransactionReference(
    paymentData: PaymentFormValues
  ): Promise<{ isValid: boolean; warning: string; riskLevel: 'low' | 'medium' | 'high' }> {
    if (!paymentData.txRef) {
      return { isValid: true, warning: '', riskLevel: 'low' }
    }

    // Basic format validation based on payment method
    switch (paymentData.method) {
      case 'MPESA':
        if (!/^[A-Z0-9]{10}$/.test(paymentData.txRef)) {
          return {
            isValid: false,
            warning: 'M-Pesa transaction code format is invalid',
            riskLevel: 'medium',
          }
        }
        break

      case 'BANK_TRANSFER':
        if (paymentData.txRef.length < 5) {
          return {
            isValid: false,
            warning: 'Bank reference number appears too short',
            riskLevel: 'medium',
          }
        }
        break
    }

    return { isValid: true, warning: '', riskLevel: 'low' }
  }

  /**
   * Check payment timing for anomalies
   */
  private static checkPaymentTiming(paymentData: PaymentFormValues): {
    isUnusual: boolean
    warning: string
    riskLevel: 'low' | 'medium' | 'high'
  } {
    const paymentDate = new Date(paymentData.paymentDate)
    const now = new Date()

    // Check if payment date is in the future (beyond reasonable limits)
    const daysDifference = Math.ceil(
      (paymentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysDifference > 7) {
      return {
        isUnusual: true,
        warning: 'Payment date is too far in the future',
        riskLevel: 'medium',
      }
    }

    // Check if payment date is too far in the past
    if (daysDifference < -365) {
      return {
        isUnusual: true,
        warning: 'Payment date is more than a year old',
        riskLevel: 'medium',
      }
    }

    return { isUnusual: false, warning: '', riskLevel: 'low' }
  }

  /**
   * Check rate limits for payments
   */
  private static async checkRateLimit(
    tenantId: string,
    userContext: any
  ): Promise<{ isExceeded: boolean }> {
    try {
      // Check for too many payments in the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

      const { data: recentPayments } = await supabase
        .from('payments')
        .select('id')
        .eq('tenant_id', tenantId)
        .gte('created_at', oneHourAgo)

      // Allow maximum 5 payments per hour per tenant
      return {
        isExceeded: recentPayments && recentPayments.length >= 5,
      }
    } catch (error) {
      console.error('Error checking rate limit:', error)
      return { isExceeded: false }
    }
  }

  // Additional fraud detection methods would be implemented here
  private static async checkVelocityFraud(tenantId: string) {
    // Implementation for velocity fraud detection
    return { riskScore: 0, reasons: [] }
  }

  private static async checkAmountAnomaly(paymentData: PaymentFormValues) {
    // Implementation for amount anomaly detection
    return { riskScore: 0, reasons: [] }
  }

  private static checkTransactionReferenceFraud(paymentData: PaymentFormValues) {
    // Implementation for transaction reference fraud detection
    return { riskScore: 0, reasons: [] }
  }

  private static async checkLocationAnomaly(tenantId: string, ipAddress: string) {
    // Implementation for location anomaly detection
    return { riskScore: 0, reasons: [] }
  }

  private static checkDeviceAnomaly(userAgent: string) {
    // Implementation for device anomaly detection
    return { riskScore: 0, reasons: [] }
  }
}
