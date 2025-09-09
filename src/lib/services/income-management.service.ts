import supabase from '../supabase-client'

// Types for Income Management
export interface IncomeCategory {
  id: string
  category_name: string
  subcategory: string
  display_name: string
  description?: string
  is_recurring: boolean
  default_frequency: string
  is_active: boolean
  sort_order: number
}

export interface IncomeTransaction {
  id: string
  category_id: string
  property_id?: string
  member_id?: string
  tenant_id?: string
  agent_id?: string
  amount_kes: number
  transaction_date: string
  due_date?: string
  received_date?: string
  description: string
  reference_number?: string
  external_reference?: string
  is_recurring: boolean
  recurring_frequency: string
  parent_transaction_id?: string
  status: string
  notes?: string
  created_at: string
  updated_at: string
  created_by?: string

  // Joined data
  category?: IncomeCategory
  property_name?: string
  member_name?: string
  tenant_name?: string
}

export interface MemberContribution {
  id: string
  member_id: string
  contribution_type: string
  property_id?: string
  project_name?: string
  amount_kes: number
  due_date: string
  paid_date?: string
  payment_reference?: string
  status: string
  is_recurring: boolean
  recurring_frequency: string
  description?: string
  notes?: string

  // Joined data
  member_name?: string
  member_number?: string
  property_name?: string
}

export interface PropertySaleIncome {
  id: string
  property_id: string
  sale_agreement_id?: string
  sale_price_kes: number
  acquisition_cost_kes: number
  capital_gains_kes: number
  total_received_kes: number
  balance_kes: number
  sale_date: string
  completion_date?: string
  buyer_name?: string
  buyer_contact?: string
  status: string
  notes?: string

  // Joined data
  property_name?: string
}

export interface IncomeAnalytics {
  totalIncome: number
  monthlyRecurring: number
  pendingAmount: number
  overdueAmount: number
  categoryBreakdown: Array<{
    category: string
    amount: number
    percentage: number
    count: number
  }>
  monthlyTrends: Array<{
    month: string
    amount: number
    transactions: number
  }>
  memberContributionSummary: {
    totalMembers: number
    activeContributors: number
    monthlyFeeCollected: number
    monthlyFeeOutstanding: number
    projectContributions: number
  }
}

export class IncomeManagementService {
  // Get all income categories
  static async getIncomeCategories(): Promise<IncomeCategory[]> {
    try {
      const { data, error } = await supabase
        .from('income_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching income categories:', error)
      throw new Error('Failed to load income categories')
    }
  }

  // Get all properties
  static async getProperties(): Promise<Array<{ id: string; name: string }>> {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, property_name as name')
        .order('property_name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching properties:', error)
      throw new Error('Failed to load properties')
    }
  }

  // Get all members
  static async getMembers(): Promise<
    Array<{ id: string; full_name: string; member_number: string }>
  > {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, full_name, member_number')
        .eq('status', 'ACTIVE')
        .order('full_name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching members:', error)
      throw new Error('Failed to load members')
    }
  }

  // Get all tenants
  static async getTenants(): Promise<Array<{ id: string; full_name: string }>> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, full_name')
        .eq('status', 'ACTIVE')
        .order('full_name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching tenants:', error)
      throw new Error('Failed to load tenants')
    }
  }

  // Get income transactions with filters
  static async getIncomeTransactions(
    filters: {
      startDate?: string
      endDate?: string
      categoryId?: string
      status?: string
      propertyId?: string
      memberId?: string
      limit?: number
      offset?: number
    } = {}
  ): Promise<{ data: IncomeTransaction[]; total: number }> {
    try {
      let query = supabase.from('income_transactions').select(
        `
          *,
          category:income_categories(display_name, category_name, subcategory),
          property:properties(name),
          member:enhanced_users!member_id(full_name, member_number),
          tenant:tenants(full_name)
        `,
        { count: 'exact' }
      )

      // Apply filters
      if (filters.startDate) {
        query = query.gte('transaction_date', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('transaction_date', filters.endDate)
      }
      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId)
      }
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.propertyId) {
        query = query.eq('property_id', filters.propertyId)
      }
      if (filters.memberId) {
        query = query.eq('member_id', filters.memberId)
      }

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit)
      }
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
      }

      query = query.order('transaction_date', { ascending: false })

      const { data, error, count } = await query

      if (error) throw error

      // Transform the data to flatten joined fields
      const transformedData = (data || []).map((transaction: any) => ({
        ...transaction,
        category_name: transaction.category?.display_name,
        property_name: transaction.property?.name,
        member_name: transaction.member?.full_name,
        member_number: transaction.member?.member_number,
        tenant_name: transaction.tenant?.full_name,
      }))

      return {
        data: transformedData,
        total: count || 0,
      }
    } catch (error) {
      console.error('Error fetching income transactions:', error)
      throw new Error('Failed to load income transactions')
    }
  }

  // Create new income transaction
  static async createIncomeTransaction(
    transaction: Omit<IncomeTransaction, 'id' | 'created_at' | 'updated_at'>
  ): Promise<IncomeTransaction> {
    try {
      const { data, error } = await supabase
        .from('income_transactions')
        .insert(transaction)
        .select(
          `
          *,
          category:income_categories(display_name, category_name, subcategory),
          property:properties(name),
          member:enhanced_users!member_id(full_name, member_number),
          tenant:tenants(full_name)
        `
        )
        .single()

      if (error) throw error

      return {
        ...data,
        category_name: data.category?.display_name,
        property_name: data.property?.name,
        member_name: data.member?.full_name,
        tenant_name: data.tenant?.full_name,
      }
    } catch (error) {
      console.error('Error creating income transaction:', error)
      throw new Error('Failed to create income transaction')
    }
  }

  // Update income transaction
  static async updateIncomeTransaction(
    id: string,
    updates: Partial<IncomeTransaction>
  ): Promise<IncomeTransaction> {
    try {
      const { data, error } = await supabase
        .from('income_transactions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select(
          `
          *,
          category:income_categories(display_name, category_name, subcategory),
          property:properties(name),
          member:enhanced_users!member_id(full_name, member_number),
          tenant:tenants(full_name)
        `
        )
        .single()

      if (error) throw error

      return {
        ...data,
        category_name: data.category?.display_name,
        property_name: data.property?.name,
        member_name: data.member?.full_name,
        tenant_name: data.tenant?.full_name,
      }
    } catch (error) {
      console.error('Error updating income transaction:', error)
      throw new Error('Failed to update income transaction')
    }
  }

  // Delete income transaction
  static async deleteIncomeTransaction(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('income_transactions').delete().eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting income transaction:', error)
      throw new Error('Failed to delete income transaction')
    }
  }

  // Get member contributions
  static async getMemberContributions(
    filters: {
      memberId?: string
      contributionType?: string
      status?: string
      startDate?: string
      endDate?: string
      limit?: number
      offset?: number
    } = {}
  ): Promise<{ data: MemberContribution[]; total: number }> {
    try {
      let query = supabase.from('member_contributions').select(
        `
          *,
          member:enhanced_users!member_id(full_name, member_number),
          property:properties(name)
        `,
        { count: 'exact' }
      )

      // Apply filters
      if (filters.memberId) {
        query = query.eq('member_id', filters.memberId)
      }
      if (filters.contributionType) {
        query = query.eq('contribution_type', filters.contributionType)
      }
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.startDate) {
        query = query.gte('due_date', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('due_date', filters.endDate)
      }

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit)
      }
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
      }

      query = query.order('due_date', { ascending: false })

      const { data, error, count } = await query

      if (error) throw error

      // Transform the data
      const transformedData = (data || []).map((contribution: any) => ({
        ...contribution,
        member_name: contribution.member?.full_name,
        member_number: contribution.member?.member_number,
        property_name: contribution.property?.name,
      }))

      return {
        data: transformedData,
        total: count || 0,
      }
    } catch (error) {
      console.error('Error fetching member contributions:', error)
      throw new Error('Failed to load member contributions')
    }
  }

  // Create member contribution
  static async createMemberContribution(
    contribution: Omit<MemberContribution, 'id' | 'created_at' | 'updated_at'>
  ): Promise<MemberContribution> {
    try {
      const { data, error } = await supabase
        .from('member_contributions')
        .insert(contribution)
        .select(
          `
          *,
          member:enhanced_users!member_id(full_name, member_number),
          property:properties(name)
        `
        )
        .single()

      if (error) throw error

      return {
        ...data,
        member_name: data.member?.full_name,
        member_number: data.member?.member_number,
        property_name: data.property?.name,
      }
    } catch (error) {
      console.error('Error creating member contribution:', error)
      throw new Error('Failed to create member contribution')
    }
  }

  // Get property sales income
  static async getPropertySalesIncome(
    filters: {
      propertyId?: string
      status?: string
      startDate?: string
      endDate?: string
    } = {}
  ): Promise<PropertySaleIncome[]> {
    try {
      let query = supabase.from('property_sales_income').select(`
          *,
          property:properties(name)
        `)

      if (filters.propertyId) {
        query = query.eq('property_id', filters.propertyId)
      }
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.startDate) {
        query = query.gte('sale_date', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('sale_date', filters.endDate)
      }

      query = query.order('sale_date', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      return (data || []).map((sale: any) => ({
        ...sale,
        property_name: sale.property?.name,
      }))
    } catch (error) {
      console.error('Error fetching property sales income:', error)
      throw new Error('Failed to load property sales income')
    }
  }

  // Get properties for dropdowns
  static async getProperties(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .eq('lifecycle_status', 'ACTIVE')
        .order('name', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching properties:', error)
      throw new Error('Failed to load properties')
    }
  }

  // Get members for dropdowns
  static async getMembers(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('enhanced_users')
        .select('id, full_name, member_number')
        .order('full_name', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching members:', error)
      throw new Error('Failed to load members')
    }
  }

  // Get tenants for dropdowns
  static async getTenants(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, full_name')
        .order('full_name', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching tenants:', error)
      throw new Error('Failed to load tenants')
    }
  }

  // Get comprehensive income analytics
  static async getIncomeAnalytics(
    filters: {
      startDate?: string
      endDate?: string
      propertyId?: string
    } = {}
  ): Promise<IncomeAnalytics> {
    try {
      const results = await Promise.allSettled([
        this.getIncomeTransactions(filters),
        this.getMemberContributions(filters),
        this.getPropertySalesIncome(filters),
        this.getRentalIncomeFromExistingSystem(filters),
      ])

      const incomeTransactions = results[0].status === 'fulfilled' ? results[0].value.data : []
      const memberContributions = results[1].status === 'fulfilled' ? results[1].value.data : []
      const propertySales = results[2].status === 'fulfilled' ? results[2].value : []
      const rentalIncome = results[3].status === 'fulfilled' ? results[3].value : []

      // Calculate totals
      const totalIncome = [
        ...incomeTransactions.filter((t) => t.status === 'RECEIVED'),
        ...memberContributions.filter((c) => c.status === 'RECEIVED'),
        ...propertySales.filter((s) => s.status === 'COMPLETED'),
        ...rentalIncome,
      ].reduce((sum, item) => sum + ((item as any).amount_kes || 0), 0)

      // Calculate monthly recurring
      const monthlyRecurring = [
        ...incomeTransactions.filter((t) => t.is_recurring && t.recurring_frequency === 'MONTHLY'),
        ...memberContributions.filter((c) => c.is_recurring && c.recurring_frequency === 'MONTHLY'),
      ].reduce((sum, item) => sum + (item.amount_kes || 0), 0)

      // Calculate pending and overdue amounts
      const pendingAmount = [
        ...incomeTransactions.filter((t) => t.status === 'PENDING'),
        ...memberContributions.filter((c) => c.status === 'PENDING'),
      ].reduce((sum, item) => sum + (item.amount_kes || 0), 0)

      const overdueAmount = [
        ...incomeTransactions.filter((t) => t.status === 'OVERDUE'),
        ...memberContributions.filter((c) => c.status === 'OVERDUE'),
      ].reduce((sum, item) => sum + (item.amount_kes || 0), 0)

      // Category breakdown
      const categoryMap = new Map()
      incomeTransactions.forEach((transaction) => {
        const category = transaction.category?.category_name || 'Unknown'
        const existing = categoryMap.get(category) || { amount: 0, count: 0 }
        categoryMap.set(category, {
          amount: existing.amount + transaction.amount_kes,
          count: existing.count + 1,
        })
      })

      const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: totalIncome > 0 ? (data.amount / totalIncome) * 100 : 0,
      }))

      // Member contribution summary
      const totalMembers = new Set(memberContributions.map((c) => c.member_id)).size
      const activeContributors = new Set(
        memberContributions.filter((c) => c.status === 'RECEIVED').map((c) => c.member_id)
      ).size

      const monthlyFeeCollected = memberContributions
        .filter((c) => c.contribution_type === 'MONTHLY_MEMBER_FEE' && c.status === 'RECEIVED')
        .reduce((sum, c) => sum + c.amount_kes, 0)

      const monthlyFeeOutstanding = memberContributions
        .filter((c) => c.contribution_type === 'MONTHLY_MEMBER_FEE' && c.status !== 'RECEIVED')
        .reduce((sum, c) => sum + c.amount_kes, 0)

      const projectContributions = memberContributions
        .filter((c) => c.contribution_type === 'PROJECT_SPECIFIC_CONTRIBUTION')
        .reduce((sum, c) => sum + c.amount_kes, 0)

      return {
        totalIncome,
        monthlyRecurring,
        pendingAmount,
        overdueAmount,
        categoryBreakdown,
        monthlyTrends: [], // TODO: Implement monthly trends calculation
        memberContributionSummary: {
          totalMembers,
          activeContributors,
          monthlyFeeCollected,
          monthlyFeeOutstanding,
          projectContributions,
        },
      }
    } catch (error) {
      console.error('Error calculating income analytics:', error)
      throw new Error('Failed to calculate income analytics')
    }
  }

  // Integration with existing rental system
  private static async getRentalIncomeFromExistingSystem(
    filters: {
      startDate?: string
      endDate?: string
      propertyId?: string
    } = {}
  ): Promise<Array<{ amount_kes: number; transaction_date: string }>> {
    try {
      let query = supabase.from('payments').select('amount_kes, payment_date')

      if (filters.startDate) {
        query = query.gte('payment_date', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('payment_date', filters.endDate)
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map((payment: any) => ({
        amount_kes: payment.amount_kes,
        transaction_date: payment.payment_date,
      }))
    } catch (error) {
      console.error('Error fetching rental income from existing system:', error)
      return []
    }
  }

  // Utility function to format currency
  static formatCurrency(amount: number): string {
    if (amount == null || isNaN(amount)) return 'KES 0'
    return `KES ${Number(amount).toLocaleString()}`
  }

  // Utility function to get status color
  static getStatusColor(status: string): string {
    switch (status) {
      case 'RECEIVED':
      case 'COMPLETED':
        return 'text-green-600 bg-green-100'
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-100'
      case 'OVERDUE':
        return 'text-red-600 bg-red-100'
      case 'CANCELLED':
        return 'text-gray-600 bg-gray-100'
      case 'PARTIAL':
        return 'text-blue-600 bg-blue-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }
}
