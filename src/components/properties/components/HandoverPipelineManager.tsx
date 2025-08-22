'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, TextField, FormField } from '../../ui'
import Modal from '../../ui/Modal'
import ViewOnGoogleMapsButton from '../../location/ViewOnGoogleMapsButton'
import HandoverStageModal from './HandoverStageModal'
import HandoverProgressTracker from './HandoverProgressTracker'
import PropertySearch from './PropertySearch'
import InlineHandoverView from './InlineHandoverView'
import { Property } from '../../../lib/types/database'
import supabase from '../../../lib/supabase-client'
import {
  HandoverItem,
  HandoverPipelineFormValues,
  handoverPipelineSchema,
  PropertyWithLifecycle
} from '../types/property-management.types'
import {
  initializeHandoverPipelineStages,
  calculateHandoverProgress,
  getCurrentHandoverStage,
  determineHandoverStatus,
  isAuthError,
  redirectToLogin
} from '../utils/property-management.utils'

interface HandoverPipelineManagerProps {
  onHandoverCreated?: () => void
  searchTerm?: string
  onSearchChange?: (searchTerm: string) => void
}

export default function HandoverPipelineManager({
  onHandoverCreated,
  searchTerm = '',
  onSearchChange
}: HandoverPipelineManagerProps) {
  const [handovers, setHandovers] = useState<HandoverItem[]>([])
  const [handoverLoading, setHandoverLoading] = useState(false)
  const [showHandoverForm, setShowHandoverForm] = useState(false)
  const [availableProperties, setAvailableProperties] = useState<Property[]>([])
  const [editingHandover, setEditingHandover] = useState<HandoverItem | null>(null)
  const [selectedHandoverId, setSelectedHandoverId] = useState<string | null>(null)
  const [selectedHandoverStageId, setSelectedHandoverStageId] = useState<number | null>(null)
  const [showHandoverStageModal, setShowHandoverStageModal] = useState(false)
  const [viewingHandoverId, setViewingHandoverId] = useState<string | null>(null)

  // Filter handovers based on search term
  const filteredHandovers = useMemo(() => {
    if (!searchTerm.trim()) return handovers

    const lower = searchTerm.toLowerCase()
    return handovers.filter(handover => {
      return (
        handover.property_name.toLowerCase().includes(lower) ||
        (handover.property_address?.toLowerCase().includes(lower) ?? false) ||
        (handover.buyer_name?.toLowerCase().includes(lower) ?? false) ||
        (handover.legal_representative?.toLowerCase().includes(lower) ?? false) ||
        (handover.risk_assessment?.toLowerCase().includes(lower) ?? false) ||
        (handover.property_condition_notes?.toLowerCase().includes(lower) ?? false)
      )
    })
  }, [handovers, searchTerm])

  // Handover Form
  const {
    register: registerHandover,
    handleSubmit: handleHandoverSubmit,
    reset: resetHandover,
    watch: watchHandover,
    formState: { errors: handoverErrors, isSubmitting: isHandoverSubmitting }
  } = useForm<HandoverPipelineFormValues>({
    resolver: zodResolver(handoverPipelineSchema)
  })

  // Selected property in Handover modal for map preview
  const selectedHandoverPropertyId = watchHandover('propertyId') as string | undefined
  const selectedHandoverProperty = selectedHandoverPropertyId
    ? [...availableProperties].find((p: any) => p.id === selectedHandoverPropertyId)
    : undefined

  // Helper function to handle authentication errors
  const handleAuthError = async (error: any, context: string) => {
    console.error(`Authentication error in ${context}:`, error)

    if (isAuthError(error)) {
      try {
        await supabase.auth.signOut()
      } catch (signOutError) {
        console.error('Error signing out:', signOutError)
      }
      redirectToLogin(context)
      return true
    }
    return false
  }

  useEffect(() => {
    loadHandovers()
    loadAvailableProperties()
  }, [])



  useEffect(() => {
    loadAvailableProperties()
  }, [editingHandover])

  const loadHandovers = async () => {
    try {
      setHandoverLoading(true)

      const { data, error } = await supabase
        .from('handover_pipeline')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.warn('Handover pipeline table does not exist. Please run database migrations.')
          setHandovers([])
          return
        }
        console.error('Error loading handovers:', error)
        throw error
      }

      setHandovers((data as HandoverItem[]) || [])
    } catch (error) {
      console.error('Error loading handovers:', error)
      setHandovers([])
    } finally {
      setHandoverLoading(false)
    }
  }

  const loadAvailableProperties = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        const handled = await handleAuthError(authError, 'loadAvailableProperties')
        if (handled) return
      }
      if (!user) {
        console.error('No authenticated user found')
        return
      }

      const { data: allProperties, error: propertiesError } = await supabase
        .from('properties')
        .select(`
          *,
          property_source,
          lifecycle_status,
          subdivision_status,
          handover_status,
          handover_date,
          source_reference_id,
          parent_property_id,
          purchase_completion_date,
          subdivision_date,
          acquisition_notes,
          expected_rental_income_kes,
          sale_price_kes,
          estimated_value_kes,
          total_area_sqm,
          total_area_acres
        `)
        .order('name')

      if (propertiesError) throw propertiesError

      let filteredProperties = (allProperties as PropertyWithLifecycle[] | null)?.filter(
        (property: any) => property.handover_status === 'IN_PROGRESS'
      ) || []

      const { data: existingHandovers, error: handoversError } = await supabase
        .from('handover_pipeline')
        .select('property_id')
        .neq('handover_status', 'COMPLETED')
        .neq('handover_status', 'CANCELLED')

      if (handoversError) throw handoversError

      const existingIds = new Set((existingHandovers || []).map((h: any) => h.property_id))

      // If editing, allow the currently selected property to remain available
      filteredProperties = filteredProperties.filter((p: any) =>
        editingHandover ? (!existingIds.has(p.id) || p.id === editingHandover.property_id) : !existingIds.has(p.id)
      )

      setAvailableProperties(filteredProperties as any)
    } catch (error) {
      console.error('Error loading available properties:', error)
      if (error instanceof Error && isAuthError(error)) {
        redirectToLogin('loadAvailableProperties')
      }
    }
  }

  const startHandoverProcess = async (property: any) => {
    try {
      resetHandover({
        propertyId: property.id,
        buyerName: '',
        buyerContact: '',
        buyerEmail: '',
        buyerAddress: '',
        askingPrice: undefined,
        negotiatedPrice: undefined,
        depositReceived: undefined,
        targetCompletionDate: '',
        legalRepresentative: '',
        riskAssessment: '',
        propertyConditionNotes: '',
        expectedProfit: undefined,
        expectedProfitPercentage: undefined,
      })
      setEditingHandover(null)
      setShowHandoverForm(true)
    } catch (error) {
      console.error('Error starting handover process:', error)
      alert('Failed to start handover process')
    }
  }

  const handleEditHandover = (handover: HandoverItem) => {
    setEditingHandover(handover)
    resetHandover({
      propertyId: handover.property_id,
      buyerName: handover.buyer_name || '',
      buyerContact: handover.buyer_contact || '',
      buyerEmail: handover.buyer_email || '',
      buyerAddress: handover.buyer_address || '',
      askingPrice: handover.asking_price_kes || undefined,
      negotiatedPrice: handover.negotiated_price_kes || undefined,
      depositReceived: handover.deposit_received_kes || undefined,
      targetCompletionDate: handover.target_completion_date || '',
      legalRepresentative: handover.legal_representative || '',
      riskAssessment: handover.risk_assessment || '',
      propertyConditionNotes: handover.property_condition_notes || '',
      expectedProfit: handover.expected_profit_kes || undefined,
      expectedProfitPercentage: handover.expected_profit_percentage || undefined,
    })
    setShowHandoverForm(true)
  }

  const handleHandoverStageUpdate = async (
    handoverId: string,
    stageId: number,
    newStatus: string,
    notes?: string
  ) => {
    try {
      // Get current handover data
      const { data: handover, error: fetchError } = await supabase
        .from('handover_pipeline')
        .select('pipeline_stages')
        .eq('id', handoverId)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116' || fetchError.message?.includes('does not exist')) {
          alert('Handover pipeline table does not exist. Please run database migrations first.')
          return
        }
        console.error('Error fetching handover:', fetchError)
        throw fetchError
      }

      let currentStages = handover.pipeline_stages as any[]

      // If pipeline_stages is null, empty, or invalid, initialize it
      if (!currentStages || !Array.isArray(currentStages) || currentStages.length === 0) {
        currentStages = initializeHandoverPipelineStages()

        // Update the database with the initialized stages
        const { error: initError } = await supabase
          .from('handover_pipeline')
          .update({ pipeline_stages: currentStages })
          .eq('id', handoverId)

        if (initError) {
          console.error('Error initializing pipeline stages:', initError)
          throw initError
        }
      }

      // Update the specific stage
      const updatedStages = currentStages.map(stage => {
        if (stage.stage_id === stageId) {
          const updatedStage = {
            ...stage,
            status: newStatus,
            notes: notes || stage.notes,
          }

          // Set completion date if stage is being completed
          if (['Completed', 'Verified', 'Finalized', 'Processed', 'Approved', 'Signed', 'Registered'].includes(newStatus)) {
            updatedStage.completed_date = new Date().toISOString()
          }

          // Set started date if stage is being started
          if (newStatus !== 'Not Started' && !stage.started_date) {
            updatedStage.started_date = new Date().toISOString()
          }

          return updatedStage
        }
        return stage
      })

      // Calculate progress and current stage
      const completedStages = updatedStages.filter(stage =>
        ['Completed', 'Verified', 'Finalized', 'Processed', 'Approved', 'Signed', 'Registered'].includes(stage.status)
      ).length
      const overallProgress = Math.round((completedStages / updatedStages.length) * 100)

      // Find current stage (first non-completed stage)
      let currentStage = updatedStages.length // Default to last stage if all completed
      for (let i = 0; i < updatedStages.length; i++) {
        if (!['Completed', 'Verified', 'Finalized', 'Processed', 'Approved', 'Signed', 'Registered'].includes(updatedStages[i].status)) {
          currentStage = updatedStages[i].stage_id
          break
        }
      }

      // Determine handover status (using correct database enum values)
      const handoverStatus = determineHandoverStatus(updatedStages)

      const updateData = {
        pipeline_stages: updatedStages,
        current_stage: currentStage,
        overall_progress: overallProgress,
        handover_status: handoverStatus,
        updated_at: new Date().toISOString(),
        actual_completion_date: handoverStatus === 'COMPLETED' ? new Date().toISOString().split('T')[0] : null
      }

      const { error } = await supabase
        .from('handover_pipeline')
        .update(updateData)
        .eq('id', handoverId)

      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          alert('Handover pipeline table does not exist. Please run database migrations first.')
          return
        }
        console.error('Supabase error details:', error)
        throw error
      }

      // Reload handovers
      loadHandovers()
      setShowHandoverStageModal(false)
    } catch (error) {
      console.error('Error updating handover stage:', error)
      throw error
    }
  }

  const handleHandoverStageClick = (stageId: number, handoverId: string) => {
    setSelectedHandoverId(handoverId)
    setSelectedHandoverStageId(stageId)
    setShowHandoverStageModal(true)
  }

  const onHandoverSubmit = async (values: HandoverPipelineFormValues) => {
    try {
      console.log('Handover form values:', values)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to manage handovers')
        return
      }

      console.log('Current user:', user.id)

      const selectedProperty = availableProperties.find(p => p.id === values.propertyId)
      if (!selectedProperty) {
        alert('Selected property not found')
        return
      }

      console.log('Selected property:', selectedProperty)

      const initialStages = initializeHandoverPipelineStages()
      const currentStageNum = getCurrentHandoverStage(initialStages)
      const overallProgress = calculateHandoverProgress(initialStages)

      console.log('Pipeline stages initialized:', { initialStages, currentStageNum, overallProgress })

      const handoverData = {
        property_id: values.propertyId,
        property_name: (selectedProperty as any).name || (selectedProperty as any).property_name || 'Unknown Property',
        property_address: (selectedProperty as any).physical_address || (selectedProperty as any).address || 'Unknown Address',
        property_type: (selectedProperty as any).property_type || 'HOME',
        buyer_name: values.buyerName,
        buyer_contact: values.buyerContact || null,
        buyer_email: values.buyerEmail || null,
        buyer_address: values.buyerAddress || null,
        pipeline_stages: initialStages,
        current_stage: currentStageNum,
        overall_progress: overallProgress,
        asking_price_kes: values.askingPrice || null,
        negotiated_price_kes: values.negotiatedPrice || null,
        deposit_received_kes: values.depositReceived || null,
        target_completion_date: values.targetCompletionDate || null,
        legal_representative: values.legalRepresentative || null,
        risk_assessment: values.riskAssessment || null,
        property_condition_notes: values.propertyConditionNotes || null,
        expected_profit_kes: values.expectedProfit || null,
        expected_profit_percentage: values.expectedProfitPercentage || null,
        handover_status: determineHandoverStatus(initialStages) || 'IDENTIFIED',
        created_by: user.id,
      }

      console.log('Handover data to insert:', handoverData)

      if (editingHandover) {
        console.log('Updating existing handover:', editingHandover.id)
        const { data: updateResult, error } = await supabase
          .from('handover_pipeline')
          .update(handoverData)
          .eq('id', editingHandover.id)
          .select()

        console.log('Update result:', updateResult)
        console.log('Update error:', error)

        if (error) {
          if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
            alert('Handover pipeline table does not exist. Please run database migrations first.')
            return
          }
          console.error('Update error details:', error)
          throw error
        }
      } else {
        console.log('Creating new handover')
        const { data: insertResult, error } = await supabase
          .from('handover_pipeline')
          .insert([handoverData])
          .select()

        console.log('Insert result:', insertResult)
        console.log('Insert error:', error)

        if (error) {
          if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
            alert('Handover pipeline table does not exist. Please run database migrations first.')
            return
          }
          console.error('Insert error details:', error)
          throw error
        }
      }

      if (handoverData.handover_status === 'COMPLETED') {
        await supabase
          .from('properties')
          .update({ handover_status: 'COMPLETED', handover_date: new Date().toISOString().split('T')[0] })
          .eq('id', values.propertyId)
      } else if (handoverData.handover_status === 'IDENTIFIED') {
        await supabase.from('properties').update({ handover_status: 'IN_PROGRESS' }).eq('id', values.propertyId)
      }

      resetHandover()
      setShowHandoverForm(false)
      setEditingHandover(null)
      loadHandovers()
      loadAvailableProperties()
      onHandoverCreated?.()
    } catch (error) {
      console.error('Error saving handover:', error)
      alert('Failed to save handover')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Property Handover Pipeline</h2>
          <p className="text-gray-600">Manage property handover and sale processes</p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEditingHandover(null)
            resetHandover()
            setShowHandoverForm(true)
          }}
        >
          Add Handover Opportunity
        </Button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center text-sm text-blue-800">
          <span className="mr-2">🔄</span>
          <span>Handover status labels sync with your current pipeline stage progress</span>
        </div>
      </div>

      {/* Available Properties for Handover */}
      {availableProperties.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Properties for Handover</h3>
          <div className="grid gap-4">
            {availableProperties.slice(0, 5).map((property) => (
              <div key={property.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h4 className="font-medium text-gray-900">{(property as any).name}</h4>
                    <span className="text-sm text-gray-500">
                      {(property as any).property_source && `(${(property as any).property_source.replace('_', ' ')})`}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{(property as any).physical_address}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                      {(property as any).property_type?.replace('_', ' ')}
                    </span>
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Ready for Handover</span>
                  </div>
                </div>
                <Button variant="primary" size="sm" onClick={() => startHandoverProcess(property)}>
                  Start Handover
                </Button>
              </div>
            ))}
            {availableProperties.length > 5 && (
              <div className="text-center py-2">
                <span className="text-sm text-gray-500">+{availableProperties.length - 5} more properties available</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      {onSearchChange && handovers.length > 0 && (
        <PropertySearch
          onSearchChange={onSearchChange}
          placeholder="Search handovers by property, buyer, or notes..."
          resultsCount={filteredHandovers.length}
          totalCount={handovers.length}
        />
      )}

      {/* Handover List */}
      {handoverLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading handovers...</p>
        </div>
      ) : filteredHandovers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="text-4xl mb-4">🏠</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Handover Opportunities</h3>
            {availableProperties.length === 0 ? (
              <div>
                <p className="text-gray-600 mb-4">No properties available for handover.</p>
                <p className="text-sm text-gray-500 mb-4">You need to create properties first before you can start handover processes.</p>
                <Button variant="secondary" onClick={() => window.location.href = '/dashboard/properties'}>
                  Go to Properties Tab
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">Start tracking properties you're preparing for handover.</p>
                <Button
                  variant="primary"
                  onClick={() => {
                    setEditingHandover(null)
                    resetHandover()
                    setShowHandoverForm(true)
                  }}
                >
                  Add First Handover
                </Button>
              </div>
            )}
          </div>
      ) : (
        <div className="grid gap-6">
          {filteredHandovers.map((handover) => (
            <div key={handover.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start mb-4">
                <div className="md:col-span-2">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{handover.property_name}</h3>
                    <span className="text-lg">🏠</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        handover.handover_status === 'COMPLETED'
                          ? 'bg-green-100 text-green-800'
                          : handover.handover_status === 'CLOSING'
                          ? 'bg-blue-100 text-blue-800'
                          : handover.handover_status === 'FINANCING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {handover.handover_status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-blue-600 flex items-center">
                      <span className="mr-1">🔄</span>
                      Auto-sync
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">{handover.property_address}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <span>Buyer: {handover.buyer_name || 'Not specified'}</span>
                    {handover.asking_price_kes && <span>Asking: KES {handover.asking_price_kes.toLocaleString()}</span>}
                    {handover.negotiated_price_kes && <span>Negotiated: KES {handover.negotiated_price_kes.toLocaleString()}</span>}
                    <span>Progress: {handover.overall_progress}%</span>
                  </div>
                </div>

                <div className="flex justify-end">
                  <ViewOnGoogleMapsButton
                    address={handover.property_address || handover.property_name}
                    propertyName={handover.property_name}
                  />
                </div>
              </div>



              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleEditHandover(handover)}
                >
                  Edit Details
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setViewingHandoverId(
                    viewingHandoverId === handover.id ? null : handover.id
                  )}
                >
                  {viewingHandoverId === handover.id ? 'Hide Details' : 'View Details'}
                </Button>
              </div>

              {/* Inline Handover Details */}
              {viewingHandoverId === handover.id && (
                <InlineHandoverView
                  handover={handover}
                  onClose={() => setViewingHandoverId(null)}
                  onStageClick={handleHandoverStageClick}
                  onStageUpdate={handleHandoverStageUpdate}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Handover Form Modal */}
      {showHandoverForm && (
        <Modal
          isOpen={showHandoverForm}
          onClose={() => {
            setShowHandoverForm(false)
            setEditingHandover(null)
            resetHandover()
          }}
          title={editingHandover ? 'Edit Handover Opportunity' : 'Add Handover Opportunity'}
        >
          <form onSubmit={handleHandoverSubmit(onHandoverSubmit)} className="space-y-6">
            {/* Property Selection */}
            <FormField name="propertyId" label="Property" error={handoverErrors.propertyId?.message}>
              {({ id }) => (
                <select
                  id={id}
                  {...registerHandover('propertyId')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a property</option>
                  {availableProperties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {(property as any).name} - {(property as any).physical_address}
                    </option>
                  ))}
                </select>
              )}
            </FormField>

            {/* Selected Property Map Preview */}
            {selectedHandoverProperty && (
              <div className="bg-gray-50 border rounded-lg p-3">
                <div className="text-sm text-gray-700 mb-2">Selected Property Location</div>
                <div className="flex justify-center">
                  <ViewOnGoogleMapsButton
                    lat={(selectedHandoverProperty as any).lat ?? null}
                    lng={(selectedHandoverProperty as any).lng ?? null}
                    address={selectedHandoverProperty.physical_address ?? (selectedHandoverProperty as any).name}
                    propertyName={(selectedHandoverProperty as any).name}
                  />
                </div>
              </div>
            )}

            {/* Buyer Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField name="buyerName" label="Buyer Name" error={handoverErrors.buyerName?.message}>
                {({ id }) => (
                  <TextField id={id} {...registerHandover('buyerName')} placeholder="Enter buyer's full name" />
                )}
              </FormField>
              <FormField name="buyerContact" label="Buyer Contact" error={handoverErrors.buyerContact?.message}>
                {({ id }) => (
                  <TextField id={id} {...registerHandover('buyerContact')} placeholder="Phone number" />
                )}
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField name="buyerEmail" label="Buyer Email" error={handoverErrors.buyerEmail?.message}>
                {({ id }) => (
                  <TextField id={id} {...registerHandover('buyerEmail')} type="email" placeholder="buyer@example.com" />
                )}
              </FormField>
              <FormField name="targetCompletionDate" label="Target Completion Date" error={handoverErrors.targetCompletionDate?.message}>
                {({ id }) => (
                  <TextField id={id} {...registerHandover('targetCompletionDate')} type="date" />
                )}
              </FormField>
            </div>

            <FormField name="buyerAddress" label="Buyer Address" error={handoverErrors.buyerAddress?.message}>
              {({ id }) => (
                <TextField id={id} {...registerHandover('buyerAddress')} placeholder="Buyer's address" />
              )}
            </FormField>

            {/* Financial Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField name="askingPrice" label="Asking Price (KES)" error={handoverErrors.askingPrice?.message}>
                {({ id }) => (
                  <TextField id={id} {...registerHandover('askingPrice', { valueAsNumber: true })} type="number" placeholder="0" />
                )}
              </FormField>
              <FormField name="negotiatedPrice" label="Negotiated Price (KES)" error={handoverErrors.negotiatedPrice?.message}>
                {({ id }) => (
                  <TextField id={id} {...registerHandover('negotiatedPrice', { valueAsNumber: true })} type="number" placeholder="0" />
                )}
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField name="depositReceived" label="Deposit Received (KES)" error={handoverErrors.depositReceived?.message}>
                {({ id }) => (
                  <TextField id={id} {...registerHandover('depositReceived', { valueAsNumber: true })} type="number" placeholder="0" />
                )}
              </FormField>
              <FormField name="legalRepresentative" label="Legal Representative" error={handoverErrors.legalRepresentative?.message}>
                {({ id }) => (
                  <TextField id={id} {...registerHandover('legalRepresentative')} placeholder="Lawyer/Legal firm name" />
                )}
              </FormField>
            </div>

            {/* Additional Information */}
            <FormField name="riskAssessment" label="Risk Assessment" error={handoverErrors.riskAssessment?.message}>
              {({ id }) => (
                <textarea
                  id={id}
                  {...registerHandover('riskAssessment')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Identify potential risks and mitigation strategies"
                />
              )}
            </FormField>

            <FormField name="propertyConditionNotes" label="Property Condition Notes" error={handoverErrors.propertyConditionNotes?.message}>
              {({ id }) => (
                <textarea
                  id={id}
                  {...registerHandover('propertyConditionNotes')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Current condition and any required improvements"
                />
              )}
            </FormField>

            {/* Expected Profit */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField name="expectedProfit" label="Expected Profit (KES)" error={handoverErrors.expectedProfit?.message}>
                {({ id }) => (
                  <TextField id={id} {...registerHandover('expectedProfit', { valueAsNumber: true })} type="number" placeholder="0" />
                )}
              </FormField>
              <FormField name="expectedProfitPercentage" label="Expected Profit (%)" error={handoverErrors.expectedProfitPercentage?.message}>
                {({ id }) => (
                  <TextField id={id} {...registerHandover('expectedProfitPercentage', { valueAsNumber: true })} type="number" min="0" max="100" placeholder="0" />
                )}
              </FormField>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowHandoverForm(false)
                  setEditingHandover(null)
                  resetHandover()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isHandoverSubmitting}>
                {isHandoverSubmitting ? 'Saving...' : editingHandover ? 'Update Handover' : 'Create Handover'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Handover Stage Modal */}
      {showHandoverStageModal && selectedHandoverStageId && selectedHandoverId && (
        <HandoverStageModal
          isOpen={showHandoverStageModal}
          onClose={() => {
            setShowHandoverStageModal(false)
            setSelectedHandoverStageId(null)
            setSelectedHandoverId(null)
          }}
          stageId={selectedHandoverStageId}
          handoverId={selectedHandoverId}
          stageData={(() => {
            const handover = handovers.find(h => h.id === selectedHandoverId)
            if (!handover?.pipeline_stages) return undefined
            return handover.pipeline_stages.find((stage: any) => stage.stage_id === selectedHandoverStageId)
          })()}
          onStageUpdate={handleHandoverStageUpdate}
        />
      )}
    </div>
  )
}
