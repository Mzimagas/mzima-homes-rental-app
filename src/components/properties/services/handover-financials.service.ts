import supabase from '../../../lib/supabase-client'

// Helper function to get CSRF token
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'csrf-token') return decodeURIComponent(value)
  }
  return null
}

// Types for handover financial data
export interface HandoverCostEntry {
  id: string
  property_id: string
  cost_type_id: string
  cost_category: 'PRE_HANDOVER' | 'AGREEMENT_LEGAL' | 'LCB_PROCESS' | 'PAYMENT_TRACKING' | 'TRANSFER_REGISTRATION' | 'OTHER'
  amount_kes: number
  payment_reference?: string
  payment_date?: string
  notes?: string
  created_at: string
  updated_at: string
  created_by?: string
}

export interface PaymentReceipt {
  id: string
  property_id: string
  receipt_number: number
  amount_kes: number
  payment_date?: string
  payment_reference?: string
  payment_method?: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'MOBILE_MONEY' | 'OTHER'
  notes?: string
  created_at: string
  updated_at: string
  created_by?: string
}

export interface HandoverFinancialSummary {
  property: {
    id: string
    name: string
    handover_price_agreement_kes: number
  }
  financial_summary: {
    handover_price_agreement_kes: number
    total_handover_costs_kes: number
    total_receipts_kes: number
    remaining_balance_kes: number
    total_income_kes: number
    payment_progress_percentage: number
  }
  cost_breakdown: {
    by_category: Record<string, number>
    total_costs: number
  }
  cost_entries: HandoverCostEntry[]
  payment_receipts: PaymentReceipt[]
  counts: {
    total_cost_entries: number
    total_payment_receipts: number
  }
}

// API service for property handover financials
export class HandoverFinancialsService {
  private static async makeRequest(url: string, options: RequestInit = {}) {
    // Get the auth token and CSRF token
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    const csrfToken = getCsrfToken()

    if (!csrfToken) {
      throw new Error('CSRF token not found. Please refresh the page and try again.')
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
      ...options.headers,
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'same-origin',
    })

    if (!response.ok) {
      console.error('HTTP Error:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Error response body:', errorText)

      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText || 'Unknown error' }
      }

      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  // Handover Costs API calls
  static async getHandoverCosts(propertyId: string): Promise<HandoverCostEntry[]> {
    try {
      const data = await this.makeRequest(`/api/properties/${propertyId}/handover-costs`)
      return data.data || []
    } catch (error) {
      console.error('Error fetching handover costs:', error)
      throw error
    }
  }

  static async createHandoverCost(propertyId: string, cost: Omit<HandoverCostEntry, 'id' | 'property_id' | 'created_at' | 'updated_at' | 'created_by'>): Promise<HandoverCostEntry> {
    try {
      const data = await this.makeRequest(`/api/properties/${propertyId}/handover-costs`, {
        method: 'POST',
        body: JSON.stringify(cost),
      })
      console.log('Successfully created handover cost:', data)
      return data.data
    } catch (error) {
      console.error('Error creating handover cost:', error)
      throw error
    }
  }

  static async updateHandoverCost(propertyId: string, costId: string, updates: Partial<Omit<HandoverCostEntry, 'id' | 'property_id' | 'created_at' | 'updated_at' | 'created_by'>>): Promise<HandoverCostEntry> {
    try {
      const data = await this.makeRequest(`/api/properties/${propertyId}/handover-costs/${costId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      console.log('Successfully updated handover cost:', data)
      return data.data
    } catch (error) {
      console.error('Error updating handover cost:', error)
      throw error
    }
  }

  static async deleteHandoverCost(propertyId: string, costId: string): Promise<void> {
    try {
      await this.makeRequest(`/api/properties/${propertyId}/handover-costs/${costId}`, {
        method: 'DELETE',
      })
      console.log('Successfully deleted handover cost')
    } catch (error) {
      console.error('Error deleting handover cost:', error)
      throw error
    }
  }

  // Payment Receipts API calls
  static async getPaymentReceipts(propertyId: string): Promise<PaymentReceipt[]> {
    try {
      const data = await this.makeRequest(`/api/properties/${propertyId}/payment-receipts`)
      return data.data || []
    } catch (error) {
      console.error('Error fetching payment receipts:', error)
      throw error
    }
  }

  static async createPaymentReceipt(propertyId: string, receipt: Omit<PaymentReceipt, 'id' | 'property_id' | 'created_at' | 'updated_at' | 'created_by'>): Promise<PaymentReceipt> {
    try {
      const data = await this.makeRequest(`/api/properties/${propertyId}/payment-receipts`, {
        method: 'POST',
        body: JSON.stringify(receipt),
      })
      console.log('Successfully created payment receipt:', data)
      return data.data
    } catch (error) {
      console.error('Error creating payment receipt:', error)
      throw error
    }
  }

  static async updatePaymentReceipt(propertyId: string, receiptId: string, updates: Partial<Omit<PaymentReceipt, 'id' | 'property_id' | 'created_at' | 'updated_at' | 'created_by'>>): Promise<PaymentReceipt> {
    try {
      const data = await this.makeRequest(`/api/properties/${propertyId}/payment-receipts/${receiptId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      console.log('Successfully updated payment receipt:', data)
      return data.data
    } catch (error) {
      console.error('Error updating payment receipt:', error)
      throw error
    }
  }

  static async deletePaymentReceipt(propertyId: string, receiptId: string): Promise<void> {
    try {
      await this.makeRequest(`/api/properties/${propertyId}/payment-receipts/${receiptId}`, {
        method: 'DELETE',
      })
      console.log('Successfully deleted payment receipt')
    } catch (error) {
      console.error('Error deleting payment receipt:', error)
      throw error
    }
  }

  // Financial Summary API call
  static async getHandoverFinancialSummary(propertyId: string): Promise<HandoverFinancialSummary> {
    try {
      const data = await this.makeRequest(`/api/properties/${propertyId}/handover-financial-summary`)
      return data.data
    } catch (error) {
      console.error('Error fetching handover financial summary:', error)
      throw error
    }
  }

  // Handover Price API calls
  static async updateHandoverPrice(propertyId: string, handoverPrice: number, changeReason?: string): Promise<void> {
    try {
      const body: any = { handover_price_agreement_kes: handoverPrice }
      if (changeReason) {
        body.change_reason = changeReason
      }

      await this.makeRequest(`/api/properties/${propertyId}/handover-price`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      console.log('Successfully updated handover price')
    } catch (error) {
      console.error('Error updating handover price:', error)
      throw error
    }
  }

  static async getHandoverPriceHistory(propertyId: string): Promise<any[]> {
    try {
      const data = await this.makeRequest(`/api/properties/${propertyId}/handover-price/history`)
      return data.data || []
    } catch (error) {
      console.error('Error fetching handover price history:', error)
      // Return empty array if history API doesn't exist yet
      return []
    }
  }

  // Combined data loading
  static async loadAllHandoverFinancialData(propertyId: string): Promise<{
    costs: HandoverCostEntry[]
    receipts: PaymentReceipt[]
    summary?: HandoverFinancialSummary
  }> {
    try {
      // Load all financial data in parallel
      const [costs, receipts, summary] = await Promise.all([
        this.getHandoverCosts(propertyId).catch(() => []), // Return empty array if API doesn't exist
        this.getPaymentReceipts(propertyId).catch(() => []), // Return empty array if API doesn't exist
        this.getHandoverFinancialSummary(propertyId).catch(() => undefined) // Return undefined if API doesn't exist
      ])

      return { costs, receipts, summary }
    } catch (error) {
      console.error('Error loading handover financial data:', error)
      // Return empty data instead of throwing if it's a 404 (API not implemented yet)
      return { costs: [], receipts: [] }
    }
  }

  // Utility methods for calculations
  static calculateTotalCosts(costs: HandoverCostEntry[]): number {
    return costs.reduce((total, cost) => total + (cost.amount_kes || 0), 0)
  }

  static calculateTotalReceipts(receipts: PaymentReceipt[]): number {
    return receipts.reduce((total, receipt) => total + (receipt.amount_kes || 0), 0)
  }

  static calculatePaymentProgress(totalReceipts: number, handoverPrice: number): number {
    if (handoverPrice <= 0) return 0
    return Math.round((totalReceipts / handoverPrice) * 100 * 100) / 100 // Round to 2 decimal places
  }

  static calculateNetIncome(handoverPrice: number, totalCosts: number): number {
    return handoverPrice - totalCosts
  }

  static calculateRemainingBalance(handoverPrice: number, totalReceipts: number): number {
    return handoverPrice - totalReceipts
  }
}
