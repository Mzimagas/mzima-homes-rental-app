/**
 * Performance Monitor Component
 * Tracks and displays real-time performance metrics for workflow tabs
 */

import React, { useState, useEffect, useRef } from 'react'
import { ActiveTab } from '../types/property-management.types'

interface PerformanceMetrics {
  tabSwitchTime: number
  renderTime: number
  dataLoadTime: number
  timestamp: number
}

interface PerformanceMonitorProps {
  activeTab: ActiveTab
  enabled?: boolean
  showMetrics?: boolean
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  activeTab,
  enabled = process.env.NODE_ENV === 'development',
  showMetrics = false,
}) => {
  const [metrics, setMetrics] = useState<Record<ActiveTab, PerformanceMetrics[]>>({
    properties: [],
    purchase: [],
    subdivision: [],
    handover: [],
  })

  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics | null>(null)
  const tabSwitchStartRef = useRef<number>(0)
  const renderStartRef = useRef<number>(0)
  const previousTabRef = useRef<ActiveTab>(activeTab)

  // Track tab switches
  useEffect(() => {
    if (!enabled) return

    if (previousTabRef.current !== activeTab) {
      // Tab switch detected
      tabSwitchStartRef.current = performance.now()
      renderStartRef.current = performance.now()

      console.log(`[Performance] Tab switch to ${activeTab} started`)

      previousTabRef.current = activeTab
    }
  }, [activeTab, enabled])

  // Track render completion
  useEffect(() => {
    if (!enabled || tabSwitchStartRef.current === 0) return

    const renderTime = performance.now() - renderStartRef.current
    const tabSwitchTime = performance.now() - tabSwitchStartRef.current

    const newMetric: PerformanceMetrics = {
      tabSwitchTime,
      renderTime,
      dataLoadTime: 0, // Will be updated when data loads
      timestamp: Date.now(),
    }

    setCurrentMetrics(newMetric)

    console.log(`[Performance] ${activeTab} tab rendered in ${renderTime.toFixed(2)}ms`)

    // Reset timers
    tabSwitchStartRef.current = 0
    renderStartRef.current = 0
  }, [activeTab, enabled])

  // Save metrics to history
  useEffect(() => {
    if (!enabled || !currentMetrics) return

    setMetrics((prev) => ({
      ...prev,
      [activeTab]: [...prev[activeTab].slice(-9), currentMetrics], // Keep last 10 metrics
    }))
  }, [currentMetrics, activeTab, enabled])

  // Calculate average metrics
  const getAverageMetrics = (tab: ActiveTab) => {
    const tabMetrics = metrics[tab]
    if (tabMetrics.length === 0) return null

    const avg = tabMetrics.reduce(
      (acc, metric) => ({
        tabSwitchTime: acc.tabSwitchTime + metric.tabSwitchTime,
        renderTime: acc.renderTime + metric.renderTime,
        dataLoadTime: acc.dataLoadTime + metric.dataLoadTime,
      }),
      { tabSwitchTime: 0, renderTime: 0, dataLoadTime: 0 }
    )

    return {
      tabSwitchTime: avg.tabSwitchTime / tabMetrics.length,
      renderTime: avg.renderTime / tabMetrics.length,
      dataLoadTime: avg.dataLoadTime / tabMetrics.length,
      sampleCount: tabMetrics.length,
    }
  }

  // Performance status indicator
  const getPerformanceStatus = (time: number) => {
    if (time < 100) return { status: 'excellent', color: 'green' }
    if (time < 300) return { status: 'good', color: 'blue' }
    if (time < 1000) return { status: 'fair', color: 'yellow' }
    return { status: 'poor', color: 'red' }
  }

  if (!enabled || !showMetrics) return null

  const avgMetrics = getAverageMetrics(activeTab)
  const currentStatus = currentMetrics ? getPerformanceStatus(currentMetrics.tabSwitchTime) : null

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="text-sm font-semibold text-gray-800 mb-2">
        Performance Monitor - {activeTab}
      </div>

      {currentMetrics && (
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Last Switch:</span>
            <span className={`font-mono text-${currentStatus?.color}-600`}>
              {currentMetrics.tabSwitchTime.toFixed(1)}ms
            </span>
          </div>
          <div className="flex justify-between">
            <span>Render Time:</span>
            <span className="font-mono">{currentMetrics.renderTime.toFixed(1)}ms</span>
          </div>
        </div>
      )}

      {avgMetrics && (
        <div className="mt-3 pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-600 mb-1">
            Average ({avgMetrics.sampleCount} samples)
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Switch:</span>
              <span className="font-mono">{avgMetrics.tabSwitchTime.toFixed(1)}ms</span>
            </div>
            <div className="flex justify-between">
              <span>Render:</span>
              <span className="font-mono">{avgMetrics.renderTime.toFixed(1)}ms</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-2 text-xs text-gray-500">
        Status:{' '}
        <span className={`text-${currentStatus?.color}-600 font-semibold`}>
          {currentStatus?.status || 'measuring...'}
        </span>
      </div>
    </div>
  )
}

// Hook for performance tracking
export const usePerformanceTracking = (enabled = false) => {
  const [isTracking, setIsTracking] = useState(enabled)

  const startTracking = () => setIsTracking(true)
  const stopTracking = () => setIsTracking(false)

  const markPerformance = (label: string) => {
    if (!isTracking) return

    const timestamp = performance.now()
    console.log(`[Performance] ${label}: ${timestamp.toFixed(2)}ms`)

    // Mark in browser performance timeline
    if (performance.mark) {
      performance.mark(`workflow-${label}`)
    }
  }

  return {
    isTracking,
    startTracking,
    stopTracking,
    markPerformance,
  }
}

export default PerformanceMonitor
