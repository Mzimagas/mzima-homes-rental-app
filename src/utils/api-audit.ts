/**
 * API Audit Tool - Identifies N+1 Query Patterns and Performance Issues
 */

interface APICall {
  id: string
  timestamp: number
  method: string
  url: string
  duration: number
  status: number
  size?: number
  stackTrace?: string
}

interface N1Pattern {
  type: 'N+1' | 'SEQUENTIAL' | 'REDUNDANT'
  description: string
  calls: APICall[]
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  impact: string
  recommendation: string
}

class APIAuditor {
  private calls: APICall[] = []
  private patterns: N1Pattern[] = []
  private isRecording = false

  startRecording() {
    this.isRecording = true
    this.calls = []
    this.patterns = []
    console.log('🔍 API Audit: Recording started')
  }

  stopRecording() {
    this.isRecording = false
    this.analyzePatterns()
    console.log('🔍 API Audit: Recording stopped, analysis complete')
    return this.getReport()
  }

  recordCall(call: Omit<APICall, 'id' | 'timestamp'>) {
    if (!this.isRecording) return

    const apiCall: APICall = {
      id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...call,
    }

    this.calls.push(apiCall)
  }

  private analyzePatterns() {
    this.detectN1Patterns()
    this.detectSequentialCalls()
    this.detectRedundantCalls()
  }

  private detectN1Patterns() {
    // Group calls by base URL pattern
    const urlGroups = new Map<string, APICall[]>()

    this.calls.forEach((call) => {
      // Extract base pattern (e.g., /api/properties/123 -> /api/properties/:id)
      const basePattern = this.extractBasePattern(call.url)
      if (!urlGroups.has(basePattern)) {
        urlGroups.set(basePattern, [])
      }
      urlGroups.get(basePattern)!.push(call)
    })

    // Look for N+1 patterns
    urlGroups.forEach((calls, pattern) => {
      if (calls.length > 3 && this.isLikelyN1Pattern(calls)) {
        const severity = this.calculateSeverity(calls.length, calls)

        this.patterns.push({
          type: 'N+1',
          description: `Detected ${calls.length} similar calls to ${pattern}`,
          calls,
          severity,
          impact: `${calls.length} individual API calls instead of 1 batch call`,
          recommendation: this.getN1Recommendation(pattern, calls.length),
        })
      }
    })
  }

  private detectSequentialCalls() {
    // Look for sequential calls that could be parallelized
    for (let i = 0; i < this.calls.length - 1; i++) {
      const current = this.calls[i]
      const next = this.calls[i + 1]

      // If calls are sequential and independent, they could be parallelized
      if (next.timestamp - current.timestamp < 100 && !this.areCallsDependent(current, next)) {
        const sequentialGroup = this.findSequentialGroup(i)
        if (sequentialGroup.length > 2) {
          this.patterns.push({
            type: 'SEQUENTIAL',
            description: `${sequentialGroup.length} sequential independent calls`,
            calls: sequentialGroup,
            severity: 'MEDIUM',
            impact: `Calls executed sequentially instead of in parallel`,
            recommendation: 'Use Promise.all() to execute these calls in parallel',
          })
        }
      }
    }
  }

  private detectRedundantCalls() {
    const urlCounts = new Map<string, APICall[]>()

    this.calls.forEach((call) => {
      const key = `${call.method}:${call.url}`
      if (!urlCounts.has(key)) {
        urlCounts.set(key, [])
      }
      urlCounts.get(key)!.push(call)
    })

    urlCounts.forEach((calls, urlKey) => {
      if (calls.length > 1) {
        // Check if calls are within a short time window (likely redundant)
        const timeWindow = 5000 // 5 seconds
        const firstCall = calls[0]
        const redundantCalls = calls.filter(
          (call) => call.timestamp - firstCall.timestamp < timeWindow
        )

        if (redundantCalls.length > 1) {
          this.patterns.push({
            type: 'REDUNDANT',
            description: `${redundantCalls.length} identical calls to ${urlKey}`,
            calls: redundantCalls,
            severity: 'HIGH',
            impact: 'Unnecessary network requests and server load',
            recommendation: 'Implement caching or request deduplication',
          })
        }
      }
    })
  }

  private extractBasePattern(url: string): string {
    // Convert specific IDs to patterns
    return url
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+/g, '/:id')
      .replace(/\?.*$/, '') // Remove query parameters
  }

  private isLikelyN1Pattern(calls: APICall[]): boolean {
    // Check if calls are made in quick succession (typical of N+1)
    if (calls.length < 3) return false

    const timeSpan = calls[calls.length - 1].timestamp - calls[0].timestamp
    const avgInterval = timeSpan / calls.length

    // If calls are made very quickly (< 50ms apart on average), likely N+1
    return avgInterval < 50
  }

  private calculateSeverity(
    count: number,
    calls: APICall[]
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const totalDuration = calls.reduce((sum, call) => sum + call.duration, 0)

    if (count > 20 || totalDuration > 5000) return 'CRITICAL'
    if (count > 10 || totalDuration > 2000) return 'HIGH'
    if (count > 5 || totalDuration > 1000) return 'MEDIUM'
    return 'LOW'
  }

  private getN1Recommendation(pattern: string, count: number): string {
    if (pattern.includes('/properties')) {
      return `Use a batch endpoint like GET /api/properties?ids=${count} items instead of ${count} individual calls`
    }
    if (pattern.includes('/tenants')) {
      return `Fetch tenants with property data in a single call using joins or includes`
    }
    if (pattern.includes('/payments')) {
      return `Use pagination or batch loading for payments instead of individual requests`
    }
    return `Consider implementing batch loading or using GraphQL for efficient data fetching`
  }

  private areCallsDependent(call1: APICall, call2: APICall): boolean {
    // Simple heuristic: if one call's URL contains data that might come from another
    // This is a simplified check - in practice, you'd need more sophisticated analysis
    return call2.url.includes('tenant') && call1.url.includes('property')
  }

  private findSequentialGroup(startIndex: number): APICall[] {
    const group = [this.calls[startIndex]]

    for (let i = startIndex + 1; i < this.calls.length; i++) {
      const current = this.calls[i - 1]
      const next = this.calls[i]

      if (next.timestamp - current.timestamp < 100 && !this.areCallsDependent(current, next)) {
        group.push(next)
      } else {
        break
      }
    }

    return group
  }

  getReport() {
    const totalCalls = this.calls.length
    const totalDuration = this.calls.reduce((sum, call) => sum + call.duration, 0)
    const criticalPatterns = this.patterns.filter((p) => p.severity === 'CRITICAL')
    const highPatterns = this.patterns.filter((p) => p.severity === 'HIGH')

    return {
      summary: {
        totalCalls,
        totalDuration,
        averageDuration: totalCalls > 0 ? totalDuration / totalCalls : 0,
        patternsFound: this.patterns.length,
        criticalIssues: criticalPatterns.length,
        highPriorityIssues: highPatterns.length,
      },
      patterns: this.patterns,
      calls: this.calls,
      recommendations: this.generateRecommendations(),
    }
  }

  private generateRecommendations(): string[] {
    const recommendations = []

    if (this.patterns.some((p) => p.type === 'N+1')) {
      recommendations.push('Implement batch API endpoints for related data loading')
      recommendations.push('Use database joins instead of separate queries for related data')
    }

    if (this.patterns.some((p) => p.type === 'SEQUENTIAL')) {
      recommendations.push('Use Promise.all() for independent parallel requests')
      recommendations.push('Implement request batching for multiple independent calls')
    }

    if (this.patterns.some((p) => p.type === 'REDUNDANT')) {
      recommendations.push('Implement request caching and deduplication')
      recommendations.push('Use React Query or SWR for automatic request optimization')
    }

    return recommendations
  }
}

// Global instance
export const apiAuditor = new APIAuditor()

// Utility function to wrap fetch calls for automatic auditing
export function auditedFetch(
  url: string,
  options?: import('../lib/types/fetch').FetchOptions
): Promise<Response> {
  const startTime = Date.now()

  return fetch(url, options)
    .then((response) => {
      const duration = Date.now() - startTime

      apiAuditor.recordCall({
        method: options?.method || 'GET',
        url,
        duration,
        status: response.status,
        size: parseInt(response.headers.get('content-length') || '0'),
      })

      return response
    })
    .catch((error) => {
      const duration = Date.now() - startTime

      apiAuditor.recordCall({
        method: options?.method || 'GET',
        url,
        duration,
        status: 0, // Error status
      })

      throw error
    })
}

export default APIAuditor
