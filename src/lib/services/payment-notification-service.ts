import supabase from '../supabase-client'

export interface NotificationTemplate {
  id: string
  type: 'payment_confirmation' | 'payment_reminder' | 'payment_overdue' | 'payment_failed'
  channel: 'email' | 'sms' | 'in_app'
  subject?: string
  message: string
  variables: string[]
}

export interface NotificationRecipient {
  id: string
  type: 'tenant' | 'landlord'
  name: string
  email?: string
  phone?: string
}

export interface PaymentNotificationData {
  paymentId?: string
  tenantId: string
  tenantName: string
  amount: number
  paymentDate: string
  method: string
  txRef?: string
  propertyName?: string
  unitLabel?: string
  dueDate?: string
  overdueAmount?: number
  invoiceId?: string
  paidByName?: string
  paidByContact?: string
  notifyPayer?: boolean
}

export class PaymentNotificationService {
  /**
   * Send payment confirmation notification
   */
  static async sendPaymentConfirmation(data: PaymentNotificationData): Promise<void> {
    try {
      // Get tenant contact information
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('full_name, email, phone')
        .eq('id', data.tenantId)
        .single()

      if (tenantError || !tenant) {
        console.error('Failed to get tenant information for notification:', tenantError)
        return
      }

      // Create in-app notification
      await this.createInAppNotification({
        userId: data.tenantId,
        title: 'Payment Confirmed',
        message: `Your payment of ${this.formatCurrency(data.amount)} via ${data.method} has been successfully processed.`,
        type: 'success',
        metadata: {
          paymentId: data.paymentId,
          amount: data.amount,
          method: data.method,
          txRef: data.txRef
        }
      })

      // Send email notification if email is available
      if (tenant.email) {
        await this.sendEmailNotification({
          to: tenant.email,
          subject: 'Payment Confirmation - Mzima Homes',
          template: 'payment_confirmation',
          data: {
            tenantName: data.tenantName,
            amount: this.formatCurrency(data.amount),
            paymentDate: this.formatDate(data.paymentDate),
            method: data.method,
            txRef: data.txRef || 'N/A',
            propertyName: data.propertyName || '',
            unitLabel: data.unitLabel || '',
            paidByName: data.paidByName || undefined
          }
        })
      }

      // Send SMS notification if phone is available
      if (tenant.phone) {
        const payerInfo = data.paidByName ? ` Paid by: ${data.paidByName}.` : ''
        const smsMessage = `Payment confirmed: ${this.formatCurrency(data.amount)} via ${data.method}. Ref: ${data.txRef || 'N/A'}.${payerInfo} Thank you! - Mzima Homes`
        await this.sendSMSNotification({
          to: tenant.phone,
          message: smsMessage
        })
      }

      // Optional: Notify payer if requested and contact provided
      if (data.notifyPayer && data.paidByContact) {
        const smsMessage = `You paid ${this.formatCurrency(data.amount)} for ${data.tenantName} via ${data.method}. Ref: ${data.txRef || 'N/A'}. Thank you! - Mzima Homes`
        await this.sendSMSNotification({
          to: data.paidByContact,
          message: smsMessage
        })
      }

      // Log notification activity
      await this.logNotificationActivity({
        type: 'payment_confirmation',
        recipientId: data.tenantId,
        recipientType: 'tenant',
        paymentId: data.paymentId,
        status: 'sent'
      })

    } catch (error) {
      console.error('Failed to send payment confirmation:', error)
      await this.logNotificationActivity({
        type: 'payment_confirmation',
        recipientId: data.tenantId,
        recipientType: 'tenant',
        paymentId: data.paymentId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Send payment reminder notification
   */
  static async sendPaymentReminder(data: PaymentNotificationData): Promise<void> {
    try {
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('full_name, email, phone')
        .eq('id', data.tenantId)
        .single()

      if (tenantError || !tenant) {
        console.error('Failed to get tenant information for reminder:', tenantError)
        return
      }

      const daysUntilDue = data.dueDate ? this.calculateDaysUntilDue(data.dueDate) : 0
      const urgencyLevel = daysUntilDue <= 3 ? 'urgent' : 'normal'

      // Create in-app notification
      await this.createInAppNotification({
        userId: data.tenantId,
        title: `Payment Reminder${urgencyLevel === 'urgent' ? ' - Urgent' : ''}`,
        message: `Your rent payment of ${this.formatCurrency(data.amount)} is due ${daysUntilDue > 0 ? `in ${daysUntilDue} days` : 'today'}.`,
        type: urgencyLevel === 'urgent' ? 'warning' : 'info',
        metadata: {
          invoiceId: data.invoiceId,
          amount: data.amount,
          dueDate: data.dueDate,
          daysUntilDue
        }
      })

      // Send email reminder
      if (tenant.email) {
        await this.sendEmailNotification({
          to: tenant.email,
          subject: `Payment Reminder${urgencyLevel === 'urgent' ? ' - Urgent' : ''} - Mzima Homes`,
          template: 'payment_reminder',
          data: {
            tenantName: data.tenantName,
            amount: this.formatCurrency(data.amount),
            dueDate: this.formatDate(data.dueDate || ''),
            daysUntilDue,
            propertyName: data.propertyName || '',
            unitLabel: data.unitLabel || '',
            urgencyLevel
          }
        })
      }

      // Send SMS for urgent reminders
      if (tenant.phone && urgencyLevel === 'urgent') {
        const smsMessage = `URGENT: Rent payment of ${this.formatCurrency(data.amount)} is due ${daysUntilDue > 0 ? `in ${daysUntilDue} days` : 'today'}. Please pay to avoid late fees. - Mzima Homes`
        await this.sendSMSNotification({
          to: tenant.phone,
          message: smsMessage
        })
      }

      await this.logNotificationActivity({
        type: 'payment_reminder',
        recipientId: data.tenantId,
        recipientType: 'tenant',
        invoiceId: data.invoiceId,
        status: 'sent'
      })

    } catch (error) {
      console.error('Failed to send payment reminder:', error)
    }
  }

  /**
   * Send overdue payment notification
   */
  static async sendOverdueNotification(data: PaymentNotificationData): Promise<void> {
    try {
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('full_name, email, phone')
        .eq('id', data.tenantId)
        .single()

      if (tenantError || !tenant) {
        console.error('Failed to get tenant information for overdue notice:', tenantError)
        return
      }

      const daysOverdue = data.dueDate ? this.calculateDaysOverdue(data.dueDate) : 0

      // Create in-app notification
      await this.createInAppNotification({
        userId: data.tenantId,
        title: 'Payment Overdue',
        message: `Your rent payment of ${this.formatCurrency(data.overdueAmount || data.amount)} is ${daysOverdue} days overdue. Please pay immediately to avoid additional charges.`,
        type: 'error',
        metadata: {
          invoiceId: data.invoiceId,
          amount: data.overdueAmount || data.amount,
          dueDate: data.dueDate,
          daysOverdue
        }
      })

      // Send email notification
      if (tenant.email) {
        await this.sendEmailNotification({
          to: tenant.email,
          subject: 'Payment Overdue - Immediate Action Required - Mzima Homes',
          template: 'payment_overdue',
          data: {
            tenantName: data.tenantName,
            amount: this.formatCurrency(data.overdueAmount || data.amount),
            dueDate: this.formatDate(data.dueDate || ''),
            daysOverdue,
            propertyName: data.propertyName || '',
            unitLabel: data.unitLabel || ''
          }
        })
      }

      // Send SMS notification
      if (tenant.phone) {
        const smsMessage = `OVERDUE: Rent payment of ${this.formatCurrency(data.overdueAmount || data.amount)} is ${daysOverdue} days overdue. Pay now to avoid additional charges. - Mzima Homes`
        await this.sendSMSNotification({
          to: tenant.phone,
          message: smsMessage
        })
      }

      await this.logNotificationActivity({
        type: 'payment_overdue',
        recipientId: data.tenantId,
        recipientType: 'tenant',
        invoiceId: data.invoiceId,
        status: 'sent'
      })

    } catch (error) {
      console.error('Failed to send overdue notification:', error)
    }
  }

  /**
   * Create in-app notification
   */
  private static async createInAppNotification(notification: {
    userId: string
    title: string
    message: string
    type: 'info' | 'warning' | 'error' | 'success'
    metadata?: any
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('in_app_notifications')
        .insert({
          user_id: notification.userId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          metadata: notification.metadata || {}
        })

      if (error) {
        console.error('Failed to create in-app notification:', error)
      }
    } catch (error) {
      console.error('Error creating in-app notification:', error)
    }
  }

  /**
   * Send email notification (placeholder - integrate with your email service)
   */
  private static async sendEmailNotification(email: {
    to: string
    subject: string
    template: string
    data: any
  }): Promise<void> {
    try {
      // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
      console.log('Email notification would be sent:', email)
      
      // For now, just log the email that would be sent
      // In production, replace this with actual email service integration
    } catch (error) {
      console.error('Failed to send email notification:', error)
    }
  }

  /**
   * Send SMS notification (placeholder - integrate with your SMS service)
   */
  private static async sendSMSNotification(sms: {
    to: string
    message: string
  }): Promise<void> {
    try {
      // TODO: Integrate with SMS service (Twilio, Africa's Talking, etc.)
      console.log('SMS notification would be sent:', sms)
      
      // For now, just log the SMS that would be sent
      // In production, replace this with actual SMS service integration
    } catch (error) {
      console.error('Failed to send SMS notification:', error)
    }
  }

  /**
   * Log notification activity for audit trail
   */
  private static async logNotificationActivity(activity: {
    type: string
    recipientId: string
    recipientType: string
    paymentId?: string
    invoiceId?: string
    status: string
    error?: string
  }): Promise<void> {
    try {
      // TODO: Implement notification activity logging
      console.log('Notification activity logged:', activity)
    } catch (error) {
      console.error('Failed to log notification activity:', error)
    }
  }

  /**
   * Utility functions
   */
  private static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  private static formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  private static calculateDaysUntilDue(dueDate: string): number {
    const due = new Date(dueDate)
    const today = new Date()
    const diffTime = due.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  private static calculateDaysOverdue(dueDate: string): number {
    const due = new Date(dueDate)
    const today = new Date()
    const diffTime = today.getTime() - due.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }
}
