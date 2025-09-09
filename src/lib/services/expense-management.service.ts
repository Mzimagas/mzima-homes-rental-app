import supabase from '../supabase-client'
import { AcquisitionFinancialsService } from '../../components/properties/services/acquisition-financials.service'
import { HandoverFinancialsService } from '../../components/properties/services/handover-financials.service'

// Types for Expense Management
export interface ExpenseCategory {
  id: string
  category_name: string
  subcategory: string
  display_name: string
  description?: string
  requires_allocation: boolean
  default_allocation_method: string
  is_active: boolean
  sort_order: number
}

export interface Vendor {
  id: string
  vendor_name: string
  vendor_code?: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  postal_code?: string
  country: string
  vendor_type?: string
  tax_id?: string
  payment_terms?: string
  credit_limit_kes: number
  is_active: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface ExpenseTransaction {
  id: string
  category_id: string
  property_id?: string
  vendor_id?: string
  amount_kes: number
  transaction_date: string
  due_date?: string
  paid_date?: string
  description: string
  invoice_number?: string
  receipt_number?: string
  reference_number?: string
  payment_method?: string
  status: string
  requested_by?: string
  approved_by?: string
  approval_date?: string
  requires_allocation: boolean
  is_allocated: boolean
  allocation_method?: string
  notes?: string
  attachments?: any[]
  created_at: string
  updated_at: string
  created_by?: string

  // Joined data
  category?: ExpenseCategory
  property_name?: string
  vendor_name?: string
  allocations?: ExpenseAllocation[]
}

export interface ExpenseAllocation {
  id: string
  expense_id: string
  property_id: string
  allocation_percentage: number
  allocated_amount_kes: number
  allocation_method: string
  allocation_basis?: any
  notes?: string
  created_at: string
  created_by?: string

  // Joined data
  property_name?: string
}

export interface PropertyExpenseConsolidation {
  property_id: string
  property_name: string
  direct_expenses_kes: number
  allocated_expenses_kes: number
  total_expenses_kes: number
  acquisition_costs_kes: number
  handover_costs_kes: number
  maintenance_costs_kes: number
  grand_total_expenses_kes: number
}

export interface ExpenseAnalytics {
  totalExpenses: number
  propertySpecificExpenses: number
  generalBusinessExpenses: number
  sharedAllocatedExpenses: number
  pendingApprovals: number
  pendingPayments: number
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
  vendorSummary: Array<{
    vendor_name: string
    total_amount: number
    transaction_count: number
  }>
  propertyExpenseRanking: Array<{
    property_name: string
    total_expenses: number
    percentage: number
  }>
}

export class ExpenseManagementService {
  // Get all expense categories
  static async getExpenseCategories(): Promise<ExpenseCategory[]> {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching expense categories:', error)
      throw new Error('Failed to load expense categories')
    }
  }

  // Get vendors
  static async getVendors(
    filters: {
      isActive?: boolean
      vendorType?: string
      search?: string
    } = {}
  ): Promise<Vendor[]> {
    try {
      let query = supabase.from('vendors').select('*')

      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive)
      }
      if (filters.vendorType) {
        query = query.eq('vendor_type', filters.vendorType)
      }
      if (filters.search) {
        query = query.or(
          `vendor_name.ilike.%${filters.search}%,contact_person.ilike.%${filters.search}%`
        )
      }

      query = query.order('vendor_name', { ascending: true })

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching vendors:', error)
      throw new Error('Failed to load vendors')
    }
  }

  // Get expense transactions with filters
  static async getExpenseTransactions(
    filters: {
      startDate?: string
      endDate?: string
      categoryId?: string
      status?: string
      propertyId?: string
      vendorId?: string
      requiresAllocation?: boolean
      limit?: number
      offset?: number
    } = {}
  ): Promise<{ data: ExpenseTransaction[]; total: number }> {
    try {
      let query = supabase.from('expense_transactions').select(
        `
          *,
          category:expense_categories(display_name, category_name, subcategory),
          property:properties(name),
          vendor:vendors(vendor_name),
          allocations:expense_allocations(
            id,
            property_id,
            allocation_percentage,
            allocated_amount_kes,
            allocation_method,
            properties(name)
          )
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
      if (filters.vendorId) {
        query = query.eq('vendor_id', filters.vendorId)
      }
      if (filters.requiresAllocation !== undefined) {
        query = query.eq('requires_allocation', filters.requiresAllocation)
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
        vendor_name: transaction.vendor?.vendor_name,
        allocations:
          transaction.allocations?.map((alloc: any) => ({
            ...alloc,
            property_name: alloc.properties?.name,
          })) || [],
      }))

      return {
        data: transformedData,
        total: count || 0,
      }
    } catch (error) {
      console.error('Error fetching expense transactions:', error)
      throw new Error('Failed to load expense transactions')
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

  // Get vendors for dropdowns
  static async getVendors(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, vendor_name, contact_person, phone, email')
        .eq('is_active', true)
        .order('vendor_name', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching vendors:', error)
      throw new Error('Failed to load vendors')
    }
  }

  // Create new expense transaction
  static async createExpenseTransaction(
    transaction: Omit<ExpenseTransaction, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ExpenseTransaction> {
    try {
      const { data, error } = await supabase
        .from('expense_transactions')
        .insert(transaction)
        .select(
          `
          *,
          category:expense_categories(display_name, category_name, subcategory),
          property:properties(name),
          vendor:vendors(vendor_name)
        `
        )
        .single()

      if (error) throw error

      return {
        ...data,
        category_name: data.category?.display_name,
        property_name: data.property?.name,
        vendor_name: data.vendor?.vendor_name,
        allocations: [],
      }
    } catch (error) {
      console.error('Error creating expense transaction:', error)
      throw new Error('Failed to create expense transaction')
    }
  }

  // Update expense transaction
  static async updateExpenseTransaction(
    id: string,
    updates: Partial<ExpenseTransaction>
  ): Promise<ExpenseTransaction> {
    try {
      const { data, error } = await supabase
        .from('expense_transactions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select(
          `
          *,
          category:expense_categories(display_name, category_name, subcategory),
          property:properties(name),
          vendor:vendors(vendor_name)
        `
        )
        .single()

      if (error) throw error

      return {
        ...data,
        category_name: data.category?.display_name,
        property_name: data.property?.name,
        vendor_name: data.vendor?.vendor_name,
        allocations: [],
      }
    } catch (error) {
      console.error('Error updating expense transaction:', error)
      throw new Error('Failed to update expense transaction')
    }
  }

  // Get property expense consolidation
  static async getPropertyExpenseConsolidation(
    propertyId?: string
  ): Promise<PropertyExpenseConsolidation[]> {
    try {
      let query = supabase.from('property_expense_consolidation').select('*')

      if (propertyId) {
        query = query.eq('property_id', propertyId)
      }

      query = query.order('grand_total_expenses_kes', { ascending: false })

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching property expense consolidation:', error)
      throw new Error('Failed to load property expense consolidation')
    }
  }

  // Intelligent consolidation of property-specific costs from existing systems
  static async consolidatePropertyExpenses(propertyId: string): Promise<{
    acquisitionCosts: any[]
    handoverCosts: any[]
    maintenanceExpenses: any[]
    directExpenses: any[]
    allocatedExpenses: any[]
    totalConsolidated: number
  }> {
    try {
      // Load data from existing financial systems in parallel
      const [acquisitionResult, handoverResult, directExpensesResult, allocatedExpensesResult] =
        await Promise.allSettled([
          AcquisitionFinancialsService.loadAllFinancialData(propertyId),
          HandoverFinancialsService.loadAllHandoverFinancialData(propertyId),
          this.getExpenseTransactions({ propertyId, status: 'PAID' }),
          this.getExpenseAllocations(propertyId),
        ])

      // Extract successful results
      const acquisitionData =
        acquisitionResult.status === 'fulfilled'
          ? acquisitionResult.value
          : { costs: [], payments: [] }
      const handoverData =
        handoverResult.status === 'fulfilled' ? handoverResult.value : { costs: [], receipts: [] }
      const directExpenses =
        directExpensesResult.status === 'fulfilled' ? directExpensesResult.value.data : []
      const allocatedExpenses =
        allocatedExpensesResult.status === 'fulfilled' ? allocatedExpensesResult.value : []

      // Get maintenance expenses from direct expenses
      const maintenanceExpenses = directExpenses.filter(
        (expense) => expense.category?.subcategory === 'MAINTENANCE_REPAIR'
      )

      // Calculate totals
      const acquisitionTotal = acquisitionData.costs.reduce(
        (sum: number, cost: any) => sum + (cost.amount_kes || 0),
        0
      )
      const handoverTotal = handoverData.costs.reduce(
        (sum: number, cost: any) => sum + (cost.amount_kes || 0),
        0
      )
      const maintenanceTotal = maintenanceExpenses.reduce(
        (sum: number, expense: any) => sum + expense.amount_kes,
        0
      )
      const directTotal = directExpenses.reduce(
        (sum: number, expense: any) => sum + expense.amount_kes,
        0
      )
      const allocatedTotal = allocatedExpenses.reduce(
        (sum: number, alloc: any) => sum + alloc.allocated_amount_kes,
        0
      )

      const totalConsolidated = acquisitionTotal + handoverTotal + directTotal + allocatedTotal

      return {
        acquisitionCosts: acquisitionData.costs,
        handoverCosts: handoverData.costs,
        maintenanceExpenses,
        directExpenses,
        allocatedExpenses,
        totalConsolidated,
      }
    } catch (error) {
      console.error('Error consolidating property expenses:', error)
      throw new Error('Failed to consolidate property expenses')
    }
  }

  // Get expense allocations for a property
  static async getExpenseAllocations(propertyId: string): Promise<ExpenseAllocation[]> {
    try {
      const { data, error } = await supabase
        .from('expense_allocations')
        .select(
          `
          *,
          property:properties(name),
          expense:expense_transactions(description, amount_kes)
        `
        )
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data || []).map((allocation: any) => ({
        ...allocation,
        property_name: allocation.property?.name,
      }))
    } catch (error) {
      console.error('Error fetching expense allocations:', error)
      throw new Error('Failed to load expense allocations')
    }
  }

  // Smart allocation engine
  static async allocateSharedExpense(
    expenseId: string,
    allocationMethod: 'EQUAL' | 'VALUE' | 'INCOME' | 'UNITS' | 'ACTIVITY' | 'MANUAL',
    manualAllocations?: Array<{ property_id: string; percentage: number }>
  ): Promise<ExpenseAllocation[]> {
    try {
      // Get the expense details
      const { data: expense, error: expenseError } = await supabase
        .from('expense_transactions')
        .select('*')
        .eq('id', expenseId)
        .single()

      if (expenseError) throw expenseError

      // Get active properties
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('id, name, purchase_price_agreement_kes')
        .eq('lifecycle_status', 'ACTIVE')

      if (propertiesError) throw propertiesError

      let allocations: Array<{ property_id: string; percentage: number; basis?: any }> = []

      if (allocationMethod === 'MANUAL' && manualAllocations) {
        allocations = manualAllocations.map((alloc) => ({ ...alloc, basis: { method: 'manual' } }))
      } else {
        allocations = await this.calculateAutoAllocations(properties, allocationMethod as any)
      }

      // Validate allocations sum to 100%
      const totalPercentage = allocations.reduce((sum, alloc) => sum + alloc.percentage, 0)
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new Error('Allocation percentages must sum to 100%')
      }

      // Create allocation records
      const allocationRecords = allocations.map((alloc) => ({
        expense_id: expenseId,
        property_id: alloc.property_id,
        allocation_percentage: alloc.percentage,
        allocated_amount_kes: (expense.amount_kes * alloc.percentage) / 100,
        allocation_method: allocationMethod,
        allocation_basis: alloc.basis,
      }))

      const { data: createdAllocations, error: createError } = await supabase
        .from('expense_allocations')
        .insert(allocationRecords).select(`
          *,
          property:properties(name)
        `)

      if (createError) throw createError

      // Update expense as allocated
      await supabase
        .from('expense_transactions')
        .update({
          is_allocated: true,
          allocation_method: allocationMethod,
          updated_at: new Date().toISOString(),
        })
        .eq('id', expenseId)

      return (createdAllocations || []).map((allocation: any) => ({
        ...allocation,
        property_name: allocation.property?.name,
      }))
    } catch (error) {
      console.error('Error allocating shared expense:', error)
      throw new Error('Failed to allocate shared expense')
    }
  }

  // Calculate automatic allocations based on method
  private static async calculateAutoAllocations(
    properties: any[],
    method: 'EQUAL' | 'VALUE' | 'INCOME' | 'UNITS' | 'ACTIVITY'
  ): Promise<Array<{ property_id: string; percentage: number; basis: any }>> {
    switch (method) {
      case 'EQUAL':
        const equalPercentage = 100 / properties.length
        return properties.map((prop) => ({
          property_id: prop.id,
          percentage: equalPercentage,
          basis: { method: 'equal', property_count: properties.length },
        }))

      case 'VALUE':
        const totalValue = properties.reduce(
          (sum, prop) => sum + (prop.purchase_price_agreement_kes || 0),
          0
        )
        if (totalValue === 0)
          throw new Error('Cannot allocate by value: no property values available')

        return properties.map((prop) => ({
          property_id: prop.id,
          percentage: ((prop.purchase_price_agreement_kes || 0) / totalValue) * 100,
          basis: {
            method: 'value',
            property_value: prop.purchase_price_agreement_kes,
            total_value: totalValue,
          },
        }))

      case 'INCOME':
        // TODO: Implement income-based allocation
        // For now, fall back to equal allocation
        const incomePercentage = 100 / properties.length
        return properties.map((prop) => ({
          property_id: prop.id,
          percentage: incomePercentage,
          basis: {
            method: 'income_fallback_equal',
            note: 'Income data not available, using equal allocation',
          },
        }))

      case 'UNITS':
        // TODO: Implement unit-based allocation
        // For now, fall back to equal allocation
        const unitsPercentage = 100 / properties.length
        return properties.map((prop) => ({
          property_id: prop.id,
          percentage: unitsPercentage,
          basis: {
            method: 'units_fallback_equal',
            note: 'Unit data not available, using equal allocation',
          },
        }))

      case 'ACTIVITY':
        // TODO: Implement activity-based allocation
        // For now, fall back to equal allocation
        const activityPercentage = 100 / properties.length
        return properties.map((prop) => ({
          property_id: prop.id,
          percentage: activityPercentage,
          basis: {
            method: 'activity_fallback_equal',
            note: 'Activity data not available, using equal allocation',
          },
        }))

      default:
        throw new Error(`Unsupported allocation method: ${method}`)
    }
  }

  // Get comprehensive expense analytics
  static async getExpenseAnalytics(
    filters: {
      startDate?: string
      endDate?: string
      propertyId?: string
    } = {}
  ): Promise<ExpenseAnalytics> {
    try {
      const [expenseTransactions, propertyConsolidation] = await Promise.allSettled([
        this.getExpenseTransactions({ ...filters, status: 'PAID' }),
        this.getPropertyExpenseConsolidation(filters.propertyId),
      ])

      const expenses =
        expenseTransactions.status === 'fulfilled' ? expenseTransactions.value.data : []
      const propertyExpenses =
        propertyConsolidation.status === 'fulfilled' ? propertyConsolidation.value : []

      // Calculate totals
      const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount_kes, 0)

      const propertySpecificExpenses = expenses
        .filter((e) => e.category?.category_name === 'PROPERTY_SPECIFIC')
        .reduce((sum, e) => sum + e.amount_kes, 0)

      const generalBusinessExpenses = expenses
        .filter((e) => e.category?.category_name === 'GENERAL_BUSINESS')
        .reduce((sum, e) => sum + e.amount_kes, 0)

      const sharedAllocatedExpenses = expenses
        .filter((e) => e.category?.category_name === 'SHARED_ALLOCATED')
        .reduce((sum, e) => sum + e.amount_kes, 0)

      // Get pending counts
      const pendingApprovals = await this.getExpenseTransactions({ status: 'PENDING' })
      const pendingPayments = await this.getExpenseTransactions({ status: 'APPROVED' })

      // Category breakdown
      const categoryMap = new Map()
      expenses.forEach((expense) => {
        const category = expense.category?.category_name || 'Unknown'
        const existing = categoryMap.get(category) || { amount: 0, count: 0 }
        categoryMap.set(category, {
          amount: existing.amount + expense.amount_kes,
          count: existing.count + 1,
        })
      })

      const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
      }))

      // Property expense ranking
      const propertyExpenseRanking = propertyExpenses
        .sort((a, b) => b.grand_total_expenses_kes - a.grand_total_expenses_kes)
        .slice(0, 10)
        .map((prop) => ({
          property_name: prop.property_name,
          total_expenses: prop.grand_total_expenses_kes,
          percentage: totalExpenses > 0 ? (prop.grand_total_expenses_kes / totalExpenses) * 100 : 0,
        }))

      return {
        totalExpenses,
        propertySpecificExpenses,
        generalBusinessExpenses,
        sharedAllocatedExpenses,
        pendingApprovals:
          (pendingApprovals as any).status === 'fulfilled'
            ? (pendingApprovals as any).value.total
            : 0,
        pendingPayments:
          (pendingPayments as any).status === 'fulfilled'
            ? (pendingPayments as any).value.total
            : 0,
        categoryBreakdown,
        monthlyTrends: [], // TODO: Implement monthly trends
        vendorSummary: [], // TODO: Implement vendor summary
        propertyExpenseRanking,
      }
    } catch (error) {
      console.error('Error calculating expense analytics:', error)
      throw new Error('Failed to calculate expense analytics')
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
      case 'PAID':
        return 'text-green-600 bg-green-100'
      case 'APPROVED':
        return 'text-blue-600 bg-blue-100'
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-100'
      case 'REJECTED':
        return 'text-red-600 bg-red-100'
      case 'CANCELLED':
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }
}
