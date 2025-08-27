'use client'

import { useState, useCallback, useEffect } from 'react'
import InlineTenantManagement from './InlineTenantManagement'
import UnitAdditionCard from './UnitAdditionCard'
import InlinePropertiesOverview from './InlinePropertiesOverview'
import { usePropertyAccess } from '../../../hooks/usePropertyAccess'

type RentalWorkflowType = 'unitAddition' | 'tenants' | 'billing' | 'maintenance' | 'properties'

interface RentalWorkflowNavigationProps {
  onWorkflowClick?: (workflow: RentalWorkflowType) => void
}

export default function RentalWorkflowNavigation({
  onWorkflowClick,
}: RentalWorkflowNavigationProps) {
  const { properties: userProperties } = usePropertyAccess()
  const [activeWorkflow, setActiveWorkflow] = useState<RentalWorkflowType | null>(null)
  const [showTenantManagement, setShowTenantManagement] = useState(false)
  const [showUnitAddition, setShowUnitAddition] = useState(false)
  const [showPropertiesOverview, setShowPropertiesOverview] = useState(false)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>(undefined)

  // Reset all workflow states
  const resetWorkflowStates = useCallback(() => {
    setActiveWorkflow(null)
    setShowTenantManagement(false)
    setShowUnitAddition(false)
    setShowPropertiesOverview(false)
    setSelectedPropertyId(undefined)
  }, [])

  const handleWorkflowClick = useCallback(
    (workflow: RentalWorkflowType) => {
      // Reset all states first to prevent cross-contamination
      resetWorkflowStates()

      // Set the new active workflow
      setActiveWorkflow(workflow)
      onWorkflowClick?.(workflow)

      // Handle specific workflows
      if (workflow === 'unitAddition') {
        // Show unit addition card
        setShowUnitAddition(true)
        return
      }

      if (workflow === 'tenants') {
        // Show inline tenant management with property selection
        setShowTenantManagement(true)
        // Default to first available property if none selected
        if (!selectedPropertyId && userProperties.length > 0) {
          setSelectedPropertyId(userProperties[0].property_id)
        }
        return
      }

      if (workflow === 'properties') {
        // Show inline properties overview
        setShowPropertiesOverview(true)
        return
      }

      // For other workflows, show a placeholder message - these can be connected to actual features later
      alert(`${workflow.charAt(0).toUpperCase() + workflow.slice(1)} workflow coming soon!`)
    },
    [onWorkflowClick, resetWorkflowStates]
  )

  // Close tenant management handler
  const closeTenantManagement = useCallback(() => {
    setShowTenantManagement(false)
    setActiveWorkflow(null)
    setSelectedPropertyId(undefined)
  }, [])

  // Close unit addition handler
  const closeUnitAddition = useCallback(() => {
    setShowUnitAddition(false)
    setActiveWorkflow(null)
  }, [])

  // Close properties overview handler
  const closePropertiesOverview = useCallback(() => {
    setShowPropertiesOverview(false)
    setActiveWorkflow(null)
  }, [])

  // Clean up state when component unmounts or when external navigation occurs
  useEffect(() => {
    return () => {
      // Cleanup function to reset state when component unmounts
      resetWorkflowStates()
    }
  }, [resetWorkflowStates])

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
      <h2 className="text-xl font-bold text-gray-900 mb-3 text-center">
        Rental Management Workflows
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
        {/* Unit Addition */}
        <button
          onClick={() => handleWorkflowClick('unitAddition')}
          className={`bg-gradient-to-br rounded-lg py-3 px-3 transition-all duration-200 hover:scale-102 cursor-pointer border-2 ${
            activeWorkflow === 'unitAddition'
              ? 'from-indigo-100 to-purple-100 border-indigo-400 shadow-md ring-2 ring-indigo-300 ring-opacity-50 scale-102'
              : 'from-indigo-50 to-purple-50 border-indigo-200 hover:shadow-md hover:from-indigo-100 hover:to-purple-100'
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${activeWorkflow === 'unitAddition' ? 'bg-indigo-200' : 'bg-indigo-100'}`}
            >
              📄
            </div>
            <div>
              <h3
                className={`font-bold text-base transition-colors ${activeWorkflow === 'unitAddition' ? 'text-indigo-900' : 'text-indigo-800'}`}
              >
                Unit Addition
              </h3>
              <p
                className={`text-sm mt-1 transition-colors opacity-75 ${activeWorkflow === 'unitAddition' ? 'text-indigo-700' : 'text-indigo-600'}`}
              >
                Add new units to existing properties
              </p>
            </div>
          </div>
        </button>

        {/* Tenant Management */}
        <button
          onClick={() => handleWorkflowClick('tenants')}
          className={`bg-gradient-to-br rounded-lg py-3 px-3 transition-all duration-200 hover:scale-102 cursor-pointer border-2 ${
            showTenantManagement
              ? 'from-green-100 to-emerald-100 border-green-400 shadow-md ring-2 ring-green-300 ring-opacity-50 scale-102'
              : 'from-green-50 to-emerald-50 border-green-200 hover:shadow-md hover:from-green-100 hover:to-emerald-100'
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${showTenantManagement ? 'bg-green-200' : 'bg-green-100'}`}
            >
              👥
            </div>
            <div>
              <h3
                className={`font-bold text-base transition-colors ${showTenantManagement ? 'text-green-900' : 'text-green-800'}`}
              >
                Tenant Management
              </h3>
              <p
                className={`text-sm mt-1 transition-colors opacity-75 ${showTenantManagement ? 'text-green-700' : 'text-green-600'}`}
              >
                Onboarding, renewals, and move-outs
              </p>
            </div>
          </div>
        </button>

        {/* Rent Collection & Billing */}
        <button
          onClick={() => handleWorkflowClick('billing')}
          className={`bg-gradient-to-br rounded-lg py-3 px-3 transition-all duration-200 hover:scale-102 cursor-pointer border-2 ${
            activeWorkflow === 'billing'
              ? 'from-blue-100 to-cyan-100 border-blue-400 shadow-md ring-2 ring-blue-300 ring-opacity-50 scale-102'
              : 'from-blue-50 to-cyan-50 border-blue-200 hover:shadow-md hover:from-blue-100 hover:to-cyan-100'
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${activeWorkflow === 'billing' ? 'bg-blue-200' : 'bg-blue-100'}`}
            >
              💰
            </div>
            <div>
              <h3
                className={`font-bold text-base transition-colors ${activeWorkflow === 'billing' ? 'text-blue-900' : 'text-blue-800'}`}
              >
                Rent Collection
              </h3>
              <p
                className={`text-sm mt-1 transition-colors opacity-75 ${activeWorkflow === 'billing' ? 'text-blue-700' : 'text-blue-600'}`}
              >
                Billing, payments, and collections
              </p>
            </div>
          </div>
        </button>

        {/* Maintenance & Repairs */}
        <button
          onClick={() => handleWorkflowClick('maintenance')}
          className={`bg-gradient-to-br rounded-lg py-3 px-3 transition-all duration-200 hover:scale-102 cursor-pointer border-2 ${
            activeWorkflow === 'maintenance'
              ? 'from-orange-100 to-amber-100 border-orange-400 shadow-md ring-2 ring-orange-300 ring-opacity-50 scale-102'
              : 'from-orange-50 to-amber-50 border-orange-200 hover:shadow-md hover:from-orange-100 hover:to-amber-100'
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${activeWorkflow === 'maintenance' ? 'bg-orange-200' : 'bg-orange-100'}`}
            >
              🔧
            </div>
            <div>
              <h3
                className={`font-bold text-base transition-colors ${activeWorkflow === 'maintenance' ? 'text-orange-900' : 'text-orange-800'}`}
              >
                Maintenance
              </h3>
              <p
                className={`text-sm mt-1 transition-colors opacity-75 ${activeWorkflow === 'maintenance' ? 'text-orange-700' : 'text-orange-600'}`}
              >
                Repairs, requests, and scheduling
              </p>
            </div>
          </div>
        </button>

        {/* Properties Overview */}
        <button
          onClick={() => handleWorkflowClick('properties')}
          className={`bg-gradient-to-br rounded-lg py-3 px-3 transition-all duration-200 hover:scale-102 cursor-pointer border-2 ${
            showPropertiesOverview
              ? 'from-teal-100 to-cyan-100 border-teal-400 shadow-md ring-2 ring-teal-300 ring-opacity-50 scale-102'
              : 'from-teal-50 to-cyan-50 border-teal-200 hover:shadow-md hover:from-teal-100 hover:to-cyan-100'
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${showPropertiesOverview ? 'bg-teal-200' : 'bg-teal-100'}`}
            >
              🏘️
            </div>
            <div>
              <h3
                className={`font-bold text-base transition-colors ${showPropertiesOverview ? 'text-teal-900' : 'text-teal-800'}`}
              >
                Properties Overview
              </h3>
              <p
                className={`text-sm mt-1 transition-colors opacity-75 ${showPropertiesOverview ? 'text-teal-700' : 'text-teal-600'}`}
              >
                View all properties, stats, and analytics
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Property Selector for Tenant Management */}
      {showTenantManagement && userProperties.length > 1 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Property for Tenant Management:
          </label>
          <select
            value={selectedPropertyId || ''}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Properties</option>
            {userProperties.map((property) => (
              <option key={property.property_id} value={property.property_id}>
                {property.property_name} ({property.user_role})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-600">
            Select a specific property to manage tenants for that property only, or choose "All
            Properties" to see all tenants.
          </p>
        </div>
      )}

      {/* Inline Tenant Management */}
      <InlineTenantManagement
        isVisible={showTenantManagement}
        onClose={closeTenantManagement}
        scopedPropertyId={selectedPropertyId}
      />

      {/* Unit Addition Card */}
      {showUnitAddition && (
        <div className="mt-6">
          <UnitAdditionCard
            onUnitCreated={(unitId, propertyId) => {
              console.log(`Unit ${unitId} created for property ${propertyId}`)
              // Optionally close the unit addition card after successful creation
              // setShowUnitAddition(false)
            }}
            onClose={closeUnitAddition}
          />
        </div>
      )}

      {/* Inline Properties Overview */}
      <InlinePropertiesOverview
        isVisible={showPropertiesOverview}
        onClose={closePropertiesOverview}
      />
    </div>
  )
}
