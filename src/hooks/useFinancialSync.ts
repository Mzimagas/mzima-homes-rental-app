import { useState, useEffect, useCallback, useRef } from 'react'
import { useFinancialStatus } from './useFinancialStatus'
import supabase from '../lib/supabase-client'

interface FinancialSyncOptions {
  propertyId: string
  pipeline: string
  enableRealTimeSync?: boolean
  syncInterval?: number // milliseconds
}

interface SyncEvent {
  type: 'payment_completed' | 'payment_failed' | 'payment_pending' | 'stage_unlocked'
  stageNumber: number
  paymentId?: string
  amount?: number
  timestamp: Date
}

export const useFinancialSync = (options: FinancialSyncOptions) => {
  const { propertyId, pipeline, enableRealTimeSync = true, syncInterval = 30000 } = options

  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([])
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const {
    getStageFinancialStatus,
    refetch: refetchFinancialStatus,
    loading: financialLoading,
  } = useFinancialStatus(propertyId, pipeline)

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (isSyncing) return

    setIsSyncing(true)
    try {
      // Refetch financial status
      await refetchFinancialStatus()

      // Update last sync time
      setLastSyncTime(new Date())

      // Emit sync event
      const syncEvent = new CustomEvent('financialSync', {
        detail: {
          propertyId,
          pipeline,
          timestamp: new Date(),
          type: 'manual_sync',
        },
      })
      window.dispatchEvent(syncEvent)
    } catch (error) {
      // Log error for debugging in development
      if (process.env.NODE_ENV === 'development') {
                      }
    } finally {
      setIsSyncing(false)
    }
  }, [propertyId, pipeline, refetchFinancialStatus, isSyncing])

  // Check for stage completion and unlock next stages
  const checkStageCompletion = useCallback(
    async (stageNumber: number) => {
      const financialStatus = getStageFinancialStatus(stageNumber)

      if (financialStatus.isFinanciallyComplete) {
        // Stage is financially complete, check if next stage should be unlocked
        const unlockEvent: SyncEvent = {
          type: 'stage_unlocked',
          stageNumber: stageNumber + 1,
          timestamp: new Date(),
        }

        setSyncEvents((prev) => [...prev, unlockEvent])

        // Emit stage unlock event
        const stageUnlockEvent = new CustomEvent('stageUnlocked', {
          detail: {
            propertyId,
            pipeline,
            completedStage: stageNumber,
            unlockedStage: stageNumber + 1,
            timestamp: new Date(),
          },
        })
        window.dispatchEvent(stageUnlockEvent)

        return true
      }

      return false
    },
    [getStageFinancialStatus, propertyId, pipeline]
  )

  // Simulate payment status updates (in real implementation, this would come from payment gateway)
  const simulatePaymentUpdate = useCallback(
    (paymentId: string, status: 'completed' | 'failed' | 'pending', amount?: number) => {
      const event: SyncEvent = {
        type:
          status === 'completed'
            ? 'payment_completed'
            : status === 'failed'
              ? 'payment_failed'
              : 'payment_pending',
        stageNumber: 0, // Would be determined from payment context
        paymentId,
        amount,
        timestamp: new Date(),
      }

      setSyncEvents((prev) => [...prev, event])

      // Trigger sync after payment update
      setTimeout(() => triggerSync(), 1000)
    },
    [triggerSync]
  )

  // Real-time subscription to financial changes (using Supabase real-time)
  useEffect(() => {
    if (!enableRealTimeSync || !propertyId) return

    let subscription: any = null

    const setupRealtimeSubscription = async () => {
      try {
        // Subscribe to property_financials table changes
        subscription = supabase
          .channel(`financial_changes_${propertyId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'property_financials',
              filter: `property_id=eq.${propertyId}`,
            },
            (payload: any) => {
              // Log financial changes in development
              if (process.env.NODE_ENV === 'development') {
                                              }

              // Trigger sync when financial data changes
              triggerSync()

              // Create sync event based on the change
              if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                const record = payload.new as any
                if (record.status === 'completed') {
                  const event: SyncEvent = {
                    type: 'payment_completed',
                    stageNumber: 0, // Would need to map payment to stage
                    paymentId: record.payment_type,
                    amount: record.amount,
                    timestamp: new Date(),
                  }
                  setSyncEvents((prev) => [...prev, event])
                }
              }
            }
          )
          .subscribe()
      } catch (error) {
        // Log subscription errors in development
        if (process.env.NODE_ENV === 'development') {
                            }
      }
    }

    setupRealtimeSubscription()

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [enableRealTimeSync, propertyId, triggerSync])

  // Periodic sync interval
  useEffect(() => {
    if (!enableRealTimeSync || syncInterval <= 0) return

    syncIntervalRef.current = setInterval(() => {
      if (!financialLoading) {
        triggerSync()
      }
    }, syncInterval)

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
    }
  }, [enableRealTimeSync, syncInterval, triggerSync, financialLoading])

  // Listen for external sync requests
  useEffect(() => {
    const handleSyncRequest = (event: CustomEvent) => {
      if (event.detail.propertyId === propertyId) {
        triggerSync()
      }
    }

    window.addEventListener('requestFinancialSync', handleSyncRequest as EventListener)

    return () => {
      window.removeEventListener('requestFinancialSync', handleSyncRequest as EventListener)
    }
  }, [propertyId, triggerSync])

  // Clear old sync events (keep only last 50)
  useEffect(() => {
    if (syncEvents.length > 50) {
      setSyncEvents((prev) => prev.slice(-50))
    }
  }, [syncEvents.length])

  return {
    // Sync status
    isSyncing,
    lastSyncTime,
    syncEvents,

    // Sync actions
    triggerSync,
    checkStageCompletion,
    simulatePaymentUpdate,

    // Financial status (re-exported for convenience)
    getStageFinancialStatus,
    financialLoading,
  }
}
