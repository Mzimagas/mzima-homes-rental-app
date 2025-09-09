'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, TextField, FormField } from '../../ui'
import Modal from '../../ui/Modal'
import { PropertyWithLifecycle } from '../types/property-management.types'
import supabase from '../../../lib/supabase-client'

// Validation schema for Start Handover form
const startHandoverSchema = z.object({
  buyerName: z.string().min(1, 'Buyer name is required'),
  buyerContact: z.string().min(1, 'Buyer contact is required'),
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

type StartHandoverFormValues = z.infer<typeof startHandoverSchema>

interface StartHandoverFormProps {
  isOpen: boolean
  onClose: () => void
  property: PropertyWithLifecycle
  onSuccess: () => void
}

export default function StartHandoverForm({
  isOpen,
  onClose,
  property,
  onSuccess,
}: StartHandoverFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<StartHandoverFormValues>({
    resolver: zodResolver(startHandoverSchema),
    defaultValues: {
      askingPrice: property.asking_price_kes || undefined,
      expectedProfit: undefined,
      expectedProfitPercentage: undefined,
    },
  })

  const watchedAskingPrice = watch('askingPrice')
  const watchedNegotiatedPrice = watch('negotiatedPrice')

  const onSubmit = async (values: StartHandoverFormValues) => {
    try {
      setIsSubmitting(true)
      setError(null)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setError('Please log in to start handover process')
        return
      }

      // Initialize handover pipeline stages
      const initializeHandoverStages = () => [
        {
          stage_id: 1,
          status: 'In Progress',
          started_date: new Date().toISOString(),
          notes: 'Handover process initiated',
        },
        {
          stage_id: 2,
          status: 'Not Started',
          notes: '',
        },
        {
          stage_id: 3,
          status: 'Not Started',
          notes: '',
        },
        {
          stage_id: 4,
          status: 'Not Started',
          notes: '',
        },
        {
          stage_id: 5,
          status: 'Not Started',
          notes: '',
        },
        {
          stage_id: 6,
          status: 'Not Started',
          notes: '',
        },
        {
          stage_id: 7,
          status: 'Not Started',
          notes: '',
        },
        {
          stage_id: 8,
          status: 'Not Started',
          notes: '',
        },
      ]

      // Create handover pipeline record
      const handoverData = {
        property_id: property.id,
        property_name: property.name,
        property_address: property.physical_address || '',
        property_type: property.property_type || 'HOME',
        buyer_name: values.buyerName,
        buyer_contact: values.buyerContact,
        buyer_email: values.buyerEmail || null,
        buyer_address: values.buyerAddress || null,
        asking_price_kes: values.askingPrice || null,
        negotiated_price_kes: values.negotiatedPrice || null,
        deposit_received_kes: values.depositReceived || null,
        balance_due_kes: values.negotiatedPrice && values.depositReceived 
          ? values.negotiatedPrice - values.depositReceived 
          : null,
        target_completion_date: values.targetCompletionDate || null,
        legal_representative: values.legalRepresentative || null,
        risk_assessment: values.riskAssessment || null,
        property_condition_notes: values.propertyConditionNotes || null,
        expected_profit_kes: values.expectedProfit || null,
        expected_profit_percentage: values.expectedProfitPercentage || null,
        handover_status: 'IN_PROGRESS',
        current_stage: 1,
        overall_progress: 0,
        pipeline_stages: initializeHandoverStages(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data: handover, error: handoverError } = await supabase
        .from('handover_pipeline')
        .insert([handoverData])
        .select()
        .single()

      if (handoverError) {
        throw new Error(`Failed to create handover pipeline: ${handoverError.message}`)
      }

      // Update property handover status
      const { error: propertyUpdateError } = await supabase
        .from('properties')
        .update({
          handover_status: 'IN_PROGRESS',
          updated_at: new Date().toISOString(),
        })
        .eq('id', property.id)

      if (propertyUpdateError) {
        // Try to rollback handover creation
        await supabase.from('handover_pipeline').delete().eq('id', handover.id)
        throw new Error(`Failed to update property status: ${propertyUpdateError.message}`)
      }

      reset()
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Start handover error:', error)
      setError(error instanceof Error ? error.message : 'Failed to start handover process')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      reset()
      setError(null)
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Start Handover - ${property.name}`}
      size="lg"
    >
      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Property Information Section */}
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-3">
              <h3 className="text-lg font-medium text-gray-900">Property Information</h3>
              <p className="text-sm text-gray-600 mt-1">Property details for this handover</p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Property:</span>
                  <span className="ml-2 text-gray-900">{property.name}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Type:</span>
                  <span className="ml-2 text-gray-900">{property.property_type?.replace('_', ' ') || 'Unknown'}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="font-medium text-gray-700">Address:</span>
                  <span className="ml-2 text-gray-900">{property.physical_address}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Buyer Information Section */}
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-3">
              <h3 className="text-lg font-medium text-gray-900">Buyer Information</h3>
              <p className="text-sm text-gray-600 mt-1">Details about the property buyer</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Buyer Name *"
                error={errors.buyerName?.message}
                required
              >
                <TextField
                  {...register('buyerName')}
                  placeholder="Enter buyer's full name"
                  disabled={isSubmitting}
                />
              </FormField>

              <FormField
                label="Buyer Contact *"
                error={errors.buyerContact?.message}
                required
              >
                <TextField
                  {...register('buyerContact')}
                  placeholder="Phone number or contact info"
                  disabled={isSubmitting}
                />
              </FormField>

              <FormField
                label="Buyer Email"
                error={errors.buyerEmail?.message}
              >
                <TextField
                  {...register('buyerEmail')}
                  type="email"
                  placeholder="buyer@example.com"
                  disabled={isSubmitting}
                />
              </FormField>

              <FormField
                label="Buyer Address"
                error={errors.buyerAddress?.message}
              >
                <TextField
                  {...register('buyerAddress')}
                  placeholder="Buyer's address"
                  disabled={isSubmitting}
                />
              </FormField>
            </div>
          </div>

          {/* Financial Information Section */}
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-3">
              <h3 className="text-lg font-medium text-gray-900">Financial Details</h3>
              <p className="text-sm text-gray-600 mt-1">Pricing and financial arrangements</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Asking Price (KES)"
                error={errors.askingPrice?.message}
              >
                <TextField
                  {...register('askingPrice', { valueAsNumber: true })}
                  type="number"
                  placeholder="0"
                  disabled={isSubmitting}
                />
              </FormField>

              <FormField
                label="Negotiated Price (KES)"
                error={errors.negotiatedPrice?.message}
              >
                <TextField
                  {...register('negotiatedPrice', { valueAsNumber: true })}
                  type="number"
                  placeholder="0"
                  disabled={isSubmitting}
                />
              </FormField>

              <FormField
                label="Deposit Received (KES)"
                error={errors.depositReceived?.message}
              >
                <TextField
                  {...register('depositReceived', { valueAsNumber: true })}
                  type="number"
                  placeholder="0"
                  disabled={isSubmitting}
                />
              </FormField>

              <FormField
                label="Target Completion Date"
                error={errors.targetCompletionDate?.message}
              >
                <TextField
                  {...register('targetCompletionDate')}
                  type="date"
                  disabled={isSubmitting}
                />
              </FormField>
            </div>

            {/* Balance Due Calculation */}
            {watchedNegotiatedPrice && watchedNegotiatedPrice > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm text-blue-800">
                  <span className="font-medium">Balance Due: </span>
                  KES {((watchedNegotiatedPrice || 0) - (watch('depositReceived') || 0)).toLocaleString()}
                </div>
              </div>
            )}
          </div>

          {/* Additional Details Section */}
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-3">
              <h3 className="text-lg font-medium text-gray-900">Additional Details</h3>
              <p className="text-sm text-gray-600 mt-1">Optional information for the handover process</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Legal Representative"
                error={errors.legalRepresentative?.message}
              >
                <TextField
                  {...register('legalRepresentative')}
                  placeholder="Lawyer or legal representative"
                  disabled={isSubmitting}
                />
              </FormField>

              <FormField
                label="Expected Profit (KES)"
                error={errors.expectedProfit?.message}
              >
                <TextField
                  {...register('expectedProfit', { valueAsNumber: true })}
                  type="number"
                  placeholder="0"
                  disabled={isSubmitting}
                />
              </FormField>

              <div className="md:col-span-2">
                <FormField
                  label="Risk Assessment"
                  error={errors.riskAssessment?.message}
                >
                  <textarea
                    {...register('riskAssessment')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Identify any potential risks or concerns"
                    disabled={isSubmitting}
                  />
                </FormField>
              </div>

              <div className="md:col-span-2">
                <FormField
                  label="Property Condition Notes"
                  error={errors.propertyConditionNotes?.message}
                >
                  <textarea
                    {...register('propertyConditionNotes')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Notes about property condition, repairs needed, etc."
                    disabled={isSubmitting}
                  />
                </FormField>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Starting Handover...
                </>
              ) : (
                'Start Handover Process'
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
