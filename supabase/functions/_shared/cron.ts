// Cron job configuration for automated notifications
// This file defines the scheduling logic for notification processing

export interface CronJob {
  name: string
  schedule: string // Cron expression
  function: string // Function name to call
  enabled: boolean
  description: string
}

export const cronJobs: CronJob[] = [
  {
    name: 'process-notifications',
    schedule: '0 9 * * *', // Daily at 9:00 AM
    function: 'process-notifications',
    enabled: true,
    description: 'Process automated notifications for rent reminders, overdue payments, and lease expiry'
  },
  {
    name: 'mark-overdue-invoices',
    schedule: '0 1 * * *', // Daily at 1:00 AM
    function: 'mark-overdue-invoices',
    enabled: true,
    description: 'Mark rent invoices as overdue when past due date'
  },
  {
    name: 'cleanup-old-notifications',
    schedule: '0 2 * * 0', // Weekly on Sunday at 2:00 AM
    function: 'cleanup-notifications',
    enabled: true,
    description: 'Clean up old notification history records (older than 6 months)'
  }
]

export function parseCronExpression(expression: string): {
  minute: string
  hour: string
  dayOfMonth: string
  month: string
  dayOfWeek: string
} {
  const parts = expression.split(' ')
  if (parts.length !== 5) {
    throw new Error('Invalid cron expression. Must have 5 parts: minute hour day month dayOfWeek')
  }

  return {
    minute: parts[0],
    hour: parts[1],
    dayOfMonth: parts[2],
    month: parts[3],
    dayOfWeek: parts[4]
  }
}

export function shouldRunNow(cronExpression: string, currentTime: Date = new Date()): boolean {
  const cron = parseCronExpression(cronExpression)
  
  const minute = currentTime.getMinutes()
  const hour = currentTime.getHours()
  const dayOfMonth = currentTime.getDate()
  const month = currentTime.getMonth() + 1 // JavaScript months are 0-based
  const dayOfWeek = currentTime.getDay() // 0 = Sunday

  return (
    matchesCronField(cron.minute, minute) &&
    matchesCronField(cron.hour, hour) &&
    matchesCronField(cron.dayOfMonth, dayOfMonth) &&
    matchesCronField(cron.month, month) &&
    matchesCronField(cron.dayOfWeek, dayOfWeek)
  )
}

function matchesCronField(cronField: string, value: number): boolean {
  // Handle wildcard
  if (cronField === '*') {
    return true
  }

  // Handle specific value
  if (cronField === value.toString()) {
    return true
  }

  // Handle ranges (e.g., "1-5")
  if (cronField.includes('-')) {
    const [start, end] = cronField.split('-').map(Number)
    return value >= start && value <= end
  }

  // Handle step values (e.g., "*/5")
  if (cronField.includes('/')) {
    const [range, step] = cronField.split('/')
    const stepValue = Number(step)
    
    if (range === '*') {
      return value % stepValue === 0
    }
    
    if (range.includes('-')) {
      const [start, end] = range.split('-').map(Number)
      return value >= start && value <= end && (value - start) % stepValue === 0
    }
  }

  // Handle comma-separated values (e.g., "1,3,5")
  if (cronField.includes(',')) {
    const values = cronField.split(',').map(Number)
    return values.includes(value)
  }

  return false
}

export function getNextRunTime(cronExpression: string, fromTime: Date = new Date()): Date {
  const nextRun = new Date(fromTime)
  nextRun.setSeconds(0, 0) // Reset seconds and milliseconds
  
  // Start from the next minute
  nextRun.setMinutes(nextRun.getMinutes() + 1)
  
  // Find the next valid time (within reasonable limits)
  for (let i = 0; i < 60 * 24 * 7; i++) { // Check up to a week ahead
    if (shouldRunNow(cronExpression, nextRun)) {
      return nextRun
    }
    nextRun.setMinutes(nextRun.getMinutes() + 1)
  }
  
  throw new Error('Could not find next run time within a week')
}

export function formatCronDescription(cronExpression: string): string {
  try {
    const cron = parseCronExpression(cronExpression)
    
    let description = 'Runs '
    
    // Handle frequency
    if (cron.minute === '0' && cron.hour !== '*') {
      description += `daily at ${cron.hour}:00`
    } else if (cron.minute !== '*' && cron.hour !== '*') {
      description += `daily at ${cron.hour}:${cron.minute.padStart(2, '0')}`
    } else if (cron.dayOfWeek !== '*') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      if (cron.dayOfWeek.includes(',')) {
        const dayNumbers = cron.dayOfWeek.split(',').map(Number)
        const dayNames = dayNumbers.map(n => days[n])
        description += `on ${dayNames.join(', ')}`
      } else {
        description += `on ${days[Number(cron.dayOfWeek)]}`
      }
      
      if (cron.hour !== '*') {
        description += ` at ${cron.hour}:${cron.minute.padStart(2, '0')}`
      }
    } else {
      description += 'periodically'
    }
    
    return description
  } catch (error) {
    return 'Invalid cron expression'
  }
}
