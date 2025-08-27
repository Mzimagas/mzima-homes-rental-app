'use client'

import { useEffect, useState } from 'react'
import { apiAuditor } from '../utils/api-audit'

interface APIAuditReport {
  summary: {
    totalCalls: number
    totalDuration: number
    averageDuration: number
    patternsFound: number
    criticalIssues: number
    highPriorityIssues: number
  }
  patterns: any[]
  calls: any[]
  recommendations: string[]
}

export function useAPIAudit(autoStart = false) {
  const [isRecording, setIsRecording] = useState(false)
  const [report, setReport] = useState<APIAuditReport | null>(null)

  useEffect(() => {
    if (autoStart) {
      startAudit()
    }
  }, [autoStart])

  const startAudit = () => {
    apiAuditor.startRecording()
    setIsRecording(true)
    setReport(null)
  }

  const stopAudit = () => {
    const auditReport = apiAuditor.stopRecording()
    setIsRecording(false)
    setReport(auditReport)

    // Log report to console for development
    if (process.env.NODE_ENV === 'development') {
      console.group('🔍 API Audit Report')
      console.log('Summary:', auditReport.summary)
      console.log('Patterns Found:', auditReport.patterns)
      console.log('Recommendations:', auditReport.recommendations)
      console.groupEnd()
    }

    return auditReport
  }

  const clearReport = () => {
    setReport(null)
  }

  return {
    isRecording,
    report,
    startAudit,
    stopAudit,
    clearReport,
  }
}

// Hook for automatic auditing during development
export function useDevAPIAudit() {
  const { startAudit, stopAudit, report } = useAPIAudit()

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Start auditing when component mounts
      startAudit()

      // Stop auditing after 30 seconds or when component unmounts
      const timer = setTimeout(() => {
        stopAudit()
      }, 30000)

      return () => {
        clearTimeout(timer)
        stopAudit()
      }
    }
  }, [])

  return { report }
}
