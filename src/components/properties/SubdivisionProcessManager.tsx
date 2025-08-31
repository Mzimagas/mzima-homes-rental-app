'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import supabase from '../../lib/supabase-client'
import { Button, TextField, FormField } from '../ui'
import Modal from '../ui/Modal'

import ViewOnGoogleMapsButton from '../location/ViewOnGoogleMapsButton'
import PropertyCard, { PropertyCardHeader, PropertyCardContent, PropertyCardFooter } from './components/PropertyCard'
import PropertySearch from './components/PropertySearch'
import InlinePropertyView from './components/InlinePropertyView'
import SubdivisionPlanConfirmationModal from './SubdivisionPlanConfirmationModal'
import SubdivisionHistoryModal from './SubdivisionHistoryModal'
import { SubdivisionHistoryService } from '../../lib/services/subdivision-history'
import { usePropertyAccess } from '../../hooks/usePropertyAccess'

// Subdivision schema - Essential fields are required for proper change tracking
const subdivisionSchema = z.object({
  subdivisionName: z.string().min(1, 'Subdivision name is required'),
  totalPlotsPlanned: z.number().int().positive('Must be a positive number'),
  surveyorName: z.string().min(1, 'Surveyor name is required'),
  surveyorContact: z.string().min(1, 'Surveyor contact is required'),
  approvalAuthority: z.string().optional(), // Optional - not essential for tracking
  surveyCost: z.number().min(0, 'Survey cost must be 0 or positive'),
  approvalFees: z.number().min(0).optional(), // Optional - not essential for tracking
  expectedPlotValue: z.number().positive('Expected plot value must be positive'),
  targetCompletionDate: z.string().min(1, 'Target completion date is required'),
  subdivisionNotes: z.string().optional(), // Optional - not essential for tracking
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
  lat?: number | null
  lng?: number | null
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
  plot_size_sqm: number | null
  plot_size_acres: number | null
  plot_status: string
  estimated_value_kes?: number | null
  property_id?: string | null
  plot_notes?: string | null
}

interface SubdivisionProcessManagerProps {
  onPropertyCreated?: (propertyId: string) => void
  searchTerm?: string
  onSearchChange?: (searchTerm: string) => void
}

export default function SubdivisionProcessManager({
  onPropertyCreated,
  searchTerm = '',
  onSearchChange,
}: SubdivisionProcessManagerProps) {
  const [properties, setProperties] = useState<Property[]>([])
  const [subdivisions, setSubdivisions] = useState<SubdivisionItem[]>([])
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [selectedSubdivision, setSelectedSubdivision] = useState<SubdivisionItem | null>(null)
  const [subdivisionPlots, setSubdivisionPlots] = useState<SubdivisionPlot[]>([])
  const [loading, setLoading] = useState(true)
  const [showSubdivisionForm, setShowSubdivisionForm] = useState(false)
  const [showPlotForm, setShowPlotForm] = useState(false)
  const [editingPlot, setEditingPlot] = useState<SubdivisionPlot | null>(null)
  const [activeTab, setActiveTab] = useState<'properties' | 'plots'>('properties')
  const [tablesExist, setTablesExist] = useState(true)
  const [viewingPropertyId, setViewingPropertyId] = useState<string | null>(null)
  const [plotLimitReached, setPlotLimitReached] = useState(false)

  // New state for confirmation and history
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false)
  const [propertyToSubdivide, setPropertyToSubdivide] = useState<Property | null>(null)
  const [pendingUpdateData, setPendingUpdateData] = useState<any>(null)
  const [isCreatingSubdivision, setIsCreatingSubdivision] = useState(false)
  const [subdivisionHistory, setSubdivisionHistory] = useState<any[]>([])

  // Property access hook
  const { canEditProperty } = usePropertyAccess()

  // Filter subdivisions based on search term
  const filteredSubdivisions = useMemo(() => {
    if (!searchTerm.trim()) return subdivisions

    const lower = searchTerm.toLowerCase()
    return subdivisions.filter((subdivision) => {
      return (
        subdivision.subdivision_name.toLowerCase().includes(lower) ||
        (subdivision.properties?.name.toLowerCase().includes(lower) ?? false) ||
        (subdivision.properties?.physical_address?.toLowerCase().includes(lower) ?? false) ||
        (subdivision.properties?.property_type?.toLowerCase().includes(lower) ?? false)
      )
    })
  }, [subdivisions, searchTerm])

  // Filter properties based on search term
  const filteredProperties = useMemo(() => {
    if (!searchTerm.trim()) return properties

    const lower = searchTerm.toLowerCase()
    return properties.filter((property) => {
      return (
        property.name.toLowerCase().includes(lower) ||
        property.physical_address.toLowerCase().includes(lower) ||
        property.property_type.toLowerCase().includes(lower)
      )
    })
  }, [properties, searchTerm])

  const subdivisionForm = useForm<SubdivisionFormValues>({
    resolver: zodResolver(subdivisionSchema),
  })

  const plotForm = useForm<PlotFormValues>({
    resolver: zodResolver(plotSchema),
  })

  // Function to compare current subdivision data with new form values
  const getChanges = (currentSubdivision: SubdivisionItem, newValues: SubdivisionFormValues) => {
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = []

    const fieldMappings = {
      subdivisionName: { current: currentSubdivision.subdivision_name, label: 'Subdivision Name' },
      totalPlotsPlanned: {
        current: currentSubdivision.total_plots_planned,
        label: 'Total Plots Planned',
      },
      surveyorName: { current: currentSubdivision.surveyor_name, label: 'Surveyor Name' },
      surveyorContact: { current: currentSubdivision.surveyor_contact, label: 'Surveyor Contact' },
      approvalAuthority: {
        current: currentSubdivision.approval_authority,
        label: 'Approval Authority',
      },
      surveyCost: { current: currentSubdivision.survey_cost_kes, label: 'Survey Cost (KES)' },
      approvalFees: { current: currentSubdivision.approval_fees_kes, label: 'Approval Fees (KES)' },
      expectedPlotValue: {
        current: currentSubdivision.expected_plot_value_kes,
        label: 'Expected Plot Value (KES)',
      },
      targetCompletionDate: {
        current: currentSubdivision.target_completion_date,
        label: 'Target Completion Date',
      },
      subdivisionNotes: {
        current: currentSubdivision.subdivision_notes,
        label: 'Subdivision Notes',
      },
    }

    Object.entries(fieldMappings).forEach(([key, mapping]) => {
      const newValue = newValues[key as keyof SubdivisionFormValues]
      const currentValue = mapping.current

      // Normalize values for comparison
      const normalizedCurrent =
        currentValue === null || currentValue === undefined ? '' : String(currentValue)
      const normalizedNew = newValue === null || newValue === undefined ? '' : String(newValue)

      if (normalizedCurrent !== normalizedNew) {
        changes.push({
          field: mapping.label,
          oldValue: currentValue,
          newValue: newValue,
        })
      }
    })

    return changes
  }

  // Function to handle confirmed subdivision update
  const handleConfirmedUpdate = async () => {
    try {
      if (!pendingUpdateData || !selectedProperty) return

      const { values, existingSubdivision, user } = pendingUpdateData

      // Update existing subdivision
      const updateData = {
        subdivision_name: values.subdivisionName,
        total_plots_planned: values.totalPlotsPlanned,
        surveyor_name: values.surveyorName || null,
        surveyor_contact: values.surveyorContact || null,
        approval_authority: values.approvalAuthority || null,
        survey_cost_kes: values.surveyCost || null,
        approval_fees_kes: values.approvalFees || null,
        expected_plot_value_kes: values.expectedPlotValue || null,
        target_completion_date: values.targetCompletionDate || null,
        subdivision_notes: values.subdivisionNotes || null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('property_subdivisions')
        .update(updateData)
        .eq('id', existingSubdivision.id)

      if (error) throw error

      // Record subdivision history for modification (optional - don't fail if this fails)
      try {
        await SubdivisionHistoryService.recordPlanModification(
          selectedProperty.id,
          existingSubdivision.id,
          'Subdivision plan updated through property management interface',
          {
            previous_values: {
              subdivision_name: existingSubdivision.subdivision_name,
              total_plots_planned: existingSubdivision.total_plots_planned,
              surveyor_name: existingSubdivision.surveyor_name,
              surveyor_contact: existingSubdivision.surveyor_contact,
              approval_authority: existingSubdivision.approval_authority,
              survey_cost_kes: existingSubdivision.survey_cost_kes,
              approval_fees_kes: existingSubdivision.approval_fees_kes,
              expected_plot_value_kes: existingSubdivision.expected_plot_value_kes,
              target_completion_date: existingSubdivision.target_completion_date,
              subdivision_notes: existingSubdivision.subdivision_notes,
            },
            new_values: {
              subdivision_name: values.subdivisionName,
              total_plots_planned: values.totalPlotsPlanned,
              surveyor_name: values.surveyorName,
              surveyor_contact: values.surveyorContact,
              approval_authority: values.approvalAuthority,
              survey_cost_kes: values.surveyCost,
              approval_fees_kes: values.approvalFees,
              expected_plot_value_kes: values.expectedPlotValue,
              target_completion_date: values.targetCompletionDate,
              subdivision_notes: values.subdivisionNotes,
            },
            updated_fields: Object.keys(updateData),
          }
        )
      } catch (historyError) {
        console.warn('Could not record subdivision history (non-critical):', historyError)
        // Continue with the operation - history recording is optional
      }

      alert('Subdivision plan updated successfully!')
      await loadSubdivisions()
      setShowSubdivisionForm(false)
      setShowUpdateConfirmation(false)
      setPendingUpdateData(null)
      setSelectedProperty(null)
      subdivisionForm.reset()
    } catch (error) {
            alert('Failed to update subdivision plan. Please try again.')
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Check plot limit when selectedSubdivision or subdivisionPlots change
  useEffect(() => {
    if (selectedSubdivision) {
      checkPlotLimit(selectedSubdivision.id)
    }
  }, [selectedSubdivision, subdivisionPlots])

  const loadData = async () => {
    try {
      setLoading(true)
      // Use Promise.allSettled for better error isolation
      const results = await Promise.allSettled([loadProperties(), loadSubdivisions()])

      // Log any failures for debugging
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const operationNames = ['Properties', 'Subdivisions']
                  }
      })
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
          }
  }

  const loadSubdivisions = async () => {
    try {
      const { data, error } = await supabase
        .from('property_subdivisions')
        .select(
          `
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
        `
        )
        .order('created_at', { ascending: false })

      if (error) {
                // Check if the error is due to missing table
        if (error.message.includes('property_subdivisions') && error.code === 'PGRST200') {
                    setTablesExist(false)
          setSubdivisions([])
          return
        }

        throw error
      }
      setSubdivisions(data || [])
      setTablesExist(true)
    } catch (error) {
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
                throw error
      }
      setSubdivisionPlots(data || [])

      // Check plot limit after loading plots
      checkPlotLimit(subdivisionId, data || [])
    } catch (error) {
            // Set empty array to prevent UI issues
      setSubdivisionPlots([])
    }
  }

  const checkPlotLimit = (subdivisionId: string, currentPlots?: SubdivisionPlot[]) => {
    const subdivision = subdivisions.find((s) => s.id === subdivisionId)
    if (!subdivision) {
      setPlotLimitReached(false)
      return
    }

    const plotsToCheck = currentPlots || subdivisionPlots
    const currentPlotCount = plotsToCheck.length
    const maxPlotsAllowed = subdivision.total_plots_planned || 0

    setPlotLimitReached(currentPlotCount >= maxPlotsAllowed)
  }

  const validatePlotCreation = (
    subdivisionId: string
  ): { canCreate: boolean; message?: string } => {
    const subdivision = subdivisions.find((s) => s.id === subdivisionId)
    if (!subdivision) {
      return { canCreate: false, message: 'Subdivision not found' }
    }

    const currentPlotCount = subdivisionPlots.length
    const maxPlotsAllowed = subdivision.total_plots_planned || 0

    if (currentPlotCount >= maxPlotsAllowed) {
      return {
        canCreate: false,
        message: `Cannot create plot: Maximum of ${maxPlotsAllowed} plots allowed for this subdivision. Currently ${currentPlotCount} plots exist.`,
      }
    }

    return { canCreate: true }
  }

  const handleSubdivisionRequest = (property: Property) => {
    // Check if user has edit permissions
    if (!canEditProperty(property.id)) {
      alert('You do not have permission to create subdivision plans for this property.')
      return
    }

    // Check if subdivision already exists
    const existingSubdivision = subdivisions.find((s) => s.original_property_id === property.id)
    if (existingSubdivision) {
      alert('A subdivision plan already exists for this property. Use "View Plots" to manage it.')
      return
    }

    setPropertyToSubdivide(property)
    setShowConfirmationModal(true)
  }

  const handleConfirmSubdivision = async (reason: string) => {
    if (!propertyToSubdivide) return

    setIsCreatingSubdivision(true)
    try {
      // Mark property as subdivided
      const { error: updateError } = await supabase
        .from('properties')
        .update({
          lifecycle_status: 'SUBDIVIDED',
          subdivision_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', propertyToSubdivide.id)

      if (updateError) throw updateError

      setSelectedProperty(propertyToSubdivide)
      subdivisionForm.reset({
        subdivisionName: `${propertyToSubdivide.name} Subdivision`,
        totalPlotsPlanned: 10,
      })
      setShowSubdivisionForm(true)
      setShowConfirmationModal(false)
      setPropertyToSubdivide(null)
    } catch (error) {
            alert('Failed to start subdivision process')
    } finally {
      setIsCreatingSubdivision(false)
    }
  }

  const handleViewHistory = (property: Property) => {
    setSelectedProperty(property)
    setShowHistoryModal(true)
  }

  const checkSubdivisionExists = (propertyId: string): boolean => {
    return subdivisions.some((s) => s.original_property_id === propertyId)
  }

  const getSubdivisionForProperty = (propertyId: string): SubdivisionItem | null => {
    return subdivisions.find((s) => s.original_property_id === propertyId) || null
  }

  const handleEditSubdivisionPlan = (property: Property) => {
    const subdivision = getSubdivisionForProperty(property.id)
    if (!subdivision) {
      alert('No subdivision plan found for this property.')
      return
    }

    // Check if user has edit permissions
    if (!canEditProperty(property.id)) {
      alert('You do not have permission to edit subdivision plans for this property.')
      return
    }

    // Set up the form for editing
    setSelectedProperty(property)
    subdivisionForm.reset({
      subdivisionName: subdivision.subdivision_name,
      totalPlotsPlanned: subdivision.total_plots_planned,
      surveyorName: subdivision.surveyor_name || '',
      surveyorContact: subdivision.surveyor_contact || '',
      approvalAuthority: subdivision.approval_authority || '',
      surveyCost: subdivision.survey_cost_kes || undefined,
      approvalFees: subdivision.approval_fees_kes || undefined,
      expectedPlotValue: subdivision.expected_plot_value_kes || undefined,
      targetCompletionDate: subdivision.target_completion_date || '',
      subdivisionNotes: subdivision.subdivision_notes || '',
    })
    setShowSubdivisionForm(true)
  }

  const onSubdivisionSubmit = async (values: SubdivisionFormValues) => {
    try {
      if (!selectedProperty) return

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to create subdivisions')
        return
      }

      const existingSubdivision = getSubdivisionForProperty(selectedProperty.id)

      if (existingSubdivision) {
        // For updates, show confirmation dialog with changes
        const changes = getChanges(existingSubdivision, values)

        if (changes.length === 0) {
          alert('No changes detected.')
          return
        }

        // Store the pending update data and show confirmation
        setPendingUpdateData({ values, existingSubdivision, user })
        setShowUpdateConfirmation(true)
        return
      } else {
        // Create new subdivision (existing logic)
        const subdivisionData = {
          original_property_id: selectedProperty.id,
          subdivision_name: values.subdivisionName,
          total_plots_planned: values.totalPlotsPlanned,
          surveyor_name: values.surveyorName || null,
          surveyor_contact: values.surveyorContact || null,
          approval_authority: values.approvalAuthority || null,
          survey_cost_kes: values.surveyCost || null,
          approval_fees_kes: values.approvalFees || null,
          expected_plot_value_kes: values.expectedPlotValue || null,
          target_completion_date: values.targetCompletionDate || null,
          subdivision_notes: values.subdivisionNotes || null,
          created_by: user.id,
          assigned_to: user.id,
        }

        const { data: subdivision, error } = await supabase
          .from('property_subdivisions')
          .insert([subdivisionData])
          .select()
          .single()

        if (error) throw error

        // Record subdivision history (optional - don't fail if this fails)
        try {
          await SubdivisionHistoryService.recordPlanCreation(
            selectedProperty.id,
            subdivision.id,
            values.subdivisionName,
            values.totalPlotsPlanned,
            'Subdivision plan created through property management interface',
            {
              surveyor_name: values.surveyorName,
              approval_authority: values.approvalAuthority,
              target_completion_date: values.targetCompletionDate,
              initial_budget_estimate: {
                survey_cost: values.surveyCost,
                approval_fees: values.approvalFees,
              },
            }
          )
        } catch (historyError) {
          console.warn('Could not record subdivision history (non-critical):', historyError)
          // Continue with the operation - history recording is optional
        }

        // Auto-create all planned plots
        await autoCreatePlots(subdivision.id, values.totalPlotsPlanned, values.subdivisionName)

        subdivisionForm.reset()
        setShowSubdivisionForm(false)
        setSelectedProperty(null)
        loadData()
        alert(
          `Subdivision process started successfully with ${values.totalPlotsPlanned} plots ready for editing!`
        )
      }
    } catch (error) {
            alert('Failed to save subdivision')
    }
  }

  const autoCreatePlots = async (
    subdivisionId: string,
    totalPlots: number,
    subdivisionName: string
  ) => {
    try {
      const plotsToCreate = []

      for (let i = 1; i <= totalPlots; i++) {
        plotsToCreate.push({
          subdivision_id: subdivisionId,
          plot_number: `${i.toString().padStart(3, '0')}`, // e.g., "001", "002", "003"
          plot_size_sqm: null, // To be filled by user
          plot_size_acres: null, // To be calculated when sqm is entered
          plot_status: 'PLANNED',
          estimated_value_kes: null, // To be filled by user
          plot_notes: `Auto-generated plot for ${subdivisionName}. Please update size and value.`,
        })
      }

      const { error } = await supabase.from('subdivision_plots').insert(plotsToCreate)

      if (error) throw error

          } catch (error) {
            // Don't throw error here to avoid breaking the subdivision creation
      // The subdivision is created, just the auto-plots failed
      alert(`Subdivision created but failed to auto-create plots. You can create them manually.`)
    }
  }

  const onPlotSubmit = async (values: PlotFormValues) => {
    try {
      if (!selectedSubdivision) return

      if (editingPlot) {
        // Update existing plot
        const { error } = await supabase
          .from('subdivision_plots')
          .update({
            plot_number: values.plotNumber,
            plot_size_sqm: values.plotSizeSqm,
            plot_size_acres: values.plotSizeSqm * 0.000247105, // Convert sqm to acres
            estimated_value_kes: values.estimatedValue || null,
            plot_notes: values.plotNotes || null,
          })
          .eq('id', editingPlot.id)

        if (error) throw error

        alert('Plot updated successfully!')
        setEditingPlot(null)
      } else {
        // Validate plot creation limit before creating new plot
        const validation = validatePlotCreation(selectedSubdivision.id)
        if (!validation.canCreate) {
          alert(validation.message)
          return
        }

        // Create new plot
        const plotData = {
          subdivision_id: selectedSubdivision.id,
          plot_number: values.plotNumber,
          plot_size_sqm: values.plotSizeSqm,
          plot_size_acres: values.plotSizeSqm * 0.000247105, // Convert sqm to acres
          estimated_value_kes: values.estimatedValue || null,
          plot_notes: values.plotNotes || null,
        }

        const { error } = await supabase.from('subdivision_plots').insert([plotData])

        if (error) throw error

        // Update subdivision plots created count
        const { error: updateError } = await supabase
          .from('property_subdivisions')
          .update({
            total_plots_created: selectedSubdivision.total_plots_created + 1,
          })
          .eq('id', selectedSubdivision.id)

        if (updateError) throw updateError

        alert('Plot created successfully!')
      }

      plotForm.reset()
      setShowPlotForm(false)
      loadSubdivisions()
      loadSubdivisionPlots(selectedSubdivision.id)
    } catch (error) {
            alert('Failed to save plot')
    }
  }

  const startEditPlot = (plot: SubdivisionPlot) => {
    setEditingPlot(plot)
    plotForm.reset({
      plotNumber: plot.plot_number,
      plotSizeSqm: plot.plot_size_sqm || 0,
      estimatedValue: plot.estimated_value_kes || undefined,
      plotNotes: plot.plot_notes?.includes('Auto-generated') ? '' : plot.plot_notes || undefined, // Clear auto-generated notes
    })
    setShowPlotForm(true)
  }

  const createPropertyFromPlot = async (plot: SubdivisionPlot) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to create properties')
        return
      }

      const subdivision = subdivisions.find((s) => s.id === plot.subdivision_id)
      if (!subdivision) return

      // Confirmation dialog before creating property
      const confirmCreate = window.confirm(
        `🏠 CREATE PROPERTY FROM PLOT\n\n` +
          `This will:\n` +
          `• Create a new property: "${subdivision.subdivision_name} - Plot ${plot.plot_number}"\n` +
          `• Change plot status to "Property Created"\n` +
          `• Make the plot no longer editable\n` +
          `• Add the property to your properties list\n\n` +
          `You can revert this action later if needed.\n\n` +
          `Continue with property creation?`
      )

      if (!confirmCreate) return

      // Create property from plot
      const { data: propertyId, error: createError } = await supabase.rpc(
        'create_property_with_owner',
        {
          property_name: `${subdivision.subdivision_name} - Plot ${plot.plot_number}`,
          property_address: `Plot ${plot.plot_number}, ${subdivision.properties?.physical_address || 'Subdivision Address'}`,
          property_type: subdivision.properties?.property_type || 'RESIDENTIAL_LAND',
          owner_user_id: user.id,
        }
      )

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
          acquisition_notes: `Created from subdivision of ${subdivision.properties?.name}. Plot ${plot.plot_number} of ${subdivision.subdivision_name}.`,
        })
        .eq('id', propertyId)

      if (updateError) throw updateError

      // Update plot status and link to property
      const { error: plotError } = await supabase
        .from('subdivision_plots')
        .update({
          plot_status: 'PROPERTY_CREATED',
          property_id: propertyId,
        })
        .eq('id', plot.id)

      if (plotError) throw plotError

      alert('Property created successfully from plot!')
      loadSubdivisionPlots(plot.subdivision_id)
      onPropertyCreated?.(propertyId)
    } catch (error) {
            alert('Failed to create property from plot')
    }
  }

  const revertPropertyToPlot = async (plot: SubdivisionPlot) => {
    try {
      if (!plot.property_id) {
        alert('No property linked to this plot')
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to revert properties')
        return
      }

      const subdivision = subdivisions.find((s) => s.id === plot.subdivision_id)
      if (!subdivision) return

      // Confirmation dialog with warning
      const confirmRevert = window.confirm(
        `⚠️ REVERT PROPERTY TO PLOT\n\n` +
          `This will:\n` +
          `• Delete the property "${subdivision.subdivision_name} - Plot ${plot.plot_number}"\n` +
          `• Revert plot back to editable status\n` +
          `• Remove all property data permanently\n\n` +
          `Are you sure you want to continue?`
      )

      if (!confirmRevert) return

      // Check property ownership/permissions
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select('landlord_id, property_source')
        .eq('id', plot.property_id)
        .single()

      if (propertyError) throw propertyError

      if (property.landlord_id !== user.id) {
        alert('Access denied: You can only revert properties you own')
        return
      }

      if (property.property_source !== 'SUBDIVISION_PROCESS') {
        alert('This property was not created from a subdivision plot')
        return
      }

      // Start transaction-like operations
      // 1. Revert plot status and remove property link
      const { error: plotError } = await supabase
        .from('subdivision_plots')
        .update({
          plot_status: 'PLANNED',
          property_id: null,
        })
        .eq('id', plot.id)

      if (plotError) throw plotError

      // 2. Delete the property
      const { error: deleteError } = await supabase
        .from('properties')
        .delete()
        .eq('id', plot.property_id)

      if (deleteError) throw deleteError

      // 3. Update subdivision plots created count (decrement)
      const { error: subdivisionError } = await supabase
        .from('property_subdivisions')
        .update({
          total_plots_created: Math.max(0, subdivision.total_plots_created - 1),
        })
        .eq('id', subdivision.id)

      if (subdivisionError) throw subdivisionError

      // 4. Log the reversion action for audit trail
      const { error: auditError } = await supabase.from('property_audit_log').insert([
        {
          property_id: plot.property_id,
          action: 'REVERTED_TO_PLOT',
          performed_by: user.id,
          details: `Property reverted back to subdivision plot. Plot ${plot.plot_number} in ${subdivision.subdivision_name}`,
          timestamp: new Date().toISOString(),
        },
      ])

      // Don't fail the operation if audit logging fails
      if (auditError) {
              }

      alert(
        '✅ Property successfully reverted to subdivision plot!\n\nThe plot is now editable and can be modified or re-converted.'
      )

      // Reload data to reflect changes
      loadSubdivisions()
      loadSubdivisionPlots(plot.subdivision_id)
    } catch (error) {
            alert('❌ Failed to revert property to plot. Please try again.')
    }
  }

  const permanentlyDeletePlot = async (plot: SubdivisionPlot) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to delete plots')
        return
      }

      const subdivision = subdivisions.find((s) => s.id === plot.subdivision_id)
      if (!subdivision) return

      // Check if plot has a linked property
      if (plot.property_id) {
        alert(
          '❌ Cannot delete plot with linked property!\n\nPlease use "Revert to Subdivision" first to remove the property, then delete the plot.'
        )
        return
      }

      // Confirmation dialog with strong warning
      const confirmDelete = window.confirm(
        `🗑️ PERMANENTLY DELETE PLOT\n\n` +
          `This will PERMANENTLY DELETE:\n` +
          `• Plot "${plot.plot_number}" from ${subdivision.subdivision_name}\n` +
          `• All plot data (size, value, notes)\n` +
          `• This action is IRREVERSIBLE\n\n` +
          `⚠️ WARNING: This cannot be undone!\n\n` +
          `Are you absolutely sure you want to permanently delete this plot?`
      )

      if (!confirmDelete) return

      // Double confirmation for safety
      const doubleConfirm = window.confirm(
        `⚠️ FINAL CONFIRMATION\n\n` +
          `You are about to PERMANENTLY DELETE Plot "${plot.plot_number}".\n\n` +
          `This action is IRREVERSIBLE and cannot be undone.\n\n` +
          `Type "DELETE" in your mind and click OK to proceed, or Cancel to abort.`
      )

      if (!doubleConfirm) return

      // Delete the plot from database
      const { error: deleteError } = await supabase
        .from('subdivision_plots')
        .delete()
        .eq('id', plot.id)

      if (deleteError) throw deleteError

      // Update subdivision plots created count (decrement)
      const { error: subdivisionError } = await supabase
        .from('property_subdivisions')
        .update({
          total_plots_created: Math.max(0, subdivision.total_plots_created - 1),
        })
        .eq('id', subdivision.id)

      if (subdivisionError) throw subdivisionError

      // Log the deletion action for audit trail
      const { error: auditError } = await supabase.from('property_audit_log').insert([
        {
          property_id: null,
          action: 'PLOT_PERMANENTLY_DELETED',
          performed_by: user.id,
          details: `Plot "${plot.plot_number}" permanently deleted from ${subdivision.subdivision_name}. Plot data: ${plot.plot_size_sqm} sqm, ${plot.estimated_value_kes ? 'KES ' + plot.estimated_value_kes : 'No value'}`,
          timestamp: new Date().toISOString(),
        },
      ])

      // Don't fail the operation if audit logging fails
      if (auditError) {
              }

      alert(
        '✅ Plot permanently deleted!\n\nThe plot has been removed from the subdivision system.'
      )

      // Reload data to reflect changes
      loadSubdivisions()
      loadSubdivisionPlots(plot.subdivision_id)
    } catch (error) {
            alert('❌ Failed to delete plot. Please try again.')
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      PLANNING: 'bg-gray-100 text-gray-800',
      SURVEY_ORDERED: 'bg-yellow-100 text-yellow-800',
      SURVEY_COMPLETED: 'bg-blue-100 text-blue-800',
      APPROVAL_PENDING: 'bg-purple-100 text-purple-800',
      APPROVED: 'bg-green-100 text-green-800',
      PLOTS_CREATED: 'bg-indigo-100 text-indigo-800',
      COMPLETED: 'bg-green-100 text-green-800',
      PLANNED: 'bg-gray-100 text-gray-800',
      SURVEYED: 'bg-blue-100 text-blue-800',
      TITLED: 'bg-purple-100 text-purple-800',
      PROPERTY_CREATED: 'bg-green-100 text-green-800',
      SOLD: 'bg-green-100 text-green-800',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Subdivision Process</h2>
          <p className="text-gray-600">
            Manage property subdivisions and create individual plot properties
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'properties', label: 'Subdivision in Progress', icon: '🏗️' },
          { id: 'plots', label: 'Subdivision Plots', icon: '📐' },
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
                <p>
                  The subdivision management tables haven&apos;t been created yet. To use subdivision
                  features:
                </p>
                <ol className="mt-2 list-decimal list-inside space-y-1">
                  <li>Go to your Supabase dashboard</li>
                  <li>Navigate to the SQL Editor</li>
                  <li>Run the subdivision table creation script</li>
                  <li>Refresh this page</li>
                </ol>
                <p className="mt-3 text-xs">
                  Contact your system administrator if you need help setting up the subdivision
                  tables.
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
                <h3 className="text-lg font-semibold text-gray-900">
                  Properties with Subdivision in Progress
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Showing properties where subdivision status is &quot;Sub-Division Started&quot;
                </p>
              </div>

              {/* Search */}
              {onSearchChange && (
                <PropertySearch
                  onSearchChange={onSearchChange}
                  placeholder="Search properties by name, address, or type..."
                  resultsCount={filteredProperties.length}
                  totalCount={properties.length}
                />
              )}
              {filteredProperties.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <div className="text-4xl mb-4">🏗️</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Properties with Subdivision in Progress
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Properties will appear here when their subdivision status is set to
                    &quot;Sub-Division Started&quot; in the Properties tab.
                  </p>
                  <p className="text-sm text-gray-500">
                    To start subdivision on a property, go to Properties → change subdivision status
                    to &quot;Sub-Division Started&quot; → Save Changes
                  </p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {filteredProperties.map((property) => (
                    <PropertyCard
                      key={property.id}
                      lifecycle={property.lifecycle_status}
                      interactive={true}
                      theme="subdivision"
                      aria-label={`Subdivision property: ${property.name}`}
                    >
                      <PropertyCardHeader>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                          <div className="md:col-span-2">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{property.name}</h3>
                              <span className="text-lg">🏗️</span>
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                                Subdivision Process
                              </span>
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                              Sub-Division Started
                            </span>
                            </div>
                            <p className="text-gray-600 mb-2">{property.physical_address}</p>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                              <span>
                                Type: {property.property_type?.replace('_', ' ') || 'Unknown'}
                              </span>
                              {property.total_area_acres && (
                                <span>Area: {property.total_area_acres} acres</span>
                              )}
                              {property.expected_rental_income_kes && (
                                <span>
                                  Expected Rent: KES{' '}
                                  {property.expected_rental_income_kes.toLocaleString()}/month
                                </span>
                              )}
                              {property.purchase_completion_date && (
                                <span>
                                  Purchased:{' '}
                                  {new Date(property.purchase_completion_date).toLocaleDateString()}
                                </span>
                              )}
                              {property.subdivision_date && (
                                <span>
                                  Subdivided:{' '}
                                  {new Date(property.subdivision_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <ViewOnGoogleMapsButton
                              lat={property.lat ?? null}
                              lng={property.lng ?? null}
                              address={property.physical_address ?? property.name}
                              propertyName={property.name}
                              debug={process.env.NODE_ENV === 'development'}
                              debugContext={`Subdivision Manager - ${property.name}`}
                            />
                          </div>
                        </div>
                      </PropertyCardHeader>

                      <PropertyCardFooter>
                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2 items-center justify-between">
                        <div className="flex space-x-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              setViewingPropertyId(
                                viewingPropertyId === property.id ? null : property.id
                              )
                            }
                          >
                            {viewingPropertyId === property.id ? 'Hide Details' : 'View Details'}
                          </Button>
                        </div>

                        <div className="flex space-x-2">
                          {!checkSubdivisionExists(property.id) ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleSubdivisionRequest(property)}
                              disabled={!canEditProperty(property.id)}
                            >
                              Create Subdivision Plan
                            </Button>
                          ) : canEditProperty(property.id) ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleEditSubdivisionPlan(property)}
                            >
                              ✏️ Edit Subdivision Plan
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled
                              className="opacity-50 cursor-not-allowed"
                            >
                              ✓ Plan Created
                            </Button>
                          )}

                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              // Find subdivision for this property
                              const subdivision = subdivisions.find(
                                (s) => s.original_property_id === property.id
                              )
                              if (subdivision) {
                                setSelectedSubdivision(subdivision)
                                loadSubdivisionPlots(subdivision.id)
                                setActiveTab('plots')
                              } else {
                                alert(
                                  'No subdivision found for this property. Create a subdivision plan first.'
                                )
                              }
                            }}
                          >
                            View Plots
                          </Button>

                          {/* History Button - Always available */}
                          <Button
                            variant="tertiary"
                            size="sm"
                            onClick={() => handleViewHistory(property)}
                          >
                            📋 View History
                          </Button>
                        </div>
                        </div>
                      </PropertyCardFooter>

                      {/* Inline Property View */}
                      {viewingPropertyId === property.id && (
                        <div className="mt-4">
                          <InlinePropertyView
                            property={property as any}
                            onClose={() => setViewingPropertyId(null)}
                          />
                        </div>
                      )}
                    </PropertyCard>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Plots Tab */}
          {activeTab === 'plots' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedSubdivision
                      ? `${selectedSubdivision.subdivision_name} - Plots`
                      : 'Subdivision Plots'}
                  </h3>
                  {selectedSubdivision && (
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-sm text-gray-600">
                        Plots: {subdivisionPlots.length}/{selectedSubdivision.total_plots_planned}
                      </span>
                      {plotLimitReached && (
                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                          Limit Reached
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {selectedSubdivision && (
                  <div className="flex flex-col items-end space-y-2">
                    <Button
                      variant="primary"
                      disabled={plotLimitReached}
                      onClick={() => {
                        const validation = validatePlotCreation(selectedSubdivision.id)
                        if (!validation.canCreate) {
                          alert(validation.message)
                          return
                        }
                        setEditingPlot(null)
                        plotForm.reset()
                        setShowPlotForm(true)
                      }}
                    >
                      Add Plot
                    </Button>
                    {plotLimitReached && selectedSubdivision && (
                      <div className="text-xs text-amber-600 text-right max-w-xs">
                        ⚠️ Plot limit reached: {subdivisionPlots.length}/
                        {selectedSubdivision.total_plots_planned} plots created
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!selectedSubdivision ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <div className="text-4xl mb-4">📐</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Subdivision</h3>
                  <p className="text-gray-600">
                    Choose a subdivision from the Subdivision in Progress tab to view its plots.
                  </p>
                </div>
              ) : subdivisionPlots.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <div className="text-4xl mb-4">📐</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Plots Found</h3>
                  <p className="text-gray-600 mb-2">
                    Plots should have been auto-created when the subdivision was started.
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    If this is an older subdivision, you can create plots manually.
                  </p>
                  <div className="flex flex-col items-center space-y-2">
                    <Button
                      variant="primary"
                      disabled={plotLimitReached}
                      onClick={() => {
                        if (!selectedSubdivision) return
                        const validation = validatePlotCreation(selectedSubdivision.id)
                        if (!validation.canCreate) {
                          alert(validation.message)
                          return
                        }
                        setEditingPlot(null)
                        plotForm.reset()
                        setShowPlotForm(true)
                      }}
                    >
                      Create First Plot
                    </Button>
                    {plotLimitReached && selectedSubdivision && (
                      <div className="text-xs text-amber-600 text-center max-w-xs">
                        ⚠️ Plot limit reached: {subdivisionPlots.length}/
                        {selectedSubdivision.total_plots_planned} plots created
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Info message for auto-created plots */}
                  {selectedSubdivision &&
                    subdivisionPlots.length > 0 &&
                    subdivisionPlots.every((plot) =>
                      plot.plot_notes?.includes('Auto-generated')
                    ) && (
                      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <div className="text-blue-500 text-xl">ℹ️</div>
                          <div>
                            <h4 className="text-sm font-medium text-blue-900 mb-1">
                              Plots Auto-Created Successfully
                            </h4>
                            <p className="text-sm text-blue-700 mb-2">
                              {subdivisionPlots.length} plots have been automatically created for
                              this subdivision. Click &quot;✏️ Edit Plot&quot; on any plot to add size, value,
                              and other details.
                            </p>
                            <p className="text-xs text-blue-600">
                              💡 Tip: You can edit multiple plots quickly by updating one, then
                              copying similar values to others.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                  <div className="grid gap-4">
                    {subdivisionPlots.map((plot) => (
                      <PropertyCard
                        key={plot.id}
                        status={plot.plot_status}
                        interactive={true}
                        theme="subdivision"
                        aria-label={`Plot ${plot.plot_number}`}
                      >
                        <PropertyCardHeader>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h4 className="font-semibold text-gray-900">
                                  Plot {plot.plot_number}
                                </h4>
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(plot.plot_status)}`}
                                >
                                  {plot.plot_status.replace('_', ' ')}
                                </span>
                                {plot.plot_status === 'PLANNED' && (
                                  <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full">
                                    ✏️ Editable
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-600 mb-1">
                                {plot.plot_size_sqm ? plot.plot_size_sqm.toLocaleString() : '0'} sqm (
                                {plot.plot_size_acres ? plot.plot_size_acres.toFixed(4) : '0.0000'}{' '}
                                acres)
                              </p>
                              {plot.estimated_value_kes && (
                                <p className="text-sm text-gray-500 mb-1">
                                  Estimated Value: KES {plot.estimated_value_kes.toLocaleString()}
                                </p>
                              )}
                              {plot.plot_notes && (
                                <p className="text-xs text-gray-400 italic">
                                  Notes: {plot.plot_notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </PropertyCardHeader>

                        <PropertyCardFooter>
                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2 justify-end">
                            {plot.plot_status === 'PLANNED' && (
                              <>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => startEditPlot(plot)}
                                >
                                  ✏️ Edit Plot
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
                                  onClick={() => permanentlyDeletePlot(plot)}
                                  className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 hover:bg-red-50"
                                >
                                  🗑️ Delete Plot
                                </Button>
                              </>
                            )}
                            {plot.plot_status === 'PROPERTY_CREATED' && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => revertPropertyToPlot(plot)}
                                className="text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300"
                              >
                                ↩️ Revert to Subdivision
                              </Button>
                            )}
                          </div>
                        </PropertyCardFooter>
                      </PropertyCard>
                    ))}
                  </div>
                </>
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
        title={
          selectedProperty && checkSubdivisionExists(selectedProperty.id)
            ? 'Edit Subdivision Plan'
            : 'Start Subdivision Process'
        }
      >
        <form onSubmit={subdivisionForm.handleSubmit(onSubdivisionSubmit)} className="space-y-4">
          <FormField
            name="subdivisionName"
            label="Subdivision Name *"
            error={subdivisionForm.formState.errors.subdivisionName?.message}
          >
            {({ id }) => (
              <TextField
                id={id}
                {...subdivisionForm.register('subdivisionName')}
                placeholder="e.g., Sunset Gardens Phase 1"
              />
            )}
          </FormField>

          <FormField
            name="totalPlotsPlanned"
            label="Total Plots Planned *"
            error={subdivisionForm.formState.errors.totalPlotsPlanned?.message}
          >
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
            <FormField
              name="surveyorName"
              label="Surveyor Name *"
              error={subdivisionForm.formState.errors.surveyorName?.message}
            >
              {({ id }) => (
                <TextField
                  id={id}
                  {...subdivisionForm.register('surveyorName')}
                  placeholder="e.g., ABC Surveyors Ltd"
                />
              )}
            </FormField>

            <FormField
              name="surveyorContact"
              label="Surveyor Contact *"
              error={subdivisionForm.formState.errors.surveyorContact?.message}
            >
              {({ id }) => (
                <TextField
                  id={id}
                  {...subdivisionForm.register('surveyorContact')}
                  placeholder="e.g., +254 700 000 000"
                />
              )}
            </FormField>
          </div>

          <FormField name="approvalAuthority" label="Approval Authority">
            {({ id }) => (
              <TextField
                id={id}
                {...subdivisionForm.register('approvalAuthority')}
                placeholder="e.g., County Government, NLC, etc."
              />
            )}
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              name="surveyCost"
              label="Survey Cost (KES) *"
              error={subdivisionForm.formState.errors.surveyCost?.message}
            >
              {({ id }) => (
                <TextField
                  id={id}
                  {...subdivisionForm.register('surveyCost', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g., 500000"
                />
              )}
            </FormField>

            <FormField name="approvalFees" label="Approval Fees (KES)">
              {({ id }) => (
                <TextField
                  id={id}
                  {...subdivisionForm.register('approvalFees', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g., 150000"
                />
              )}
            </FormField>
          </div>

          <FormField
            name="expectedPlotValue"
            label="Expected Plot Value (KES) *"
            error={subdivisionForm.formState.errors.expectedPlotValue?.message}
          >
            {({ id }) => (
              <TextField
                id={id}
                {...subdivisionForm.register('expectedPlotValue', { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="1"
                placeholder="e.g., 2000000"
              />
            )}
          </FormField>

          <FormField
            name="targetCompletionDate"
            label="Target Completion Date *"
            error={subdivisionForm.formState.errors.targetCompletionDate?.message}
          >
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
              {subdivisionForm.formState.isSubmitting
                ? selectedProperty && checkSubdivisionExists(selectedProperty.id)
                  ? 'Updating...'
                  : 'Creating...'
                : selectedProperty && checkSubdivisionExists(selectedProperty.id)
                  ? 'Update Subdivision Plan'
                  : 'Start Subdivision'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Plot Form Modal */}
      <Modal
        isOpen={showPlotForm}
        onClose={() => {
          setShowPlotForm(false)
          setEditingPlot(null)
          plotForm.reset()
        }}
        title={editingPlot ? `Edit Plot ${editingPlot.plot_number}` : 'Add Plot'}
      >
        <form onSubmit={plotForm.handleSubmit(onPlotSubmit)} className="space-y-4">
          <FormField
            name="plotNumber"
            label="Plot Number"
            error={plotForm.formState.errors.plotNumber?.message}
          >
            {({ id }) => (
              <TextField
                id={id}
                {...plotForm.register('plotNumber')}
                placeholder="e.g., 001, A1, etc."
              />
            )}
          </FormField>

          <FormField
            name="plotSizeSqm"
            label="Plot Size (Square Meters)"
            error={plotForm.formState.errors.plotSizeSqm?.message}
          >
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

          <FormField
            name="estimatedValue"
            label="Estimated Value (KES)"
            error={plotForm.formState.errors.estimatedValue?.message}
          >
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
                setEditingPlot(null)
                plotForm.reset()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={plotForm.formState.isSubmitting}>
              {plotForm.formState.isSubmitting
                ? editingPlot
                  ? 'Updating...'
                  : 'Adding...'
                : editingPlot
                  ? 'Update Plot'
                  : 'Add Plot'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Subdivision Plan Confirmation Modal */}
      {propertyToSubdivide && (
        <SubdivisionPlanConfirmationModal
          isOpen={showConfirmationModal}
          onClose={() => {
            setShowConfirmationModal(false)
            setPropertyToSubdivide(null)
          }}
          onConfirm={handleConfirmSubdivision}
          property={propertyToSubdivide}
          isSubmitting={isCreatingSubdivision}
        />
      )}

      {/* Subdivision History Modal */}
      {selectedProperty && (
        <SubdivisionHistoryModal
          isOpen={showHistoryModal}
          onClose={() => {
            setShowHistoryModal(false)
            setSelectedProperty(null)
          }}
          propertyId={selectedProperty.id}
          propertyName={selectedProperty.name}
        />
      )}

      {/* Update Confirmation Modal */}
      <Modal
        isOpen={showUpdateConfirmation}
        onClose={() => {
          setShowUpdateConfirmation(false)
          setPendingUpdateData(null)
        }}
        title="⚠️ Confirm Subdivision Plan Update"
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  You are about to update the subdivision plan
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>The following changes will be made:</p>
                </div>
              </div>
            </div>
          </div>

          {/* Changes List */}
          {pendingUpdateData && selectedProperty && (
            <div className="space-y-2">
              {getChanges(pendingUpdateData.existingSubdivision, pendingUpdateData.values).map(
                (change, index) => (
                  <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-sm font-medium text-blue-900">{change.field}:</div>
                    <div className="flex items-center space-x-2 mt-1 text-sm">
                      {change.oldValue !== null &&
                      change.oldValue !== undefined &&
                      change.oldValue !== '' ? (
                        <>
                          <span className="text-red-600 line-through bg-red-50 px-2 py-1 rounded">
                            {String(change.oldValue)}
                          </span>
                          <span className="text-gray-400">→</span>
                        </>
                      ) : (
                        <span className="text-gray-500 text-xs bg-gray-100 px-2 py-1 rounded">
                          (new)
                        </span>
                      )}
                      <span className="text-green-600 font-medium bg-green-50 px-2 py-1 rounded">
                        {change.newValue !== null &&
                        change.newValue !== undefined &&
                        change.newValue !== ''
                          ? String(change.newValue)
                          : '(removed)'}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-sm text-gray-600">
              <strong>Note:</strong> This action will update the subdivision plan and create a
              history record of all changes made.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowUpdateConfirmation(false)
                setPendingUpdateData(null)
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirmedUpdate}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              ⚠️ Confirm Update
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
