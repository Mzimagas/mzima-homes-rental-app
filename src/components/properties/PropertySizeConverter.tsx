'use client'

import { useState, useEffect } from 'react'
import supabase from '../../lib/supabase-client'
import { useAuth } from '../../lib/auth-context'

interface PropertyWithSize {
  id: string
  name: string
  created_at: string
  physical_address: string
  current_size_acres?: number
  extracted_hectares?: number
  converted_acres?: number
}

interface PropertySizeConverterProps {
  onSuccess?: () => void
  onCancel?: () => void
  isOpen: boolean
}

export default function PropertySizeConverter({ onSuccess, onCancel, isOpen }: PropertySizeConverterProps) {
  const { user } = useAuth()
  const [properties, setProperties] = useState<PropertyWithSize[]>([])
  const [loading, setLoading] = useState(false)
  const [converting, setConverting] = useState(false)
  const [selectedForConversion, setSelectedForConversion] = useState<Set<string>>(new Set())
  const [conversionProgress, setConversionProgress] = useState({ current: 0, total: 0 })
  const [conversionResults, setConversionResults] = useState<{ success: number; failed: number; errors: string[] }>({
    success: 0,
    failed: 0,
    errors: []
  })

  // Conversion factor: 1 hectare = 2.47105 acres
  const HECTARES_TO_ACRES = 2.47105

  const extractHectaresFromName = (propertyName: string): number | null => {
    // Look for patterns like (0.046Ha), (0.572Ha), (1.6Ha), etc.
    const hectareMatch = propertyName.match(/\((\d+\.?\d*)\s*Ha\)/i)
    if (hectareMatch) {
      return parseFloat(hectareMatch[1])
    }
    return null
  }

  const convertHectaresToAcres = (hectares: number): number => {
    return Math.round(hectares * HECTARES_TO_ACRES * 1000) / 1000 // Round to 3 decimal places
  }

  const findPropertiesWithHectares = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Get recent properties (last 24 hours) that likely came from bulk import
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      console.log('Fetching properties created after:', yesterday.toISOString())

      // Get properties with total_area_acres column (from new migration)
      const { data: properties, error } = await supabase
        .from('properties')
        .select('id, name, created_at, physical_address, total_area_acres')
        .is('disabled_at', null) // Only active properties
        .gte('created_at', yesterday.toISOString()) // Recent properties
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching properties:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        return
      }

      console.log(`Found ${properties?.length || 0} recent properties`)

      // Process properties to extract hectare values and calculate acre conversions
      const processedProperties: PropertyWithSize[] = (properties || []).map(property => {
        const extractedHectares = extractHectaresFromName(property.name)
        const convertedAcres = extractedHectares ? convertHectaresToAcres(extractedHectares) : null

        return {
          id: property.id,
          name: property.name,
          created_at: property.created_at,
          physical_address: property.physical_address || '',
          current_size_acres: (property as any).total_area_acres || null,
          extracted_hectares: extractedHectares,
          converted_acres: convertedAcres
        }
      }).filter(property => property.extracted_hectares !== null) // Only show properties with extractable hectare values

      setProperties(processedProperties)
    } catch (err) {
      console.error('Error finding properties with hectares:', err)
    } finally {
      setLoading(false)
    }
  }

  const convertPropertySizes = async () => {
    if (selectedForConversion.size === 0) return

    setConverting(true)
    setConversionProgress({ current: 0, total: selectedForConversion.size })
    setConversionResults({ success: 0, failed: 0, errors: [] })
    console.log(`Starting size conversion for ${selectedForConversion.size} properties...`)
    
    try {
      let successCount = 0
      let failedCount = 0
      const errors: string[] = []
      const propertyIds = Array.from(selectedForConversion)

      for (let i = 0; i < propertyIds.length; i++) {
        const propertyId = propertyIds[i]
        const property = properties.find(p => p.id === propertyId)
        
        if (!property || !property.converted_acres) {
          failedCount++
          errors.push(`Property ${propertyId}: No converted acres value available`)
          continue
        }

        setConversionProgress({ current: i + 1, total: propertyIds.length })
        console.log(`Converting property ${i + 1}/${propertyIds.length}: ${property.name} (${property.extracted_hectares}Ha → ${property.converted_acres} acres)`)
        
        try {
          // Update the total_area_acres field in the database
          const { error: updateError } = await supabase
            .from('properties')
            .update({
              total_area_acres: property.converted_acres
            })
            .eq('id', propertyId)

          if (updateError) {
            failedCount++
            const errorMsg = `Property ${property.name}: ${updateError.message}`
            errors.push(errorMsg)
            console.error(`✗ Failed to update property ${property.name}:`, updateError.message)
          } else {
            successCount++
            console.log(`✓ Successfully updated ${property.name}: ${property.extracted_hectares}Ha → ${property.converted_acres} acres`)
          }
        } catch (err) {
          failedCount++
          const errorMsg = `Property ${property.name}: ${err instanceof Error ? err.message : 'Unknown error'}`
          errors.push(errorMsg)
          console.error(`✗ Exception updating property ${property.name}:`, err)
        }

        // Add a small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      console.log(`Size conversion completed: ${successCount} successful, ${failedCount} failed`)
      setConversionResults({ success: successCount, failed: failedCount, errors })
      
      // Refresh the properties list
      await findPropertiesWithHectares()
      setSelectedForConversion(new Set())
      
      if (successCount > 0 && onSuccess) {
        onSuccess()
      }
    } finally {
      setConverting(false)
      setConversionProgress({ current: 0, total: 0 })
    }
  }

  const toggleSelection = (propertyId: string) => {
    const newSelection = new Set(selectedForConversion)
    if (newSelection.has(propertyId)) {
      newSelection.delete(propertyId)
    } else {
      newSelection.add(propertyId)
    }
    setSelectedForConversion(newSelection)
  }

  const selectAllProperties = () => {
    const toSelect = new Set<string>()
    properties.forEach(prop => {
      // Only select properties that don't already have total_area_acres set or have different values
      if (!prop.current_size_acres || Math.abs(prop.current_size_acres - (prop.converted_acres || 0)) > 0.001) {
        toSelect.add(prop.id)
      }
    })
    setSelectedForConversion(toSelect)
  }

  useEffect(() => {
    if (isOpen && user) {
      findPropertiesWithHectares()
    }
  }, [isOpen, user])

  if (!isOpen) return null

  if (!user) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Authentication Required</h3>
            <p className="text-sm text-gray-600 mb-4">Please log in to manage properties.</p>
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Property Size Converter (Hectares → Acres)
          </h3>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="text-sm text-gray-600">Scanning for properties with hectare specifications...</div>
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-sm text-gray-600">No recent properties with hectare specifications found!</div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Found {properties.length} recent properties with hectare specifications that can be converted to acres.
                </p>
                <button
                  onClick={selectAllProperties}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Select All Needing Conversion
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Conversion Information
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>This tool extracts hectare values from property names and converts them to acres using the factor: 1 hectare = 2.47105 acres. Results are stored in the "Total Area (Acres)" field.</p>
                    </div>
                  </div>
                </div>
              </div>

              {converting && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex justify-between text-sm text-green-700 mb-2">
                    <span>Converting property sizes...</span>
                    <span>{conversionProgress.current} / {conversionProgress.total}</span>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${conversionProgress.total > 0 ? (conversionProgress.current / conversionProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              {conversionResults.success > 0 || conversionResults.failed > 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-sm">
                    <div className="text-green-600">✓ Successfully converted: {conversionResults.success} properties</div>
                    {conversionResults.failed > 0 && (
                      <div className="text-red-600">✗ Failed: {conversionResults.failed} properties</div>
                    )}
                  </div>
                  {conversionResults.errors.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer">View errors</summary>
                      <div className="mt-1 text-xs text-red-600 space-y-1">
                        {conversionResults.errors.map((error, i) => (
                          <div key={i}>{error}</div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              ) : selectedForConversion.size > 0 && !converting ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700 mb-2">
                    📏 You have selected {selectedForConversion.size} properties for size conversion.
                  </p>
                  <p className="text-xs text-blue-600">
                    This will extract hectare values from property names and populate the "Total Area (Acres)" field.
                  </p>
                </div>
              ) : null}

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {properties.map((property) => (
                  <div key={property.id} className="flex items-center justify-between bg-white p-3 rounded border">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedForConversion.has(property.id)}
                          onChange={() => toggleSelection(property.id)}
                          className="rounded"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {property.name}
                            {property.current_size_acres && (
                              <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                                HAS AREA: {property.current_size_acres} acres
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            Created: {new Date(property.created_at).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            Address: {property.physical_address}
                          </div>
                          <div className="text-xs text-blue-600 font-medium">
                            Conversion: {property.extracted_hectares}Ha → {property.converted_acres} acres
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              disabled={converting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Close
            </button>
            {properties.length > 0 && (
              <button
                type="button"
                onClick={convertPropertySizes}
                disabled={converting || selectedForConversion.size === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {converting ? `Converting ${selectedForConversion.size} properties...` : `Convert Selected (${selectedForConversion.size})`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
