'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../../lib/auth-context'
import supabase from '../../lib/supabase-client'
import { Property } from '../../lib/types/database'
import EnhancedPropertyForm from './EnhancedPropertyForm'
import PurchasePipelineManager from './PurchasePipelineManager'
import SubdivisionProcessManager from './SubdivisionProcessManager'
import { Button } from '../ui'
import Modal from '../ui/Modal'
import ViewOnGoogleMapsButton from '@/components/location/ViewOnGoogleMapsButton'

// Phone number validation regex (consistent with tenant validation)
const phoneRegex = /^\+?[0-9\s\-()]+$/

// Handover Pipeline Stage Definitions
export interface HandoverPipelineStage {
  id: number
  name: string
  description: string
  statusOptions: string[]
  requiredFields?: string[]
  estimatedDays?: number
}

export const HANDOVER_PIPELINE_STAGES: HandoverPipelineStage[] = [
  { id: 1, name: 'Initial Handover Preparation', description: 'Property preparation and buyer identification', statusOptions: ['Not Started', 'In Progress', 'Completed', 'On Hold'], requiredFields: ['propertyId', 'buyerName', 'askingPrice'], estimatedDays: 7 },
  { id: 2, name: 'Property Documentation & Survey', description: 'Document preparation and property survey verification', statusOptions: ['Not Started', 'Scheduled', 'In Progress', 'Completed', 'Issues Found'], estimatedDays: 14 },
  { id: 3, name: 'Legal Clearance & Verification', description: 'Legal verification and clearance documentation', statusOptions: ['Not Started', 'Documents Requested', 'Under Review', 'Verified', 'Issues Found'], estimatedDays: 21 },
  { id: 4, name: 'Handover Agreement & Documentation', description: 'Sale agreement preparation and signing', statusOptions: ['Not Started', 'Draft Prepared', 'Under Review', 'Signed', 'Amendments Needed'], estimatedDays: 10 },
  { id: 5, name: 'Payment Processing', description: 'Initial payment and deposit processing', statusOptions: ['Not Started', 'Pending', 'Partial', 'Completed', 'Issues'], estimatedDays: 5 },
  { id: 6, name: 'Final Payment Processing', description: 'Balance payment and final settlement', statusOptions: ['Not Started', 'Pending', 'Partial', 'Completed', 'Issues'], estimatedDays: 7 },
  { id: 7, name: 'LCB & Transfer Forms Processing', description: 'Land Control Board approval and transfer forms', statusOptions: ['Not Started', 'Submitted', 'Under Review', 'Approved', 'Forms Pending'], estimatedDays: 30 },
  { id: 8, name: 'Title Transfer & Registration', description: 'Final title transfer and registration completion', statusOptions: ['Not Started', 'In Progress', 'Registered', 'Completed'], estimatedDays: 14 },
]

// Handover pipeline schema
const handoverPipelineSchema = z.object({
  propertyId: z.string().min(1, 'Please select a property'),
  buyerName: z.string().min(1, 'Buyer name is required'),
  buyerContact: z.string().regex(phoneRegex, 'Enter a valid phone number').optional().or(z.literal('')),
  buyerEmail: z.string().email('Enter a valid email').optional().or(z.literal('')),
  buyerAddress: z.string().optional(),
  askingPrice: z.number().positive('Asking price must be positive').optional(),
  negotiatedPrice: z.number().positive('Negotiated price must be positive').optional(),
  depositReceived: z.number().min(0, 'Deposit cannot be negative').optional(),
  targetCompletionDate: z.string().optional(),
  legalRepresentative: z.string().optional(),
  riskAssessment: z.string().optional(),
  propertyConditionNotes: z.string().optional(),
  expectedProfit: z.number().min(0, 'Expected profit cannot be negative').optional(),
  expectedProfitPercentage: z.number().min(0).max(100, 'Percentage must be between 0-100').optional(),
})

type HandoverPipelineFormValues = z.infer<typeof handoverPipelineSchema>

// Handover Pipeline Stage Data Interface
export interface HandoverPipelineStageData {
  stage_id: number
  status: string
  started_date?: string
  completed_date?: string
  notes: string
  documents: string[]
}

// Handover Item Interface
interface HandoverItem {
  id: string
  property_id: string
  property_name: string
  property_address: string
  property_type: string
  buyer_name?: string
  buyer_contact?: string
  buyer_email?: string
  buyer_address?: string
  asking_price_kes?: number
  negotiated_price_kes?: number
  deposit_received_kes?: number
  balance_due_kes?: number
  handover_status: string
  current_stage: number
  overall_progress: number
  pipeline_stages?: HandoverPipelineStageData[]
  target_completion_date?: string
  actual_completion_date?: string
  legal_representative?: string
  risk_assessment?: string
  property_condition_notes?: string
  expected_profit_kes?: number
  expected_profit_percentage?: number
  created_at: string
  updated_at: string
}

interface PropertyWithLifecycle extends Property {
  property_source?: string
  lifecycle_status?: string
  subdivision_status?: 'NOT_STARTED' | 'SUB_DIVISION_STARTED' | 'SUBDIVIDED'
  source_reference_id?: string
  parent_property_id?: string
  purchase_completion_date?: string
  subdivision_date?: string
  handover_status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  handover_date?: string
  acquisition_notes?: string
  expected_rental_income_kes?: number
  sale_price_kes?: number
  estimated_value_kes?: number
  total_area_sqm?: number
  total_area_acres?: number
}

interface PropertyManagementTabsProps {
  onPropertyCreated?: (propertyId: string) => void
  onRefreshProperties?: () => void
}

export default function PropertyManagementTabs({
  onPropertyCreated,
  onRefreshProperties
}: PropertyManagementTabsProps) {
  useAuth() // Keep auth context active

  // Helper function to handle authentication errors
  const handleAuthError = async (error: any, context: string) => {
    console.error(`Authentication error in ${context}:`, error)

    if (
      error?.message?.includes('Invalid Refresh Token') ||
      error?.message?.includes('Auth session missing') ||
      error?.message?.includes('JWT')
    ) {
      try {
        await supabase.auth.signOut()
      } catch (signOutError) {
        console.error('Error signing out:', signOutError)
      }
      window.location.href = `/auth/login?message=Session expired. Please log in again.&context=${context}`
      return true
    }
    return false
  }

  const [activeTab, setActiveTab] = useState<'properties' | 'purchase' | 'subdivision' | 'handover'>('properties')
  const [properties, setProperties] = useState<PropertyWithLifecycle[]>([])
  const [loading, setLoading] = useState(true)
  const [showPropertyForm, setShowPropertyForm] = useState(false)
  const [editingProperty, setEditingProperty] = useState<PropertyWithLifecycle | null>(null)

  // Handover Pipeline State
  const [handovers, setHandovers] = useState<HandoverItem[]>([])
  const [handoverLoading, setHandoverLoading] = useState(false)
  const [showHandoverForm, setShowHandoverForm] = useState(false)
  const [availableProperties, setAvailableProperties] = useState<Property[]>([])
  const [editingHandover, setEditingHandover] = useState<HandoverItem | null>(null)

  // Handover Form
  const {
    register: registerHandover,
    handleSubmit: handleHandoverSubmit,
    reset: resetHandover,
    watch: watchHandover,
    setValue: setHandoverValue,
    formState: { errors: handoverErrors, isSubmitting: isHandoverSubmitting }
  } = useForm<HandoverPipelineFormValues>({
    resolver: zodResolver(handoverPipelineSchema)
  })

  // Selected property in Handover modal for map preview
  const selectedHandoverPropertyId = watchHandover('propertyId') as string | undefined
  const selectedHandoverProperty = selectedHandoverPropertyId
    ? [...availableProperties, ...properties].find((p: any) => p.id === selectedHandoverPropertyId)
    : undefined

  // State for managing pending changes
  const [pendingChanges, setPendingChanges] = useState<{
    [propertyId: string]: {
      subdivision?: string
      handover?: string
    }
  }>({})
  const [savingChanges, setSavingChanges] = useState<{ [propertyId: string]: boolean }>({})

  useEffect(() => {
    loadProperties()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (activeTab === 'handover') {
      loadHandovers()
      loadAvailableProperties()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'handover') {
      loadAvailableProperties()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties, activeTab])

  const loadProperties = async () => {
    try {
      setLoading(true)
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        const handled = await handleAuthError(authError, 'loadProperties')
        if (handled) return
      }
      if (!user) {
        console.error('No authenticated user found')
        window.location.href = '/auth/login?message=Please log in to access properties.'
        return
      }

      const { data, error } = await supabase
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
        .order('created_at', { ascending: false })

      if (error) throw error
      setProperties((data as PropertyWithLifecycle[]) || [])
    } catch (error) {
      console.error('Error loading properties:', error)
      if (
        error instanceof Error &&
        (error.message?.includes('Invalid Refresh Token') ||
          error.message?.includes('Auth session missing') ||
          error.message?.includes('JWT'))
      ) {
        window.location.href = '/auth/login?message=Session expired. Please log in again.'
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePropertyCreated = (propertyId: string) => {
    loadProperties()
    onPropertyCreated?.(propertyId)
    onRefreshProperties?.()
    setShowPropertyForm(false)
    setEditingProperty(null)
  }

  const handlePropertyTransferred = (propertyId: string) => {
    loadProperties()
    onPropertyCreated?.(propertyId)
    onRefreshProperties?.()
  }

  // Helper functions for managing pending changes
  const hasPendingChanges = (propertyId: string) => {
    const changes = pendingChanges[propertyId]
    const has = !!(changes && (changes.subdivision !== undefined || changes.handover !== undefined))
    return has
  }

  const getPendingSubdivisionValue = (property: PropertyWithLifecycle) => {
    const pending = pendingChanges[property.id]?.subdivision
    if (pending !== undefined) return pending
    switch (property.subdivision_status) {
      case 'SUBDIVIDED':
        return 'Subdivided'
      case 'SUB_DIVISION_STARTED':
        return 'Sub-Division Started'
      case 'NOT_STARTED':
      default:
        return 'Not Started'
    }
  }

  const getPendingHandoverValue = (property: PropertyWithLifecycle) => {
    const pending = pendingChanges[property.id]?.handover
    if (pending !== undefined) return pending
    return property.handover_status === 'COMPLETED'
      ? 'Handed Over'
      : property.handover_status === 'IN_PROGRESS'
      ? 'In Progress'
      : 'Not Started'
  }

  const handleSubdivisionChange = (propertyId: string, value: string) => {
    setPendingChanges(prev => ({ ...prev, [propertyId]: { ...prev[propertyId], subdivision: value } }))
  }

  const handleHandoverChange = (propertyId: string, value: string) => {
    setPendingChanges(prev => ({ ...prev, [propertyId]: { ...prev[propertyId], handover: value } }))
  }

  const cancelChanges = (propertyId: string) => {
    setPendingChanges(prev => {
      const copy = { ...prev }
      delete copy[propertyId]
      return copy
    })
  }

  const saveChanges = async (propertyId: string) => {
    const changes = pendingChanges[propertyId]
    if (!changes) return

    setSavingChanges(prev => ({ ...prev, [propertyId]: true }))

    try {
      const updateData: any = {}
      const property = properties.find(p => p.id === propertyId)
      if (!property) {
        alert('Property not found. Please refresh and try again.')
        setSavingChanges(prev => ({ ...prev, [propertyId]: false }))
        return
      }

      // Subdivision
      if (changes.subdivision !== undefined) {
        const currentSubdivisionValue =
          property.subdivision_status === 'SUBDIVIDED'
            ? 'Subdivided'
            : property.subdivision_status === 'SUB_DIVISION_STARTED'
            ? 'Sub-Division Started'
            : 'Not Started'

        if (currentSubdivisionValue !== changes.subdivision) {
          if (changes.subdivision === 'Subdivided') {
            if (property.lifecycle_status !== 'ACTIVE') {
              alert('Only ACTIVE properties can be marked as subdivided')
              setSavingChanges(prev => ({ ...prev, [propertyId]: false }))
              return
            }
            updateData.lifecycle_status = 'SUBDIVIDED'
            updateData.subdivision_status = 'SUBDIVIDED'
            updateData.subdivision_date = new Date().toISOString().split('T')[0]
          } else if (changes.subdivision === 'Sub-Division Started') {
            updateData.subdivision_status = 'SUB_DIVISION_STARTED'
            if (property.lifecycle_status === 'SUBDIVIDED') updateData.lifecycle_status = 'ACTIVE'
            if (property.subdivision_date) updateData.subdivision_date = null
          } else if (changes.subdivision === 'Not Started') {
            updateData.subdivision_status = 'NOT_STARTED'
            if (property.lifecycle_status === 'SUBDIVIDED') updateData.lifecycle_status = 'ACTIVE'
            if (property.subdivision_date) updateData.subdivision_date = null
          }
        }
      }

      // Handover
      if (changes.handover !== undefined) {
        const currentHandoverValue =
          property.handover_status === 'COMPLETED'
            ? 'Handed Over'
            : property.handover_status === 'IN_PROGRESS'
            ? 'In Progress'
            : 'Not Started'

        if (currentHandoverValue !== changes.handover) {
          let newStatus: string
          let setDate = false
          if (changes.handover === 'Handed Over') {
            newStatus = 'COMPLETED'
            setDate = true
          } else if (changes.handover === 'In Progress') {
            newStatus = 'IN_PROGRESS'
          } else {
            newStatus = 'PENDING'
          }
          updateData.handover_status = newStatus
          updateData.handover_date = setDate ? new Date().toISOString().split('T')[0] : null
        }
      }

      if (Object.keys(updateData).length === 0) {
        cancelChanges(propertyId)
        setSavingChanges(prev => ({ ...prev, [propertyId]: false }))
        return
      }

      // CSRF helper
      const getCsrfToken = () => {
        try {
          const match = document.cookie.split(';').map(p => p.trim()).find(p => p.startsWith('csrf-token='))
          if (!match) return null
          return decodeURIComponent(match.split('=')[1])
        } catch {
          return null
        }
      }

      const csrfToken = getCsrfToken()
      if (!csrfToken) throw new Error('CSRF token not found. Please refresh the page and try again.')

      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        if (
          sessionError.message?.includes('Invalid Refresh Token') ||
          sessionError.message?.includes('Auth session missing') ||
          sessionError.message?.includes('JWT')
        ) {
          try {
            const { error: refreshError } = await supabase.auth.refreshSession()
            if (!refreshError) return saveChanges(propertyId) // retry once
          } catch (_) {}
          alert('Your session has expired. Please log in again.')
          window.location.href = '/auth/login?message=Session expired. Please log in again.'
          return
        }
        throw new Error(`Authentication error: ${sessionError.message}`)
      }

      if (!session) {
        alert('You are not logged in. Please log in to save changes.')
        window.location.href = '/auth/login?message=Please log in to save changes.'
        return
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
      }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

      const response = await fetch(`/api/properties/${propertyId}`, {
        method: 'PATCH',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error('API Error Response:', errorData)
        throw new Error(`Failed to update property: ${response.status} ${response.statusText}`)
      }

      cancelChanges(propertyId)
      await loadProperties()
    } catch (err: any) {
      console.error('Error saving changes:', err)
      if (
        err?.message?.includes('Invalid Refresh Token') ||
        err?.message?.includes('Auth session missing') ||
        err?.message?.includes('JWT') ||
        err?.message?.includes('Authentication error')
      ) {
        alert('Your session has expired. You will be redirected to login.')
        window.location.href = '/auth/login?message=Session expired. Please log in again.'
        return
      }
      if (err?.message?.includes('CSRF token')) {
        alert('Security token expired. Please refresh the page and try again.')
        window.location.reload()
        return
      }
      alert(`Failed to save changes: ${err?.message ?? 'Unknown error'}`)
    } finally {
      setSavingChanges(prev => ({ ...prev, [propertyId]: false }))
    }
  }

  const getSourceIcon = (source?: string) => {
    switch (source) {
      case 'PURCHASE_PIPELINE': return '🏢'
      case 'SUBDIVISION_PROCESS': return '🏗️'
      case 'DIRECT_ADDITION':
      default: return '🏠'
    }
  }

  const getSourceLabel = (source?: string) => {
    switch (source) {
      case 'PURCHASE_PIPELINE': return 'Purchased'
      case 'SUBDIVISION_PROCESS': return 'From Subdivision'
      case 'DIRECT_ADDITION':
      default: return 'Direct Addition'
    }
  }

  const getLifecycleStatusColor = (status?: string) => {
    const colors = {
      ACTIVE: 'bg-green-100 text-green-800',
      SUBDIVIDED: 'bg-purple-100 text-purple-800',
      PURCHASED: 'bg-blue-100 text-blue-800',
      UNDER_DEVELOPMENT: 'bg-yellow-100 text-yellow-800',
      INACTIVE: 'bg-gray-100 text-gray-800',
    } as const
    // @ts-ignore
    return (status && colors[status as keyof typeof colors]) || 'bg-gray-100 text-gray-800'
  }

  // Handover Pipeline Functions
  const initializeHandoverPipelineStages = (): HandoverPipelineStageData[] => {
    return HANDOVER_PIPELINE_STAGES.map(stage => ({
      stage_id: stage.id,
      status: stage.id === 1 ? 'In Progress' : 'Not Started',
      started_date: stage.id === 1 ? new Date().toISOString() : undefined,
      notes: '',
      documents: [],
    }))
  }

  const calculateHandoverProgress = (stageData: HandoverPipelineStageData[]): number => {
    const completedStages = stageData.filter(stage =>
      ['Completed', 'Verified', 'Finalized', 'Processed', 'Approved', 'Signed', 'Registered'].includes(stage.status)
    ).length
    return Math.round((completedStages / HANDOVER_PIPELINE_STAGES.length) * 100)
  }

  const getCurrentHandoverStage = (stageData: HandoverPipelineStageData[]): number => {
    for (let i = 0; i < stageData.length; i++) {
      const stage = stageData[i]
      if (!['Completed', 'Verified', 'Finalized', 'Processed', 'Approved', 'Signed', 'Registered'].includes(stage.status)) {
        return stage.stage_id
      }
    }
    return HANDOVER_PIPELINE_STAGES.length
  }

  const determineHandoverStatus = (stageData: HandoverPipelineStageData[]): string => {
    const progress = calculateHandoverProgress(stageData)
    if (progress === 100) return 'COMPLETED'
    if (progress >= 75) return 'CLOSING'
    if (progress >= 50) return 'FINANCING'
    if (progress >= 25) return 'DUE_DILIGENCE'
    if (progress > 0) return 'NEGOTIATING'
    return 'IDENTIFIED'
  }

  const loadHandovers = async () => {
    try {
      setHandoverLoading(true)
      const { data, error } = await supabase
        .from('handover_pipeline')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setHandovers((data as HandoverItem[]) || [])
    } catch (error) {
      console.error('Error loading handovers:', error)
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
      if (
        error instanceof Error &&
        (error.message?.includes('Invalid Refresh Token') ||
          error.message?.includes('Auth session missing') ||
          error.message?.includes('JWT'))
      ) {
        window.location.href = '/auth/login?message=Session expired. Please log in again.'
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

  const onHandoverSubmit = async (values: HandoverPipelineFormValues) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to manage handovers')
        return
      }

      const selectedProperty = availableProperties.find(p => p.id === values.propertyId)
      if (!selectedProperty) {
        alert('Selected property not found')
        return
      }

      const initialStages = initializeHandoverPipelineStages()
      const currentStageNum = getCurrentHandoverStage(initialStages)
      const overallProgress = calculateHandoverProgress(initialStages)

      const handoverData = {
        property_id: values.propertyId,
        property_name: (selectedProperty as any).name,
        property_address: (selectedProperty as any).physical_address,
        property_type: (selectedProperty as any).property_type,
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
        handover_status: determineHandoverStatus(initialStages),
        created_by: user.id,
      }

      if (editingHandover) {
        const { error } = await supabase.from('handover_pipeline').update(handoverData).eq('id', editingHandover.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('handover_pipeline').insert([handoverData])
        if (error) throw error
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
      loadProperties()
      loadAvailableProperties()
    } catch (error) {
      console.error('Error saving handover:', error)
      alert('Failed to save handover')
    }
  }

  return (
    <div className="space-y-6">
      {/* Interactive Workflow Cards - Primary Navigation */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
        <h2 className="text-xl font-bold text-gray-900 mb-3 text-center">Property Management Workflows</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {/* Direct Addition */}
          <button
            onClick={() => setActiveTab('properties')}
            className={`bg-gradient-to-br rounded-lg py-3 px-3 transition-all duration-200 hover:scale-102 cursor-pointer border-2 ${
              activeTab === 'properties'
                ? 'from-green-100 to-emerald-100 border-green-400 shadow-md ring-2 ring-green-300 ring-opacity-50 scale-102'
                : 'from-green-50 to-emerald-50 border-green-200 hover:shadow-md hover:from-green-100 hover:to-emerald-100'
            }`}
          >
            <div className="flex flex-col items-center text-center space-y-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${activeTab === 'properties' ? 'bg-green-200' : 'bg-green-100'}`}>🏠</div>
              <div>
                <h3 className={`font-bold text-base transition-colors ${activeTab === 'properties' ? 'text-green-900' : 'text-green-800'}`}>Direct Addition</h3>
                <p className={`text-sm mt-1 transition-colors opacity-75 ${activeTab === 'properties' ? 'text-green-700' : 'text-green-600'}`}>Manually create properties with full details and coordinates</p>
              </div>
            </div>
          </button>

          {/* Purchase Pipeline */}
          <button
            onClick={() => setActiveTab('purchase')}
            className={`bg-gradient-to-br rounded-lg py-3 px-3 transition-all duration-200 hover:scale-102 cursor-pointer border-2 ${
              activeTab === 'purchase'
                ? 'from-blue-100 to-cyan-100 border-blue-400 shadow-md ring-2 ring-blue-300 ring-opacity-50 scale-102'
                : 'from-blue-50 to-cyan-50 border-blue-200 hover:shadow-md hover:from-blue-100 hover:to-cyan-100'
            }`}
          >
            <div className="flex flex-col items-center text-center space-y-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${activeTab === 'purchase' ? 'bg-blue-200' : 'bg-blue-100'}`}>🏢</div>
              <div>
                <h3 className={`font-bold text-base transition-colors ${activeTab === 'purchase' ? 'text-blue-900' : 'text-blue-800'}`}>Purchase Pipeline</h3>
                <p className={`text-sm mt-1 transition-colors opacity-75 ${activeTab === 'purchase' ? 'text-blue-700' : 'text-blue-600'}`}>Track acquisitions and transfer completed purchases to properties</p>
              </div>
            </div>
          </button>

          {/* Subdivision Process */}
          <button
            onClick={() => setActiveTab('subdivision')}
            className={`bg-gradient-to-br rounded-lg py-3 px-3 transition-all duration-200 hover:scale-102 cursor-pointer border-2 ${
              activeTab === 'subdivision'
                ? 'from-orange-100 to-amber-100 border-orange-400 shadow-md ring-2 ring-orange-300 ring-opacity-50 scale-102'
                : 'from-orange-50 to-amber-50 border-orange-200 hover:shadow-md hover:from-orange-100 hover:to-amber-100'
            }`}
          >
            <div className="flex flex-col items-center text-center space-y-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${activeTab === 'subdivision' ? 'bg-orange-200' : 'bg-orange-100'}`}>🏗️</div>
              <div>
                <h3 className={`font-bold text-base transition-colors ${activeTab === 'subdivision' ? 'text-orange-900' : 'text-orange-800'}`}>Subdivision Process</h3>
                <p className={`text-sm mt-1 transition-colors opacity-75 ${activeTab === 'subdivision' ? 'text-orange-700' : 'text-orange-600'}`}>Subdivide existing properties into individual manageable plots</p>
              </div>
            </div>
          </button>

          {/* Property Handover */}
          <button
            onClick={() => setActiveTab('handover')}
            className={`bg-gradient-to-br rounded-lg py-3 px-3 transition-all duration-200 hover:scale-102 cursor-pointer border-2 ${
              activeTab === 'handover'
                ? 'from-purple-100 to-violet-100 border-purple-400 shadow-md ring-2 ring-purple-300 ring-opacity-50 scale-102'
                : 'from-purple-50 to-violet-50 border-purple-200 hover:shadow-md hover:from-purple-100 hover:to-violet-100'
            }`}
          >
            <div className="flex flex-col items-center text-center space-y-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${activeTab === 'handover' ? 'bg-purple-200' : 'bg-purple-100'}`}>📋</div>
              <div>
                <h3 className={`font-bold text-base transition-colors ${activeTab === 'handover' ? 'text-purple-900' : 'text-purple-800'}`}>Property Handover</h3>
                <p className={`text-sm mt-1 transition-colors opacity-75 ${activeTab === 'handover' ? 'text-purple-700' : 'text-purple-600'}`}>Manage financial settlements and property handover processes</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'properties' && (
          <div className="space-y-6">
            {/* Properties Header */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Properties Management</h3>
                <p className="text-gray-600">All properties from all creation pathways</p>
              </div>
              <Button
                onClick={() => {
                  setEditingProperty(null)
                  setShowPropertyForm(true)
                }}
                variant="primary"
              >
                <span className="mr-2">🏠</span>
                Add Property Directly
              </Button>
            </div>

            {/* Properties List */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading properties...</p>
              </div>
            ) : properties.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <div className="text-4xl mb-4">🏠</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Properties Yet</h3>
                <p className="text-gray-600 mb-6">Start by adding properties through any of the three pathways above.</p>
                <div className="flex justify-center space-x-3">
                  <Button
                    onClick={() => {
                      setEditingProperty(null)
                      setShowPropertyForm(true)
                    }}
                    variant="primary"
                  >
                    Add Property Directly
                  </Button>
                  <Button onClick={() => setActiveTab('purchase')} variant="secondary">
                    Start Purchase Process
                  </Button>
                  <Button onClick={() => setActiveTab('subdivision')} variant="secondary">
                    Subdivide Property
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-6">
                {properties.map((property) => (
                  // FIX: collapsed/matched wrappers; removed stray divs
                  <div key={property.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start mb-4">
                      <div className="md:col-span-2">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{property.name}</h3>
                          <span className="text-lg">{getSourceIcon(property.property_source)}</span>
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                            {getSourceLabel(property.property_source)}
                          </span>
                          {property.lifecycle_status && (
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getLifecycleStatusColor(property.lifecycle_status)}`}>
                              {property.lifecycle_status.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-2">{property.physical_address}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          <span>Type: {property.property_type?.replace('_', ' ') || 'Unknown'}</span>
                          {property.total_area_acres && <span>Area: {property.total_area_acres} acres</span>}
                          {property.expected_rental_income_kes && (
                            <span>Expected Rent: KES {property.expected_rental_income_kes.toLocaleString()}/month</span>
                          )}
                          {property.purchase_completion_date && (
                            <span>Purchased: {new Date(property.purchase_completion_date).toLocaleDateString()}</span>
                          )}
                          {property.subdivision_date && <span>Subdivided: {new Date(property.subdivision_date).toLocaleDateString()}</span>}
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <ViewOnGoogleMapsButton
                          lat={(property as any).lat ?? null}
                          lng={(property as any).lng ?? null}
                          address={property.physical_address ?? property.name}
                          propertyName={property.name}
                        />
                      </div>
                    </div>

                    {/* Status Dropdowns */}
                    <div className="mt-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Subdivision Status */}
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Subdivision Status</label>
                          <select
                            className="text-sm border rounded px-2 py-1 w-full"
                            value={getPendingSubdivisionValue(property)}
                            onChange={(e) => handleSubdivisionChange(property.id, e.target.value)}
                            disabled={savingChanges[property.id]}
                          >
                            <option>Not Started</option>
                            <option>Sub-Division Started</option>
                            <option>Subdivided</option>
                          </select>
                          {property.subdivision_date && (
                            <div className="text-xs text-gray-500 mt-1">on {new Date(property.subdivision_date).toLocaleDateString()}</div>
                          )}
                        </div>

                        {/* Handover Status */}
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Handover Status</label>
                          <select
                            className="text-sm border rounded px-2 py-1 w-full"
                            value={getPendingHandoverValue(property)}
                            onChange={(e) => handleHandoverChange(property.id, e.target.value)}
                            disabled={savingChanges[property.id]}
                          >
                            <option>Not Started</option>
                            <option>In Progress</option>
                            <option>Handed Over</option>
                          </select>
                          {property.handover_date && (
                            <div className="text-xs text-gray-500 mt-1">on {new Date(property.handover_date).toLocaleDateString()}</div>
                          )}
                        </div>
                      </div>

                      {/* Save/Cancel */}
                      {hasPendingChanges(property.id) && (
                        <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
                          <Button
                            onClick={() => saveChanges(property.id)}
                            disabled={savingChanges[property.id]}
                            variant="primary"
                            size="sm"
                          >
                            {savingChanges[property.id] ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                Saving...
                              </>
                            ) : (
                              'Save Changes'
                            )}
                          </Button>
                          <Button
                            onClick={() => cancelChanges(property.id)}
                            disabled={savingChanges[property.id]}
                            variant="secondary"
                            size="sm"
                          >
                            Cancel
                          </Button>
                          <div className="text-xs text-amber-600">You have unsaved changes</div>
                        </div>
                      )}
                    </div>

                    {property.acquisition_notes && (
                      <p className="text-sm text-gray-600 mt-2 italic">{property.acquisition_notes}</p>
                    )}

                    <div className="flex space-x-2 mt-4">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingProperty(property)
                          setShowPropertyForm(true)
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          window.location.href = `/dashboard/properties/${property.id}`
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'purchase' && <PurchasePipelineManager onPropertyTransferred={handlePropertyTransferred} />}

        {activeTab === 'subdivision' && <SubdivisionProcessManager onPropertyCreated={handlePropertyCreated} />}

        {activeTab === 'handover' && (
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

            {/* Handover List */}
            {handoverLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading handovers...</p>
              </div>
            ) : handovers.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <div className="text-4xl mb-4">🏠</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Handover Opportunities</h3>
                {availableProperties.length === 0 ? (
                  <div>
                    <p className="text-gray-600 mb-4">No properties available for handover.</p>
                    <p className="text-sm text-gray-500 mb-4">You need to create properties first before you can start handover processes.</p>
                    <Button variant="secondary" onClick={() => setActiveTab('properties')}>
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
                {handovers.map((handover) => (
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
                          <span>Stage: {handover.current_stage}/8</span>
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

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                      <div className="bg-purple-600 h-2 rounded-full transition-all duration-300" style={{ width: `${handover.overall_progress}%` }} />
                    </div>

                    {/* Financial Summary */}
                    {(handover.asking_price_kes || handover.expected_profit_kes) && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                        {handover.asking_price_kes && (
                          <div>
                            <p className="text-xs text-gray-500">Asking Price</p>
                            <p className="font-semibold text-green-600">KES {handover.asking_price_kes.toLocaleString()}</p>
                          </div>
                        )}
                        {handover.negotiated_price_kes && (
                          <div>
                            <p className="text-xs text-gray-500">Negotiated Price</p>
                            <p className="font-semibold text-blue-600">KES {handover.negotiated_price_kes.toLocaleString()}</p>
                          </div>
                        )}
                        {handover.expected_profit_kes && (
                          <div>
                            <p className="text-xs text-gray-500">Expected Profit</p>
                            <p className="font-semibold text-purple-600">KES {handover.expected_profit_kes.toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex space-x-2 mt-4">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          alert(`Pipeline management for ${handover.property_name} will be implemented in the next iteration. Current stage: ${handover.current_stage}/8`)
                        }}
                      >
                        Manage Pipeline
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
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
                        }}
                      >
                        Edit Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Enhanced Property Form Modal */}
      <EnhancedPropertyForm
        isOpen={showPropertyForm}
        onSuccess={handlePropertyCreated}
        onCancel={() => {
          setShowPropertyForm(false)
          setEditingProperty(null)
        }}
        property={editingProperty}
        sourceType="DIRECT_ADDITION"
      />

      {/* Handover Form Modal */}
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Property <span className="text-red-500">*</span>
            </label>
            <select
              {...registerHandover('propertyId')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={!!editingHandover}
              defaultValue=""
            >
              <option value="">Select a property...</option>
              {availableProperties.map((property) => (
                <option key={property.id} value={property.id}>
                  {(property as any).name} - {(property as any).physical_address}
                  {(property as any).property_source && ` (${(property as any).property_source.replace('_', ' ')})`}
                  {(property as any).handover_status && ` [${(property as any).handover_status}]`}
                </option>
              ))}
            </select>
            {handoverErrors.propertyId && (
              <p className="mt-1 text-sm text-red-600">{handoverErrors.propertyId.message}</p>
            )}
          </div>

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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buyer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...registerHandover('buyerName')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter buyer's full name"
              />
              {handoverErrors.buyerName && (
                <p className="mt-1 text-sm text-red-600">{handoverErrors.buyerName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Buyer Contact</label>
              <input
                type="text"
                {...registerHandover('buyerContact')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Phone number"
              />
              {handoverErrors.buyerContact && (
                <p className="mt-1 text-sm text-red-600">{handoverErrors.buyerContact.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Buyer Email</label>
              <input
                type="email"
                {...registerHandover('buyerEmail')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="buyer@example.com"
              />
              {handoverErrors.buyerEmail && (
                <p className="mt-1 text-sm text-red-600">{handoverErrors.buyerEmail.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Completion Date</label>
              <input
                type="date"
                {...registerHandover('targetCompletionDate')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Buyer Address</label>
            <textarea
              {...registerHandover('buyerAddress')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Buyer's address"
            />
          </div>

          {/* Financial Details */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Asking Price (KES)</label>
                <input
                  type="number"
                  {...registerHandover('askingPrice', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0"
                />
                {handoverErrors.askingPrice && (
                  <p className="mt-1 text-sm text-red-600">{handoverErrors.askingPrice.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Negotiated Price (KES)</label>
                <input
                  type="number"
                  {...registerHandover('negotiatedPrice', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0"
                />
                {handoverErrors.negotiatedPrice && (
                  <p className="mt-1 text-sm text-red-600">{handoverErrors.negotiatedPrice.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Deposit Received (KES)</label>
                <input
                  type="number"
                  {...registerHandover('depositReceived', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0"
                />
                {handoverErrors.depositReceived && (
                  <p className="mt-1 text-sm text-red-600">{handoverErrors.depositReceived.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Expected Profit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expected Profit (KES)</label>
              <input
                type="number"
                {...registerHandover('expectedProfit', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="0"
              />
              {handoverErrors.expectedProfit && (
                <p className="mt-1 text-sm text-red-600">{handoverErrors.expectedProfit.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expected Profit (%)</label>
              <input
                type="number"
                {...registerHandover('expectedProfitPercentage', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="0"
                min={0}
                max={100}
              />
              {handoverErrors.expectedProfitPercentage && (
                <p className="mt-1 text-sm text-red-600">{handoverErrors.expectedProfitPercentage.message}</p>
              )}
            </div>
          </div>

          {/* Additional Information */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Legal Representative</label>
                <input
                  type="text"
                  {...registerHandover('legalRepresentative')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Lawyer or legal firm handling the transaction"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Property Condition Notes</label>
                <textarea
                  {...registerHandover('propertyConditionNotes')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Current condition of the property, any repairs needed, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Risk Assessment</label>
                <textarea
                  {...registerHandover('riskAssessment')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Potential risks, buyer reliability, market conditions, etc."
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowHandoverForm(false)
                setEditingHandover(null)
                resetHandover()
              }}
              disabled={isHandoverSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isHandoverSubmitting}>
              {isHandoverSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {editingHandover ? 'Updating...' : 'Creating...'}
                </>
              ) : editingHandover ? (
                'Update Handover'
              ) : (
                'Create Handover'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
