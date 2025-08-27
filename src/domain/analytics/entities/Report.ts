/**
 * Report Domain Entity
 * Represents analytics reports with data, configuration, and metadata
 */

import { AggregateRoot } from '../../shared/AggregateRoot'
import { DomainEvent } from '../../events/DomainEvent'

export interface ReportConfiguration {
  title: string
  description?: string
  reportType: 'financial' | 'occupancy' | 'maintenance' | 'tenant' | 'property' | 'custom'
  dataSource: string[]
  filters: ReportFilter[]
  groupBy: string[]
  sortBy: ReportSort[]
  aggregations: ReportAggregation[]
  dateRange: {
    start: Date
    end: Date
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  }
  visualization: {
    chartType: 'line' | 'bar' | 'pie' | 'table' | 'metric' | 'heatmap'
    layout: 'single' | 'grid' | 'dashboard'
    options: Record<string, any>
  }
}

export interface ReportFilter {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'between'
  value: any
  label?: string
}

export interface ReportSort {
  field: string
  direction: 'asc' | 'desc'
  priority: number
}

export interface ReportAggregation {
  field: string
  operation: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct' | 'percentage'
  alias?: string
  format?: string
}

export interface ReportData {
  headers: string[]
  rows: any[][]
  metadata: {
    totalRows: number
    generatedAt: Date
    executionTime: number
    dataQuality: 'high' | 'medium' | 'low'
    warnings?: string[]
  }
  summary?: {
    totals: Record<string, number>
    averages: Record<string, number>
    trends: Record<string, 'up' | 'down' | 'stable'>
  }
}

export interface ReportSchedule {
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly'
  cronExpression?: string
  recipients: string[]
  format: 'pdf' | 'excel' | 'csv' | 'json'
  isActive: boolean
  nextRun?: Date
  lastRun?: Date
}

export class Report extends AggregateRoot {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly configuration: ReportConfiguration,
    public readonly createdBy: string,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public data?: ReportData,
    public schedule?: ReportSchedule,
    public isTemplate: boolean = false,
    public tags: string[] = [],
    public sharedWith: string[] = [],
    public version: number = 1
  ) {
    super(id)
  }

  // Report generation
  generateReport(data: ReportData): void {
    this.data = {
      ...data,
      metadata: {
        ...data.metadata,
        generatedAt: new Date()
      }
    }
    this.updatedAt = new Date()

    this.addDomainEvent(new ReportGeneratedEvent(
      this.id,
      this.name,
      this.configuration.reportType,
      data.metadata.totalRows,
      data.metadata.executionTime
    ))
  }

  // Configuration updates
  updateConfiguration(newConfig: Partial<ReportConfiguration>): void {
    this.configuration = { ...this.configuration, ...newConfig }
    this.updatedAt = new Date()
    this.version += 1

    this.addDomainEvent(new ReportConfigurationUpdatedEvent(
      this.id,
      this.version,
      Object.keys(newConfig)
    ))
  }

  // Scheduling
  setSchedule(schedule: ReportSchedule): void {
    this.schedule = schedule
    this.updatedAt = new Date()

    this.addDomainEvent(new ReportScheduledEvent(
      this.id,
      schedule.frequency,
      schedule.recipients.length
    ))
  }

  removeSchedule(): void {
    this.schedule = undefined
    this.updatedAt = new Date()

    this.addDomainEvent(new ReportScheduleRemovedEvent(this.id))
  }

  // Sharing and permissions
  shareWith(userIds: string[]): void {
    const newShares = userIds.filter(id => !this.sharedWith.includes(id))
    this.sharedWith = [...this.sharedWith, ...newShares]
    this.updatedAt = new Date()

    if (newShares.length > 0) {
      this.addDomainEvent(new ReportSharedEvent(
        this.id,
        newShares,
        this.createdBy
      ))
    }
  }

  unshareWith(userIds: string[]): void {
    this.sharedWith = this.sharedWith.filter(id => !userIds.includes(id))
    this.updatedAt = new Date()

    this.addDomainEvent(new ReportUnsharedEvent(
      this.id,
      userIds,
      this.createdBy
    ))
  }

  // Template operations
  convertToTemplate(): void {
    if (!this.isTemplate) {
      this.isTemplate = true
      this.updatedAt = new Date()

      this.addDomainEvent(new ReportConvertedToTemplateEvent(
        this.id,
        this.name,
        this.configuration.reportType
      ))
    }
  }

  cloneFromTemplate(newName: string, createdBy: string): Report {
    if (!this.isTemplate) {
      throw new Error('Can only clone from template reports')
    }

    const clonedReport = new Report(
      `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      newName,
      { ...this.configuration },
      createdBy,
      new Date(),
      new Date(),
      undefined, // No data in clone
      undefined, // No schedule in clone
      false, // Not a template
      [...this.tags],
      [], // No shared users in clone
      1 // Reset version
    )

    clonedReport.addDomainEvent(new ReportClonedEvent(
      clonedReport.id,
      this.id,
      newName,
      createdBy
    ))

    return clonedReport
  }

  // Validation
  validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this.configuration.title.trim()) {
      errors.push('Report title is required')
    }

    if (this.configuration.dataSource.length === 0) {
      errors.push('At least one data source is required')
    }

    if (!this.configuration.dateRange.start || !this.configuration.dateRange.end) {
      errors.push('Date range is required')
    }

    if (this.configuration.dateRange.start >= this.configuration.dateRange.end) {
      errors.push('Start date must be before end date')
    }

    if (this.configuration.aggregations.length === 0) {
      errors.push('At least one aggregation is required')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Data quality assessment
  assessDataQuality(): 'high' | 'medium' | 'low' {
    if (!this.data) return 'low'

    const { metadata } = this.data
    let score = 0

    // Execution time (faster is better)
    if (metadata.executionTime < 1000) score += 3
    else if (metadata.executionTime < 5000) score += 2
    else score += 1

    // Data completeness
    if (metadata.totalRows > 100) score += 3
    else if (metadata.totalRows > 10) score += 2
    else score += 1

    // Warnings
    if (!metadata.warnings || metadata.warnings.length === 0) score += 2
    else if (metadata.warnings.length < 3) score += 1

    if (score >= 7) return 'high'
    if (score >= 5) return 'medium'
    return 'low'
  }

  // Export formats
  getExportFormats(): string[] {
    const baseFormats = ['json', 'csv']
    
    if (this.data && this.data.rows.length > 0) {
      baseFormats.push('excel', 'pdf')
    }

    if (this.configuration.visualization.chartType !== 'table') {
      baseFormats.push('png', 'svg')
    }

    return baseFormats
  }
}

// Domain Events
export class ReportGeneratedEvent extends DomainEvent {
  constructor(
    public readonly reportId: string,
    public readonly reportName: string,
    public readonly reportType: string,
    public readonly rowCount: number,
    public readonly executionTime: number
  ) {
    super('ReportGenerated', reportId, {
      reportId,
      reportName,
      reportType,
      rowCount,
      executionTime
    })
  }
}

export class ReportConfigurationUpdatedEvent extends DomainEvent {
  constructor(
    public readonly reportId: string,
    public readonly version: number,
    public readonly updatedFields: string[]
  ) {
    super('ReportConfigurationUpdated', reportId, {
      reportId,
      version,
      updatedFields
    })
  }
}

export class ReportScheduledEvent extends DomainEvent {
  constructor(
    public readonly reportId: string,
    public readonly frequency: string,
    public readonly recipientCount: number
  ) {
    super('ReportScheduled', reportId, {
      reportId,
      frequency,
      recipientCount
    })
  }
}

export class ReportScheduleRemovedEvent extends DomainEvent {
  constructor(public readonly reportId: string) {
    super('ReportScheduleRemoved', reportId, { reportId })
  }
}

export class ReportSharedEvent extends DomainEvent {
  constructor(
    public readonly reportId: string,
    public readonly sharedWithUsers: string[],
    public readonly sharedBy: string
  ) {
    super('ReportShared', reportId, {
      reportId,
      sharedWithUsers,
      sharedBy
    })
  }
}

export class ReportUnsharedEvent extends DomainEvent {
  constructor(
    public readonly reportId: string,
    public readonly unsharedFromUsers: string[],
    public readonly unsharedBy: string
  ) {
    super('ReportUnshared', reportId, {
      reportId,
      unsharedFromUsers,
      unsharedBy
    })
  }
}

export class ReportConvertedToTemplateEvent extends DomainEvent {
  constructor(
    public readonly reportId: string,
    public readonly reportName: string,
    public readonly reportType: string
  ) {
    super('ReportConvertedToTemplate', reportId, {
      reportId,
      reportName,
      reportType
    })
  }
}

export class ReportClonedEvent extends DomainEvent {
  constructor(
    public readonly newReportId: string,
    public readonly templateReportId: string,
    public readonly newReportName: string,
    public readonly clonedBy: string
  ) {
    super('ReportCloned', newReportId, {
      newReportId,
      templateReportId,
      newReportName,
      clonedBy
    })
  }
}
