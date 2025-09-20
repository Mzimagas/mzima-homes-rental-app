'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '../../ui'
import ViewOnGoogleMapsButton from '../../ui/ViewOnGoogleMapsButton'
import PropertyCard, {
  PropertyCardHeader,
  PropertyCardContent,
  PropertyCardFooter,
} from './PropertyCard'
import HandoverStageModal from './HandoverStageModal'
import PropertySearch from './PropertySearch'
import InlineHandoverView from './InlineHandoverView'
import HandoverDetailsForm from './HandoverDetailsForm'
import PropertyProgressIndicator from './PropertyProgressIndicator'
import { Property } from '../../../lib/types/database'
import supabase from '../../../lib/supabase-client'
import {
  HandoverItem,
  HandoverPipelineFormValues,
  handoverPipelineSchema,
  PropertyWithLifecycle,
} from '../types/property-management.types'
import { useAutoCloseWithCountdown } from '../../../hooks/useAutoClose'
import {
  initializeHandoverPipelineStages,
  calculateHandoverProgress,
  getCurrentHandoverStage,
  determineHandoverStatus,
  isAuthError,
  redirectToLogin,
} from '../utils/property-management.utils'

interface HandoverPipelineManagerProps {
  onHandoverCreated?: () => void
  searchTerm?: string
  onSearchChange?: (searchTerm: string) => void
}

export default function HandoverPipelineManager({
  onHandoverCreated,
  searchTerm = '',
  onSearchChange,
}: HandoverPipelineManagerProps) {
  const [handovers, setHandovers] = useState<HandoverItem[]>([])
  const [propertiesAwaitingStart, setPropertiesAwaitingStart] = useState<Property[]>([])
  const [handoverLoading, setHandoverLoading] = useState(false)
  const [showHandoverForm, setShowHandoverForm] = useState(false)
  const [showStartHandoverForm, setShowStartHandoverForm] = useState(false)
  const [selectedPropertyForStart, setSelectedPropertyForStart] = useState<Property | null>(null)

  const [editingHandover, setEditingHandover] = useState<HandoverItem | null>(null)
  const [selectedHandoverId, setSelectedHandoverId] = useState<string | null>(null)
  const [selectedHandoverStageId, setSelectedHandoverStageId] = useState<number | null>(null)
  const [showHandoverStageModal, setShowHandoverStageModal] = useState(false)
  const [viewingHandoverId, setViewingHandoverId] = useState<string | null>(null)

  // Click-outside functionality for handover details
  const { containerRef } = useAutoCloseWithCountdown(viewingHandoverId !== null, () =>
    setViewingHandoverId(null)
  )

  // Filter handovers and properties based on search term
  const filteredHandovers = useMemo(() => {
    console.log('🔍 Filtering handovers:', {
      totalHandovers: handovers.length,
      searchTerm,
      handoverNames: handovers.map((h) => h.property_name),
    })
    if (!searchTerm.trim()) return handovers

    const lower = searchTerm.toLowerCase()
    const filtered = handovers.filter((handover) => {
      return (
        handover.property_name.toLowerCase().includes(lower) ||
        (handover.property_address?.toLowerCase().includes(lower) ?? false) ||
        (handover.buyer_name?.toLowerCase().includes(lower) ?? false) ||
        (handover.legal_representative?.toLowerCase().includes(lower) ?? false) ||
        (handover.risk_assessment?.toLowerCase().includes(lower) ?? false) ||
        (handover.property_condition_notes?.toLowerCase().includes(lower) ?? false)
      )
    })
    console.log(
      '🔍 Filtered handovers:',
      filtered.map((h) => h.property_name)
    )
    return filtered
  }, [handovers, searchTerm])

  const filteredPropertiesAwaitingStart = useMemo(() => {
    if (!searchTerm.trim()) return propertiesAwaitingStart

    const lower = searchTerm.toLowerCase()
    return propertiesAwaitingStart.filter((property) => {
      return (
        property.name.toLowerCase().includes(lower) ||
        (property.physical_address?.toLowerCase().includes(lower) ?? false)
      )
    })
  }, [propertiesAwaitingStart, searchTerm])

  // Form reset function for cleanup
  const resetHandover = () => {
    // Reset function for form cleanup
  }

  // Helper function to handle authentication errors
  const handleAuthError = async (error: any, context: string) => {
    if (isAuthError(error)) {
      try {
        await supabase.auth.signOut()
      } catch (signOutError) {}
      redirectToLogin(context)
      return true
    }
    return false
  }

  useEffect(() => {
    loadHandovers()
  }, [])

  const loadHandovers = async () => {
    try {
      setHandoverLoading(true)

      // First, load the handover pipeline data (active handovers)
      const { data: handoverData, error: handoverError } = await supabase
        .from('handover_pipeline')
        .select('*')
        .order('created_at', { ascending: false })

      if (handoverError) {
        if (
          handoverError.code === 'PGRST116' ||
          handoverError.message?.includes('does not exist')
        ) {
          // If handover_pipeline table doesn't exist, just load properties with IN_PROGRESS status
          await loadPropertiesWithHandoverStatus()
          return
        }
        throw handoverError
      }

      // Load properties with AWAITING_START handover status (ready to start handover)
      const { data: propertiesAwaitingStart, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('handover_status', 'AWAITING_START')
        .order('name')

      // Also load properties with IN_PROGRESS handover status that might not have pipeline records
      const { data: inProgressProperties, error: inProgressError } = await supabase
        .from('properties')
        .select('*')
        .eq('handover_status', 'IN_PROGRESS')
        .order('name')

      if (propertiesError) {
        console.warn(
          'Error loading properties with AWAITING_START handover status:',
          propertiesError
        )
      }

      if (inProgressError) {
        console.warn('Error loading properties with IN_PROGRESS handover status:', inProgressError)
      }

      // Set properties awaiting start (these are properties ready to begin handover process)
      setPropertiesAwaitingStart(propertiesAwaitingStart || [])

      // Prepare a combined list we will enhance and display
      let combinedHandovers: any[] = handoverData || []

      // For IN_PROGRESS properties without pipeline records, create proper handover records from client data
      if (inProgressProperties && inProgressProperties.length > 0) {
        const existingHandoverPropertyIds = new Set(handoverData?.map((h) => h.property_id) || [])

        // Get missing properties that need handover records
        const missingProperties = inProgressProperties.filter(
          (prop) => !existingHandoverPropertyIds.has(prop.id)
        )

        // Create proper handover records from client interest data
        const missingHandovers = await Promise.all(
          missingProperties.map(async (prop) => {
            // Get client interest data for this property
            const { data: clientInterest } = await supabase
              .from('client_property_interests')
              .select(
                `
                *,
                clients:client_id (
                  full_name,
                  email,
                  phone
                )
              `
              )
              .eq('property_id', prop.id)
              .eq('status', 'CONVERTED')
              .order('updated_at', { ascending: false })
              .limit(1)
              .single()

            const client = clientInterest?.clients
            const hasAgreement = Boolean(clientInterest?.agreement_signed_at)
            const hasDeposit = Boolean(clientInterest?.deposit_paid_at)

            // Map progress signals to a numeric stage index (1-based):
            // 1 = Initial Prep, 2 = Deposit, 3 = Agreement (heuristic mapping)
            const currentStageNum = hasAgreement ? 3 : hasDeposit ? 2 : 1

            return {
              id: `temp-${prop.id}`,
              property_id: prop.id,
              property_name: prop.name,
              property_address: prop.physical_address || 'Address not available',
              property_type: prop.property_type,
              handover_status: 'IN_PROGRESS',
              current_stage: currentStageNum,
              overall_progress: hasAgreement ? 60 : hasDeposit ? 40 : 10,
              buyer_name: client?.full_name || 'Client Name Loading...',
              buyer_contact: client?.phone || '',
              buyer_email: client?.email || '',
              buyer_address: '', // Not available in current schema
              client_id: clientInterest?.client_id || null,
              created_at: clientInterest?.created_at || new Date().toISOString(),
              updated_at: clientInterest?.updated_at || new Date().toISOString(),
              pipeline_stages: [],
              asking_price_kes: prop.asking_price_kes || prop.sale_price_kes || 0,
              negotiated_price_kes: clientInterest?.payment_data?.propertyPrice || null,
              deposit_received_kes: clientInterest?.deposit_amount_kes || null,
              expected_profit_kes: null,
              expected_profit_percentage: null,
              legal_representative: 'To be assigned',
              risk_assessment: null,
              property_condition_notes: null,
              actual_completion_date: null,
              // Additional client portal specific fields
              reservation_date: clientInterest?.reservation_date,
              deposit_paid_at: clientInterest?.deposit_paid_at,
              agreement_signed_at: clientInterest?.agreement_signed_at,
              payment_reference: clientInterest?.payment_reference,
              payment_verified_at: clientInterest?.payment_verified_at,
            }
          })
        )

        combinedHandovers = [...(handoverData || []), ...missingHandovers]
      }

      // Use the combined list (actual + synthesized for gaps)
      const allHandovers = combinedHandovers

      // Get unique property IDs from all handover data
      const propertyIds = allHandovers
        .map((handover) => handover.property_id)
        .filter((id) => id != null && id !== '')

      const propertiesMap = new Map()

      // If we have property IDs, try to fetch the corresponding property data
      if (propertyIds.length > 0) {
        try {
          const { data: propertiesData, error: propertiesError } = await supabase
            .from('properties')
            .select(
              'id, lat, lng, physical_address, purchase_price_agreement_kes, handover_price_agreement_kes'
            )
            .in('id', propertyIds)

          if (propertiesError) {
          } else if (propertiesData) {
            propertiesData.forEach((property) => {
              propertiesMap.set(property.id, property)
            })
          }
        } catch (propertiesError) {
          // Continue without coordinates - this is not a fatal error
        }
      } else {
      }

      // Enhance handover data with property coordinates
      const enhancedData = allHandovers.map((handover) => {
        const property = propertiesMap.get(handover.property_id)
        return {
          ...handover,
          property_lat: property?.lat || null,
          property_lng: property?.lng || null,
          property_physical_address: property?.physical_address || handover.property_address,
          // Use property's handover price as the canonical sale price for handover pipeline
          property_handover_price_agreement_kes: property?.handover_price_agreement_kes || null,
        }
      })

      setHandovers(enhancedData as HandoverItem[])
    } catch (error) {
      console.error('Error loading handovers:', error)
      setHandovers([])
    } finally {
      setHandoverLoading(false)
    }
  }

  // Helper function to load only properties with handover status
  const loadPropertiesWithHandoverStatus = async () => {
    try {
      const { data: propertiesAwaitingStart, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('handover_status', 'AWAITING_START')
        .order('name')

      const { data: inProgressProperties, error: inProgressError } = await supabase
        .from('properties')
        .select('*')
        .eq('handover_status', 'IN_PROGRESS')
        .order('name')

      if (propertiesError) throw propertiesError
      if (inProgressError) throw inProgressError

      // Set properties awaiting start
      setPropertiesAwaitingStart(propertiesAwaitingStart || [])

      // Create mock handover records for IN_PROGRESS properties when pipeline table doesn't exist
      const mockHandovers = (inProgressProperties || []).map((prop) => ({
        id: `temp-${prop.id}`,
        property_id: prop.id,
        property_name: prop.name,
        property_address: prop.physical_address || 'Address not available',
        handover_status: 'IN_PROGRESS',
        current_stage: 'Initial Handover Preparation',
        overall_progress: 0,
        buyer_name: 'Client Name Loading...',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        pipeline_stages: [],
        asking_price_kes:
          prop.handover_price_agreement_kes ||
          prop.purchase_price_agreement_kes ||
          prop.sale_price_kes ||
          0,
        negotiated_price_kes: null,
        expected_profit_kes: null,
        expected_profit_percentage: null,
        legal_representative: null,
        risk_assessment: null,
        property_condition_notes: null,
        actual_completion_date: null,
        client_id: null,
      }))

      setHandovers(mockHandovers)
    } catch (error) {
      console.error('Error loading properties with handover status:', error)
      setHandovers([])
    }
  }

  const handleStartHandover = (property: Property) => {
    setSelectedPropertyForStart(property)
    setShowStartHandoverForm(true)
  }

  const handleStartHandoverSubmit = async (data: any) => {
    if (!selectedPropertyForStart) return

    try {
      // Initialize handover pipeline stages
      const initialStages = initializeHandoverPipelineStages()
      const currentStageNum = getCurrentHandoverStage(initialStages)
      const overallProgress = calculateHandoverProgress(initialStages)

      const handoverData = {
        property_id: selectedPropertyForStart.id,
        property_name: selectedPropertyForStart.name,
        property_address: selectedPropertyForStart.physical_address,
        property_type: selectedPropertyForStart.property_type,
        buyer_name: data.buyerName,
        buyer_contact: data.buyerContact || null,
        buyer_email: data.buyerEmail || null,
        buyer_address: data.buyerAddress || null,
        pipeline_stages: initialStages,
        current_stage: currentStageNum,
        overall_progress: overallProgress,
        handover_status: 'IN_PROGRESS',
        asking_price_kes: data.askingPrice || null,
        negotiated_price_kes: data.negotiatedPrice || null,
        deposit_received_kes: data.depositReceived || null,
        target_completion_date: data.targetCompletionDate || null,
        legal_representative: data.legalRepresentative || null,
        risk_assessment: data.riskAssessment || null,
        property_condition_notes: data.propertyConditionNotes || null,
        expected_profit_kes: data.expectedProfit || null,
        expected_profit_percentage: data.expectedProfitPercentage || null,
      }

      const { error } = await supabase.from('handover_pipeline').insert([handoverData])

      if (error) throw error

      // Refresh the data
      await loadHandovers()

      setShowStartHandoverForm(false)
      setSelectedPropertyForStart(null)

      if (onHandoverCreated) {
        onHandoverCreated()
      }
    } catch (error) {
      console.error('Error starting handover:', error)
      alert('Failed to start handover. Please try again.')
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
          throw initError
        }
      }

      // Update the specific stage
      const updatedStages = currentStages.map((stage) => {
        if (stage.stage_id === stageId) {
          const updatedStage = {
            ...stage,
            status: newStatus,
            notes: notes || stage.notes,
          }

          // Set completion date if stage is being completed
          if (
            [
              'Completed',
              'Verified',
              'Finalized',
              'Processed',
              'Approved',
              'Signed',
              'Registered',
            ].includes(newStatus)
          ) {
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
      const completedStages = updatedStages.filter((stage) =>
        [
          'Completed',
          'Verified',
          'Finalized',
          'Processed',
          'Approved',
          'Signed',
          'Registered',
        ].includes(stage.status)
      ).length
      const overallProgress = Math.round((completedStages / updatedStages.length) * 100)

      // Find current stage (first non-completed stage)
      let currentStage = updatedStages.length // Default to last stage if all completed
      for (let i = 0; i < updatedStages.length; i++) {
        if (
          ![
            'Completed',
            'Verified',
            'Finalized',
            'Processed',
            'Approved',
            'Signed',
            'Registered',
          ].includes(updatedStages[i].status)
        ) {
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
        actual_completion_date:
          handoverStatus === 'COMPLETED' ? new Date().toISOString().split('T')[0] : null,
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
        throw error
      }

      // Reload handovers
      loadHandovers()
      setShowHandoverStageModal(false)
    } catch (error) {
      throw error
    }
  }

  const handleHandoverStageClick = (stageId: number, handoverId: string) => {
    setSelectedHandoverId(handoverId)
    setSelectedHandoverStageId(stageId)
    setShowHandoverStageModal(true)
  }

  const handleMarketplaceStatusChange = async (handoverId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/handover/${handoverId}/marketplace-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          marketplace_status: mapMarketplaceStatusToEnum(newStatus),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update marketplace status')
      }

      // Refresh handover data
      await loadHandovers()

      console.log(`Marketplace status updated to ${newStatus} for handover ${handoverId}`)
    } catch (error) {
      console.error('Error updating marketplace status:', error)
      alert(
        `Failed to update marketplace status: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  const getMarketplaceStatusValue = (handover: any): string => {
    if (!handover.marketplace_status) return 'Not Listed'

    const statusMap: Record<string, string> = {
      NOT_LISTED: 'Not Listed',
      AVAILABLE: 'Available',
      RESERVED: 'Reserved',
      UNDER_CONTRACT: 'Under Contract',
      SOLD: 'Sold',
    }

    return statusMap[handover.marketplace_status] || handover.marketplace_status
  }

  const mapMarketplaceStatusToEnum = (displayValue: string): string => {
    const mapping: Record<string, string> = {
      'Not Listed': 'NOT_LISTED',
      Available: 'AVAILABLE',
      Reserved: 'RESERVED',
      'Under Contract': 'UNDER_CONTRACT',
      Sold: 'SOLD',
    }
    return mapping[displayValue] || 'NOT_LISTED'
  }

  const onHandoverSubmit = async (values: HandoverPipelineFormValues) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to manage handovers')
        return
      }

      // Only allow editing existing handovers
      if (!editingHandover) {
        alert(
          'Creating new handovers is not allowed from this interface. Please use the Properties tab.'
        )
        return
      }

      const initialStages = initializeHandoverPipelineStages()
      const currentStageNum = getCurrentHandoverStage(initialStages)
      const overallProgress = calculateHandoverProgress(initialStages)

      const handoverData = {
        property_id: values.propertyId,
        property_name: editingHandover.property_name,
        property_address: editingHandover.property_address,
        property_type: editingHandover.property_type,
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

      if (editingHandover) {
        const { data: updateResult, error } = await supabase
          .from('handover_pipeline')
          .update(handoverData)
          .eq('id', editingHandover.id)
          .select()

        if (error) {
          if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
            alert('Handover pipeline table does not exist. Please run database migrations first.')
            return
          }
          throw error
        }
      } else {
        const { data: insertResult, error } = await supabase
          .from('handover_pipeline')
          .insert([handoverData])
          .select()

        if (error) {
          if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
            alert('Handover pipeline table does not exist. Please run database migrations first.')
            return
          }
          throw error
        }
      }

      if (handoverData.handover_status === 'COMPLETED') {
        await supabase
          .from('properties')
          .update({
            handover_status: 'COMPLETED',
            handover_date: new Date().toISOString().split('T')[0],
          })
          .eq('id', values.propertyId)
      } else if (handoverData.handover_status === 'IDENTIFIED') {
        await supabase
          .from('properties')
          .update({ handover_status: 'IN_PROGRESS' })
          .eq('id', values.propertyId)
      }

      resetHandover()
      setShowHandoverForm(false)
      setEditingHandover(null)
      loadHandovers()
      onHandoverCreated?.()
    } catch (error) {
      alert('Failed to save handover')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Handover Pipeline</h2>
          <p className="text-gray-600">Manage property handover and sale processes</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center text-sm text-blue-800">
          <span className="mr-2">🔄</span>
          <span>Handover status labels sync with your current pipeline stage progress</span>
        </div>
      </div>

      {/* Search */}
      {onSearchChange && (handovers.length > 0 || propertiesAwaitingStart.length > 0) && (
        <PropertySearch
          onSearchChange={onSearchChange}
          placeholder="Search handovers by property, buyer, or notes..."
          resultsCount={filteredHandovers.length + filteredPropertiesAwaitingStart.length}
          totalCount={handovers.length + propertiesAwaitingStart.length}
        />
      )}

      {/* Properties Awaiting Start Section */}
      {filteredPropertiesAwaitingStart.length > 0 && (
        <div className="mb-8">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Properties Ready to Start Handover
            </h3>
            <p className="text-sm text-gray-600">
              These properties have been marked for handover but need details captured before
              pipeline stages begin.
            </p>
          </div>
          <div className="grid gap-4">
            {filteredPropertiesAwaitingStart.map((property) => (
              <PropertyCard
                key={property.id}
                status="pending"
                interactive={true}
                theme="handover"
                aria-label={`Property awaiting handover start: ${property.name}`}
              >
                <PropertyCardHeader>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                    <div className="md:col-span-2">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{property.name}</h3>
                        <span className="text-lg">🏠</span>
                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-yellow-100 text-yellow-800">
                          Awaiting Start
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">{property.physical_address}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span>Type: {property.property_type}</span>
                        {/* Show Handover Sale Price from property record */}
                        {property.handover_price_agreement_kes ? (
                          <span>
                            Sale Price: KES {property.handover_price_agreement_kes.toLocaleString()}
                          </span>
                        ) : property.asking_price_kes ? (
                          <span>Asking: KES {property.asking_price_kes.toLocaleString()}</span>
                        ) : (
                          <span
                            className="text-orange-600"
                            title="Set handover sale price in handover Financial tab"
                          >
                            Sale Price: Not Set
                          </span>
                        )}
                      </div>

                      {/* Enhanced Property Progress Indicator */}
                      <div className="mt-4">
                        <PropertyProgressIndicator
                          propertyId={property.id}
                          reservationStatus={property.reservation_status}
                          handoverStatus={property.handover_status}
                          compact={true}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <ViewOnGoogleMapsButton
                        source="Handover Pipeline"
                        name={property.name}
                        lat={property.lat ?? null}
                        lng={property.lng ?? null}
                        compact
                      />
                    </div>
                  </div>
                </PropertyCardHeader>
                <PropertyCardFooter>
                  <div className="flex space-x-2">
                    {property.reservation_status === 'RESERVED' ? (
                      <Button variant="secondary" size="sm" disabled>
                        🔒 Reserved
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleStartHandover(property)}
                      >
                        🚀 Start Handover
                      </Button>
                    )}
                  </div>
                </PropertyCardFooter>
              </PropertyCard>
            ))}
          </div>
        </div>
      )}

      {/* Active Handovers Section */}
      {filteredHandovers.length > 0 && (
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Active Handover Pipeline</h3>
          <p className="text-sm text-gray-600">
            Properties currently progressing through the handover pipeline stages.
          </p>
        </div>
      )}

      {/* Handover List */}
      {handoverLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading handovers...</p>
        </div>
      ) : filteredHandovers.length === 0 && filteredPropertiesAwaitingStart.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-4">🏠</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Handover Activities</h3>
          <div>
            <p className="text-gray-600 mb-4">
              No properties are currently in the handover pipeline.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              To start a handover, go to the Properties tab, set a property&apos;s handover status
              to &quot;In Progress&quot;, then complete the handover setup form.
            </p>
            <Button
              variant="secondary"
              onClick={() => (window.location.href = '/dashboard/properties')}
            >
              Go to Properties Tab
            </Button>
          </div>
        </div>
      ) : filteredHandovers.length > 0 ? (
        <div className="grid gap-6">
          {filteredHandovers.map((handover) => (
            <PropertyCard
              key={handover.id}
              status={handover.handover_status}
              interactive={true}
              theme="handover"
              aria-label={`Handover: ${handover.property_name}`}
            >
              <PropertyCardHeader>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <div className="md:col-span-2">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {handover.property_name}
                      </h3>
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
                      {/* Show Handover Sale Price from property record */}
                      {(handover as any).property_handover_price_agreement_kes ? (
                        <span>
                          Sale Price: KES{' '}
                          {(handover as any).property_handover_price_agreement_kes.toLocaleString()}
                        </span>
                      ) : (
                        <span
                          className="text-orange-600"
                          title="Set handover sale price in handover Financial tab"
                        >
                          Sale Price: Not Set
                        </span>
                      )}
                      {handover.negotiated_price_kes && (
                        <span>
                          Negotiated: KES {handover.negotiated_price_kes.toLocaleString()}
                        </span>
                      )}
                      <span>Progress: {handover.overall_progress}%</span>
                    </div>

                    {/* Marketplace Status Dropdown */}
                    <div className="mt-3">
                      <label className="block text-xs text-gray-500 mb-1">Marketplace Status</label>
                      <select
                        value={getMarketplaceStatusValue(handover)}
                        onChange={(e) => handleMarketplaceStatusChange(handover.id, e.target.value)}
                        className="w-full text-xs border border-gray-300 rounded px-2 py-1 bg-white max-w-xs"
                      >
                        <option value="Not Listed">Not Listed</option>
                        <option value="Available">Available</option>
                        <option value="Reserved">Reserved</option>
                        <option value="Under Contract">Under Contract</option>
                        <option value="Sold">Sold</option>
                      </select>

                      {/* Status-specific information */}
                      {handover.marketplace_status === 'AVAILABLE' && (
                        <div className="text-xs text-green-600 mt-1">✅ Visible in marketplace</div>
                      )}
                      {handover.marketplace_status === 'RESERVED' && (
                        <div className="text-xs text-orange-600 mt-1">🔒 Reserved by client</div>
                      )}
                      {handover.marketplace_status === 'SOLD' && (
                        <div className="text-xs text-purple-600 mt-1">🎉 Transaction completed</div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <ViewOnGoogleMapsButton
                      source="Handover Pipeline"
                      name={handover.property_name}
                      lat={(handover as any).property_lat ?? null}
                      lng={(handover as any).property_lng ?? null}
                      compact
                    />
                  </div>
                </div>
              </PropertyCardHeader>

              <PropertyCardFooter>
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
                    onClick={() =>
                      setViewingHandoverId(viewingHandoverId === handover.id ? null : handover.id)
                    }
                  >
                    {viewingHandoverId === handover.id ? 'Hide Details' : 'View Details'}
                  </Button>
                </div>

                {/* Inline Handover Details */}
                {viewingHandoverId === handover.id && (
                  <div ref={containerRef} className="mt-4">
                    <InlineHandoverView
                      handover={handover}
                      onClose={() => setViewingHandoverId(null)}
                      onStageClick={handleHandoverStageClick}
                      onStageUpdate={handleHandoverStageUpdate}
                    />
                  </div>
                )}
              </PropertyCardFooter>
            </PropertyCard>
          ))}
        </div>
      ) : null}

      {/* Edit Handover Form Modal */}
      {showHandoverForm && editingHandover && (
        <HandoverDetailsForm
          isOpen={showHandoverForm}
          onClose={() => {
            setShowHandoverForm(false)
            setEditingHandover(null)
            resetHandover()
          }}
          onSubmit={onHandoverSubmit}
          property={{
            id: editingHandover.property_id,
            name: editingHandover.property_name,
            physical_address: editingHandover.property_address,
            asking_price_kes: editingHandover.asking_price_kes,
          }}
          handover={editingHandover}
          mode="edit"
          context="admin"
        />
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
            const handover = handovers.find((h) => h.id === selectedHandoverId)
            if (!handover?.pipeline_stages) return undefined
            return handover.pipeline_stages.find(
              (stage: any) => stage.stage_id === selectedHandoverStageId
            )
          })()}
          onStageUpdate={handleHandoverStageUpdate}
        />
      )}

      {/* Start Handover Form Modal */}
      {showStartHandoverForm && selectedPropertyForStart && (
        <HandoverDetailsForm
          isOpen={showStartHandoverForm}
          onClose={() => {
            setShowStartHandoverForm(false)
            setSelectedPropertyForStart(null)
          }}
          onSubmit={handleStartHandoverSubmit}
          property={{
            id: selectedPropertyForStart.id,
            name: selectedPropertyForStart.name,
            physical_address: selectedPropertyForStart.physical_address || undefined,
          }}
          mode="start"
          context="admin"
        />
      )}
    </div>
  )
}
