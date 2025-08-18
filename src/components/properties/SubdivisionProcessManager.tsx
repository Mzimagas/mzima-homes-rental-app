'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import supabase from '../../lib/supabase-client'
import { Button, TextField, FormField } from '../ui'
import Modal from '../ui/Modal'

// Subdivision schema
const subdivisionSchema = z.object({
  subdivisionName: z.string().min(1, 'Subdivision name is required'),
  totalPlotsPlanned: z.number().int().positive('Must be a positive number'),
  subdivisionPlanReference: z.string().optional(),
  surveyorName: z.string().optional(),
  surveyorContact: z.string().optional(),
  approvalAuthority: z.string().optional(),
  surveyCost: z.number().min(0).optional(),
  approvalFees: z.number().min(0).optional(),
  infrastructureCost: z.number().min(0).optional(),
  expectedPlotValue: z.number().positive().optional(),
  targetCompletionDate: z.string().optional(),
  subdivisionNotes: z.string().optional(),
})

type SubdivisionFormValues = z.infer<typeof subdivisionSchema>

// Plot schema for individual plots
const plotSchema = z.object({
  plotNumber: z.string().min(1, 'Plot number is required'),
  plotSizeSqm: z.number().positive('Plot size must be positive'),
  estimatedValue: z.number().positive().optional(),
  plotNotes: z.string().optional(),
})

type PlotFormValues = z.infer<typeof plotSchema>

interface Property {
  id: string
  name: string
  physical_address: string
  property_type: string
  total_area_sqm?: number
  total_area_acres?: number
  lifecycle_status: string
  subdivision_status?: string
}

interface SubdivisionItem {
  id: string
  original_property_id: string
  subdivision_name: string
  total_plots_planned: number
  total_plots_created: number
  subdivision_status: string
  target_completion_date?: string
  created_at: string
  properties?: Property
}

interface SubdivisionPlot {
  id: string
  subdivision_id: string
  plot_number: string
  plot_size_sqm: number
  plot_size_acres: number
  plot_status: string
  estimated_value_kes?: number
  property_id?: string
}

interface SubdivisionProcessManagerProps {
  onPropertyCreated?: (propertyId: string) => void
}

export default function SubdivisionProcessManager({ onPropertyCreated }: SubdivisionProcessManagerProps) {
  const [properties, setProperties] = useState<Property[]>([])
  const [subdivisions, setSubdivisions] = useState<SubdivisionItem[]>([])
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [selectedSubdivision, setSelectedSubdivision] = useState<SubdivisionItem | null>(null)
  const [subdivisionPlots, setSubdivisionPlots] = useState<SubdivisionPlot[]>([])
  const [loading, setLoading] = useState(true)
  const [showSubdivisionForm, setShowSubdivisionForm] = useState(false)
  const [showPlotForm, setShowPlotForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'properties' | 'subdivisions' | 'plots'>('properties')
  const [tablesExist, setTablesExist] = useState(true)

  const subdivisionForm = useForm<SubdivisionFormValues>({
    resolver: zodResolver(subdivisionSchema)
  })

  const plotForm = useForm<PlotFormValues>({
    resolver: zodResolver(plotSchema)
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      await Promise.all([loadProperties(), loadSubdivisions()])
    } finally {
      setLoading(false)
    }
  }

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('subdivision_status', 'SUB_DIVISION_STARTED')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProperties(data || [])
    } catch (error) {
      console.error('Error loading properties:', error)
    }
  }

  const loadSubdivisions = async () => {
    try {
      const { data, error } = await supabase
        .from('property_subdivisions')
        .select(`
          *,
          properties:original_property_id (
            id,
            name,
            physical_address,
            property_type,
            total_area_sqm,
            total_area_acres,
            lifecycle_status
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error loading subdivisions:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })

        // Check if the error is due to missing table
        if (error.message.includes('property_subdivisions') && error.code === 'PGRST200') {
          console.log('📋 Subdivision tables not found - they need to be created')
          setTablesExist(false)
          setSubdivisions([])
          return
        }

        throw error
      }
      setSubdivisions(data || [])
      setTablesExist(true)
    } catch (error) {
      console.error('Error loading subdivisions:', error)
      // Set empty array to prevent UI issues
      setSubdivisions([])
    }
  }

  const loadSubdivisionPlots = async (subdivisionId: string) => {
    try {
      const { data, error } = await supabase
        .from('subdivision_plots')
        .select('*')
        .eq('subdivision_id', subdivisionId)
        .order('plot_number')

      if (error) {
        console.error('Supabase error loading subdivision plots:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }
      setSubdivisionPlots(data || [])
    } catch (error) {
      console.error('Error loading plots:', error)
      // Set empty array to prevent UI issues
      setSubdivisionPlots([])
    }
  }

  const startSubdivision = async (property: Property) => {
    try {
      // Mark property as subdivided
      const { error: updateError } = await supabase
        .from('properties')
        .update({
          lifecycle_status: 'SUBDIVIDED',
          subdivision_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', property.id)

      if (updateError) throw updateError

      setSelectedProperty(property)
      subdivisionForm.reset({
        subdivisionName: `${property.name} Subdivision`,
        totalPlotsPlanned: 10,
      })
      setShowSubdivisionForm(true)
    } catch (error) {
      console.error('Error starting subdivision:', error)
      alert('Failed to start subdivision process')
    }
  }

  const onSubdivisionSubmit = async (values: SubdivisionFormValues) => {
    try {
      if (!selectedProperty) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to create subdivisions')
        return
      }

      const subdivisionData = {
        original_property_id: selectedProperty.id,
        subdivision_name: values.subdivisionName,
        total_plots_planned: values.totalPlotsPlanned,
        subdivision_plan_reference: values.subdivisionPlanReference || null,
        surveyor_name: values.surveyorName || null,
        surveyor_contact: values.surveyorContact || null,
        approval_authority: values.approvalAuthority || null,
        survey_cost_kes: values.surveyCost || null,
        approval_fees_kes: values.approvalFees || null,
        infrastructure_cost_kes: values.infrastructureCost || null,
        expected_plot_value_kes: values.expectedPlotValue || null,
        target_completion_date: values.targetCompletionDate || null,
        subdivision_notes: values.subdivisionNotes || null,
        created_by: user.id,
        assigned_to: user.id,
      }

      const { error } = await supabase
        .from('property_subdivisions')
        .insert([subdivisionData])

      if (error) throw error

      subdivisionForm.reset()
      setShowSubdivisionForm(false)
      setSelectedProperty(null)
      loadData()
      alert('Subdivision process started successfully!')
    } catch (error) {
      console.error('Error creating subdivision:', error)
      alert('Failed to create subdivision')
    }
  }

  const onPlotSubmit = async (values: PlotFormValues) => {
    try {
      if (!selectedSubdivision) return

      const plotData = {
        subdivision_id: selectedSubdivision.id,
        plot_number: values.plotNumber,
        plot_size_sqm: values.plotSizeSqm,
        estimated_value_kes: values.estimatedValue || null,
        plot_notes: values.plotNotes || null,
      }

      const { error } = await supabase
        .from('subdivision_plots')
        .insert([plotData])

      if (error) throw error

      // Update subdivision plots created count
      const { error: updateError } = await supabase
        .from('property_subdivisions')
        .update({
          total_plots_created: selectedSubdivision.total_plots_created + 1
        })
        .eq('id', selectedSubdivision.id)

      if (updateError) throw updateError

      plotForm.reset()
      setShowPlotForm(false)
      loadSubdivisions()
      loadSubdivisionPlots(selectedSubdivision.id)
    } catch (error) {
      console.error('Error creating plot:', error)
      alert('Failed to create plot')
    }
  }

  const createPropertyFromPlot = async (plot: SubdivisionPlot) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to create properties')
        return
      }

      const subdivision = subdivisions.find(s => s.id === plot.subdivision_id)
      if (!subdivision) return

      // Create property from plot
      const { data: propertyId, error: createError } = await supabase.rpc('create_property_with_owner', {
        property_name: `${subdivision.subdivision_name} - Plot ${plot.plot_number}`,
        property_address: `Plot ${plot.plot_number}, ${subdivision.properties?.physical_address || 'Subdivision Address'}`,
        property_type: subdivision.properties?.property_type || 'RESIDENTIAL_LAND',
        owner_user_id: user.id
      })

      if (createError) throw createError

      // Update property with plot details and lifecycle tracking
      const { error: updateError } = await supabase
        .from('properties')
        .update({
          property_source: 'SUBDIVISION_PROCESS',
          source_reference_id: subdivision.id,
          parent_property_id: subdivision.original_property_id,
          lifecycle_status: 'ACTIVE',
          subdivision_date: new Date().toISOString().split('T')[0],
          total_area_sqm: plot.plot_size_sqm,
          total_area_acres: plot.plot_size_acres,
          sale_price_kes: plot.estimated_value_kes,
          acquisition_notes: `Created from subdivision of ${subdivision.properties?.name}. Plot ${plot.plot_number} of ${subdivision.subdivision_name}.`
        })
        .eq('id', propertyId)

      if (updateError) throw updateError

      // Update plot status and link to property
      const { error: plotError } = await supabase
        .from('subdivision_plots')
        .update({
          plot_status: 'PROPERTY_CREATED',
          property_id: propertyId
        })
        .eq('id', plot.id)

      if (plotError) throw plotError

      alert('Property created successfully from plot!')
      loadSubdivisionPlots(plot.subdivision_id)
      onPropertyCreated?.(propertyId)
    } catch (error) {
      console.error('Error creating property from plot:', error)
      alert('Failed to create property from plot')
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'PLANNING': 'bg-gray-100 text-gray-800',
      'SURVEY_ORDERED': 'bg-yellow-100 text-yellow-800',
      'SURVEY_COMPLETED': 'bg-blue-100 text-blue-800',
      'APPROVAL_PENDING': 'bg-purple-100 text-purple-800',
      'APPROVED': 'bg-green-100 text-green-800',
      'PLOTS_CREATED': 'bg-indigo-100 text-indigo-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'PLANNED': 'bg-gray-100 text-gray-800',
      'SURVEYED': 'bg-blue-100 text-blue-800',
      'TITLED': 'bg-purple-100 text-purple-800',
      'PROPERTY_CREATED': 'bg-green-100 text-green-800',
      'SOLD': 'bg-green-100 text-green-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Subdivision Process</h2>
          <p className="text-gray-600">Manage property subdivisions and create individual plot properties</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'properties', label: 'Subdivision in Progress', icon: '🏗️' },
          { id: 'subdivisions', label: 'Active Subdivisions', icon: '📋' },
          { id: 'plots', label: 'Subdivision Plots', icon: '📐' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      ) : !tablesExist ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="text-2xl">⚠️</div>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-yellow-800">Subdivision Tables Not Found</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>The subdivision management tables haven't been created yet. To use subdivision features:</p>
                <ol className="mt-2 list-decimal list-inside space-y-1">
                  <li>Go to your Supabase dashboard</li>
                  <li>Navigate to the SQL Editor</li>
                  <li>Run the subdivision table creation script</li>
                  <li>Refresh this page</li>
                </ol>
                <p className="mt-3 text-xs">
                  Contact your system administrator if you need help setting up the subdivision tables.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Properties Tab */}
          {activeTab === 'properties' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Properties with Subdivision in Progress</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Showing properties where subdivision status is "Sub-Division Started"
                </p>
              </div>
              {properties.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <div className="text-4xl mb-4">🏗️</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Properties with Subdivision in Progress</h3>
                  <p className="text-gray-600 mb-4">
                    Properties will appear here when their subdivision status is set to "Sub-Division Started" in the Properties tab.
                  </p>
                  <p className="text-sm text-gray-500">
                    To start subdivision on a property, go to Properties → change subdivision status to "Sub-Division Started" → Save Changes
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {properties.map((property) => (
                    <div key={property.id} className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">{property.name}</h4>
                          <p className="text-gray-600">{property.physical_address}</p>
                          <p className="text-sm text-gray-500">
                            Type: {property.property_type.replace('_', ' ')}
                            {property.total_area_acres && ` • ${property.total_area_acres} acres`}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800`}>
                            Sub-Division Started
                          </span>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => startSubdivision(property)}
                          >
                            Create Subdivision Plan
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Subdivisions Tab */}
          {activeTab === 'subdivisions' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Active Subdivisions</h3>
              {subdivisions.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <div className="text-4xl mb-4">🏗️</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Subdivisions</h3>
                  <p className="text-gray-600">Start subdividing properties to see them here.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {subdivisions.map((subdivision) => (
                    <div key={subdivision.id} className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{subdivision.subdivision_name}</h4>
                          <p className="text-gray-600">Original: {subdivision.properties?.name}</p>
                          <p className="text-sm text-gray-500">
                            {subdivision.total_plots_created} of {subdivision.total_plots_planned} plots created
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(subdivision.subdivision_status)}`}>
                          {subdivision.subdivision_status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2 mr-4">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(subdivision.total_plots_created / subdivision.total_plots_planned) * 100}%` }}
                          ></div>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedSubdivision(subdivision)
                            loadSubdivisionPlots(subdivision.id)
                            setActiveTab('plots')
                          }}
                        >
                          View Plots
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Plots Tab */}
          {activeTab === 'plots' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedSubdivision ? `${selectedSubdivision.subdivision_name} - Plots` : 'Subdivision Plots'}
                </h3>
                {selectedSubdivision && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      plotForm.reset()
                      setShowPlotForm(true)
                    }}
                  >
                    Add Plot
                  </Button>
                )}
              </div>

              {!selectedSubdivision ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <div className="text-4xl mb-4">📐</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Subdivision</h3>
                  <p className="text-gray-600">Choose a subdivision from the Active Subdivisions tab to view its plots.</p>
                </div>
              ) : subdivisionPlots.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <div className="text-4xl mb-4">📐</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Plots Created</h3>
                  <p className="text-gray-600 mb-4">Start creating plots for this subdivision.</p>
                  <Button
                    variant="primary"
                    onClick={() => {
                      plotForm.reset()
                      setShowPlotForm(true)
                    }}
                  >
                    Create First Plot
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {subdivisionPlots.map((plot) => (
                    <div key={plot.id} className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">Plot {plot.plot_number}</h4>
                          <p className="text-gray-600">
                            {plot.plot_size_sqm.toLocaleString()} sqm ({plot.plot_size_acres.toFixed(4)} acres)
                          </p>
                          {plot.estimated_value_kes && (
                            <p className="text-sm text-gray-500">
                              Estimated Value: KES {plot.estimated_value_kes.toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(plot.plot_status)}`}>
                            {plot.plot_status.replace('_', ' ')}
                          </span>
                          {plot.plot_status === 'PLANNED' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => createPropertyFromPlot(plot)}
                            >
                              Create Property
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Subdivision Form Modal */}
      <Modal
        isOpen={showSubdivisionForm}
        onClose={() => {
          setShowSubdivisionForm(false)
          setSelectedProperty(null)
          subdivisionForm.reset()
        }}
        title="Start Subdivision Process"
        size="large"
      >
        <form onSubmit={subdivisionForm.handleSubmit(onSubdivisionSubmit)} className="space-y-4">
          <FormField name="subdivisionName" label="Subdivision Name" error={subdivisionForm.formState.errors.subdivisionName?.message}>
            {({ id }) => (
              <TextField
                id={id}
                {...subdivisionForm.register('subdivisionName')}
                placeholder="e.g., Sunset Gardens Phase 1"
              />
            )}
          </FormField>

          <FormField name="totalPlotsPlanned" label="Total Plots Planned" error={subdivisionForm.formState.errors.totalPlotsPlanned?.message}>
            {({ id }) => (
              <TextField
                id={id}
                {...subdivisionForm.register('totalPlotsPlanned', { valueAsNumber: true })}
                type="number"
                min="1"
                placeholder="e.g., 20"
              />
            )}
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField name="surveyorName" label="Surveyor Name">
              {({ id }) => (
                <TextField
                  id={id}
                  {...subdivisionForm.register('surveyorName')}
                  placeholder="e.g., ABC Surveyors Ltd"
                />
              )}
            </FormField>

            <FormField name="surveyorContact" label="Surveyor Contact">
              {({ id }) => (
                <TextField
                  id={id}
                  {...subdivisionForm.register('surveyorContact')}
                  placeholder="e.g., +254 700 000 000"
                />
              )}
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField name="surveyCost" label="Survey Cost (KES)">
              {({ id }) => (
                <TextField
                  id={id}
                  {...subdivisionForm.register('surveyCost', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  placeholder="e.g., 500000"
                />
              )}
            </FormField>

            <FormField name="expectedPlotValue" label="Expected Plot Value (KES)">
              {({ id }) => (
                <TextField
                  id={id}
                  {...subdivisionForm.register('expectedPlotValue', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  placeholder="e.g., 2000000"
                />
              )}
            </FormField>
          </div>

          <FormField name="targetCompletionDate" label="Target Completion Date">
            {({ id }) => (
              <TextField
                id={id}
                {...subdivisionForm.register('targetCompletionDate')}
                type="date"
              />
            )}
          </FormField>

          <FormField name="subdivisionNotes" label="Subdivision Notes">
            {({ id }) => (
              <textarea
                id={id}
                {...subdivisionForm.register('subdivisionNotes')}
                rows={3}
                className="form-textarea"
                placeholder="Additional notes about this subdivision..."
              />
            )}
          </FormField>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowSubdivisionForm(false)
                setSelectedProperty(null)
                subdivisionForm.reset()
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={subdivisionForm.formState.isSubmitting}
            >
              {subdivisionForm.formState.isSubmitting ? 'Creating...' : 'Start Subdivision'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Plot Form Modal */}
      <Modal
        isOpen={showPlotForm}
        onClose={() => {
          setShowPlotForm(false)
          plotForm.reset()
        }}
        title="Add Plot"
      >
        <form onSubmit={plotForm.handleSubmit(onPlotSubmit)} className="space-y-4">
          <FormField name="plotNumber" label="Plot Number" error={plotForm.formState.errors.plotNumber?.message}>
            {({ id }) => (
              <TextField
                id={id}
                {...plotForm.register('plotNumber')}
                placeholder="e.g., 001, A1, etc."
              />
            )}
          </FormField>

          <FormField name="plotSizeSqm" label="Plot Size (Square Meters)" error={plotForm.formState.errors.plotSizeSqm?.message}>
            {({ id }) => (
              <TextField
                id={id}
                {...plotForm.register('plotSizeSqm', { valueAsNumber: true })}
                type="number"
                step="0.01"
                placeholder="e.g., 2000"
              />
            )}
          </FormField>

          <FormField name="estimatedValue" label="Estimated Value (KES)" error={plotForm.formState.errors.estimatedValue?.message}>
            {({ id }) => (
              <TextField
                id={id}
                {...plotForm.register('estimatedValue', { valueAsNumber: true })}
                type="number"
                step="0.01"
                placeholder="e.g., 2000000"
              />
            )}
          </FormField>

          <FormField name="plotNotes" label="Plot Notes">
            {({ id }) => (
              <textarea
                id={id}
                {...plotForm.register('plotNotes')}
                rows={2}
                className="form-textarea"
                placeholder="Additional notes about this plot..."
              />
            )}
          </FormField>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowPlotForm(false)
                plotForm.reset()
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={plotForm.formState.isSubmitting}
            >
              {plotForm.formState.isSubmitting ? 'Adding...' : 'Add Plot'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
