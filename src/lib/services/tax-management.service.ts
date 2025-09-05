import supabase from '../supabase-client'

// Types for Tax Management
export interface TaxConfiguration {
  id: string
  tax_type: string
  tax_name: string
  tax_rate: number
  minimum_threshold: number
  maximum_threshold?: number
  effective_from: string
  effective_to?: string
  description?: string
  calculation_method: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EnhancedLandRates {
  id: string
  property_id: string
  parcel_number?: string
  financial_year: string
  assessed_value_kes: number
  rate_percentage: number
  annual_rate_kes: number
  amount_paid_kes: number
  balance_kes: number
  due_date: string
  penalty_rate: number
  penalty_amount_kes: number
  payment_reference?: string
  receipt_number?: string
  payment_date?: string
  status: string
  is_disputed: boolean
  dispute_reason?: string
  county?: string
  sub_county?: string
  created_at: string
  updated_at: string
  created_by?: string

  // Joined data
  property_name?: string
}

export interface VATManagement {
  id: string
  business_name: string
  kra_pin: string
  vat_registration_number?: string
  registration_status: string
  registration_date?: string
  vat_period_start: string
  vat_period_end: string
  filing_due_date: string
  total_sales_kes: number
  vat_on_sales_kes: number
  total_purchases_kes: number
  vat_on_purchases_kes: number
  net_vat_payable_kes: number
  status: string
  filed_date?: string
  payment_date?: string
  payment_reference?: string
  penalty_amount_kes: number
  interest_amount_kes: number
  created_at: string
  updated_at: string
  created_by?: string
}

export interface VATTransaction {
  id: string
  vat_period_id: string
  transaction_type: string
  transaction_date: string
  description: string
  property_id?: string
  vendor_id?: string
  customer_name?: string
  gross_amount_kes: number
  vat_rate: number
  vat_amount_kes: number
  net_amount_kes: number
  invoice_number?: string
  receipt_number?: string
  created_at: string
  created_by?: string

  // Joined data
  property_name?: string
  vendor_name?: string
}

export interface WithholdingTaxManagement {
  id: string
  tax_period_start: string
  tax_period_end: string
  filing_due_date: string
  total_payments_kes: number
  total_withholding_tax_kes: number
  status: string
  filed_date?: string
  payment_date?: string
  payment_reference?: string
  penalty_amount_kes: number
  interest_amount_kes: number
  created_at: string
  updated_at: string
  created_by?: string
}

export interface WithholdingTaxTransaction {
  id: string
  withholding_period_id: string
  transaction_date: string
  payee_name: string
  payee_pin?: string
  service_description: string
  agent_id?: string
  vendor_id?: string
  property_id?: string
  gross_payment_kes: number
  withholding_rate: number
  withholding_tax_kes: number
  net_payment_kes: number
  tax_category: string
  invoice_number?: string
  payment_voucher?: string
  created_at: string
  created_by?: string

  // Joined data
  agent_name?: string
  vendor_name?: string
  property_name?: string
}

export interface TaxComplianceCalendar {
  id: string
  tax_type: string
  obligation_name: string
  description?: string
  frequency: string
  due_day?: number
  due_month?: number
  period_start?: string
  period_end?: string
  filing_due_date: string
  payment_due_date?: string
  status: string
  completed_date?: string
  reminder_days_before: number
  is_reminder_sent: boolean
  created_at: string
  updated_at: string
}

export interface TaxComplianceSummary {
  pending_land_rates: number
  outstanding_land_rates_kes: number
  paid_land_rates_kes: number
  pending_vat_returns: number
  outstanding_vat_kes: number
  paid_vat_kes: number
  pending_withholding_returns: number
  outstanding_withholding_kes: number
  paid_withholding_kes: number
  total_penalties_kes: number
  total_interest_kes: number
  upcoming_obligations: number
}

export interface PropertyTaxSummary {
  property_id: string
  property_name: string
  total_assessed_value_kes: number
  total_annual_rates_kes: number
  total_land_rates_paid_kes: number
  total_land_rates_outstanding_kes: number
  total_land_rates_penalties_kes: number
  property_vat_on_sales_kes: number
  property_vat_on_purchases_kes: number
  property_withholding_tax_kes: number
  total_tax_burden_kes: number
}

export class TaxManagementService {
  // Get tax configurations
  static async getTaxConfigurations(
    filters: {
      taxType?: string
      isActive?: boolean
    } = {}
  ): Promise<TaxConfiguration[]> {
    try {
      let query = supabase.from('tax_configurations').select('*')

      if (filters.taxType) {
        query = query.eq('tax_type', filters.taxType)
      }
      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive)
      }

      query = query
        .order('tax_type', { ascending: true })
        .order('effective_from', { ascending: false })

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching tax configurations:', error)
      throw new Error('Failed to load tax configurations')
    }
  }

  // Get enhanced land rates
  static async getEnhancedLandRates(
    filters: {
      propertyId?: string
      financialYear?: string
      status?: string
      county?: string
      limit?: number
      offset?: number
    } = {}
  ): Promise<{ data: EnhancedLandRates[]; total: number }> {
    try {
      let query = supabase.from('enhanced_land_rates').select(
        `
          *,
          property:properties(name)
        `,
        { count: 'exact' }
      )

      if (filters.propertyId) {
        query = query.eq('property_id', filters.propertyId)
      }
      if (filters.financialYear) {
        query = query.eq('financial_year', filters.financialYear)
      }
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.county) {
        query = query.eq('county', filters.county)
      }

      if (filters.limit) {
        query = query.limit(filters.limit)
      }
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
      }

      query = query.order('due_date', { ascending: false })

      const { data, error, count } = await query

      if (error) throw error

      const transformedData = (data || []).map((landRate: any) => ({
        ...landRate,
        property_name: landRate.property?.name,
      }))

      return {
        data: transformedData,
        total: count || 0,
      }
    } catch (error) {
      console.error('Error fetching enhanced land rates:', error)
      throw new Error('Failed to load land rates')
    }
  }

  // Create land rates record
  static async createLandRatesRecord(
    landRate: Omit<EnhancedLandRates, 'id' | 'balance_kes' | 'created_at' | 'updated_at'>
  ): Promise<EnhancedLandRates> {
    try {
      const { data, error } = await supabase
        .from('enhanced_land_rates')
        .insert(landRate)
        .select(
          `
          *,
          property:properties(name)
        `
        )
        .single()

      if (error) throw error

      return {
        ...data,
        property_name: data.property?.name,
      }
    } catch (error) {
      console.error('Error creating land rates record:', error)
      throw new Error('Failed to create land rates record')
    }
  }

  // Calculate land rates for property
  static async calculateLandRates(
    propertyId: string,
    assessedValue: number,
    county: string,
    financialYear: string
  ): Promise<{
    rate_percentage: number
    annual_rate_kes: number
    due_date: string
  }> {
    try {
      // Get county-specific land rates configuration
      const { data: taxConfig, error } = await supabase
        .from('tax_configurations')
        .select('*')
        .eq('tax_type', 'LAND_RATES')
        .ilike('tax_name', `%${county}%`)
        .eq('is_active', true)
        .order('effective_from', { ascending: false })
        .limit(1)
        .single()

      if (error || !taxConfig) {
        // Fallback to default rate if county-specific rate not found
        const defaultRate = 0.0015 // 0.15% default
        const annualRate = assessedValue * defaultRate
        const dueDate = new Date(new Date().getFullYear(), 5, 30).toISOString().split('T')[0] // June 30th

        return {
          rate_percentage: defaultRate,
          annual_rate_kes: annualRate,
          due_date: dueDate,
        }
      }

      const ratePercentage = taxConfig.tax_rate
      const annualRate = assessedValue * ratePercentage
      const dueDate = new Date(new Date().getFullYear(), 5, 30).toISOString().split('T')[0] // June 30th

      return {
        rate_percentage: ratePercentage,
        annual_rate_kes: annualRate,
        due_date: dueDate,
      }
    } catch (error) {
      console.error('Error calculating land rates:', error)
      throw new Error('Failed to calculate land rates')
    }
  }

  // Get VAT management records
  static async getVATManagement(
    filters: {
      status?: string
      registrationStatus?: string
      startDate?: string
      endDate?: string
      limit?: number
    } = {}
  ): Promise<VATManagement[]> {
    try {
      let query = supabase.from('vat_management').select('*')

      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.registrationStatus) {
        query = query.eq('registration_status', filters.registrationStatus)
      }
      if (filters.startDate) {
        query = query.gte('vat_period_start', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('vat_period_end', filters.endDate)
      }
      if (filters.limit) {
        query = query.limit(filters.limit)
      }

      query = query.order('vat_period_start', { ascending: false })

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching VAT management records:', error)
      throw new Error('Failed to load VAT management records')
    }
  }

  // Calculate VAT for transaction
  static async calculateVAT(
    grossAmount: number,
    transactionType: 'SALE' | 'PURCHASE',
    isVATRegistered: boolean = true
  ): Promise<{
    vat_rate: number
    vat_amount: number
    net_amount: number
  }> {
    try {
      if (!isVATRegistered) {
        return {
          vat_rate: 0,
          vat_amount: 0,
          net_amount: grossAmount,
        }
      }

      // Get current VAT rate
      const { data: vatConfig, error } = await supabase
        .from('tax_configurations')
        .select('*')
        .eq('tax_type', 'VAT')
        .eq('tax_name', 'Standard VAT Rate')
        .eq('is_active', true)
        .single()

      if (error || !vatConfig) {
        throw new Error('VAT configuration not found')
      }

      const vatRate = vatConfig.tax_rate
      const vatAmount = grossAmount * vatRate
      const netAmount = grossAmount - vatAmount

      return {
        vat_rate: vatRate,
        vat_amount: vatAmount,
        net_amount: netAmount,
      }
    } catch (error) {
      console.error('Error calculating VAT:', error)
      throw new Error('Failed to calculate VAT')
    }
  }

  // Get withholding tax management records
  static async getWithholdingTaxManagement(
    filters: {
      status?: string
      startDate?: string
      endDate?: string
      limit?: number
    } = {}
  ): Promise<WithholdingTaxManagement[]> {
    try {
      let query = supabase.from('withholding_tax_management').select('*')

      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.startDate) {
        query = query.gte('tax_period_start', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('tax_period_end', filters.endDate)
      }
      if (filters.limit) {
        query = query.limit(filters.limit)
      }

      query = query.order('tax_period_start', { ascending: false })

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching withholding tax management records:', error)
      throw new Error('Failed to load withholding tax management records')
    }
  }

  // Calculate withholding tax
  static async calculateWithholdingTax(
    grossPayment: number,
    taxCategory: string,
    payeePin?: string
  ): Promise<{
    withholding_rate: number
    withholding_tax: number
    net_payment: number
    is_exempt: boolean
  }> {
    try {
      // Get withholding tax configuration for the category
      const categoryMap: { [key: string]: string } = {
        PROFESSIONAL_FEES: 'Professional Fees WHT',
        COMMISSIONS: 'Commission WHT',
        RENT: 'Rent WHT',
        MANAGEMENT_FEES: 'Management Fees WHT',
      }

      const configName = categoryMap[taxCategory]
      if (!configName) {
        throw new Error(`Unknown tax category: ${taxCategory}`)
      }

      const { data: whtConfig, error } = await supabase
        .from('tax_configurations')
        .select('*')
        .eq('tax_type', 'WITHHOLDING_TAX')
        .eq('tax_name', configName)
        .eq('is_active', true)
        .single()

      if (error || !whtConfig) {
        throw new Error(`Withholding tax configuration not found for ${taxCategory}`)
      }

      // Check if payment is below threshold
      if (grossPayment < whtConfig.minimum_threshold) {
        return {
          withholding_rate: 0,
          withholding_tax: 0,
          net_payment: grossPayment,
          is_exempt: true,
        }
      }

      const withholdingRate = whtConfig.tax_rate
      const withholdingTax = grossPayment * withholdingRate
      const netPayment = grossPayment - withholdingTax

      return {
        withholding_rate: withholdingRate,
        withholding_tax: withholdingTax,
        net_payment: netPayment,
        is_exempt: false,
      }
    } catch (error) {
      console.error('Error calculating withholding tax:', error)
      throw new Error('Failed to calculate withholding tax')
    }
  }

  // Get tax compliance summary
  static async getTaxComplianceSummary(): Promise<TaxComplianceSummary> {
    try {
      const { data, error } = await supabase.from('tax_compliance_summary').select('*').single()

      if (error) throw error

      return (
        data || {
          pending_land_rates: 0,
          outstanding_land_rates_kes: 0,
          paid_land_rates_kes: 0,
          pending_vat_returns: 0,
          outstanding_vat_kes: 0,
          paid_vat_kes: 0,
          pending_withholding_returns: 0,
          outstanding_withholding_kes: 0,
          paid_withholding_kes: 0,
          total_penalties_kes: 0,
          total_interest_kes: 0,
          upcoming_obligations: 0,
        }
      )
    } catch (error) {
      console.error('Error fetching tax compliance summary:', error)
      throw new Error('Failed to load tax compliance summary')
    }
  }

  // Get property tax summary
  static async getPropertyTaxSummary(propertyId?: string): Promise<PropertyTaxSummary[]> {
    try {
      let query = supabase.from('property_tax_summary').select('*')

      if (propertyId) {
        query = query.eq('property_id', propertyId)
      }

      query = query.order('total_tax_burden_kes', { ascending: false })

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching property tax summary:', error)
      throw new Error('Failed to load property tax summary')
    }
  }

  // Get tax compliance calendar
  static async getTaxComplianceCalendar(
    filters: {
      taxType?: string
      status?: string
      upcomingDays?: number
    } = {}
  ): Promise<TaxComplianceCalendar[]> {
    try {
      let query = supabase.from('tax_compliance_calendar').select('*')

      if (filters.taxType) {
        query = query.eq('tax_type', filters.taxType)
      }
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.upcomingDays) {
        const futureDate = new Date()
        futureDate.setDate(futureDate.getDate() + filters.upcomingDays)
        query = query.lte('filing_due_date', futureDate.toISOString().split('T')[0])
      }

      query = query.order('filing_due_date', { ascending: true })

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching tax compliance calendar:', error)
      throw new Error('Failed to load tax compliance calendar')
    }
  }

  // Calculate penalties and interest
  static async calculatePenaltiesAndInterest(
    taxType: string,
    originalAmount: number,
    dueDate: string,
    currentDate: string = new Date().toISOString().split('T')[0]
  ): Promise<{
    penalty_amount: number
    interest_amount: number
    total_additional: number
    days_overdue: number
  }> {
    try {
      const dueDateObj = new Date(dueDate)
      const currentDateObj = new Date(currentDate)
      const daysOverdue = Math.max(
        0,
        Math.floor((currentDateObj.getTime() - dueDateObj.getTime()) / (1000 * 60 * 60 * 24))
      )

      if (daysOverdue <= 0) {
        return {
          penalty_amount: 0,
          interest_amount: 0,
          total_additional: 0,
          days_overdue: 0,
        }
      }

      // Default penalty and interest rates (can be made configurable)
      const penaltyRate = 0.05 // 5% penalty
      const interestRate = 0.02 // 2% per month interest

      const penaltyAmount = originalAmount * penaltyRate
      const monthsOverdue = Math.ceil(daysOverdue / 30)
      const interestAmount = originalAmount * interestRate * monthsOverdue

      return {
        penalty_amount: penaltyAmount,
        interest_amount: interestAmount,
        total_additional: penaltyAmount + interestAmount,
        days_overdue: daysOverdue,
      }
    } catch (error) {
      console.error('Error calculating penalties and interest:', error)
      throw new Error('Failed to calculate penalties and interest')
    }
  }

  // Update land rates payment
  static async updateLandRatesPayment(
    landRateId: string,
    paymentAmount: number,
    paymentDate: string,
    paymentReference: string,
    receiptNumber?: string
  ): Promise<EnhancedLandRates> {
    try {
      const { data, error } = await supabase
        .from('enhanced_land_rates')
        .update({
          amount_paid_kes: paymentAmount,
          payment_date: paymentDate,
          payment_reference: paymentReference,
          receipt_number: receiptNumber,
          status: 'PAID',
          updated_at: new Date().toISOString(),
        })
        .eq('id', landRateId)
        .select(
          `
          *,
          property:properties(name)
        `
        )
        .single()

      if (error) throw error

      return {
        ...data,
        property_name: data.property?.name,
      }
    } catch (error) {
      console.error('Error updating land rates payment:', error)
      throw new Error('Failed to update land rates payment')
    }
  }

  // Generate tax compliance report
  static async generateTaxComplianceReport(
    startDate: string,
    endDate: string
  ): Promise<{
    period: { start_date: string; end_date: string }
    land_rates: {
      total_assessed: number
      total_due: number
      total_paid: number
      total_outstanding: number
      properties_count: number
    }
    vat: {
      total_sales: number
      total_purchases: number
      net_vat_payable: number
      returns_filed: number
      returns_pending: number
    }
    withholding_tax: {
      total_payments: number
      total_withholding: number
      returns_filed: number
      returns_pending: number
    }
    compliance_score: number
  }> {
    try {
      // Get land rates data
      const landRatesData = await this.getEnhancedLandRates({
        // Add date filters when available
      })

      // Get VAT data
      const vatData = await this.getVATManagement({
        startDate,
        endDate,
      })

      // Get withholding tax data
      const withholdingData = await this.getWithholdingTaxManagement({
        startDate,
        endDate,
      })

      // Calculate land rates summary
      const landRatesSummary = landRatesData.data.reduce(
        (acc, lr) => ({
          total_assessed: acc.total_assessed + lr.assessed_value_kes,
          total_due: acc.total_due + lr.annual_rate_kes,
          total_paid: acc.total_paid + lr.amount_paid_kes,
          total_outstanding: acc.total_outstanding + lr.balance_kes,
          properties_count: acc.properties_count + 1,
        }),
        {
          total_assessed: 0,
          total_due: 0,
          total_paid: 0,
          total_outstanding: 0,
          properties_count: 0,
        }
      )

      // Calculate VAT summary
      const vatSummary = vatData.reduce(
        (acc, vat) => ({
          total_sales: acc.total_sales + vat.total_sales_kes,
          total_purchases: acc.total_purchases + vat.total_purchases_kes,
          net_vat_payable: acc.net_vat_payable + vat.net_vat_payable_kes,
          returns_filed: acc.returns_filed + (vat.status === 'FILED' ? 1 : 0),
          returns_pending: acc.returns_pending + (vat.status === 'PENDING' ? 1 : 0),
        }),
        {
          total_sales: 0,
          total_purchases: 0,
          net_vat_payable: 0,
          returns_filed: 0,
          returns_pending: 0,
        }
      )

      // Calculate withholding tax summary
      const withholdingSummary = withholdingData.reduce(
        (acc, wht) => ({
          total_payments: acc.total_payments + wht.total_payments_kes,
          total_withholding: acc.total_withholding + wht.total_withholding_tax_kes,
          returns_filed: acc.returns_filed + (wht.status === 'FILED' ? 1 : 0),
          returns_pending: acc.returns_pending + (wht.status === 'PENDING' ? 1 : 0),
        }),
        {
          total_payments: 0,
          total_withholding: 0,
          returns_filed: 0,
          returns_pending: 0,
        }
      )

      // Calculate compliance score (simplified)
      const totalObligations =
        vatSummary.returns_filed +
        vatSummary.returns_pending +
        withholdingSummary.returns_filed +
        withholdingSummary.returns_pending
      const completedObligations = vatSummary.returns_filed + withholdingSummary.returns_filed
      const complianceScore =
        totalObligations > 0 ? (completedObligations / totalObligations) * 100 : 100

      return {
        period: {
          start_date: startDate,
          end_date: endDate,
        },
        land_rates: landRatesSummary,
        vat: vatSummary,
        withholding_tax: withholdingSummary,
        compliance_score: complianceScore,
      }
    } catch (error) {
      console.error('Error generating tax compliance report:', error)
      throw new Error('Failed to generate tax compliance report')
    }
  }

  // Utility function to format currency
  static formatCurrency(amount: number): string {
    if (amount == null || isNaN(amount)) return 'KES 0'
    return `KES ${Number(amount).toLocaleString()}`
  }

  // Utility function to format percentage
  static formatPercentage(value: number, decimals: number = 2): string {
    if (value == null || isNaN(value)) return '0.00%'
    return `${Number(value).toFixed(decimals)}%`
  }

  // Utility function to get status color
  static getStatusColor(status: string): string {
    switch (status) {
      case 'PAID':
      case 'FILED':
        return 'text-green-600 bg-green-100'
      case 'PENDING':
      case 'CALCULATED':
        return 'text-yellow-600 bg-yellow-100'
      case 'OVERDUE':
        return 'text-red-600 bg-red-100'
      case 'DISPUTED':
        return 'text-purple-600 bg-purple-100'
      case 'WAIVED':
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  // Utility function to get tax type display name
  static getTaxTypeDisplayName(taxType: string): string {
    const displayNames: { [key: string]: string } = {
      LAND_RATES: 'Land Rates',
      VAT: 'Value Added Tax',
      WITHHOLDING_TAX: 'Withholding Tax',
      INCOME_TAX: 'Income Tax',
      STAMP_DUTY: 'Stamp Duty',
      CAPITAL_GAINS_TAX: 'Capital Gains Tax',
      RENTAL_INCOME_TAX: 'Rental Income Tax',
      PROPERTY_TRANSFER_TAX: 'Property Transfer Tax',
    }
    return displayNames[taxType] || taxType
  }
}
