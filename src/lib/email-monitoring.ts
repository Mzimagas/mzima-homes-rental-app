/**
 * Email Monitoring and Logging Utility
 * Tracks email sending success/failure rates to prevent bounce issues
 */

export interface EmailAttempt {
  id: string
  email: string
  type: 'signup' | 'notification' | 'reset_password' | 'other'
  status: 'success' | 'failed' | 'bounced' | 'pending'
  error?: string
  timestamp: Date
  supabaseProjectId?: string
}

export interface EmailStats {
  totalAttempts: number
  successCount: number
  failureCount: number
  bounceCount: number
  successRate: number
  bounceRate: number
  recentFailures: EmailAttempt[]
}

class EmailMonitor {
  private attempts: EmailAttempt[] = []
  private maxStoredAttempts = 1000
  private supabaseProjectId = 'ajrxvnakphkpkcssisxm'

  /**
   * Log an email attempt
   */
  logEmailAttempt(
    email: string, 
    type: EmailAttempt['type'], 
    status: EmailAttempt['status'], 
    error?: string
  ): void {
    const attempt: EmailAttempt = {
      id: this.generateId(),
      email: this.sanitizeEmail(email),
      type,
      status,
      error,
      timestamp: new Date(),
      supabaseProjectId: this.supabaseProjectId
    }

    this.attempts.unshift(attempt)
    
    // Keep only the most recent attempts
    if (this.attempts.length > this.maxStoredAttempts) {
      this.attempts = this.attempts.slice(0, this.maxStoredAttempts)
    }

    // Log to console for debugging
    const statusEmoji = status === 'success' ? '✅' : status === 'failed' ? '❌' : status === 'bounced' ? '🚫' : '⏳'
    console.log(`${statusEmoji} Email ${type}: ${this.sanitizeEmail(email)} - ${status}${error ? ` (${error})` : ''}`)

    // Check if we're approaching dangerous bounce rates
    this.checkBounceRateWarning()
  }

  /**
   * Log a successful email send
   */
  logSuccess(email: string, type: EmailAttempt['type']): void {
    this.logEmailAttempt(email, type, 'success')
  }

  /**
   * Log a failed email send
   */
  logFailure(email: string, type: EmailAttempt['type'], error: string): void {
    this.logEmailAttempt(email, type, 'failed', error)
  }

  /**
   * Log a bounced email
   */
  logBounce(email: string, type: EmailAttempt['type'], error: string): void {
    this.logEmailAttempt(email, type, 'bounced', error)
  }

  /**
   * Get email statistics
   */
  getStats(timeframeHours: number = 24): EmailStats {
    const cutoffTime = new Date(Date.now() - timeframeHours * 60 * 60 * 1000)
    const recentAttempts = this.attempts.filter(attempt => attempt.timestamp >= cutoffTime)

    const totalAttempts = recentAttempts.length
    const successCount = recentAttempts.filter(a => a.status === 'success').length
    const failureCount = recentAttempts.filter(a => a.status === 'failed').length
    const bounceCount = recentAttempts.filter(a => a.status === 'bounced').length

    const successRate = totalAttempts > 0 ? (successCount / totalAttempts) * 100 : 0
    const bounceRate = totalAttempts > 0 ? (bounceCount / totalAttempts) * 100 : 0

    const recentFailures = recentAttempts
      .filter(a => a.status === 'failed' || a.status === 'bounced')
      .slice(0, 10)

    return {
      totalAttempts,
      successCount,
      failureCount,
      bounceCount,
      successRate,
      bounceRate,
      recentFailures
    }
  }

  /**
   * Check if bounce rate is approaching dangerous levels
   */
  private checkBounceRateWarning(): void {
    const stats = this.getStats(1) // Last hour
    
    if (stats.totalAttempts >= 5) { // Only check if we have enough data
      if (stats.bounceRate > 20) {
        console.warn('🚨 HIGH BOUNCE RATE WARNING:', {
          bounceRate: `${stats.bounceRate.toFixed(1)}%`,
          totalAttempts: stats.totalAttempts,
          bounceCount: stats.bounceCount,
          message: 'High bounce rate detected! This could trigger Supabase email restrictions.'
        })
      } else if (stats.bounceRate > 10) {
        console.warn('⚠️ Elevated bounce rate:', {
          bounceRate: `${stats.bounceRate.toFixed(1)}%`,
          totalAttempts: stats.totalAttempts,
          bounceCount: stats.bounceCount
        })
      }
    }
  }

  /**
   * Get a summary report
   */
  getSummaryReport(): string {
    const stats24h = this.getStats(24)
    const stats1h = this.getStats(1)

    return `
📊 Email Delivery Report (Supabase Project: ${this.supabaseProjectId})

Last 24 Hours:
- Total Attempts: ${stats24h.totalAttempts}
- Success Rate: ${stats24h.successRate.toFixed(1)}%
- Bounce Rate: ${stats24h.bounceRate.toFixed(1)}%
- Failures: ${stats24h.failureCount}

Last Hour:
- Total Attempts: ${stats1h.totalAttempts}
- Success Rate: ${stats1h.successRate.toFixed(1)}%
- Bounce Rate: ${stats1h.bounceRate.toFixed(1)}%

${stats24h.bounceRate > 10 ? '🚨 WARNING: High bounce rate detected!' : '✅ Bounce rate within acceptable limits'}

Recent Failures:
${stats24h.recentFailures.slice(0, 5).map(f => 
  `- ${f.timestamp.toISOString()}: ${this.sanitizeEmail(f.email)} (${f.type}) - ${f.error || f.status}`
).join('\n') || 'None'}
    `.trim()
  }

  /**
   * Clear old attempts (for memory management)
   */
  clearOldAttempts(olderThanHours: number = 168): void { // Default: 1 week
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000)
    this.attempts = this.attempts.filter(attempt => attempt.timestamp >= cutoffTime)
  }

  /**
   * Sanitize email for logging (hide sensitive parts)
   */
  private sanitizeEmail(email: string): string {
    if (!email || !email.includes('@')) return '[invalid]'
    
    const [local, domain] = email.split('@')
    if (local.length <= 2) return email
    
    return `${local.charAt(0)}***${local.slice(-1)}@${domain}`
  }

  /**
   * Generate a simple ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }
}

// Export singleton instance
export const emailMonitor = new EmailMonitor()

// Helper functions for easy use
export const logEmailSuccess = (email: string, type: EmailAttempt['type']) => 
  emailMonitor.logSuccess(email, type)

export const logEmailFailure = (email: string, type: EmailAttempt['type'], error: string) => 
  emailMonitor.logFailure(email, type, error)

export const logEmailBounce = (email: string, type: EmailAttempt['type'], error: string) => 
  emailMonitor.logBounce(email, type, error)

export const getEmailStats = (timeframeHours?: number) => 
  emailMonitor.getStats(timeframeHours)

export const getEmailReport = () => 
  emailMonitor.getSummaryReport()

// Auto-cleanup every hour
if (typeof window !== 'undefined') {
  setInterval(() => {
    emailMonitor.clearOldAttempts()
  }, 60 * 60 * 1000) // 1 hour
}
