import { AcquisitionCostEntry, PaymentInstallment, PurchasePriceHistoryEntry } from '../types/property-management.types'
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

// API service for property acquisition financials
export class AcquisitionFinancialsService {
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



    // Check if response has content before trying to parse JSON
    const contentType = response.headers.get('content-type')
    let data

    if (contentType && contentType.includes('application/json')) {
      const text = await response.text()
      if (text.trim()) {
        try {
          data = JSON.parse(text)
        } catch (e) {
          console.error('Failed to parse JSON response:', text)
          throw new Error('Invalid JSON response from server')
        }
      } else {
        data = {}
      }
    } else {
      // Non-JSON response
      data = { message: await response.text() }
    }

    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP ${response.status}`)
    }

    return data
  }

  // Acquisition Costs API calls
  static async getAcquisitionCosts(propertyId: string): Promise<AcquisitionCostEntry[]> {
    try {
      const data = await this.makeRequest(`/api/properties/${propertyId}/acquisition-costs`)
      return data.data || []
    } catch (error) {
      console.error('Error fetching acquisition costs:', error)
      throw error
    }
  }

  static async createAcquisitionCost(propertyId: string, cost: Omit<AcquisitionCostEntry, 'id' | 'property_id' | 'created_at' | 'updated_at'>): Promise<AcquisitionCostEntry> {
    try {
      const data = await this.makeRequest(`/api/properties/${propertyId}/acquisition-costs`, {
        method: 'POST',
        body: JSON.stringify(cost),
      })
      return data.data
    } catch (error) {
      console.error('Error creating acquisition cost:', error)
      throw error
    }
  }

  static async deleteAcquisitionCost(propertyId: string, costId: string): Promise<void> {
    try {
      await this.makeRequest(`/api/properties/${propertyId}/acquisition-costs/${costId}`, {
        method: 'DELETE',
      })
    } catch (error) {
      console.error('Error deleting acquisition cost:', error)
      throw error
    }
  }

  // Payment Installments API calls
  static async getPaymentInstallments(propertyId: string): Promise<PaymentInstallment[]> {
    try {
      const data = await this.makeRequest(`/api/properties/${propertyId}/payment-installments`)
      return data.data || []
    } catch (error) {
      console.error('Error fetching payment installments:', error)
      throw error
    }
  }

  static async createPaymentInstallment(propertyId: string, payment: Omit<PaymentInstallment, 'id' | 'property_id' | 'installment_number' | 'created_at' | 'updated_at'>): Promise<PaymentInstallment> {
    try {
      const data = await this.makeRequest(`/api/properties/${propertyId}/payment-installments`, {
        method: 'POST',
        body: JSON.stringify(payment),
      })
      return data.data
    } catch (error) {
      console.error('Error creating payment installment:', error)
      throw error
    }
  }

  static async deletePaymentInstallment(propertyId: string, paymentId: string): Promise<void> {
    try {
      await this.makeRequest(`/api/properties/${propertyId}/payment-installments/${paymentId}`, {
        method: 'DELETE',
      })
    } catch (error) {
      console.error('Error deleting payment installment:', error)
      throw error
    }
  }

  // Purchase Price API calls
  static async updatePurchasePrice(propertyId: string, purchasePrice: number, changeReason?: string): Promise<void> {
    try {
      const body: any = { purchase_price_agreement_kes: purchasePrice }
      if (changeReason) {
        body.change_reason = changeReason
      }

      await this.makeRequest(`/api/properties/${propertyId}/purchase-price`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
    } catch (error) {
      console.error('Error updating purchase price:', error)
      throw error
    }
  }

  // Get purchase price change history
  static async getPurchasePriceHistory(propertyId: string): Promise<PurchasePriceHistoryEntry[]> {
    try {
      const response = await this.makeRequest(`/api/properties/${propertyId}/purchase-price/history`, {
        method: 'GET',
      })
      return response.data || []
    } catch (error) {
      console.error('Error fetching purchase price history:', error)
      throw error
    }
  }

  // Combined data loading
  static async loadAllFinancialData(propertyId: string): Promise<{
    costs: AcquisitionCostEntry[]
    payments: PaymentInstallment[]
  }> {
    try {
      const [costs, payments] = await Promise.all([
        this.getAcquisitionCosts(propertyId).catch(() => []), // Return empty array if API doesn't exist
        this.getPaymentInstallments(propertyId).catch(() => []) // Return empty array if API doesn't exist
      ])

      return { costs, payments }
    } catch (error) {
      console.error('Error loading financial data:', error)
      // Return empty data instead of throwing if it's a 404 (API not implemented yet)
      return { costs: [], payments: [] }
    }
  }
}
