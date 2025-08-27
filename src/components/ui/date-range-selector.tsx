'use client'

import { useState, useEffect } from 'react'

interface DateRange {
  startDate: string
  endDate: string
}

interface DateRangeSelectorProps {
  value: DateRange
  onChange: (dateRange: DateRange) => void
  maxRangeYears?: number
  className?: string
  disabled?: boolean
}

export default function DateRangeSelector({
  value,
  onChange,
  maxRangeYears = 5,
  className = '',
  disabled = false,
}: DateRangeSelectorProps) {
  const [errors, setErrors] = useState<{ startDate?: string; endDate?: string }>({})

  // Validate date range
  const validateDateRange = (startDate: string, endDate: string) => {
    const errors: { startDate?: string; endDate?: string } = {}

    if (!startDate) {
      errors.startDate = 'Start date is required'
    }

    if (!endDate) {
      errors.endDate = 'End date is required'
    }

    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)

      // Check if start date is after end date
      if (start > end) {
        errors.startDate = 'Start date cannot be after end date'
      }

      // Check if date range exceeds maximum allowed years
      const yearsDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
      if (yearsDiff > maxRangeYears) {
        errors.endDate = `Date range cannot exceed ${maxRangeYears} years`
      }

      // Check if dates are in the future (beyond today)
      const today = new Date()
      today.setHours(23, 59, 59, 999) // End of today

      if (start > today) {
        errors.startDate = 'Start date cannot be in the future'
      }

      if (end > today) {
        errors.endDate = 'End date cannot be in the future'
      }
    }

    return errors
  }

  // Handle date change
  const handleDateChange = (field: 'startDate' | 'endDate', newValue: string) => {
    const newDateRange = {
      ...value,
      [field]: newValue,
    }

    // Validate the new date range
    const validationErrors = validateDateRange(newDateRange.startDate, newDateRange.endDate)
    setErrors(validationErrors)

    // Only call onChange if there are no validation errors
    if (Object.keys(validationErrors).length === 0) {
      onChange(newDateRange)
    }
  }

  // Validate on mount and when value changes
  useEffect(() => {
    if (value.startDate && value.endDate) {
      const validationErrors = validateDateRange(value.startDate, value.endDate)
      setErrors(validationErrors)
    }
  }, [value.startDate, value.endDate, maxRangeYears])

  // Get max date (today)
  const getMaxDate = () => {
    return new Date().toISOString().split('T')[0]
  }

  // Get min date for end date (start date)
  const getMinEndDate = () => {
    return value.startDate || undefined
  }

  // Get max date for start date (end date or today, whichever is earlier)
  const getMaxStartDate = () => {
    const today = getMaxDate()
    if (value.endDate) {
      return value.endDate < today ? value.endDate : today
    }
    return today
  }

  return (
    <div className={`flex flex-col sm:flex-row gap-4 ${className}`}>
      <div className="flex-1">
        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
          Start Date
        </label>
        <input
          type="date"
          id="startDate"
          value={value.startDate}
          onChange={(e) => handleDateChange('startDate', e.target.value)}
          max={getMaxStartDate()}
          disabled={disabled}
          className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            errors.startDate
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
        />
        {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}
      </div>

      <div className="flex-1">
        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
          End Date
        </label>
        <input
          type="date"
          id="endDate"
          value={value.endDate}
          onChange={(e) => handleDateChange('endDate', e.target.value)}
          min={getMinEndDate()}
          max={getMaxDate()}
          disabled={disabled}
          className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            errors.endDate
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
        />
        {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>}
      </div>
    </div>
  )
}

// Helper function to get default date range (current month)
export const getDefaultDateRange = (): DateRange => {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  return {
    startDate: startOfMonth.toISOString().split('T')[0],
    endDate: endOfMonth.toISOString().split('T')[0],
  }
}

// Helper function to get predefined date ranges
export const getPredefinedDateRanges = () => {
  const now = new Date()
  const ranges = {
    currentMonth: {
      startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
    },
    last3Months: {
      startDate: new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0],
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
    },
    last6Months: {
      startDate: new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString().split('T')[0],
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
    },
    lastYear: {
      startDate: new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().split('T')[0],
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
    },
    yearToDate: {
      startDate: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    },
  }

  return ranges
}
