/**
 * Metrics Calculator Service
 * Calculates business metrics and KPIs for rental management
 */

export interface PropertyMetrics {
  totalProperties: number
  occupiedProperties: number
  vacantProperties: number
  occupancyRate: number
  averageRent: number
  totalRentRevenue: number
  maintenanceCosts: number
  netOperatingIncome: number
  returnOnInvestment: number
  averageTenancyDuration: number
}

export interface TenantMetrics {
  totalTenants: number
  activeTenants: number
  newTenantsThisMonth: number
  tenantTurnoverRate: number
  averageLeaseLength: number
  onTimePaymentRate: number
  latePaymentRate: number
  evictionRate: number
  tenantSatisfactionScore: number
  averageRentPerTenant: number
}

export interface FinancialMetrics {
  totalRevenue: number
  totalExpenses: number
  netIncome: number
  grossMargin: number
  operatingExpenseRatio: number
  cashFlow: number
  revenueGrowthRate: number
  expenseGrowthRate: number
  profitMargin: number
  debtServiceCoverageRatio: number
}

export interface MaintenanceMetrics {
  totalRequests: number
  completedRequests: number
  pendingRequests: number
  averageResponseTime: number
  averageCompletionTime: number
  maintenanceCostPerProperty: number
  emergencyRequestRate: number
  tenantSatisfactionWithMaintenance: number
  preventiveMaintenanceRatio: number
  vendorPerformanceScore: number
}

export interface TimeSeriesData {
  date: Date
  value: number
  label?: string
}

export interface MetricTrend {
  current: number
  previous: number
  change: number
  changePercentage: number
  trend: 'up' | 'down' | 'stable'
  isPositive: boolean
}

export class MetricsCalculator {
  // Property Metrics
  static calculatePropertyMetrics(
    properties: any[],
    leases: any[],
    payments: any[],
    maintenanceRequests: any[]
  ): PropertyMetrics {
    const totalProperties = properties.length
    const occupiedProperties = properties.filter(p => p.status === 'OCCUPIED').length
    const vacantProperties = totalProperties - occupiedProperties
    const occupancyRate = totalProperties > 0 ? (occupiedProperties / totalProperties) * 100 : 0

    const activeLeases = leases.filter(l => l.status === 'ACTIVE')
    const totalRent = activeLeases.reduce((sum, lease) => sum + (lease.monthlyRent || 0), 0)
    const averageRent = activeLeases.length > 0 ? totalRent / activeLeases.length : 0

    const currentMonth = new Date()
    const monthlyPayments = payments.filter(p => 
      new Date(p.paymentDate).getMonth() === currentMonth.getMonth() &&
      new Date(p.paymentDate).getFullYear() === currentMonth.getFullYear()
    )
    const totalRentRevenue = monthlyPayments.reduce((sum, payment) => sum + payment.amount, 0)

    const maintenanceCosts = maintenanceRequests
      .filter(r => r.status === 'COMPLETED' && r.cost)
      .reduce((sum, request) => sum + request.cost, 0)

    const netOperatingIncome = totalRentRevenue - maintenanceCosts
    const returnOnInvestment = totalProperties > 0 ? (netOperatingIncome / totalProperties) * 100 : 0

    // Calculate average tenancy duration
    const completedLeases = leases.filter(l => l.status === 'COMPLETED')
    const averageTenancyDuration = completedLeases.length > 0
      ? completedLeases.reduce((sum, lease) => {
          const start = new Date(lease.startDate)
          const end = new Date(lease.endDate)
          return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
        }, 0) / completedLeases.length
      : 0

    return {
      totalProperties,
      occupiedProperties,
      vacantProperties,
      occupancyRate,
      averageRent,
      totalRentRevenue,
      maintenanceCosts,
      netOperatingIncome,
      returnOnInvestment,
      averageTenancyDuration
    }
  }

  // Tenant Metrics
  static calculateTenantMetrics(
    tenants: any[],
    leases: any[],
    payments: any[]
  ): TenantMetrics {
    const totalTenants = tenants.length
    const activeTenants = tenants.filter(t => t.status === 'ACTIVE').length

    const currentMonth = new Date()
    const newTenantsThisMonth = tenants.filter(t => {
      const createdDate = new Date(t.createdAt)
      return createdDate.getMonth() === currentMonth.getMonth() &&
             createdDate.getFullYear() === currentMonth.getFullYear()
    }).length

    // Calculate turnover rate (annual)
    const lastYear = new Date()
    lastYear.setFullYear(lastYear.getFullYear() - 1)
    const tenantsLeftLastYear = leases.filter(l => 
      l.status === 'COMPLETED' && new Date(l.endDate) >= lastYear
    ).length
    const tenantTurnoverRate = totalTenants > 0 ? (tenantsLeftLastYear / totalTenants) * 100 : 0

    // Average lease length
    const completedLeases = leases.filter(l => l.status === 'COMPLETED')
    const averageLeaseLength = completedLeases.length > 0
      ? completedLeases.reduce((sum, lease) => {
          const start = new Date(lease.startDate)
          const end = new Date(lease.endDate)
          return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30) // months
        }, 0) / completedLeases.length
      : 0

    // Payment rates
    const totalPayments = payments.length
    const onTimePayments = payments.filter(p => p.status === 'ON_TIME').length
    const latePayments = payments.filter(p => p.status === 'LATE').length
    
    const onTimePaymentRate = totalPayments > 0 ? (onTimePayments / totalPayments) * 100 : 0
    const latePaymentRate = totalPayments > 0 ? (latePayments / totalPayments) * 100 : 0

    // Eviction rate
    const evictedTenants = tenants.filter(t => t.status === 'EVICTED').length
    const evictionRate = totalTenants > 0 ? (evictedTenants / totalTenants) * 100 : 0

    // Average rent per tenant
    const activeLeases = leases.filter(l => l.status === 'ACTIVE')
    const totalRent = activeLeases.reduce((sum, lease) => sum + (lease.monthlyRent || 0), 0)
    const averageRentPerTenant = activeTenants > 0 ? totalRent / activeTenants : 0

    return {
      totalTenants,
      activeTenants,
      newTenantsThisMonth,
      tenantTurnoverRate,
      averageLeaseLength,
      onTimePaymentRate,
      latePaymentRate,
      evictionRate,
      tenantSatisfactionScore: 85, // Mock data - would come from surveys
      averageRentPerTenant
    }
  }

  // Financial Metrics
  static calculateFinancialMetrics(
    payments: any[],
    expenses: any[],
    previousPeriodPayments: any[],
    previousPeriodExpenses: any[]
  ): FinancialMetrics {
    const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0)
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
    const netIncome = totalRevenue - totalExpenses
    const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0
    const operatingExpenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0
    const cashFlow = netIncome // Simplified
    const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0

    // Growth rates
    const previousRevenue = previousPeriodPayments.reduce((sum, payment) => sum + payment.amount, 0)
    const previousExpenses = previousPeriodExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    
    const revenueGrowthRate = previousRevenue > 0 
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
      : 0
    const expenseGrowthRate = previousExpenses > 0 
      ? ((totalExpenses - previousExpenses) / previousExpenses) * 100 
      : 0

    return {
      totalRevenue,
      totalExpenses,
      netIncome,
      grossMargin,
      operatingExpenseRatio,
      cashFlow,
      revenueGrowthRate,
      expenseGrowthRate,
      profitMargin,
      debtServiceCoverageRatio: 1.25 // Mock data
    }
  }

  // Maintenance Metrics
  static calculateMaintenanceMetrics(
    maintenanceRequests: any[],
    properties: any[]
  ): MaintenanceMetrics {
    const totalRequests = maintenanceRequests.length
    const completedRequests = maintenanceRequests.filter(r => r.status === 'COMPLETED').length
    const pendingRequests = maintenanceRequests.filter(r => r.status === 'PENDING').length

    // Response and completion times
    const requestsWithResponseTime = maintenanceRequests.filter(r => r.responseTime)
    const averageResponseTime = requestsWithResponseTime.length > 0
      ? requestsWithResponseTime.reduce((sum, r) => sum + r.responseTime, 0) / requestsWithResponseTime.length
      : 0

    const requestsWithCompletionTime = maintenanceRequests.filter(r => r.completionTime)
    const averageCompletionTime = requestsWithCompletionTime.length > 0
      ? requestsWithCompletionTime.reduce((sum, r) => sum + r.completionTime, 0) / requestsWithCompletionTime.length
      : 0

    // Costs
    const totalMaintenanceCost = maintenanceRequests
      .filter(r => r.cost)
      .reduce((sum, r) => sum + r.cost, 0)
    const maintenanceCostPerProperty = properties.length > 0 
      ? totalMaintenanceCost / properties.length 
      : 0

    // Emergency requests
    const emergencyRequests = maintenanceRequests.filter(r => r.priority === 'EMERGENCY').length
    const emergencyRequestRate = totalRequests > 0 ? (emergencyRequests / totalRequests) * 100 : 0

    // Preventive maintenance
    const preventiveRequests = maintenanceRequests.filter(r => r.type === 'PREVENTIVE').length
    const preventiveMaintenanceRatio = totalRequests > 0 ? (preventiveRequests / totalRequests) * 100 : 0

    return {
      totalRequests,
      completedRequests,
      pendingRequests,
      averageResponseTime,
      averageCompletionTime,
      maintenanceCostPerProperty,
      emergencyRequestRate,
      tenantSatisfactionWithMaintenance: 78, // Mock data
      preventiveMaintenanceRatio,
      vendorPerformanceScore: 82 // Mock data
    }
  }

  // Trend Analysis
  static calculateTrend(current: number, previous: number): MetricTrend {
    const change = current - previous
    const changePercentage = previous !== 0 ? (change / previous) * 100 : 0
    
    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (Math.abs(changePercentage) > 5) {
      trend = changePercentage > 0 ? 'up' : 'down'
    }

    // Determine if the trend is positive (depends on metric type)
    const isPositive = change >= 0

    return {
      current,
      previous,
      change,
      changePercentage,
      trend,
      isPositive
    }
  }

  // Time Series Generation
  static generateTimeSeries(
    data: any[],
    dateField: string,
    valueField: string,
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly',
    startDate: Date,
    endDate: Date
  ): TimeSeriesData[] {
    const timeSeries: TimeSeriesData[] = []
    const groupedData = new Map<string, number>()

    // Group data by period
    data.forEach(item => {
      const date = new Date(item[dateField])
      if (date >= startDate && date <= endDate) {
        const key = this.getTimeSeriesKey(date, period)
        const currentValue = groupedData.get(key) || 0
        groupedData.set(key, currentValue + (item[valueField] || 0))
      }
    })

    // Generate complete time series with gaps filled
    const current = new Date(startDate)
    while (current <= endDate) {
      const key = this.getTimeSeriesKey(current, period)
      const value = groupedData.get(key) || 0
      
      timeSeries.push({
        date: new Date(current),
        value,
        label: this.formatTimeSeriesLabel(current, period)
      })

      this.incrementDate(current, period)
    }

    return timeSeries
  }

  private static getTimeSeriesKey(date: Date, period: string): string {
    switch (period) {
      case 'daily':
        return date.toISOString().split('T')[0]
      case 'weekly':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        return weekStart.toISOString().split('T')[0]
      case 'monthly':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      case 'quarterly':
        const quarter = Math.floor(date.getMonth() / 3) + 1
        return `${date.getFullYear()}-Q${quarter}`
      default:
        return date.toISOString().split('T')[0]
    }
  }

  private static formatTimeSeriesLabel(date: Date, period: string): string {
    switch (period) {
      case 'daily':
        return date.toLocaleDateString()
      case 'weekly':
        return `Week of ${date.toLocaleDateString()}`
      case 'monthly':
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      case 'quarterly':
        const quarter = Math.floor(date.getMonth() / 3) + 1
        return `Q${quarter} ${date.getFullYear()}`
      default:
        return date.toLocaleDateString()
    }
  }

  private static incrementDate(date: Date, period: string): void {
    switch (period) {
      case 'daily':
        date.setDate(date.getDate() + 1)
        break
      case 'weekly':
        date.setDate(date.getDate() + 7)
        break
      case 'monthly':
        date.setMonth(date.getMonth() + 1)
        break
      case 'quarterly':
        date.setMonth(date.getMonth() + 3)
        break
    }
  }

  // Benchmark Comparisons
  static calculateBenchmarks(metrics: any, industryAverages: any): Record<string, {
    value: number
    benchmark: number
    performance: 'above' | 'below' | 'at'
    percentile: number
  }> {
    const benchmarks: Record<string, any> = {}

    Object.keys(metrics).forEach(key => {
      if (industryAverages[key] !== undefined) {
        const value = metrics[key]
        const benchmark = industryAverages[key]
        const performance = value > benchmark ? 'above' : value < benchmark ? 'below' : 'at'
        const percentile = this.calculatePercentile(value, benchmark)

        benchmarks[key] = {
          value,
          benchmark,
          performance,
          percentile
        }
      }
    })

    return benchmarks
  }

  private static calculatePercentile(value: number, benchmark: number): number {
    // Simplified percentile calculation
    // In real implementation, this would use historical data distribution
    const ratio = benchmark > 0 ? value / benchmark : 1
    return Math.min(100, Math.max(0, ratio * 50 + 25))
  }
}
