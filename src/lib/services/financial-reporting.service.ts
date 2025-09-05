import supabase from '../supabase-client'
import { IncomeManagementService } from './income-management.service'
import { ExpenseManagementService } from './expense-management.service'

// Types for Financial Reporting
export interface FinancialPeriod {
  id: string
  period_name: string
  start_date: string
  end_date: string
  period_type: string
  fiscal_year: number
  is_closed: boolean
  closed_by?: string
  closed_at?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface FinancialReportTemplate {
  id: string
  template_name: string
  report_type: string
  description?: string
  template_config: any
  is_active: boolean
  is_default: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface FinancialReport {
  id: string
  report_name: string
  report_type: string
  template_id?: string
  period_id?: string
  start_date: string
  end_date: string
  report_data: any
  summary_metrics?: any
  comparison_data?: any
  generated_by?: string
  generated_at: string
  generation_time_ms?: number
  status: string
  is_published: boolean
  published_at?: string
  published_by?: string
  pdf_url?: string
  excel_url?: string
  notes?: string
  tags?: string[]
  created_at: string
}

export interface ProfitLossStatement {
  period: {
    start_date: string
    end_date: string
    period_name: string
  }
  income: {
    rental_income: number
    member_contributions: number
    property_sales: number
    commission_income: number
    interest_income: number
    other_income: number
    total_income: number
  }
  expenses: {
    property_expenses: number
    business_expenses: number
    allocated_expenses: number
    total_expenses: number
  }
  net_income: number
  margins: {
    gross_margin: number
    net_margin: number
  }
  comparisons?: {
    previous_period: any
    year_over_year: any
  }
}

export interface CashFlowStatement {
  period: {
    start_date: string
    end_date: string
    period_name: string
  }
  operating_activities: {
    operating_inflows: number
    operating_outflows: number
    net_operating_cash_flow: number
  }
  investing_activities: {
    investing_inflows: number
    investing_outflows: number
    net_investing_cash_flow: number
  }
  financing_activities: {
    financing_inflows: number
    financing_outflows: number
    net_financing_cash_flow: number
  }
  net_cash_flow: number
  beginning_cash: number
  ending_cash: number
}

export interface PortfolioPerformance {
  period: {
    start_date: string
    end_date: string
  }
  overview: {
    total_properties: number
    total_income: number
    total_expenses: number
    net_income: number
    average_roi: number
    portfolio_value: number
  }
  monthly_trends: Array<{
    month: string
    income: number
    expenses: number
    net_income: number
    properties_active: number
  }>
  property_rankings: Array<{
    property_id: string
    property_name: string
    net_income: number
    roi_percentage: number
    occupancy_rate: number
  }>
  key_metrics: {
    income_growth: number
    expense_growth: number
    roi_trend: number
    occupancy_trend: number
  }
}

export interface PropertyPerformance {
  property_id: string
  property_name: string
  period: {
    start_date: string
    end_date: string
  }
  financial_metrics: {
    total_income: number
    total_expenses: number
    net_income: number
    roi_percentage: number
    acquisition_cost: number
  }
  operational_metrics: {
    occupancy_rate: number
    average_rent: number
    total_units: number
    occupied_units: number
  }
  monthly_breakdown: Array<{
    month: string
    income: number
    expenses: number
    net_income: number
    occupancy: number
  }>
  comparisons: {
    portfolio_average: any
    previous_period: any
  }
}

export interface MemberContributionReport {
  period: {
    start_date: string
    end_date: string
  }
  summary: {
    total_members: number
    active_members: number
    total_contributions: number
    monthly_fees_collected: number
    project_contributions: number
    share_capital: number
    outstanding_amount: number
  }
  member_analysis: Array<{
    member_id: string
    member_name: string
    member_number: string
    total_contributions: number
    payment_reliability: number
    outstanding_amount: number
    member_status: string
  }>
  payment_trends: Array<{
    month: string
    monthly_fees: number
    project_contributions: number
    total_contributions: number
    member_count: number
  }>
}

export class FinancialReportingService {
  // Get financial periods
  static async getFinancialPeriods(
    filters: {
      periodType?: string
      fiscalYear?: number
      isClosed?: boolean
    } = {}
  ): Promise<FinancialPeriod[]> {
    try {
      let query = supabase.from('financial_periods').select('*')

      if (filters.periodType) {
        query = query.eq('period_type', filters.periodType)
      }
      if (filters.fiscalYear) {
        query = query.eq('fiscal_year', filters.fiscalYear)
      }
      if (filters.isClosed !== undefined) {
        query = query.eq('is_closed', filters.isClosed)
      }

      query = query.order('start_date', { ascending: false })

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching financial periods:', error)
      throw new Error('Failed to load financial periods')
    }
  }

  // Get report templates
  static async getReportTemplates(reportType?: string): Promise<FinancialReportTemplate[]> {
    try {
      let query = supabase.from('financial_report_templates').select('*').eq('is_active', true)

      if (reportType) {
        query = query.eq('report_type', reportType)
      }

      query = query.order('template_name', { ascending: true })

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching report templates:', error)
      throw new Error('Failed to load report templates')
    }
  }

  // Generate Profit & Loss Statement
  static async generateProfitLossStatement(
    startDate: string,
    endDate: string,
    includePreviousPeriod: boolean = true
  ): Promise<ProfitLossStatement> {
    try {
      // Get income data
      const incomeData = await IncomeManagementService.getIncomeTransactions({
        startDate,
        endDate,
        status: 'RECEIVED',
      })

      // Get expense data
      const expenseData = await ExpenseManagementService.getExpenseTransactions({
        startDate,
        endDate,
        status: 'PAID',
      })

      // Categorize income
      const income = {
        rental_income: 0,
        member_contributions: 0,
        property_sales: 0,
        commission_income: 0,
        interest_income: 0,
        other_income: 0,
        total_income: 0,
      }

      incomeData.data.forEach((transaction) => {
        const amount = transaction.amount_kes
        income.total_income += amount

        switch (transaction.category?.category_name) {
          case 'RENTAL_INCOME':
            income.rental_income += amount
            break
          case 'MEMBER_CONTRIBUTION':
            income.member_contributions += amount
            break
          case 'PROPERTY_SALE':
            income.property_sales += amount
            break
          case 'COMMISSION_INCOME':
            income.commission_income += amount
            break
          case 'INTEREST_INCOME':
            income.interest_income += amount
            break
          default:
            income.other_income += amount
        }
      })

      // Categorize expenses
      const expenses = {
        property_expenses: 0,
        business_expenses: 0,
        allocated_expenses: 0,
        total_expenses: 0,
      }

      expenseData.data.forEach((transaction) => {
        const amount = transaction.amount_kes
        expenses.total_expenses += amount

        switch (transaction.category?.category_name) {
          case 'PROPERTY_SPECIFIC':
            expenses.property_expenses += amount
            break
          case 'GENERAL_BUSINESS':
            expenses.business_expenses += amount
            break
          case 'SHARED_ALLOCATED':
            expenses.allocated_expenses += amount
            break
        }
      })

      // Calculate net income and margins
      const net_income = income.total_income - expenses.total_expenses
      const gross_margin =
        income.total_income > 0
          ? ((income.total_income - expenses.property_expenses) / income.total_income) * 100
          : 0
      const net_margin = income.total_income > 0 ? (net_income / income.total_income) * 100 : 0

      // Get previous period comparison if requested
      let comparisons = undefined
      if (includePreviousPeriod) {
        const periodLength = new Date(endDate).getTime() - new Date(startDate).getTime()
        const previousEndDate = new Date(new Date(startDate).getTime() - 1)
          .toISOString()
          .split('T')[0]
        const previousStartDate = new Date(new Date(startDate).getTime() - periodLength)
          .toISOString()
          .split('T')[0]

        const previousPL = await this.generateProfitLossStatement(
          previousStartDate,
          previousEndDate,
          false
        )

        comparisons = {
          previous_period: {
            income_change: income.total_income - previousPL.income.total_income,
            expense_change: expenses.total_expenses - previousPL.expenses.total_expenses,
            net_income_change: net_income - previousPL.net_income,
            income_change_percentage:
              previousPL.income.total_income > 0
                ? ((income.total_income - previousPL.income.total_income) /
                    previousPL.income.total_income) *
                  100
                : 0,
          },
        }
      }

      return {
        period: {
          start_date: startDate,
          end_date: endDate,
          period_name: `${startDate} to ${endDate}`,
        },
        income,
        expenses,
        net_income,
        margins: {
          gross_margin,
          net_margin,
        },
        comparisons: {
          ...comparisons,
          year_over_year: {}, // Add missing property
        },
      }
    } catch (error) {
      console.error('Error generating P&L statement:', error)
      throw new Error('Failed to generate Profit & Loss statement')
    }
  }

  // Generate Cash Flow Statement
  static async generateCashFlowStatement(
    startDate: string,
    endDate: string
  ): Promise<CashFlowStatement> {
    try {
      const { data: cashFlowData, error } = await supabase
        .from('cash_flow_analysis')
        .select('*')
        .gte('period_month', startDate)
        .lte('period_month', endDate)
        .order('period_month', { ascending: true })

      if (error) throw error

      // Aggregate cash flows for the period
      const aggregated = (cashFlowData || []).reduce(
        (acc: any, month: any) => ({
          operating_inflows: acc.operating_inflows + (month.operating_inflows || 0),
          operating_outflows: acc.operating_outflows + (month.operating_outflows || 0),
          investing_inflows: acc.investing_inflows + (month.investing_inflows || 0),
          investing_outflows: acc.investing_outflows + (month.investing_outflows || 0),
          financing_inflows: acc.financing_inflows + (month.financing_inflows || 0),
          net_cash_flow: acc.net_cash_flow + (month.net_cash_flow || 0),
        }),
        {
          operating_inflows: 0,
          operating_outflows: 0,
          investing_inflows: 0,
          investing_outflows: 0,
          financing_inflows: 0,
          net_cash_flow: 0,
        }
      )

      return {
        period: {
          start_date: startDate,
          end_date: endDate,
          period_name: `${startDate} to ${endDate}`,
        },
        operating_activities: {
          operating_inflows: aggregated.operating_inflows,
          operating_outflows: aggregated.operating_outflows,
          net_operating_cash_flow: aggregated.operating_inflows + aggregated.operating_outflows,
        },
        investing_activities: {
          investing_inflows: aggregated.investing_inflows,
          investing_outflows: aggregated.investing_outflows,
          net_investing_cash_flow: aggregated.investing_inflows + aggregated.investing_outflows,
        },
        financing_activities: {
          financing_inflows: aggregated.financing_inflows,
          financing_outflows: 0, // TODO: Add financing outflows when loan system is implemented
          net_financing_cash_flow: aggregated.financing_inflows,
        },
        net_cash_flow: aggregated.net_cash_flow,
        beginning_cash: 0, // TODO: Implement cash balance tracking
        ending_cash: aggregated.net_cash_flow,
      }
    } catch (error) {
      console.error('Error generating cash flow statement:', error)
      throw new Error('Failed to generate Cash Flow statement')
    }
  }

  // Generate Portfolio Performance Report
  static async generatePortfolioPerformance(
    startDate: string,
    endDate: string
  ): Promise<PortfolioPerformance> {
    try {
      // Get portfolio metrics
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolio_performance_metrics')
        .select('*')
        .gte('period_month', startDate)
        .lte('period_month', endDate)
        .order('period_month', { ascending: true })

      if (portfolioError) throw portfolioError

      // Get property performance data
      const { data: propertyData, error: propertyError } = await supabase
        .from('property_performance_metrics')
        .select('*')
        .order('annual_net_income', { ascending: false })
        .limit(10)

      if (propertyError) throw propertyError

      // Calculate overview metrics
      const totalMetrics = (portfolioData || []).reduce(
        (acc: any, month: any) => ({
          total_income: acc.total_income + (month.total_income || 0),
          total_expenses: acc.total_expenses + (month.total_expenses || 0),
          net_income: acc.net_income + (month.net_income || 0),
          active_properties: Math.max(acc.active_properties, month.active_properties || 0),
        }),
        {
          total_income: 0,
          total_expenses: 0,
          net_income: 0,
          active_properties: 0,
        }
      )

      // Calculate portfolio value and average ROI
      const portfolio_value = (propertyData || []).reduce(
        (sum: any, prop: any) => sum + (prop.acquisition_cost || 0),
        0
      )
      const average_roi =
        propertyData && propertyData.length > 0
          ? propertyData.reduce((sum: any, prop: any) => sum + (prop.roi_percentage || 0), 0) /
            propertyData.length
          : 0

      // Format monthly trends
      const monthly_trends = (portfolioData || []).map((month: any) => ({
        month: new Date(month.period_month).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
        }),
        income: month.total_income || 0,
        expenses: month.total_expenses || 0,
        net_income: month.net_income || 0,
        properties_active: month.active_properties || 0,
      }))

      // Format property rankings
      const property_rankings = (propertyData || []).slice(0, 10).map((prop: any) => ({
        property_id: prop.property_id,
        property_name: prop.property_name,
        net_income: prop.annual_net_income || 0,
        roi_percentage: prop.roi_percentage || 0,
        occupancy_rate: prop.occupancy_rate || 0,
      }))

      // Calculate growth trends (simplified)
      const income_growth =
        monthly_trends.length >= 2
          ? ((monthly_trends[monthly_trends.length - 1].income - monthly_trends[0].income) /
              (monthly_trends[0].income || 1)) *
            100
          : 0
      const expense_growth =
        monthly_trends.length >= 2
          ? ((monthly_trends[monthly_trends.length - 1].expenses - monthly_trends[0].expenses) /
              (monthly_trends[0].expenses || 1)) *
            100
          : 0

      return {
        period: {
          start_date: startDate,
          end_date: endDate,
        },
        overview: {
          total_properties: totalMetrics.active_properties,
          total_income: totalMetrics.total_income,
          total_expenses: totalMetrics.total_expenses,
          net_income: totalMetrics.net_income,
          average_roi,
          portfolio_value,
        },
        monthly_trends,
        property_rankings,
        key_metrics: {
          income_growth,
          expense_growth,
          roi_trend: average_roi,
          occupancy_trend:
            property_rankings.length > 0
              ? property_rankings.reduce((sum: any, prop: any) => sum + prop.occupancy_rate, 0) /
                property_rankings.length
              : 0,
        },
      }
    } catch (error) {
      console.error('Error generating portfolio performance:', error)
      throw new Error('Failed to generate Portfolio Performance report')
    }
  }

  // Generate Property Performance Report
  static async generatePropertyPerformance(
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<PropertyPerformance> {
    try {
      // Get property details
      const { data: propertyData, error: propertyError } = await supabase
        .from('property_performance_metrics')
        .select('*')
        .eq('property_id', propertyId)
        .single()

      if (propertyError) throw propertyError

      // Get monthly breakdown
      const incomeData = await IncomeManagementService.getIncomeTransactions({
        propertyId,
        startDate,
        endDate,
        status: 'RECEIVED',
      })

      const expenseData = await ExpenseManagementService.getExpenseTransactions({
        propertyId,
        startDate,
        endDate,
        status: 'PAID',
      })

      // Group by month
      const monthlyMap = new Map()

      // Initialize months
      const current = new Date(startDate)
      const end = new Date(endDate)
      while (current <= end) {
        const monthKey = current.toISOString().slice(0, 7)
        monthlyMap.set(monthKey, {
          month: current.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
          income: 0,
          expenses: 0,
          net_income: 0,
          occupancy: propertyData.occupancy_rate || 0,
        })
        current.setMonth(current.getMonth() + 1)
      }

      // Add income data
      incomeData.data.forEach((transaction) => {
        const monthKey = transaction.transaction_date.slice(0, 7)
        if (monthlyMap.has(monthKey)) {
          const month = monthlyMap.get(monthKey)
          month.income += transaction.amount_kes
          month.net_income = month.income - month.expenses
        }
      })

      // Add expense data
      expenseData.data.forEach((transaction) => {
        const monthKey = transaction.transaction_date.slice(0, 7)
        if (monthlyMap.has(monthKey)) {
          const month = monthlyMap.get(monthKey)
          month.expenses += transaction.amount_kes
          month.net_income = month.income - month.expenses
        }
      })

      const monthly_breakdown = Array.from(monthlyMap.values())

      return {
        property_id: propertyId,
        property_name: propertyData.property_name,
        period: {
          start_date: startDate,
          end_date: endDate,
        },
        financial_metrics: {
          total_income: propertyData.annual_income || 0,
          total_expenses: propertyData.annual_expenses || 0,
          net_income: propertyData.annual_net_income || 0,
          roi_percentage: propertyData.roi_percentage || 0,
          acquisition_cost: propertyData.acquisition_cost || 0,
        },
        operational_metrics: {
          occupancy_rate: propertyData.occupancy_rate || 0,
          average_rent: propertyData.average_monthly_rent || 0,
          total_units: propertyData.total_units || 0,
          occupied_units: propertyData.occupied_units || 0,
        },
        monthly_breakdown,
        comparisons: {
          portfolio_average: {}, // TODO: Calculate portfolio averages
          previous_period: {}, // TODO: Calculate previous period comparison
        },
      }
    } catch (error) {
      console.error('Error generating property performance:', error)
      throw new Error('Failed to generate Property Performance report')
    }
  }

  // Generate Member Contribution Report
  static async generateMemberContributionReport(
    startDate: string,
    endDate: string
  ): Promise<MemberContributionReport> {
    try {
      const { data: memberData, error } = await supabase
        .from('member_contribution_analysis')
        .select('*')
        .order('annual_contributions', { ascending: false })

      if (error) throw error

      // Calculate summary metrics
      const summary = (memberData || []).reduce(
        (acc: any, member: any) => ({
          total_members: acc.total_members + 1,
          active_members: acc.active_members + (member.member_status === 'ACTIVE' ? 1 : 0),
          total_contributions: acc.total_contributions + (member.annual_contributions || 0),
          monthly_fees_collected: acc.monthly_fees_collected + (member.annual_monthly_fees || 0),
          project_contributions:
            acc.project_contributions + (member.annual_project_contributions || 0),
          share_capital: acc.share_capital + (member.total_share_capital || 0),
          outstanding_amount: acc.outstanding_amount + (member.current_outstanding || 0),
        }),
        {
          total_members: 0,
          active_members: 0,
          total_contributions: 0,
          monthly_fees_collected: 0,
          project_contributions: 0,
          share_capital: 0,
          outstanding_amount: 0,
        }
      )

      // Format member analysis
      const member_analysis = (memberData || []).map((member: any) => ({
        member_id: member.member_id,
        member_name: member.member_name,
        member_number: member.member_number,
        total_contributions: member.annual_contributions || 0,
        payment_reliability: member.payment_reliability_percentage || 0,
        outstanding_amount: member.current_outstanding || 0,
        member_status: member.member_status,
      }))

      // Get payment trends (simplified - would need more detailed monthly data)
      const payment_trends: any[] = [] // TODO: Implement monthly payment trends

      return {
        period: {
          start_date: startDate,
          end_date: endDate,
        },
        summary,
        member_analysis,
        payment_trends,
      }
    } catch (error) {
      console.error('Error generating member contribution report:', error)
      throw new Error('Failed to generate Member Contribution report')
    }
  }

  // Save generated report
  static async saveReport(
    report: Omit<FinancialReport, 'id' | 'created_at'>
  ): Promise<FinancialReport> {
    try {
      const { data, error } = await supabase
        .from('financial_reports')
        .insert(report)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error saving financial report:', error)
      throw new Error('Failed to save financial report')
    }
  }

  // Get saved reports
  static async getReports(
    filters: {
      reportType?: string
      startDate?: string
      endDate?: string
      status?: string
      limit?: number
    } = {}
  ): Promise<FinancialReport[]> {
    try {
      let query = supabase.from('financial_reports').select('*')

      if (filters.reportType) {
        query = query.eq('report_type', filters.reportType)
      }
      if (filters.startDate) {
        query = query.gte('start_date', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('end_date', filters.endDate)
      }
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.limit) {
        query = query.limit(filters.limit)
      }

      query = query.order('generated_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching financial reports:', error)
      throw new Error('Failed to load financial reports')
    }
  }

  // Utility function to format currency
  static formatCurrency(amount: number): string {
    if (amount == null || isNaN(amount)) return 'KES 0'
    return `KES ${Number(amount).toLocaleString()}`
  }

  // Utility function to format percentage
  static formatPercentage(value: number, decimals: number = 1): string {
    if (value == null || isNaN(value)) return '0.0%'
    return `${Number(value).toFixed(decimals)}%`
  }

  // Utility function to calculate period-over-period change
  static calculateChange(
    current: number,
    previous: number
  ): {
    absolute: number
    percentage: number
    direction: 'up' | 'down' | 'neutral'
  } {
    const absolute = current - previous
    const percentage = previous !== 0 ? (absolute / Math.abs(previous)) * 100 : 0
    const direction = absolute > 0 ? 'up' : absolute < 0 ? 'down' : 'neutral'

    return { absolute, percentage, direction }
  }
}
