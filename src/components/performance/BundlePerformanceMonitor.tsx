'use client'

import React, { useEffect, useState } from 'react'

interface PerformanceMetrics {
  bundleLoadTime: number
  chunkLoadTimes: Record<string, number>
  totalBundleSize: number
  cacheHitRate: number
  renderTime: number
}

interface BundlePerformanceMonitorProps {
  enabled?: boolean
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void
}

export default function BundlePerformanceMonitor({ 
  enabled = process.env.NODE_ENV === 'development',
  onMetricsUpdate 
}: BundlePerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!enabled) return

    const measurePerformance = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      
      // Calculate bundle load time
      const bundleLoadTime = navigation.loadEventEnd - navigation.fetchStart
      
      // Calculate chunk load times
      const chunkLoadTimes: Record<string, number> = {}
      resources.forEach(resource => {
        if (resource.name.includes('/_next/static/chunks/')) {
          const chunkName = resource.name.split('/').pop() || 'unknown'
          chunkLoadTimes[chunkName] = resource.responseEnd - resource.fetchStart
        }
      })
      
      // Calculate total bundle size (approximation)
      const totalBundleSize = resources
        .filter(r => r.name.includes('/_next/static/'))
        .reduce((total, r) => total + (r.transferSize || 0), 0)
      
      // Calculate cache hit rate
      const cachedResources = resources.filter(r => r.transferSize === 0).length
      const cacheHitRate = resources.length > 0 ? (cachedResources / resources.length) * 100 : 0
      
      // Calculate render time
      const renderTime = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart
      
      const newMetrics: PerformanceMetrics = {
        bundleLoadTime,
        chunkLoadTimes,
        totalBundleSize,
        cacheHitRate,
        renderTime
      }
      
      setMetrics(newMetrics)
      onMetricsUpdate?.(newMetrics)
    }

    // Measure after page load
    if (document.readyState === 'complete') {
      measurePerformance()
    } else {
      window.addEventListener('load', measurePerformance)
      return () => window.removeEventListener('load', measurePerformance)
    }
  }, [enabled, onMetricsUpdate])

  // Monitor chunk loading in real-time
  useEffect(() => {
    if (!enabled || !metrics) return

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const chunkEntries = entries.filter(entry => 
        entry.name.includes('/_next/static/chunks/')
      ) as PerformanceResourceTiming[]
      
      if (chunkEntries.length > 0) {
        const newChunkTimes = { ...metrics.chunkLoadTimes }
        chunkEntries.forEach(entry => {
          const chunkName = entry.name.split('/').pop() || 'unknown'
          newChunkTimes[chunkName] = entry.responseEnd - entry.fetchStart
        })
        
        setMetrics(prev => prev ? { ...prev, chunkLoadTimes: newChunkTimes } : null)
      }
    })

    observer.observe({ entryTypes: ['resource'] })
    return () => observer.disconnect()
  }, [enabled, metrics])

  if (!enabled || !metrics) return null

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatTime = (ms: number) => {
    return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`
  }

  const getSlowestChunks = () => {
    return Object.entries(metrics.chunkLoadTimes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
  }

  const getPerformanceStatus = () => {
    if (metrics.bundleLoadTime < 2000) return { status: 'good', color: 'text-green-600' }
    if (metrics.bundleLoadTime < 4000) return { status: 'fair', color: 'text-yellow-600' }
    return { status: 'poor', color: 'text-red-600' }
  }

  const performanceStatus = getPerformanceStatus()

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        title="Bundle Performance Monitor"
      >
        📊
      </button>

      {/* Performance Panel */}
      {isVisible && (
        <div className="absolute bottom-12 right-0 bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-900">Bundle Performance</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Overall Performance */}
          <div className="mb-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Load Time:</span>
              <span className={`text-sm font-medium ${performanceStatus.color}`}>
                {formatTime(metrics.bundleLoadTime)} ({performanceStatus.status})
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Bundle Size:</span>
              <span className="text-sm font-medium">{formatSize(metrics.totalBundleSize)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Cache Hit Rate:</span>
              <span className="text-sm font-medium">{metrics.cacheHitRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Render Time:</span>
              <span className="text-sm font-medium">{formatTime(metrics.renderTime)}</span>
            </div>
          </div>

          {/* Slowest Chunks */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Slowest Chunks:</h4>
            <div className="space-y-1">
              {getSlowestChunks().map(([chunk, time]) => (
                <div key={chunk} className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 truncate" title={chunk}>
                    {chunk.length > 20 ? `${chunk.substring(0, 20)}...` : chunk}
                  </span>
                  <span className="font-medium">{formatTime(time)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Tips */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Tips:</h4>
            <div className="text-xs text-gray-600 space-y-1">
              {metrics.bundleLoadTime > 3000 && (
                <div>• Consider lazy loading heavy components</div>
              )}
              {metrics.cacheHitRate < 50 && (
                <div>• Enable better caching strategies</div>
              )}
              {Object.keys(metrics.chunkLoadTimes).length > 20 && (
                <div>• Too many chunks - consider bundling</div>
              )}
              {metrics.totalBundleSize > 1024 * 1024 && (
                <div>• Bundle size is large - review dependencies</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Hook for accessing performance metrics
export function usePerformanceMetrics() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)

  useEffect(() => {
    const measureMetrics = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      
      const bundleLoadTime = navigation.loadEventEnd - navigation.fetchStart
      const chunkLoadTimes: Record<string, number> = {}
      
      resources.forEach(resource => {
        if (resource.name.includes('/_next/static/chunks/')) {
          const chunkName = resource.name.split('/').pop() || 'unknown'
          chunkLoadTimes[chunkName] = resource.responseEnd - resource.fetchStart
        }
      })
      
      const totalBundleSize = resources
        .filter(r => r.name.includes('/_next/static/'))
        .reduce((total, r) => total + (r.transferSize || 0), 0)
      
      const cachedResources = resources.filter(r => r.transferSize === 0).length
      const cacheHitRate = resources.length > 0 ? (cachedResources / resources.length) * 100 : 0
      
      const renderTime = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart
      
      setMetrics({
        bundleLoadTime,
        chunkLoadTimes,
        totalBundleSize,
        cacheHitRate,
        renderTime
      })
    }

    if (document.readyState === 'complete') {
      measureMetrics()
    } else {
      window.addEventListener('load', measureMetrics)
      return () => window.removeEventListener('load', measureMetrics)
    }
  }, [])

  return metrics
}
