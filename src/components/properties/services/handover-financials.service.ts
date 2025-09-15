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
  cost_category:
    | 'PRE_HANDOVER'
    | 'AGREEMENT_LEGAL'
    | 'LCB_PROCESS'
    | 'PAYMENT_TRACKING'
    | 'TRANSFER_REGISTRATION'
    | 'OTHER'
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
  private static async makeRequest(
    url: string,
    options: import('../../../lib/types/fetch').FetchOptions = {}
  ) {
    // Verify user authentication first
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Authentication required')
    }

    // Get the auth token and CSRF token
    const {
      data: { session },
    } = await supabase.auth.getSession()
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
            const errorText = await response.text()
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
            throw error
    }
  }

  static async createHandoverCost(
    propertyId: string,
    cost: Omit<HandoverCostEntry, 'id' | 'property_id' | 'created_at' | 'updated_at' | 'created_by'>
  ): Promise<HandoverCostEntry> {
    try {
      const data = await this.makeRequest(`/api/properties/${propertyId}/handover-costs`, {
        method: 'POST',
        body: JSON.stringify(cost),
      })
            return data.data
    } catch (error) {
            throw error
    }
  }

  static async updateHandoverCost(
    propertyId: string,
    costId: string,
    updates: Partial<
      Omit<HandoverCostEntry, 'id' | 'property_id' | 'created_at' | 'updated_at' | 'created_by'>
    >
  ): Promise<HandoverCostEntry> {
    try {
      const data = await this.makeRequest(
        `/api/properties/${propertyId}/handover-costs/${costId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(updates),
        }
      )
            return data.data
    } catch (error) {
            throw error
    }
  }

  static async deleteHandoverCost(propertyId: string, costId: string): Promise<void> {
    try {
      await this.makeRequest(`/api/properties/${propertyId}/handover-costs/${costId}`, {
        method: 'DELETE',
      })
          } catch (error) {
            throw error
    }
  }

  // Payment Receipts API calls
  static async getPaymentReceipts(propertyId: string): Promise<PaymentReceipt[]> {
    try {
      const data = await this.makeRequest(`/api/properties/${propertyId}/payment-receipts`)
      return data.data || []
    } catch (error) {
            throw error
    }
  }

  static async createPaymentReceipt(
    propertyId: string,
    receipt: Omit<PaymentReceipt, 'id' | 'property_id' | 'created_at' | 'updated_at' | 'created_by'>
  ): Promise<PaymentReceipt> {
    try {
      const data = await this.makeRequest(`/api/properties/${propertyId}/payment-receipts`, {
        method: 'POST',
        body: JSON.stringify(receipt),
      })
            return data.data
    } catch (error) {
            throw error
    }
  }

  static async updatePaymentReceipt(
    propertyId: string,
    receiptId: string,
    updates: Partial<
      Omit<PaymentReceipt, 'id' | 'property_id' | 'created_at' | 'updated_at' | 'created_by'>
    >
  ): Promise<PaymentReceipt> {
    try {
      const data = await this.makeRequest(
        `/api/properties/${propertyId}/payment-receipts/${receiptId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(updates),
        }
      )
            return data.data
    } catch (error) {
            throw error
    }
  }

  static async deletePaymentReceipt(propertyId: string, receiptId: string): Promise<void> {
    try {
      await this.makeRequest(`/api/properties/${propertyId}/payment-receipts/${receiptId}`, {
        method: 'DELETE',
      })
          } catch (error) {
            throw error
    }
  }

  // Financial Summary API call
  static async getHandoverFinancialSummary(propertyId: string): Promise<HandoverFinancialSummary> {
    try {
      const data = await this.makeRequest(
        `/api/properties/${propertyId}/handover-financial-summary`
      )
      return data.data
    } catch (error) {
            throw error
    }
  }

  // Handover Price API calls
  static async updateHandoverPrice(
    propertyId: string,
    handoverPrice: number,
    changeReason?: string
  ): Promise<void> {
    try {
      const body: any = { handover_price_agreement_kes: handoverPrice }
      if (changeReason) {
        body.change_reason = changeReason
      }

      await this.makeRequest(`/api/properties/${propertyId}/handover-price`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
          } catch (error) {
            throw error
    }
  }

  static async getHandoverPriceHistory(propertyId: string): Promise<any[]> {
    try {
      const data = await this.makeRequest(`/api/properties/${propertyId}/handover-price/history`)
      return data.data || []
    } catch (error) {
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
      // Load all financial data in parallel with better error isolation
      const results = await Promise.allSettled([
        this.getHandoverCosts(propertyId),
        this.getPaymentReceipts(propertyId),
        this.getHandoverFinancialSummary(propertyId),
      ])

      // Extract successful results and handle failures gracefully
      const costs = results[0].status === 'fulfilled' ? results[0].value : []
      const receipts = results[1].status === 'fulfilled' ? results[1].value : []
      const summary = results[2].status === 'fulfilled' ? results[2].value : undefined

      // Log failures for debugging (but don't throw)
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const operationNames = ['Handover Costs', 'Payment Receipts', 'Financial Summary']
                  }
      })

      return { costs, receipts, summary }
    } catch (error) {
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
