/**
 * DateRange Value Object
 * Represents a range of dates with validation and utility methods
 */

export class DateRange {
  private readonly _startDate: Date
  private readonly _endDate: Date

  constructor(startDate: Date, endDate: Date) {
    if (startDate >= endDate) {
      throw new Error('Start date must be before end date')
    }

    // Create new Date objects to ensure immutability
    this._startDate = new Date(startDate)
    this._endDate = new Date(endDate)
  }

  get startDate(): Date {
    return new Date(this._startDate)
  }

  get endDate(): Date {
    return new Date(this._endDate)
  }

  // Duration calculations
  getDurationInDays(): number {
    const diffTime = this._endDate.getTime() - this._startDate.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  getDurationInMonths(): number {
    const years = this._endDate.getFullYear() - this._startDate.getFullYear()
    const months = this._endDate.getMonth() - this._startDate.getMonth()
    return years * 12 + months
  }

  getDurationInYears(): number {
    return this.getDurationInMonths() / 12
  }

  // Overlap and containment checks
  contains(date: Date): boolean {
    return date >= this._startDate && date <= this._endDate
  }

  containsRange(other: DateRange): boolean {
    return this._startDate <= other._startDate && this._endDate >= other._endDate
  }

  overlaps(other: DateRange): boolean {
    return this._startDate <= other._endDate && this._endDate >= other._startDate
  }

  getOverlap(other: DateRange): DateRange | null {
    if (!this.overlaps(other)) {
      return null
    }

    const overlapStart = new Date(Math.max(this._startDate.getTime(), other._startDate.getTime()))
    const overlapEnd = new Date(Math.min(this._endDate.getTime(), other._endDate.getTime()))

    return new DateRange(overlapStart, overlapEnd)
  }

  // Comparison methods
  equals(other: DateRange): boolean {
    return (
      this._startDate.getTime() === other._startDate.getTime() &&
      this._endDate.getTime() === other._endDate.getTime()
    )
  }

  isBefore(other: DateRange): boolean {
    return this._endDate < other._startDate
  }

  isAfter(other: DateRange): boolean {
    return this._startDate > other._endDate
  }

  // Extension methods
  extend(days: number): DateRange {
    const newEndDate = new Date(this._endDate)
    newEndDate.setDate(newEndDate.getDate() + days)
    return new DateRange(this._startDate, newEndDate)
  }

  extendToDate(newEndDate: Date): DateRange {
    if (newEndDate <= this._startDate) {
      throw new Error('New end date must be after start date')
    }
    return new DateRange(this._startDate, newEndDate)
  }

  // Utility methods
  isCurrentlyActive(): boolean {
    const now = new Date()
    return this.contains(now)
  }

  isInFuture(): boolean {
    const now = new Date()
    return this._startDate > now
  }

  isInPast(): boolean {
    const now = new Date()
    return this._endDate < now
  }

  toString(): string {
    return `${this._startDate.toISOString().split('T')[0]} to ${this._endDate.toISOString().split('T')[0]}`
  }

  toJSON(): { startDate: string; endDate: string } {
    return {
      startDate: this._startDate.toISOString(),
      endDate: this._endDate.toISOString()
    }
  }

  // Static factory methods
  static fromDays(startDate: Date, days: number): DateRange {
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + days)
    return new DateRange(startDate, endDate)
  }

  static fromMonths(startDate: Date, months: number): DateRange {
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + months)
    return new DateRange(startDate, endDate)
  }

  static fromYears(startDate: Date, years: number): DateRange {
    const endDate = new Date(startDate)
    endDate.setFullYear(endDate.getFullYear() + years)
    return new DateRange(startDate, endDate)
  }

  static currentMonth(): DateRange {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return new DateRange(startOfMonth, endOfMonth)
  }

  static currentYear(): DateRange {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const endOfYear = new Date(now.getFullYear(), 11, 31)
    return new DateRange(startOfYear, endOfYear)
  }

  static fromStrings(startDateStr: string, endDateStr: string): DateRange {
    const startDate = new Date(startDateStr)
    const endDate = new Date(endDateStr)
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid date strings provided')
    }
    
    return new DateRange(startDate, endDate)
  }
}
