/**
 * Real-time Occupancy Hook
 * Provides real-time updates for unit occupancy and tenancy changes
 */

import { useEffect, useState, useCallback } from 'react'
import supabase from '../../../lib/supabase-client'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface OccupancyData {
  [unitId: string]: {
    occupied: boolean
    tenant_id?: string
    tenant_name?: string
    lease_start?: string
    lease_end?: string
    monthly_rent?: number
    available_from?: string
  }
}

export interface RealTimeEvent {
  type: 'LEASE_CREATED' | 'LEASE_TERMINATED' | 'LEASE_UPDATED' | 'UNIT_STATUS_CHANGED'
  unitId: string
  tenantId?: string
  data: any
  timestamp: string
}

export const useRealTimeOccupancy = () => {
  const [occupancyData, setOccupancyData] = useState<OccupancyData>({})
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [recentEvents, setRecentEvents] = useState<RealTimeEvent[]>([])

  // Initialize occupancy data
  const loadInitialOccupancyData = useCallback(async () => {
    try {
      // Try to use the optimized view first, fallback to manual query if view doesn't exist
      let data, error

      // First try the optimized view
      const viewResult = await supabase.from('unit_occupancy_summary').select('*')

      if (viewResult.error && viewResult.error.code === '42P01') {
        // View doesn't exist, use manual query with existing tables
        const manualResult = await supabase
          .from('units')
          .select(
            `
            id,
            unit_label,
            monthly_rent_kes,
            property_id,
            properties!inner(id, name),
            tenancy_agreements!left(
              id,
              tenant_id,
              start_date,
              end_date,
              monthly_rent_kes,
              status,
              tenants!inner(id, full_name)
            )
          `
          )
          .eq('is_active', true)

        if (manualResult.error) throw manualResult.error

        // Transform manual query result to match view format
        data = manualResult.data?.map((unit) => {
          const activeAgreement = unit.tenancy_agreements?.find(
            (agreement: any) => agreement.status === 'ACTIVE'
          )

          return {
            unit_id: unit.id,
            unit_label: unit.unit_label,
            property_id: unit.property_id,
            property_name: (unit.properties as any)?.name,
            monthly_rent_kes: unit.monthly_rent_kes,
            occupancy_status: activeAgreement ? 'OCCUPIED' : 'VACANT',
            tenant_id: activeAgreement?.tenant_id,
            tenant_name: activeAgreement?.tenants?.full_name,
            lease_start: activeAgreement?.start_date,
            lease_end: activeAgreement?.end_date,
            actual_rent: activeAgreement?.monthly_rent_kes,
          }
        })
        error = null
      } else {
        data = viewResult.data
        error = viewResult.error
      }

      if (error) throw error

      const occupancyMap: OccupancyData = {}
      data?.forEach((unit: any) => {
        occupancyMap[unit.unit_id] = {
          occupied: unit.occupancy_status === 'OCCUPIED',
          tenant_id: unit.tenant_id,
          tenant_name: unit.tenant_name,
          lease_start: unit.lease_start,
          lease_end: unit.lease_end,
          monthly_rent: unit.actual_rent || unit.monthly_rent_kes,
          available_from: unit.lease_end,
        }
      })

      setOccupancyData(occupancyMap)
    } catch (error) {
      console.error('Error loading initial occupancy data:', error)
      // Set empty occupancy data to prevent crashes
      setOccupancyData({})
    }
  }, [])

  // Handle real-time tenancy agreement changes
  const handleTenancyChange = useCallback((payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    let event: RealTimeEvent | null = null

    if (eventType === 'INSERT' && newRecord.status === 'ACTIVE') {
      // New lease created
      setOccupancyData((prev) => ({
        ...prev,
        [newRecord.unit_id]: {
          occupied: true,
          tenant_id: newRecord.tenant_id,
          lease_start: newRecord.start_date,
          lease_end: newRecord.end_date,
          monthly_rent: newRecord.monthly_rent_kes,
        },
      }))

      event = {
        type: 'LEASE_CREATED',
        unitId: newRecord.unit_id,
        tenantId: newRecord.tenant_id,
        data: newRecord,
        timestamp: new Date().toISOString(),
      }
    } else if (eventType === 'UPDATE') {
      if (oldRecord.status === 'ACTIVE' && newRecord.status !== 'ACTIVE') {
        // Lease terminated
        setOccupancyData((prev) => ({
          ...prev,
          [oldRecord.unit_id]: {
            occupied: false,
            available_from: newRecord.end_date || new Date().toISOString().split('T')[0],
          },
        }))

        event = {
          type: 'LEASE_TERMINATED',
          unitId: oldRecord.unit_id,
          tenantId: oldRecord.tenant_id,
          data: { oldRecord, newRecord },
          timestamp: new Date().toISOString(),
        }
      } else if (newRecord.status === 'ACTIVE') {
        // Lease updated
        setOccupancyData((prev) => ({
          ...prev,
          [newRecord.unit_id]: {
            ...prev[newRecord.unit_id],
            lease_start: newRecord.start_date,
            lease_end: newRecord.end_date,
            monthly_rent: newRecord.monthly_rent_kes,
          },
        }))

        event = {
          type: 'LEASE_UPDATED',
          unitId: newRecord.unit_id,
          tenantId: newRecord.tenant_id,
          data: newRecord,
          timestamp: new Date().toISOString(),
        }
      }
    } else if (eventType === 'DELETE' && oldRecord.status === 'ACTIVE') {
      // Lease deleted
      setOccupancyData((prev) => ({
        ...prev,
        [oldRecord.unit_id]: {
          occupied: false,
          available_from: new Date().toISOString().split('T')[0],
        },
      }))

      event = {
        type: 'LEASE_TERMINATED',
        unitId: oldRecord.unit_id,
        tenantId: oldRecord.tenant_id,
        data: oldRecord,
        timestamp: new Date().toISOString(),
      }
    }

    if (event) {
      setRecentEvents((prev) => [event!, ...prev.slice(0, 9)]) // Keep last 10 events
      setLastUpdate(new Date())
    }
  }, [])

  // Handle unit status changes
  const handleUnitStatusChange = useCallback((payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    if (eventType === 'UPDATE' && oldRecord.status !== newRecord.status) {
      setOccupancyData((prev) => ({
        ...prev,
        [newRecord.id]: {
          ...prev[newRecord.id],
          occupied: newRecord.status === 'OCCUPIED',
        },
      }))

      const event: RealTimeEvent = {
        type: 'UNIT_STATUS_CHANGED',
        unitId: newRecord.id,
        data: { oldStatus: oldRecord.status, newStatus: newRecord.status },
        timestamp: new Date().toISOString(),
      }

      setRecentEvents((prev) => [event, ...prev.slice(0, 9)])
      setLastUpdate(new Date())
    }
  }, [])

  // Set up real-time subscriptions
  useEffect(() => {
    loadInitialOccupancyData()

    // Subscribe to tenancy agreement changes
    const tenancyChannel: RealtimeChannel = supabase
      .channel('tenancy_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tenancy_agreements',
        },
        handleTenancyChange
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'units',
        },
        handleUnitStatusChange
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      tenancyChannel.unsubscribe()
    }
  }, [loadInitialOccupancyData, handleTenancyChange, handleUnitStatusChange])

  // Utility functions
  const getUnitOccupancy = useCallback(
    (unitId: string) => {
      return occupancyData[unitId] || { occupied: false }
    },
    [occupancyData]
  )

  const getOccupancyStats = useCallback(() => {
    const units = Object.values(occupancyData)
    const totalUnits = units.length
    const occupiedUnits = units.filter((unit) => unit.occupied).length
    const vacantUnits = totalUnits - occupiedUnits
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0

    return {
      totalUnits,
      occupiedUnits,
      vacantUnits,
      occupancyRate,
    }
  }, [occupancyData])

  const refreshOccupancyData = useCallback(() => {
    loadInitialOccupancyData()
  }, [loadInitialOccupancyData])

  return {
    occupancyData,
    isConnected,
    lastUpdate,
    recentEvents,
    getUnitOccupancy,
    getOccupancyStats,
    refreshOccupancyData,
  }
}

// Hook for specific unit real-time updates
export const useUnitRealTime = (unitId: string) => {
  const { occupancyData, getUnitOccupancy, isConnected } = useRealTimeOccupancy()

  return {
    unitData: getUnitOccupancy(unitId),
    isConnected,
    isOccupied: occupancyData[unitId]?.occupied || false,
    tenantName: occupancyData[unitId]?.tenant_name,
    leaseEnd: occupancyData[unitId]?.lease_end,
  }
}

// Hook for property-level real-time updates
export const usePropertyRealTime = (propertyId: string) => {
  const { occupancyData, isConnected } = useRealTimeOccupancy()
  const [propertyUnits, setPropertyUnits] = useState<string[]>([])

  useEffect(() => {
    const loadPropertyUnits = async () => {
      try {
        const { data, error } = await supabase
          .from('units')
          .select('id')
          .eq('property_id', propertyId)
          .eq('is_active', true)

        if (error) throw error
        setPropertyUnits(data?.map((unit) => unit.id) || [])
      } catch (error) {
        console.error('Error loading property units:', error)
      }
    }

    loadPropertyUnits()
  }, [propertyId])

  const propertyOccupancy = propertyUnits.reduce(
    (acc, unitId) => {
      const unitData = occupancyData[unitId]
      if (unitData) {
        acc.totalUnits++
        if (unitData.occupied) acc.occupiedUnits++
      }
      return acc
    },
    { totalUnits: 0, occupiedUnits: 0 }
  )

  return {
    ...propertyOccupancy,
    vacantUnits: propertyOccupancy.totalUnits - propertyOccupancy.occupiedUnits,
    occupancyRate:
      propertyOccupancy.totalUnits > 0
        ? (propertyOccupancy.occupiedUnits / propertyOccupancy.totalUnits) * 100
        : 0,
    isConnected,
  }
}
