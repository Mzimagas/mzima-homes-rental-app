'use client'

import React, { useState, useEffect } from 'react'
import {
  getPropertiesForPermissionManagement,
  getPurchasePipelineProperties,
  getSubdivisionProperties,
  getHandoverProperties,
  Property,
} from '../../services/propertyService'

export default function PropertyLifecycleTest() {
  const [allProperties, setAllProperties] = useState<Property[]>([])
  const [pipelineProperties, setPipelineProperties] = useState<Property[]>([])
  const [subdivisionProperties, setSubdivisionProperties] = useState<Property[]>([])
  const [handoverProperties, setHandoverProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true)
      try {
        // Use Promise.allSettled for better error isolation
        const results = await Promise.allSettled([
          getPropertiesForPermissionManagement(),
          getPurchasePipelineProperties(),
          getSubdivisionProperties(),
          getHandoverProperties(),
        ])

        // Extract successful results and handle failures gracefully
        const [allResult, pipelineResult, subdivisionResult, handoverResult] = results

        setAllProperties(allResult.status === 'fulfilled' ? allResult.value : [])
        setPipelineProperties(pipelineResult.status === 'fulfilled' ? pipelineResult.value : [])
        setSubdivisionProperties(
          subdivisionResult.status === 'fulfilled' ? subdivisionResult.value : []
        )
        setHandoverProperties(handoverResult.status === 'fulfilled' ? handoverResult.value : [])

        // Log any failures for debugging
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            const apiNames = ['Properties', 'Pipeline', 'Subdivision', 'Handover']
                      }
        })
      } catch (error) {
              } finally {
        setLoading(false)
      }
    }

    loadAllData()
  }, [])

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Property Lifecycle Filter Test</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* All Properties */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">🌐 All Properties</h4>
          <p className="text-2xl font-bold text-blue-700">{allProperties.length}</p>
          <p className="text-sm text-blue-600">Total accessible</p>
        </div>

        {/* Purchase Pipeline */}
        <div className="bg-orange-50 p-4 rounded-lg">
          <h4 className="font-medium text-orange-900 mb-2">🏗️ Purchase Pipeline</h4>
          <p className="text-2xl font-bold text-orange-700">{pipelineProperties.length}</p>
          <p className="text-sm text-orange-600">In pipeline</p>
        </div>

        {/* Subdivision */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-medium text-green-900 mb-2">📐 Subdivision</h4>
          <p className="text-2xl font-bold text-green-700">{subdivisionProperties.length}</p>
          <p className="text-sm text-green-600">In subdivision</p>
        </div>

        {/* Handover */}
        <div className="bg-purple-50 p-4 rounded-lg">
          <h4 className="font-medium text-purple-900 mb-2">🤝 Handover</h4>
          <p className="text-2xl font-bold text-purple-700">{handoverProperties.length}</p>
          <p className="text-sm text-purple-600">In handover</p>
        </div>
      </div>

      {/* Sample Properties */}
      <div className="mt-6">
        <h4 className="font-medium mb-3">Sample Properties by Lifecycle Stage</h4>

        <div className="space-y-4">
          {/* Purchase Pipeline Sample */}
          {pipelineProperties.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-orange-700 mb-2">
                🏗️ Purchase Pipeline Properties:
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {pipelineProperties.slice(0, 4).map((property) => (
                  <div key={property.id} className="bg-orange-50 p-2 rounded text-sm">
                    <span className="font-medium">{property.name}</span>
                    {property.lifecycle_status && (
                      <span className="ml-2 px-2 py-1 bg-orange-200 text-orange-800 rounded text-xs">
                        {property.lifecycle_status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subdivision Sample */}
          {subdivisionProperties.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-green-700 mb-2">
                📐 Subdivision Properties:
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {subdivisionProperties.slice(0, 4).map((property) => (
                  <div key={property.id} className="bg-green-50 p-2 rounded text-sm">
                    <span className="font-medium">{property.name}</span>
                    {property.subdivision_status && (
                      <span className="ml-2 px-2 py-1 bg-green-200 text-green-800 rounded text-xs">
                        {property.subdivision_status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Handover Sample */}
          {handoverProperties.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-purple-700 mb-2">🤝 Handover Properties:</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {handoverProperties.slice(0, 4).map((property) => (
                  <div key={property.id} className="bg-purple-50 p-2 rounded text-sm">
                    <span className="font-medium">{property.name}</span>
                    {property.handover_status && (
                      <span className="ml-2 px-2 py-1 bg-purple-200 text-purple-800 rounded text-xs">
                        {property.handover_status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Debug Information */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium mb-2">Debug Information</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>Total Properties: {allProperties.length}</p>
          <p>Purchase Pipeline: {pipelineProperties.length}</p>
          <p>Subdivision: {subdivisionProperties.length}</p>
          <p>Handover: {handoverProperties.length}</p>
          <p>
            Coverage:{' '}
            {allProperties.length > 0
              ? Math.round(
                  ((pipelineProperties.length +
                    subdivisionProperties.length +
                    handoverProperties.length) /
                    allProperties.length) *
                    100
                )
              : 0}
            % of properties have lifecycle status
          </p>
        </div>
      </div>
    </div>
  )
}
