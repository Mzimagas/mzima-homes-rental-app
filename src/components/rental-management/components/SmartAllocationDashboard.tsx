'use client'

import { useState, useEffect } from 'react'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'
import { UnitAllocationService } from '../services/unit-allocation.service'
import { useRealTimeOccupancy } from '../hooks/useRealTimeOccupancy'
import supabase from '../../../lib/supabase-client'

interface AllocationSuggestion {
  id: string
  tenant: {
    id: string
    full_name: string
    phone: string
    email?: string
    current_unit?: any
  }
  suggestedUnits: Array<{
    id: string
    unit_label: string
    monthly_rent_kes: number
    property_name: string
    score: number
    reasons: string[]
  }>
  reason: 'NEW_TENANT' | 'LEASE_EXPIRING' | 'UPGRADE_REQUEST' | 'MAINTENANCE_MOVE' | 'REALLOCATION_NEEDED'
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  urgency_date?: string
  notes?: string
}

interface SmartAllocationDashboardProps {
  onDataChange?: () => void
}

export default function SmartAllocationDashboard({ onDataChange }: SmartAllocationDashboardProps) {
  const [suggestions, setSuggestions] = useState<AllocationSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [showQuickAllocationModal, setShowQuickAllocationModal] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState<AllocationSuggestion | null>(null)
  const [selectedUnit, setSelectedUnit] = useState('')
  const [allocating, setAllocating] = useState(false)
  const [error, setError] = useState('')

  const { getOccupancyStats, isConnected } = useRealTimeOccupancy()

  useEffect(() => {
    generateAllocationSuggestions()
  }, [])

  const generateAllocationSuggestions = async () => {
    try {
      setLoading(true)
      setError('')

      const suggestions: AllocationSuggestion[] = []

      // 1. Find tenants without units (NEW_TENANT)
      const unassignedTenants = await getUnassignedTenants()
      for (const tenant of unassignedTenants) {
        const suggestedUnits = await getSuggestedUnitsForTenant(tenant)
        if (suggestedUnits.length > 0) {
          suggestions.push({
            id: `new-${tenant.id}`,
            tenant,
            suggestedUnits,
            reason: 'NEW_TENANT',
            priority: 'HIGH',
            notes: 'Tenant needs initial unit assignment'
          })
        }
      }

      // 2. Find expiring leases (LEASE_EXPIRING)
      const expiringLeases = await getExpiringLeases(30) // Next 30 days
      for (const lease of expiringLeases) {
        const tenant = lease.tenant
        const suggestedUnits = await getSuggestedUnitsForTenant(tenant, lease.unit_id)
        if (suggestedUnits.length > 0) {
          suggestions.push({
            id: `expiring-${lease.id}`,
            tenant,
            suggestedUnits,
            reason: 'LEASE_EXPIRING',
            priority: 'MEDIUM',
            urgency_date: lease.end_date,
            notes: `Current lease expires on ${new Date(lease.end_date).toLocaleDateString()}`
          })
        }
      }

      // 3. Find maintenance-related moves (MAINTENANCE_MOVE)
      const maintenanceMoves = await getMaintenanceRequiredMoves()
      for (const move of maintenanceMoves) {
        const suggestedUnits = await getSuggestedUnitsForTenant(move.tenant, move.current_unit_id)
        if (suggestedUnits.length > 0) {
          suggestions.push({
            id: `maintenance-${move.tenant.id}`,
            tenant: move.tenant,
            suggestedUnits,
            reason: 'MAINTENANCE_MOVE',
            priority: 'HIGH',
            notes: `Unit requires maintenance: ${move.maintenance_reason}`
          })
        }
      }

      // 4. Find potential upgrades/downgrades (UPGRADE_REQUEST)
      const upgradeOpportunities = await getUpgradeOpportunities()
      for (const opportunity of upgradeOpportunities) {
        const suggestedUnits = await getSuggestedUnitsForTenant(opportunity.tenant, opportunity.current_unit_id)
        if (suggestedUnits.length > 0) {
          suggestions.push({
            id: `upgrade-${opportunity.tenant.id}`,
            tenant: opportunity.tenant,
            suggestedUnits,
            reason: 'UPGRADE_REQUEST',
            priority: 'LOW',
            notes: opportunity.reason
          })
        }
      }

      // Sort by priority and urgency
      suggestions.sort((a, b) => {
        const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 }
        const aPriority = priorityOrder[a.priority]
        const bPriority = priorityOrder[b.priority]
        
        if (aPriority !== bPriority) return bPriority - aPriority
        
        // If same priority, sort by urgency date
        if (a.urgency_date && b.urgency_date) {
          return new Date(a.urgency_date).getTime() - new Date(b.urgency_date).getTime()
        }
        
        return 0
      })

      setSuggestions(suggestions)
    } catch (error) {
      console.error('Error generating allocation suggestions:', error)
      setError('Failed to generate allocation suggestions')
    } finally {
      setLoading(false)
    }
  }

  const getUnassignedTenants = async () => {
    const { data, error } = await supabase
      .from('tenants')
      .select(`
        id, full_name, phone, email,
        tenancy_agreements!left(id, status)
      `)
      .is('tenancy_agreements.id', null)
      .or('tenancy_agreements.status.neq.ACTIVE')

    if (error) throw error
    return data?.filter(tenant => 
      !tenant.tenancy_agreements?.some((agreement: any) => agreement.status === 'ACTIVE')
    ) || []
  }

  const getExpiringLeases = async (daysAhead: number) => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + daysAhead)

    const { data, error } = await supabase
      .from('tenancy_agreements')
      .select(`
        id, end_date, unit_id,
        tenants!inner(id, full_name, phone, email)
      `)
      .eq('status', 'ACTIVE')
      .not('end_date', 'is', null)
      .lte('end_date', futureDate.toISOString().split('T')[0])

    if (error) throw error
    return data?.map(lease => ({
      ...lease,
      tenant: lease.tenants
    })) || []
  }

  const getMaintenanceRequiredMoves = async () => {
    // This would integrate with a maintenance system
    // For now, return units marked as needing maintenance
    const { data, error } = await supabase
      .from('units')
      .select(`
        id, unit_label, maintenance_notes,
        tenancy_agreements!inner(
          tenant_id,
          tenants!inner(id, full_name, phone, email)
        )
      `)
      .eq('status', 'MAINTENANCE')
      .eq('tenancy_agreements.status', 'ACTIVE')

    if (error) throw error
    return data?.map(unit => ({
      current_unit_id: unit.id,
      tenant: unit.tenancy_agreements[0]?.tenants,
      maintenance_reason: unit.maintenance_notes || 'Unit requires maintenance'
    })) || []
  }

  const getUpgradeOpportunities = async () => {
    // Find tenants who might benefit from unit upgrades/downgrades
    // This is a simplified version - could be enhanced with tenant preferences
    return []
  }

  const getSuggestedUnitsForTenant = async (tenant: any, excludeUnitId?: string) => {
    try {
      const availableUnits = await UnitAllocationService.getAvailableUnits(
        new Date().toISOString().split('T')[0]
      )

      // Filter out current unit if specified
      const filteredUnits = availableUnits.filter(unit => unit.id !== excludeUnitId)

      // Score units based on various factors
      const scoredUnits = filteredUnits.map(unit => {
        let score = 0
        const reasons: string[] = []

        // Base score for availability
        score += 10
        reasons.push('Available immediately')

        // Rent affordability (assuming tenant can afford current rent +/- 20%)
        const currentRent = tenant.current_unit?.monthly_rent_kes || unit.monthly_rent_kes
        const rentDiff = Math.abs((unit.monthly_rent_kes || 0) - currentRent) / currentRent
        if (rentDiff <= 0.1) {
          score += 15
          reasons.push('Similar rent to current unit')
        } else if (rentDiff <= 0.2) {
          score += 10
          reasons.push('Reasonable rent adjustment')
        }

        // Property quality/amenities (simplified)
        if (unit.monthly_rent_kes && unit.monthly_rent_kes > 15000) {
          score += 5
          reasons.push('Premium property')
        }

        return {
          id: unit.id,
          unit_label: unit.unit_label || '',
          monthly_rent_kes: unit.monthly_rent_kes || 0,
          property_name: (unit as any).properties?.name || 'Unknown Property',
          score,
          reasons
        }
      })

      // Return top 3 suggestions
      return scoredUnits
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
    } catch (error) {
      console.error('Error getting suggested units:', error)
      return []
    }
  }

  const handleQuickAllocation = (suggestion: AllocationSuggestion) => {
    setSelectedSuggestion(suggestion)
    setSelectedUnit('')
    setShowQuickAllocationModal(true)
  }

  const confirmQuickAllocation = async () => {
    if (!selectedSuggestion || !selectedUnit) return

    try {
      setAllocating(true)
      
      const result = await UnitAllocationService.allocateUnitToTenant(
        selectedSuggestion.tenant.id,
        selectedUnit,
        {
          tenant_id: selectedSuggestion.tenant.id,
          unit_id: selectedUnit,
          start_date: new Date().toISOString().split('T')[0],
          monthly_rent_kes: selectedSuggestion.suggestedUnits.find(u => u.id === selectedUnit)?.monthly_rent_kes || 0,
          notes: `Smart allocation: ${selectedSuggestion.reason}`
        }
      )

      if (result.success) {
        alert('Unit allocated successfully!')
        setShowQuickAllocationModal(false)
        generateAllocationSuggestions() // Refresh suggestions
        onDataChange?.()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error allocating unit:', error)
      setError(error instanceof Error ? error.message : 'Failed to allocate unit')
    } finally {
      setAllocating(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-800 border-red-200'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case 'NEW_TENANT': return '👤'
      case 'LEASE_EXPIRING': return '⏰'
      case 'MAINTENANCE_MOVE': return '🔧'
      case 'UPGRADE_REQUEST': return '⬆️'
      case 'REALLOCATION_NEEDED': return '🔄'
      default: return '📋'
    }
  }

  const getReasonText = (reason: string) => {
    switch (reason) {
      case 'NEW_TENANT': return 'New Tenant Assignment'
      case 'LEASE_EXPIRING': return 'Lease Expiring Soon'
      case 'MAINTENANCE_MOVE': return 'Maintenance Required'
      case 'UPGRADE_REQUEST': return 'Upgrade Opportunity'
      case 'REALLOCATION_NEEDED': return 'Reallocation Needed'
      default: return reason
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Smart Allocation Dashboard</h2>
          <p className="text-gray-600">Automated suggestions for optimal unit assignments</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={isConnected ? 'text-green-700' : 'text-red-700'}>
              {isConnected ? 'Live Data' : 'Offline'}
            </span>
          </div>
          <Button
            onClick={generateAllocationSuggestions}
            disabled={loading}
            variant="secondary"
          >
            {loading ? 'Analyzing...' : 'Refresh Suggestions'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Suggestions List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🤖</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing Allocation Opportunities</h3>
          <p className="text-gray-500">Please wait while we generate smart suggestions...</p>
        </div>
      ) : suggestions.length > 0 ? (
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="bg-white rounded-lg shadow border p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getReasonIcon(suggestion.reason)}</span>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {suggestion.tenant.full_name}
                    </h3>
                    <p className="text-sm text-gray-600">{getReasonText(suggestion.reason)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(suggestion.priority)}`}>
                    {suggestion.priority}
                  </span>
                  {suggestion.urgency_date && (
                    <span className="text-xs text-gray-500">
                      Due: {new Date(suggestion.urgency_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {suggestion.notes && (
                <p className="text-sm text-gray-600 mb-4">{suggestion.notes}</p>
              )}

              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Suggested Units:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {suggestion.suggestedUnits.map((unit) => (
                    <div
                      key={unit.id}
                      className="border rounded-lg p-3 hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() => handleQuickAllocation(suggestion)}
                    >
                      <div className="font-medium text-gray-900">{unit.property_name}</div>
                      <div className="text-sm text-gray-600">{unit.unit_label}</div>
                      <div className="text-sm font-medium text-green-600">
                        KES {unit.monthly_rent_kes.toLocaleString()}/month
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        Score: {unit.score}/30
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {unit.reasons.slice(0, 2).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => handleQuickAllocation(suggestion)}
                  variant="primary"
                  size="sm"
                >
                  Quick Allocate
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">✅</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Allocation Suggestions</h3>
          <p className="text-gray-500">
            All tenants are optimally allocated. Check back later for new opportunities.
          </p>
        </div>
      )}

      {/* Quick Allocation Modal */}
      <Modal
        isOpen={showQuickAllocationModal}
        onClose={() => setShowQuickAllocationModal(false)}
        title={`Quick Allocation - ${selectedSuggestion?.tenant.full_name}`}
      >
        {selectedSuggestion && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Allocation Details</h4>
              <p className="text-sm text-blue-700">
                <strong>Reason:</strong> {getReasonText(selectedSuggestion.reason)}
              </p>
              <p className="text-sm text-blue-700">
                <strong>Priority:</strong> {selectedSuggestion.priority}
              </p>
              {selectedSuggestion.notes && (
                <p className="text-sm text-blue-700">
                  <strong>Notes:</strong> {selectedSuggestion.notes}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Unit *
              </label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a unit...</option>
                {selectedSuggestion.suggestedUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.property_name} - {unit.unit_label} (KES {unit.monthly_rent_kes.toLocaleString()}/month)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setShowQuickAllocationModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={confirmQuickAllocation}
                disabled={!selectedUnit || allocating}
              >
                {allocating ? 'Allocating...' : 'Confirm Allocation'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
