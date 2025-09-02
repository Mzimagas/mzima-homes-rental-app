'use client'

import { useState, useEffect } from 'react'
import { Button } from '../../ui'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import supabase from '../../../lib/supabase-client'
import PropertyCard, { PropertyCardHeader, PropertyCardContent, PropertyCardFooter } from './PropertyCard'

// Types
interface Property {
  id: string
  name: string
  [key: string]: any
}

interface Subdivision {
  id: string
  subdivision_name: string
  total_plots_planned: number
  total_plots_created: number
  original_property_id: string
  [key: string]: any
}

interface SubdivisionPlot {
  id: string
  subdivision_id: string
  plot_number: number
  plot_size_sqm?: number
  plot_size_acres?: number
  estimated_value_kes?: number
  plot_notes?: string
  plot_status: 'PLANNED' | 'PROPERTY_CREATED'
  created_property_id?: string
  [key: string]: any
}

interface InlineSubdivisionPlotsProps {
  property: Property
  subdivision: Subdivision | null
  isExpanded: boolean
  onToggle: () => void
  onPlotUpdate?: () => void
  onPropertyCreated?: (propertyId: string) => void
  canEdit: boolean
}

// Plot form validation schema
const plotFormSchema = z.object({
  plotNumber: z.number().min(1, 'Plot number must be at least 1'),
  plotSizeHa: z.number().min(0.001, 'Plot size must be greater than 0'),
  estimatedValue: z.number().optional(),
  plotNotes: z.string().optional(),
})

type PlotFormValues = z.infer<typeof plotFormSchema>

export default function InlineSubdivisionPlots({
  property,
  subdivision,
  isExpanded,
  onToggle,
  onPlotUpdate,
  onPropertyCreated,
  canEdit
}: InlineSubdivisionPlotsProps) {
  const [plots, setPlots] = useState<SubdivisionPlot[]>([])
  const [loading, setLoading] = useState(false)
  const [showPlotForm, setShowPlotForm] = useState(false)
  const [editingPlot, setEditingPlot] = useState<SubdivisionPlot | null>(null)
  const [plotLimitReached, setPlotLimitReached] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const plotForm = useForm<PlotFormValues>({
    resolver: zodResolver(plotFormSchema),
    defaultValues: {
      plotNumber: 1,
      plotSizeHa: 0.045,
      estimatedValue: undefined,
      plotNotes: '',
    },
  })

  // Load plots when expanded and subdivision exists
  useEffect(() => {
    if (isExpanded && subdivision) {
      loadPlots()
    }
  }, [isExpanded, subdivision])

  const loadPlots = async () => {
    if (!subdivision) return

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('subdivision_plots')
        .select('*')
        .eq('subdivision_id', subdivision.id)
        .order('plot_number')

      if (error) throw error

      setPlots(data || [])

      // Check plot limit
      const limitReached = (data?.length || 0) >= subdivision.total_plots_planned
      setPlotLimitReached(limitReached)
    } catch (error) {
      console.error('Error loading plots:', error)
      setPlots([])
      setPlotLimitReached(false)
    } finally {
      setLoading(false)
    }
  }

  const validatePlotCreation = (subdivisionId: string) => {
    if (!subdivision) {
      return { canCreate: false, message: 'No subdivision selected' }
    }

    if (plots.length >= subdivision.total_plots_planned) {
      return {
        canCreate: false,
        message: `Plot limit reached: ${plots.length}/${subdivision.total_plots_planned} plots created`,
      }
    }

    return { canCreate: true, message: '' }
  }

  const handlePlotSubmit = async (values: PlotFormValues) => {
    if (!subdivision) return

    try {
      if (editingPlot) {
        // Update existing plot
        const { error } = await supabase
          .from('subdivision_plots')
          .update({
            plot_number: values.plotNumber,
            plot_size_sqm: values.plotSizeHa * 10000, // Convert hectares to square meters
            plot_size_acres: values.plotSizeHa * 2.47105, // Convert hectares to acres
            estimated_value_kes: values.estimatedValue || null,
            plot_notes: values.plotNotes || null,
            updated_by: (await supabase.auth.getUser()).data.user?.id,
          })
          .eq('id', editingPlot.id)

        if (error) throw error
        alert('Plot updated successfully!')
      } else {
        // Create new plot
        const user = await supabase.auth.getUser()
        const plotData = {
          subdivision_id: subdivision.id,
          plot_number: values.plotNumber,
          plot_size_sqm: values.plotSizeHa * 10000, // Convert hectares to square meters
          plot_size_acres: values.plotSizeHa * 2.47105, // Convert hectares to acres
          estimated_value_kes: values.estimatedValue || null,
          plot_notes: values.plotNotes || null,
          created_by: user.data.user?.id,
          updated_by: user.data.user?.id,
        }

        const { error } = await supabase.from('subdivision_plots').insert([plotData])
        if (error) throw error

        // Update subdivision plots created count
        const { error: updateError } = await supabase
          .from('property_subdivisions')
          .update({
            total_plots_created: subdivision.total_plots_created + 1,
          })
          .eq('id', subdivision.id)

        if (updateError) {
          console.warn('Could not update subdivision plot count:', updateError)
        }
        alert('Plot created successfully!')
      }

      setShowPlotForm(false)
      setEditingPlot(null)
      plotForm.reset({
        plotNumber: 1,
        plotSizeHa: 0.045,
        estimatedValue: undefined,
        plotNotes: '',
      })
      loadPlots()
      onPlotUpdate?.()
    } catch (error) {
      console.error('Error saving plot:', error)
      alert('Failed to save plot')
    }
  }

  const startEditPlot = (plot: SubdivisionPlot) => {
    setEditingPlot(plot)
    plotForm.reset({
      plotNumber: plot.plot_number,
      plotSizeHa: plot.plot_size_sqm ? plot.plot_size_sqm / 10000 : 0.045, // Convert sqm to hectares
      estimatedValue: plot.estimated_value_kes || undefined,
      plotNotes: plot.plot_notes || '',
    })
    setShowPlotForm(true)
  }

  const createPropertyFromPlot = async (plot: SubdivisionPlot) => {
    if (!canEdit) {
      alert('You do not have permission to create properties from plots.')
      return
    }

    if (!subdivision) {
      alert('No subdivision found for this plot.')
      return
    }

    if (!confirm(`Create a new property from Plot ${plot.plot_number}? This will mark the plot as having a property created.`)) {
      return
    }

    try {
      const user = await supabase.auth.getUser()

      // Get the original property details for reference
      const { data: originalProperty, error: originalError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', subdivision.original_property_id)
        .single()

      if (originalError) throw originalError

      // Create new property from plot
      const newPropertyData = {
        name: `${originalProperty.name} - Plot ${plot.plot_number}`,
        description: `Plot ${plot.plot_number} from ${subdivision.subdivision_name}`,
        property_type: originalProperty.property_type || 'RESIDENTIAL',
        size_sqm: plot.plot_size_sqm,
        size_acres: plot.plot_size_acres,
        estimated_value_kes: plot.estimated_value_kes,
        location_description: originalProperty.location_description,
        county: originalProperty.county,
        sub_county: originalProperty.sub_county,
        ward: originalProperty.ward,
        latitude: originalProperty.latitude,
        longitude: originalProperty.longitude,
        status: 'AVAILABLE',
        created_by: user.data.user?.id,
      }

      const { data: newProperty, error: propertyError } = await supabase
        .from('properties')
        .insert([newPropertyData])
        .select()
        .single()

      if (propertyError) throw propertyError

      // Update the plot to mark it as having a property created
      const { error: plotUpdateError } = await supabase
        .from('subdivision_plots')
        .update({
          plot_status: 'PROPERTY_CREATED',
          created_property_id: newProperty.id,
          updated_by: user.data.user?.id,
        })
        .eq('id', plot.id)

      if (plotUpdateError) throw plotUpdateError

      // Create user access for the new property (inherit from original property)
      const { data: originalAccess, error: accessError } = await supabase
        .from('user_property_access')
        .select('*')
        .eq('property_id', subdivision.original_property_id)

      if (accessError) {
        console.warn('Could not fetch original property access:', accessError)
      } else if (originalAccess && originalAccess.length > 0) {
        // Create access records for the new property
        const newAccessRecords = originalAccess.map(access => ({
          user_id: access.user_id,
          property_id: newProperty.id,
          property_name: newProperty.name,
          role: access.role,
          status: access.status,
          permissions: access.permissions,
          is_owner: access.is_owner,
          can_edit_property: access.can_edit_property,
          can_manage_tenants: access.can_manage_tenants,
          can_manage_maintenance: access.can_manage_maintenance,
          can_create_data: access.can_create_data,
        }))

        const { error: newAccessError } = await supabase
          .from('user_property_access')
          .insert(newAccessRecords)

        if (newAccessError) {
          console.warn('Could not create access records for new property:', newAccessError)
        }
      }

      alert(`Property "${newProperty.name}" created successfully from Plot ${plot.plot_number}!`)
      loadPlots()
      onPlotUpdate?.()

      // Optionally call onPropertyCreated if provided
      if (onPropertyCreated) {
        onPropertyCreated(newProperty.id)
      }
    } catch (error) {
      console.error('Error creating property from plot:', error)
      alert('Failed to create property from plot. Please try again.')
    }
  }

  const deletePlot = async (plot: SubdivisionPlot) => {
    if (!canEdit) {
      alert('You do not have permission to delete plots.')
      return
    }

    if (!confirm('Are you sure you want to delete this plot? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('subdivision_plots')
        .delete()
        .eq('id', plot.id)

      if (error) throw error

      // Update subdivision plots created count
      if (subdivision) {
        const { error: updateError } = await supabase
          .from('property_subdivisions')
          .update({
            total_plots_created: Math.max(0, subdivision.total_plots_created - 1),
          })
          .eq('id', subdivision.id)

        if (updateError) console.error('Error updating subdivision count:', updateError)
      }

      alert('Plot deleted successfully!')
      loadPlots()
      onPlotUpdate?.()
    } catch (error) {
      console.error('Error deleting plot:', error)
      alert('Failed to delete plot')
    }
  }

  if (!subdivision) {
    return (
      <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-center py-4">
          <div className="text-2xl mb-2">📐</div>
          <p className="text-gray-600 text-sm">
            No subdivision plan found. Create a subdivision plan first to view plots.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4">
      {/* Expandable Content */}
      {isExpanded && (
        <div className="border border-gray-200 rounded-lg bg-white shadow-sm">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-lg">📐</span>
                <div>
                  <h4 className="font-medium text-gray-900">
                    {subdivision.subdivision_name} - Plots
                  </h4>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="text-sm text-gray-600">
                      Plots: {plots.length}/{subdivision.total_plots_planned}
                    </span>
                    {plotLimitReached && (
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                        Limit Reached
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {canEdit && (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={plotLimitReached}
                    onClick={() => {
                      const validation = validatePlotCreation(subdivision.id)
                      if (!validation.canCreate) {
                        alert(validation.message)
                        return
                      }
                      setEditingPlot(null)
                      plotForm.reset({
                        plotNumber: 1,
                        plotSizeHa: 0.045,
                        estimatedValue: undefined,
                        plotNotes: '',
                      })
                      setShowPlotForm(true)
                    }}
                  >
                    + Add Plot
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onToggle}
                >
                  ▲ Collapse
                </Button>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          {plots.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search plots by number, status, or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400">🔍</span>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading plots...</div>
              </div>
            ) : plots.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <div className="text-4xl mb-4">📐</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Plots Found</h3>
                <p className="text-gray-600 mb-4">
                  Create your first plot to start managing the subdivision.
                </p>
                {canEdit && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      setEditingPlot(null)
                      plotForm.reset({
                        plotNumber: 1,
                        plotSizeHa: 0.045,
                        estimatedValue: undefined,
                        plotNotes: '',
                      })
                      setShowPlotForm(true)
                    }}
                  >
                    Create First Plot
                  </Button>
                )}
              </div>
            ) : (
              (() => {
                // Filter plots based on search term
                const filteredPlots = plots.filter(plot => {
                  if (!searchTerm) return true
                  const searchLower = searchTerm.toLowerCase()
                  return (
                    plot.plot_number.toString().includes(searchLower) ||
                    plot.plot_status.toLowerCase().includes(searchLower) ||
                    (plot.plot_notes && plot.plot_notes.toLowerCase().includes(searchLower))
                  )
                })

                return filteredPlots.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <div className="text-4xl mb-4">🔍</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Plots Found</h3>
                    <p className="text-gray-600">
                      No plots match your search criteria. Try adjusting your search terms.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {filteredPlots.map((plot) => (
                  <div
                    key={plot.id}
                    className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="font-medium text-gray-900">
                            Plot {plot.plot_number}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              plot.plot_status === 'PROPERTY_CREATED'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {plot.plot_status === 'PROPERTY_CREATED' ? 'Property Created' : 'Planned'}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          {plot.plot_size_sqm && (
                            <span>{(plot.plot_size_sqm / 10000).toFixed(3)} Ha</span>
                          )}
                          {plot.estimated_value_kes && (
                            <span className="ml-3">
                              KES {plot.estimated_value_kes.toLocaleString()}
                            </span>
                          )}
                        </div>
                        {plot.plot_notes && (
                          <div className="mt-1 text-xs text-gray-500">
                            {plot.plot_notes}
                          </div>
                        )}
                      </div>
                      {canEdit && (
                        <div className="flex space-x-2">
                          {plot.plot_status === 'PLANNED' && (
                            <>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => startEditPlot(plot)}
                              >
                                ✏️ Edit
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => createPropertyFromPlot(plot)}
                              >
                                🏠 Create Property
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => deletePlot(plot)}
                                className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 hover:bg-red-50"
                              >
                                🗑️ Delete
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                    ))}
                  </div>
                )
              })()
            )}
          </div>
        </div>
      )}

      {/* Plot Form Modal */}
      {showPlotForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingPlot ? 'Edit Plot' : 'Add New Plot'}
            </h3>
            <form onSubmit={plotForm.handleSubmit(handlePlotSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plot Number
                </label>
                <input
                  type="number"
                  {...plotForm.register('plotNumber', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {plotForm.formState.errors.plotNumber && (
                  <p className="text-red-500 text-xs mt-1">
                    {plotForm.formState.errors.plotNumber.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plot Size (Ha)
                </label>
                <input
                  type="number"
                  step="0.001"
                  {...plotForm.register('plotSizeHa', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {plotForm.formState.errors.plotSizeHa && (
                  <p className="text-red-500 text-xs mt-1">
                    {plotForm.formState.errors.plotSizeHa.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Value (KES) - Optional
                </label>
                <input
                  type="number"
                  {...plotForm.register('estimatedValue', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes - Optional
                </label>
                <textarea
                  {...plotForm.register('plotNotes')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                >
                  {editingPlot ? 'Update Plot' : 'Create Plot'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowPlotForm(false)
                    setEditingPlot(null)
                    plotForm.reset({
                      plotNumber: 1,
                      plotSizeHa: 0.045,
                      estimatedValue: undefined,
                      plotNotes: '',
                    })
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
