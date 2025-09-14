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
  // Feature flags to enable financial APIs
  private static readonly FEATURE_FLAGS = {
    PURCHASE_PIPELINE_API: false, // ❌ Disabled - causing 403 errors, use property API instead
    ACQUISITION_COSTS_API: true, // ✅ Enabled - API routes exist
    PAYMENT_INSTALLMENTS_API: true, // ✅ Enabled - API routes exist
  }

  // Circuit breaker for 403 errors
  private static authFailure = false
  private static authFailureTime = 0
  private static readonly AUTH_RETRY_DELAY = 30000 // 30 seconds

  // Cache and rate limiting
  private static cache = new Map<string, { data: any; timestamp: number }>()
  private static readonly CACHE_TTL = 60000 // 1 minute cache
  private static requestQueue = new Map<string, Promise<any>>()
  private static readonly MAX_CONCURRENT_REQUESTS = 3
  private static activeRequests = 0

  private static async makeRequest(
    url: string,
    options: import('../../../lib/types/fetch').FetchOptions = {}
  ) {
    // Check circuit breaker for auth failures
    if (this.authFailure) {
      const timeSinceFailure = Date.now() - this.authFailureTime
      if (timeSinceFailure < this.AUTH_RETRY_DELAY) {
        throw new Error('Authentication failed. Please refresh the page and try again.')
      } else {
        // Reset circuit breaker after delay
        this.authFailure = false
      }
    }

    // Get the auth token and (if needed) CSRF token
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const token = session?.access_token

    const method = String((options as any).method || 'GET').toUpperCase()
    const csrfToken = method === 'GET' ? null : getCsrfToken()

    if (method !== 'GET' && !csrfToken) {
      throw new Error('CSRF token not found. Please refresh the page and try again.')
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'same-origin',
    })

    // Handle 403 errors with circuit breaker (but allow fallback for pipeline APIs)
    if (response.status === 403) {
      this.authFailure = true
      this.authFailureTime = Date.now()
      console.warn('[AcquisitionFinancialsService] 403 detected, activating circuit breaker')

      // For pipeline APIs, throw a specific error that can be caught for fallback
      if (url.includes('/api/purchase-pipeline/')) {
        throw new Error('PIPELINE_API_FORBIDDEN')
      }

      throw new Error('Access denied. Please check your permissions or refresh the page.')
    }

    // Handle 404 errors with better logging
    if (response.status === 404) {
      console.error(`[AcquisitionFinancialsService] 404 Not Found: ${url}`)
      throw new Error(`API endpoint not found: ${url}`)
    }

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
      // Try purchase pipeline API first (only if enabled)
      if (this.FEATURE_FLAGS.PURCHASE_PIPELINE_API) {
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
          // Pipeline API failed, continue to fallback
          const errorMessage = pipelineError instanceof Error ? pipelineError.message : String(pipelineError)
          if (errorMessage === 'PIPELINE_API_FORBIDDEN' || errorMessage.includes('403')) {
            console.log('Purchase pipeline API access denied, falling back to property API')
          } else {
            console.log('Purchase pipeline API failed, falling back to property API:', errorMessage)
          }
        }
      }

      // Use property API as fallback
      const data = await this.makeRequest(`/api/properties/${propertyId}/acquisition-costs`, {
        method: 'POST',
        body: JSON.stringify(cost),
      })
      return data.data
    } catch (error) {
      throw error
    }
  }

  static async deleteAcquisitionCost(propertyId: string, costId: string): Promise<void> {
    try {
      // Try purchase pipeline API first (only if enabled)
      if (this.FEATURE_FLAGS.PURCHASE_PIPELINE_API) {
        try {
          await this.makeRequest(`/api/purchase-pipeline/${propertyId}/acquisition-costs/${costId}`, {
            method: 'DELETE',
          })
          return
        } catch (pipelineError) {
          // Pipeline API failed, continue to fallback
          console.log('Purchase pipeline API failed for delete, falling back to property API')
        }
      }

      // Use property API as fallback
      console.log(`[AcquisitionFinancialsService] Attempting to delete cost ${costId} for property ${propertyId}`)
      await this.makeRequest(`/api/properties/${propertyId}/acquisition-costs/${costId}`, {
        method: 'DELETE',
      })
      console.log(`[AcquisitionFinancialsService] Successfully deleted cost ${costId}`)
    } catch (error) {
      console.error(`[AcquisitionFinancialsService] Failed to delete cost ${costId}:`, error)
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
      // Try purchase pipeline API first (only if enabled)
      if (this.FEATURE_FLAGS.PURCHASE_PIPELINE_API) {
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
        }
      }

      // Use property API
      const data = await this.makeRequest(`/api/properties/${propertyId}/payment-installments`, {
        method: 'POST',
        body: JSON.stringify(payment),
      })
      return data.data
    } catch (error) {
      throw error
    }
  }

  static async deletePaymentInstallment(propertyId: string, paymentId: string): Promise<void> {
    try {
      // Try purchase pipeline API first (only if enabled)
      if (this.FEATURE_FLAGS.PURCHASE_PIPELINE_API) {
        try {
          await this.makeRequest(
            `/api/purchase-pipeline/${propertyId}/payment-installments/${paymentId}`,
            {
              method: 'DELETE',
            }
          )
          return
        } catch (pipelineError) {
          // Pipeline API failed, continue to fallback
          console.log('Purchase pipeline API failed for delete, falling back to property API')
        }
      }

      // Use property API as fallback
      await this.makeRequest(`/api/properties/${propertyId}/payment-installments/${paymentId}`, {
        method: 'DELETE',
      })
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
      // Try purchase pipeline API first (only if enabled)
      if (this.FEATURE_FLAGS.PURCHASE_PIPELINE_API) {
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
        }
      }

      // Use property purchase price API
      const body: any = { purchase_price_agreement_kes: purchasePrice }
      if (changeReason) {
        body.change_reason = changeReason
      }

      await this.makeRequest(`/api/properties/${propertyId}/purchase-price`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
    } catch (error) {
      throw error
    }
  }

  // Get purchase price change history
  static async getPurchasePriceHistory(propertyId: string): Promise<PurchasePriceHistoryEntry[]> {
    try {
      // Try purchase pipeline API first (only if enabled)
      if (this.FEATURE_FLAGS.PURCHASE_PIPELINE_API) {
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
        }
      }

      // Use property API
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
    // Check cache first
    const cacheKey = `financial_${propertyId}`
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }

    // Check if request is already in progress
    if (this.requestQueue.has(cacheKey)) {
      return this.requestQueue.get(cacheKey)!
    }

    // Skip API calls entirely if auth failed or features are disabled
    if (
      this.authFailure ||
      (!this.FEATURE_FLAGS.PURCHASE_PIPELINE_API &&
        !this.FEATURE_FLAGS.ACQUISITION_COSTS_API &&
        !this.FEATURE_FLAGS.PAYMENT_INSTALLMENTS_API)
    ) {
      // Return empty data immediately if no APIs are available or auth failed
      const emptyData = { costs: [], payments: [] }
      this.cache.set(cacheKey, { data: emptyData, timestamp: Date.now() })
      return emptyData
    }

    // Rate limiting - wait if too many concurrent requests
    if (this.activeRequests >= this.MAX_CONCURRENT_REQUESTS) {
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200))
      return this.loadAllFinancialData(propertyId) // Retry
    }

    // Create and queue the request
    const requestPromise = this._executeFinancialDataRequest(propertyId, cacheKey)
    this.requestQueue.set(cacheKey, requestPromise)

    try {
      const result = await requestPromise
      return result
    } finally {
      this.requestQueue.delete(cacheKey)
    }
  }

  private static async _executeFinancialDataRequest(propertyId: string, cacheKey: string): Promise<{
    costs: AcquisitionCostEntry[]
    payments: PaymentInstallment[]
  }> {
    this.activeRequests++

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
          const result = {
            costs: data.costs || [],
            payments: data.payments || [],
          }
          this.cache.set(cacheKey, { data: result, timestamp: Date.now() })
          return result
        } catch (pipelineError) {
          // Pipeline API failed, continue to fallback
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

      const result = { costs, payments }
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() })
      return result
    } catch (error) {
      // Don't log expected errors to reduce console noise
      if (
        !error.message?.includes('403') &&
        !error.message?.includes('404') &&
        !error.message?.includes('timeout')
      ) {
        console.error('Financial data loading error:', error)
      }
      // Always return empty data instead of throwing to prevent UI blocking
      const emptyResult = { costs: [], payments: [] }
      this.cache.set(cacheKey, { data: emptyResult, timestamp: Date.now() })
      return emptyResult
    } finally {
      this.activeRequests--
    }
  }
}
