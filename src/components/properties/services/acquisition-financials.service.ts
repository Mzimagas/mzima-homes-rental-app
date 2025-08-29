import {
  AcquisitionCostEntry,
  PaymentInstallment,
  PurchasePriceHistoryEntry,
} from '../types/property-management.types'
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
  // Feature flags to disable non-existent APIs and reduce 403 errors
  private static readonly FEATURE_FLAGS = {
    PURCHASE_PIPELINE_API: false, // Set to true when API is implemented
    ACQUISITION_COSTS_API: false, // Set to true when API is implemented
    PAYMENT_INSTALLMENTS_API: false, // Set to true when API is implemented
  }

  private static async makeRequest(
    url: string,
    options: import('../../../lib/types/fetch').FetchOptions = {}
  ) {
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

    // Check if response has content before trying to parse JSON
    const contentType = response.headers.get('content-type')
    let data

    if (contentType && contentType.includes('application/json')) {
      const text = await response.text()
      if (text.trim()) {
        try {
          data = JSON.parse(text)
        } catch (e) {
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
            throw error
    }
  }

  static async createAcquisitionCost(
    propertyId: string,
    cost: Omit<AcquisitionCostEntry, 'id' | 'property_id' | 'created_at' | 'updated_at'>
  ): Promise<AcquisitionCostEntry> {
    try {
      // Try purchase pipeline API first
      try {
        const data = await this.makeRequest(
          `/api/purchase-pipeline/${propertyId}/acquisition-costs`,
          {
            method: 'POST',
            body: JSON.stringify(cost),
          }
        )
                return data.data
      } catch (pipelineError) {
                // Fall back to property API
        const data = await this.makeRequest(`/api/properties/${propertyId}/acquisition-costs`, {
          method: 'POST',
          body: JSON.stringify(cost),
        })
                return data.data
      }
    } catch (error) {
            throw error
    }
  }

  static async deleteAcquisitionCost(propertyId: string, costId: string): Promise<void> {
    try {
      // Try purchase pipeline API first
      try {
        await this.makeRequest(`/api/purchase-pipeline/${propertyId}/acquisition-costs/${costId}`, {
          method: 'DELETE',
        })
                return
      } catch (pipelineError) {
                // Fall back to property API
        await this.makeRequest(`/api/properties/${propertyId}/acquisition-costs/${costId}`, {
          method: 'DELETE',
        })
              }
    } catch (error) {
            throw error
    }
  }

  // Payment Installments API calls
  static async getPaymentInstallments(propertyId: string): Promise<PaymentInstallment[]> {
    try {
      const data = await this.makeRequest(`/api/properties/${propertyId}/payment-installments`)
      return data.data || []
    } catch (error) {
            throw error
    }
  }

  static async createPaymentInstallment(
    propertyId: string,
    payment: Omit<
      PaymentInstallment,
      'id' | 'property_id' | 'installment_number' | 'created_at' | 'updated_at'
    >
  ): Promise<PaymentInstallment> {
    try {
      // Try purchase pipeline API first
      try {
        const data = await this.makeRequest(
          `/api/purchase-pipeline/${propertyId}/payment-installments`,
          {
            method: 'POST',
            body: JSON.stringify(payment),
          }
        )
                return data.data
      } catch (pipelineError) {
                // Fall back to property API
        const data = await this.makeRequest(`/api/properties/${propertyId}/payment-installments`, {
          method: 'POST',
          body: JSON.stringify(payment),
        })
                return data.data
      }
    } catch (error) {
            throw error
    }
  }

  static async deletePaymentInstallment(propertyId: string, paymentId: string): Promise<void> {
    try {
      // Try purchase pipeline API first
      try {
        await this.makeRequest(
          `/api/purchase-pipeline/${propertyId}/payment-installments/${paymentId}`,
          {
            method: 'DELETE',
          }
        )
                return
      } catch (pipelineError) {
                // Fall back to property API
        await this.makeRequest(`/api/properties/${propertyId}/payment-installments/${paymentId}`, {
          method: 'DELETE',
        })
              }
    } catch (error) {
            throw error
    }
  }

  // Purchase Price API calls
  static async updatePurchasePrice(
    propertyId: string,
    purchasePrice: number,
    changeReason?: string
  ): Promise<void> {
    try {
      // Try purchase pipeline API first
      try {
        const body: any = { negotiated_price_kes: purchasePrice }
        if (changeReason) {
          body.change_reason = changeReason
        }
        await this.makeRequest(`/api/purchase-pipeline/${propertyId}/financial`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
                return
      } catch (pipelineError) {
                // Fall back to property purchase price API
        const body: any = { purchase_price_agreement_kes: purchasePrice }
        if (changeReason) {
          body.change_reason = changeReason
        }

        await this.makeRequest(`/api/properties/${propertyId}/purchase-price`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
              }
    } catch (error) {
            throw error
    }
  }

  // Get purchase price change history
  static async getPurchasePriceHistory(propertyId: string): Promise<PurchasePriceHistoryEntry[]> {
    try {
      // Try purchase pipeline API first
      try {
        const response = await this.makeRequest(
          `/api/purchase-pipeline/${propertyId}/purchase-price/history`,
          {
            method: 'GET',
          }
        )
                return response.data || []
      } catch (pipelineError) {
                // Fall back to property API
        try {
          const response = await this.makeRequest(
            `/api/properties/${propertyId}/purchase-price/history`,
            {
              method: 'GET',
            }
          )
                    return response.data || []
        } catch (propertyError) {
                    return []
        }
      }
    } catch (error) {
            // Return empty array instead of throwing
      return []
    }
  }

  // Combined data loading with feature flags to avoid unnecessary API calls
  static async loadAllFinancialData(propertyId: string): Promise<{
    costs: AcquisitionCostEntry[]
    payments: PaymentInstallment[]
  }> {
    // Skip API calls entirely if features are disabled to avoid 403 errors
    if (
      !this.FEATURE_FLAGS.PURCHASE_PIPELINE_API &&
      !this.FEATURE_FLAGS.ACQUISITION_COSTS_API &&
      !this.FEATURE_FLAGS.PAYMENT_INSTALLMENTS_API
    ) {
      // Return empty data immediately if no APIs are available
      return { costs: [], payments: [] }
    }

    try {
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout after 5 seconds')), 5000)
      )

      // Try purchase pipeline API first with timeout (only if enabled)
      if (this.FEATURE_FLAGS.PURCHASE_PIPELINE_API) {
        try {
          const dataPromise = this.makeRequest(`/api/purchase-pipeline/${propertyId}/financial`)
          const data = await Promise.race([dataPromise, timeoutPromise])
                    return {
            costs: data.costs || [],
            payments: data.payments || [],
          }
        } catch (pipelineError) {
                  }
      }

      // Fall back to property financial endpoints with timeout (only if enabled)
      const promises: Promise<any>[] = []

      if (this.FEATURE_FLAGS.ACQUISITION_COSTS_API) {
        promises.push(
          Promise.race([this.getAcquisitionCosts(propertyId), timeoutPromise]).catch(() => [])
        )
      } else {
        promises.push(Promise.resolve([]))
      }

      if (this.FEATURE_FLAGS.PAYMENT_INSTALLMENTS_API) {
        promises.push(
          Promise.race([this.getPaymentInstallments(propertyId), timeoutPromise]).catch(() => [])
        )
      } else {
        promises.push(Promise.resolve([]))
      }

      const [costs, payments] = await Promise.allSettled(promises).then((results) => [
        results[0].status === 'fulfilled' ? results[0].value : [],
        results[1].status === 'fulfilled' ? results[1].value : [],
      ])

      return { costs, payments }
    } catch (error) {
      // Don't log expected errors to reduce console noise
      if (
        !error.message?.includes('403') &&
        !error.message?.includes('404') &&
        !error.message?.includes('timeout')
      ) {
              }
      // Always return empty data instead of throwing to prevent UI blocking
      return { costs: [], payments: [] }
    }
  }
}
