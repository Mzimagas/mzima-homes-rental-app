import { SubdivisionCostEntry, SubdivisionCostCategory } from '../types/property-management.types'
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

export class SubdivisionCostsService {
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

  // Subdivision Costs API calls
  static async getSubdivisionCosts(propertyId: string): Promise<SubdivisionCostEntry[]> {
    try {
      const data = await this.makeRequest(`/api/properties/${propertyId}/subdivision-costs`)
      return data.data || []
    } catch (error) {
      console.error('Error fetching subdivision costs:', error)
      throw error
    }
  }

  static async createSubdivisionCost(
    propertyId: string,
    cost: Omit<SubdivisionCostEntry, 'id' | 'property_id' | 'created_at' | 'updated_at'>
  ): Promise<SubdivisionCostEntry> {
    try {
      console.log('Creating subdivision cost for property:', propertyId)
      console.log('Cost data:', cost)

      const response = await this.makeRequest(`/api/properties/${propertyId}/subdivision-costs`, {
        method: 'POST',
        body: JSON.stringify(cost),
      })
      console.log('Successfully created subdivision cost:', response)

      // Handle both response formats: {data: cost} and {success: true, data: cost}
      if (response.data) {
        return response.data
      } else {
        throw new Error('Invalid response format from API')
      }
    } catch (error) {
      console.error('Error creating subdivision cost:', error)
      throw error
    }
  }

  static async updateSubdivisionCost(
    propertyId: string,
    costId: string,
    updates: Partial<
      Omit<
        SubdivisionCostEntry,
        'id' | 'property_id' | 'cost_type_id' | 'cost_category' | 'created_at' | 'updated_at'
      >
    >
  ): Promise<SubdivisionCostEntry> {
    try {
      const data = await this.makeRequest(
        `/api/properties/${propertyId}/subdivision-costs/${costId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(updates),
        }
      )
      console.log('Successfully updated subdivision cost:', data)
      return data.data
    } catch (error) {
      console.error('Error updating subdivision cost:', error)
      throw error
    }
  }

  static async deleteSubdivisionCost(propertyId: string, costId: string): Promise<void> {
    try {
      await this.makeRequest(`/api/properties/${propertyId}/subdivision-costs/${costId}`, {
        method: 'DELETE',
      })
      console.log('Successfully deleted subdivision cost')
    } catch (error) {
      console.error('Error deleting subdivision cost:', error)
      throw error
    }
  }

  // Helper function to calculate subdivision cost summary
  static calculateSubdivisionSummary(costs: SubdivisionCostEntry[]) {
    try {
      console.log('calculateSubdivisionSummary called with:', costs)

      // Ensure costs is an array and filter out any invalid entries
      const validCosts = Array.isArray(costs)
        ? costs.filter((cost) => {
            const isValid =
              cost &&
              typeof cost.amount_kes === 'number' &&
              cost.payment_status &&
              cost.cost_category
            console.log('Cost validation:', cost, 'isValid:', isValid)
            return isValid
          })
        : []

      console.log('Valid costs after filtering:', validCosts)

      const totalCosts = validCosts.reduce((sum, cost) => sum + cost.amount_kes, 0)
      const paidCosts = validCosts
        .filter((cost) => cost.payment_status === 'PAID')
        .reduce((sum, cost) => sum + cost.amount_kes, 0)
      const pendingCosts = validCosts
        .filter(
          (cost) => cost.payment_status === 'PENDING' || cost.payment_status === 'PARTIALLY_PAID'
        )
        .reduce((sum, cost) => sum + cost.amount_kes, 0)

      // Calculate breakdown by category
      const costsByCategory: Record<SubdivisionCostCategory, number> = {
        STATUTORY_BOARD_FEES: 0,
        SURVEY_PLANNING_FEES: 0,
        REGISTRATION_TITLE_FEES: 0,
        LEGAL_COMPLIANCE: 0,
        OTHER_CHARGES: 0,
      }

      validCosts.forEach((cost) => {
        if (cost.cost_category && Object.hasOwn(costsByCategory, cost.cost_category)) {
          costsByCategory[cost.cost_category] += cost.amount_kes
        }
      })

      // Calculate breakdown by payment status
      const costsByStatus = {
        PENDING: validCosts
          .filter((cost) => cost.payment_status === 'PENDING')
          .reduce((sum, cost) => sum + cost.amount_kes, 0),
        PAID: paidCosts,
        PARTIALLY_PAID: validCosts
          .filter((cost) => cost.payment_status === 'PARTIALLY_PAID')
          .reduce((sum, cost) => sum + cost.amount_kes, 0),
      }

      return {
        totalSubdivisionCosts: totalCosts,
        paidSubdivisionCosts: paidCosts,
        pendingSubdivisionCosts: pendingCosts,
        subdivisionCostsByCategory: costsByCategory,
        subdivisionCostsByStatus: costsByStatus,
        subdivisionCostCount: validCosts.length,
        paidCostCount: validCosts.filter((cost) => cost.payment_status === 'PAID').length,
        pendingCostCount: validCosts.filter(
          (cost) => cost.payment_status === 'PENDING' || cost.payment_status === 'PARTIALLY_PAID'
        ).length,
      }
    } catch (error) {
      console.error('Error in calculateSubdivisionSummary:', error)
      // Return safe default values
      return {
        totalSubdivisionCosts: 0,
        paidSubdivisionCosts: 0,
        pendingSubdivisionCosts: 0,
        subdivisionCostsByCategory: {
          STATUTORY_BOARD_FEES: 0,
          SURVEY_PLANNING_FEES: 0,
          REGISTRATION_TITLE_FEES: 0,
          LEGAL_COMPLIANCE: 0,
          OTHER_CHARGES: 0,
        },
        subdivisionCostsByStatus: {
          PENDING: 0,
          PAID: 0,
          PARTIALLY_PAID: 0,
        },
        subdivisionCostCount: 0,
        paidCostCount: 0,
        pendingCostCount: 0,
      }
    }
  }

  // Helper function to get cost type label
  static getCostTypeLabel(costTypeId: string): string {
    const costTypeLabels: Record<string, string> = {
      // Statutory & Board Fees
      lcb_normal_fee: 'Land Control Board (Normal)',
      lcb_special_fee: 'Land Control Board (Special)',
      board_application_fee: 'Board Application Fee',

      // Survey & Planning Fees
      scheme_plan_preparation: 'Scheme Plan Preparation',
      mutation_drawing: 'Mutation Drawing',
      mutation_checking: 'Mutation Checking',
      surveyor_professional_fees: 'Surveyor Professional Fees',
      map_amendment: 'Map Amendment',
      rim_update: 'RIM Update',
      new_parcel_numbers: 'New Parcel Numbers',

      // Registration & Title Fees
      new_title_registration: 'New Title Registration',
      registrar_fees: 'Registrar Fees',
      title_printing: 'Title Printing',

      // Legal & Compliance
      compliance_certificate: 'Compliance Certificate',
      development_fee: 'Development Fee',
      admin_costs: 'Administrative Costs',
      search_fee: 'Search Fee',
      land_rates_clearance: 'Land Rates Clearance',
      stamp_duty: 'Stamp Duty',

      // Other Charges
      county_planning_fees: 'County Planning Fees',
      professional_legal_fees: 'Professional/Legal Fees',
      miscellaneous_disbursements: 'Miscellaneous Disbursements',
    }

    return costTypeLabels[costTypeId] || costTypeId
  }

  // Helper function to get payment status label
  static getPaymentStatusLabel(status: string): string {
    const statusLabels: Record<string, string> = {
      PENDING: 'Pending',
      PAID: 'Paid',
      PARTIALLY_PAID: 'Partially Paid',
    }

    return statusLabels[status] || status
  }

  // Helper function to get payment status color
  static getPaymentStatusColor(status: string): string {
    const statusColors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-green-100 text-green-800',
      PARTIALLY_PAID: 'bg-blue-100 text-blue-800',
    }

    return statusColors[status] || 'bg-gray-100 text-gray-800'
  }
}
