// M-PESA Integration Service for Kenya
import axios from 'axios'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface MPESAConfig {
  consumerKey: string
  consumerSecret: string
  businessShortCode: string
  passkey: string
  environment: 'sandbox' | 'production'
}

interface STKPushRequest {
  phoneNumber: string
  amount: number
  accountReference: string
  transactionDesc: string
  callbackUrl: string
}

interface STKPushResponse {
  MerchantRequestID: string
  CheckoutRequestID: string
  ResponseCode: string
  ResponseDescription: string
  CustomerMessage: string
}

interface TransactionStatusResponse {
  ResponseCode: string
  ResponseDescription: string
  MerchantRequestID: string
  CheckoutRequestID: string
  ResultCode: string
  ResultDesc: string
}

export class MPESAService {
  private config: MPESAConfig
  private baseUrl: string
  private accessToken: string | null = null
  private tokenExpiry: Date | null = null

  constructor(config: MPESAConfig) {
    this.config = config
    this.baseUrl = config.environment === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke'
  }

  // Generate access token
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken
    }

    try {
      const auth = Buffer.from(`${this.config.consumerKey}:${this.config.consumerSecret}`).toString('base64')
      
      const response = await axios.get(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      })

      this.accessToken = response.data.access_token
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000))
      
      return this.accessToken
    } catch (error) {
      console.error('Error getting M-PESA access token:', error)
      throw new Error('Failed to authenticate with M-PESA API')
    }
  }

  // Generate timestamp for M-PESA requests
  private generateTimestamp(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hour = String(now.getHours()).padStart(2, '0')
    const minute = String(now.getMinutes()).padStart(2, '0')
    const second = String(now.getSeconds()).padStart(2, '0')
    
    return `${year}${month}${day}${hour}${minute}${second}`
  }

  // Generate password for STK Push
  private generatePassword(timestamp: string): string {
    const data = `${this.config.businessShortCode}${this.config.passkey}${timestamp}`
    return Buffer.from(data).toString('base64')
  }

  // Format phone number to M-PESA format
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '')
    
    // Handle different formats
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1)
    } else if (cleaned.startsWith('+254')) {
      cleaned = cleaned.substring(1)
    } else if (cleaned.startsWith('254')) {
      // Already in correct format
    } else if (cleaned.length === 9) {
      cleaned = '254' + cleaned
    }
    
    return cleaned
  }

  // Initiate STK Push payment
  async initiateSTKPush(request: STKPushRequest): Promise<STKPushResponse> {
    try {
      const accessToken = await this.getAccessToken()
      const timestamp = this.generateTimestamp()
      const password = this.generatePassword(timestamp)
      const formattedPhone = this.formatPhoneNumber(request.phoneNumber)

      const payload = {
        BusinessShortCode: this.config.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: request.amount,
        PartyA: formattedPhone,
        PartyB: this.config.businessShortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: request.callbackUrl,
        AccountReference: request.accountReference,
        TransactionDesc: request.transactionDesc
      }

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      // Log the transaction request
      await this.logTransaction({
        type: 'stk_push_request',
        merchant_request_id: response.data.MerchantRequestID,
        checkout_request_id: response.data.CheckoutRequestID,
        phone_number: formattedPhone,
        amount: request.amount,
        account_reference: request.accountReference,
        transaction_desc: request.transactionDesc,
        response_code: response.data.ResponseCode,
        response_description: response.data.ResponseDescription,
        raw_response: response.data
      })

      return response.data
    } catch (error) {
      console.error('Error initiating STK Push:', error)
      throw new Error('Failed to initiate M-PESA payment')
    }
  }

  // Query transaction status
  async queryTransactionStatus(checkoutRequestId: string): Promise<TransactionStatusResponse> {
    try {
      const accessToken = await this.getAccessToken()
      const timestamp = this.generateTimestamp()
      const password = this.generatePassword(timestamp)

      const payload = {
        BusinessShortCode: this.config.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      }

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      return response.data
    } catch (error) {
      console.error('Error querying transaction status:', error)
      throw new Error('Failed to query transaction status')
    }
  }

  // Handle M-PESA callback
  async handleCallback(callbackData: any): Promise<void> {
    try {
      const { Body } = callbackData
      const { stkCallback } = Body

      // Log the callback
      await this.logTransaction({
        type: 'stk_push_callback',
        merchant_request_id: stkCallback.MerchantRequestID,
        checkout_request_id: stkCallback.CheckoutRequestID,
        result_code: stkCallback.ResultCode,
        result_desc: stkCallback.ResultDesc,
        raw_response: callbackData
      })

      if (stkCallback.ResultCode === 0) {
        // Payment successful
        const callbackMetadata = stkCallback.CallbackMetadata?.Item || []
        const transactionData: any = {}

        callbackMetadata.forEach((item: any) => {
          switch (item.Name) {
            case 'Amount':
              transactionData.amount = item.Value
              break
            case 'MpesaReceiptNumber':
              transactionData.mpesa_receipt_number = item.Value
              break
            case 'TransactionDate':
              transactionData.transaction_date = item.Value
              break
            case 'PhoneNumber':
              transactionData.phone_number = item.Value
              break
          }
        })

        // Create receipt record
        await this.createReceiptFromMPESA({
          checkout_request_id: stkCallback.CheckoutRequestID,
          mpesa_receipt_number: transactionData.mpesa_receipt_number,
          amount: transactionData.amount,
          phone_number: transactionData.phone_number,
          transaction_date: transactionData.transaction_date
        })

        // Try to auto-match with pending invoices
        await this.autoMatchPayment(transactionData)
      } else {
        // Payment failed
        console.log('M-PESA payment failed:', stkCallback.ResultDesc)
      }
    } catch (error) {
      console.error('Error handling M-PESA callback:', error)
    }
  }

  // Log transaction to database
  private async logTransaction(data: any): Promise<void> {
    try {
      await supabase
        .from('mpesa_transactions')
        .insert({
          ...data,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Error logging M-PESA transaction:', error)
    }
  }

  // Create receipt from M-PESA payment
  private async createReceiptFromMPESA(data: {
    checkout_request_id: string
    mpesa_receipt_number: string
    amount: number
    phone_number: string
    transaction_date: string
  }): Promise<void> {
    try {
      // Find matching sale agreement by phone number or amount
      const { data: agreements } = await supabase
        .from('sale_agreements')
        .select(`
          *,
          clients(phone),
          invoices(*)
        `)
        .eq('clients.phone', data.phone_number)
        .eq('status', 'active')

      let saleAgreementId = null
      let invoiceId = null

      if (agreements && agreements.length > 0) {
        // Find matching invoice by amount
        const agreement = agreements[0]
        const matchingInvoice = agreement.invoices?.find((inv: any) => 
          Math.abs(inv.amount_due - data.amount) < 1
        )

        saleAgreementId = agreement.sale_agreement_id
        invoiceId = matchingInvoice?.invoice_id
      }

      // Generate receipt number
      const receiptNo = `MPE${Date.now()}`

      // Create receipt
      await supabase
        .from('receipts')
        .insert({
          receipt_no: receiptNo,
          sale_agreement_id: saleAgreementId,
          invoice_id: invoiceId,
          payment_method: 'mpesa',
          transaction_ref: data.mpesa_receipt_number,
          paid_date: new Date(data.transaction_date).toISOString().split('T')[0],
          amount: data.amount,
          payer_name: 'M-PESA Customer',
          notes: `M-PESA payment from ${data.phone_number}`,
          mpesa_checkout_request_id: data.checkout_request_id
        })

      // Update invoice if matched
      if (invoiceId) {
        const { data: invoice } = await supabase
          .from('invoices')
          .select('amount_paid')
          .eq('invoice_id', invoiceId)
          .single()

        if (invoice) {
          await supabase
            .from('invoices')
            .update({
              amount_paid: (invoice.amount_paid || 0) + data.amount
            })
            .eq('invoice_id', invoiceId)
        }
      }

      // Create bank reconciliation record
      await supabase
        .from('bank_mpesa_recons')
        .insert({
          source: 'mpesa',
          statement_date: new Date(data.transaction_date).toISOString().split('T')[0],
          transaction_ref: data.mpesa_receipt_number,
          amount: data.amount,
          description: `M-PESA payment from ${data.phone_number}`,
          payer_details: data.phone_number,
          raw_row: data,
          status: saleAgreementId ? 'matched' : 'unmatched',
          auto_matched: !!saleAgreementId,
          processed_at: new Date().toISOString()
        })

    } catch (error) {
      console.error('Error creating receipt from M-PESA:', error)
    }
  }

  // Auto-match payment with pending invoices
  private async autoMatchPayment(transactionData: any): Promise<void> {
    try {
      // Find pending invoices with matching amounts
      const { data: invoices } = await supabase
        .from('invoices')
        .select(`
          *,
          sale_agreements(
            clients(phone)
          )
        `)
        .eq('status', 'unpaid')
        .gte('amount_due', transactionData.amount - 10) // Allow small variance
        .lte('amount_due', transactionData.amount + 10)

      if (invoices && invoices.length > 0) {
        // Try to match by phone number first
        const phoneMatch = invoices.find((inv: any) => 
          inv.sale_agreements?.clients?.phone === transactionData.phone_number
        )

        const matchedInvoice = phoneMatch || invoices[0]

        // Update invoice payment
        await supabase
          .from('invoices')
          .update({
            amount_paid: (matchedInvoice.amount_paid || 0) + transactionData.amount
          })
          .eq('invoice_id', matchedInvoice.invoice_id)

        console.log(`Auto-matched M-PESA payment to invoice ${matchedInvoice.invoice_id}`)
      }
    } catch (error) {
      console.error('Error auto-matching M-PESA payment:', error)
    }
  }

  // Get transaction history
  async getTransactionHistory(filters?: {
    dateFrom?: string
    dateTo?: string
    phoneNumber?: string
    status?: string
    limit?: number
  }): Promise<any[]> {
    try {
      let query = supabase
        .from('mpesa_transactions')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo)
      }
      if (filters?.phoneNumber) {
        query = query.eq('phone_number', filters.phoneNumber)
      }
      if (filters?.status) {
        query = query.eq('result_code', filters.status === 'success' ? 0 : 1)
      }
      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting M-PESA transaction history:', error)
      return []
    }
  }
}

// Export configured M-PESA service instance
export const mpesaService = new MPESAService({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  businessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE!,
  passkey: process.env.MPESA_PASSKEY!,
  environment: (process.env.MPESA_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox'
})

// Utility functions for M-PESA integration
export const mpesaUtils = {
  // Format amount for display
  formatAmount: (amount: number): string => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount)
  },

  // Validate phone number
  isValidPhoneNumber: (phoneNumber: string): boolean => {
    const cleaned = phoneNumber.replace(/\D/g, '')
    return /^(254|0)[17]\d{8}$/.test(cleaned)
  },

  // Generate payment reference
  generatePaymentReference: (prefix: string = 'PAY'): string => {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `${prefix}${timestamp}${random}`
  },

  // Parse M-PESA transaction date
  parseTransactionDate: (mpesaDate: string): Date => {
    // M-PESA date format: YYYYMMDDHHMMSS
    const year = parseInt(mpesaDate.substring(0, 4))
    const month = parseInt(mpesaDate.substring(4, 6)) - 1
    const day = parseInt(mpesaDate.substring(6, 8))
    const hour = parseInt(mpesaDate.substring(8, 10))
    const minute = parseInt(mpesaDate.substring(10, 12))
    const second = parseInt(mpesaDate.substring(12, 14))
    
    return new Date(year, month, day, hour, minute, second)
  }
}
