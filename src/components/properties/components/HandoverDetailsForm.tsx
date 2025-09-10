'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, TextField, FormField } from '../../ui'
import Modal from '../../ui/Modal'
import { HandoverItem } from '../types/property-management.types'

// Phone regex for validation
const phoneRegex = /^(\+254|0)[17]\d{8}$/

// Base schema for handover details
const baseHandoverSchema = z.object({
  buyerName: z.string().min(1, 'Buyer name is required'),
  buyerContact: z.string().regex(phoneRegex, 'Enter a valid phone number').optional().or(z.literal('')),
  buyerEmail: z.string().email('Enter a valid email').optional().or(z.literal('')),
  buyerAddress: z.string().optional(),
  targetCompletionDate: z.string().optional(),
  legalRepresentative: z.string().optional(),
  propertyConditionNotes: z.string().optional(),
})

// Admin-specific schema (includes pricing and investment fields)
const adminHandoverSchema = baseHandoverSchema.extend({
  askingPrice: z.number().positive('Asking price must be positive').optional(),
  negotiatedPrice: z.number().positive('Negotiated price must be positive').optional(),
  depositReceived: z.number().min(0, 'Deposit cannot be negative').optional(),
  riskAssessment: z.string().optional(),
  expectedProfit: z.number().min(0, 'Expected profit cannot be negative').optional(),
  expectedProfitPercentage: z.number().min(0).max(100, 'Percentage must be between 0-100').optional(),
})

// Client-specific schema (excludes pricing and investment fields)
const clientHandoverSchema = baseHandoverSchema.extend({
  preferredLegalRep: z.enum(['inhouse', 'external', 'undecided'], {
    required_error: 'Please select your legal representation preference'
  }),
  externalLegalRepName: z.string().optional(),
})

type AdminHandoverFormValues = z.infer<typeof adminHandoverSchema>
type ClientHandoverFormValues = z.infer<typeof clientHandoverSchema>

interface HandoverDetailsFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: AdminHandoverFormValues | ClientHandoverFormValues) => Promise<void>
  property: {
    id: string
    name: string
    physical_address?: string
    asking_price_kes?: number
  }
  handover?: HandoverItem | null
  mode: 'start' | 'edit'
  context: 'admin' | 'client'
  clientData?: {
    full_name?: string
    email?: string
    phone?: string
    address?: string
  }
}

export default function HandoverDetailsForm({
  isOpen,
  onClose,
  onSubmit,
  property,
  handover,
  mode,
  context,
  clientData
}: HandoverDetailsFormProps) {
  const isAdmin = context === 'admin'
  const schema = isAdmin ? adminHandoverSchema : clientHandoverSchema
  
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AdminHandoverFormValues | ClientHandoverFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      // Pre-populate with existing handover data or client data
      buyerName: handover?.buyer_name || clientData?.full_name || '',
      buyerContact: handover?.buyer_contact || clientData?.phone || '',
      buyerEmail: handover?.buyer_email || clientData?.email || '',
      buyerAddress: handover?.buyer_address || clientData?.address || '',
      targetCompletionDate: handover?.target_completion_date || '',
      legalRepresentative: handover?.legal_representative || '',
      propertyConditionNotes: handover?.property_condition_notes || '',
      ...(isAdmin && {
        askingPrice: handover?.asking_price_kes || property.asking_price_kes || undefined,
        negotiatedPrice: handover?.negotiated_price_kes || undefined,
        depositReceived: handover?.deposit_received_kes || undefined,
        riskAssessment: handover?.risk_assessment || '',
        expectedProfit: handover?.expected_profit_kes || undefined,
        expectedProfitPercentage: handover?.expected_profit_percentage || undefined,
      }),
      ...(!isAdmin && {
        preferredLegalRep: 'undecided' as const,
        externalLegalRepName: '',
      })
    }
  })

  const watchPreferredLegalRep = watch('preferredLegalRep' as any)

  const handleFormSubmit = async (data: AdminHandoverFormValues | ClientHandoverFormValues) => {
    try {
      await onSubmit(data)
      reset()
      onClose()
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      reset()
      onClose()
    }
  }

  const title = mode === 'start' 
    ? (isAdmin ? 'Start Handover Process' : 'Complete Your Property Details')
    : (isAdmin ? 'Edit Handover Details' : 'Update Your Property Details')

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="lg"
    >
      <div className="p-8">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
          {/* Property Information Section */}
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-medium text-gray-900">Property Information</h3>
              <p className="text-sm text-gray-600 mt-1">
                {property.name} - {property.physical_address}
              </p>
            </div>
          </div>

          {/* Buyer Information Section */}
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {isAdmin ? 'Buyer Information' : 'Your Information'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {isAdmin 
                  ? 'Details about the property buyer'
                  : 'Please verify and update your contact information'
                }
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                name="buyerName"
                label={isAdmin ? "Buyer Name" : "Your Full Name"}
                error={errors.buyerName?.message}
                required
              >
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('buyerName')}
                    placeholder={isAdmin ? "Enter buyer's full name" : "Enter your full name"}
                    className="w-full"
                  />
                )}
              </FormField>

              <FormField
                name="buyerContact"
                label={isAdmin ? "Buyer Contact" : "Your Phone Number"}
                error={errors.buyerContact?.message}
              >
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('buyerContact')}
                    placeholder="+254712345678 or 0712345678"
                    className="w-full"
                  />
                )}
              </FormField>

              <FormField
                name="buyerEmail"
                label={isAdmin ? "Buyer Email" : "Your Email"}
                error={errors.buyerEmail?.message}
              >
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('buyerEmail')}
                    type="email"
                    placeholder={isAdmin ? "Enter buyer's email" : "Enter your email"}
                    className="w-full"
                  />
                )}
              </FormField>

              <FormField
                name="targetCompletionDate"
                label="Target Completion Date"
                error={errors.targetCompletionDate?.message}
              >
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('targetCompletionDate')}
                    type="date"
                    className="w-full"
                  />
                )}
              </FormField>
            </div>

            <FormField
              name="buyerAddress"
              label={isAdmin ? "Buyer Address" : "Your Address"}
              error={errors.buyerAddress?.message}
            >
              {({ id }) => (
                <textarea
                  id={id}
                  {...register('buyerAddress')}
                  placeholder={isAdmin ? "Enter buyer's address" : "Enter your address"}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              )}
            </FormField>
          </div>

          {/* Legal & Administrative Section */}
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-medium text-gray-900">Legal & Administrative</h3>
              <p className="text-sm text-gray-600 mt-1">
                Legal representation and administrative details
              </p>
            </div>

            {isAdmin ? (
              <FormField
                name="legalRepresentative"
                label="Legal Representative"
                error={errors.legalRepresentative?.message}
              >
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('legalRepresentative')}
                    placeholder="Enter legal representative name"
                    className="w-full"
                  />
                )}
              </FormField>
            ) : (
              <div className="space-y-4">
                <FormField
                  name="preferredLegalRep"
                  label="Legal Representation Preference"
                  error={errors.preferredLegalRep?.message}
                  required
                >
                  {({ id }) => (
                    <select
                      id={id}
                      {...register('preferredLegalRep')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="undecided">I haven't decided yet</option>
                      <option value="inhouse">Use your in-house legal department</option>
                      <option value="external">I have my own legal representative</option>
                    </select>
                  )}
                </FormField>

                {watchPreferredLegalRep === 'external' && (
                  <FormField
                    name="externalLegalRepName"
                    label="Your Legal Representative"
                    error={errors.externalLegalRepName?.message}
                  >
                    {({ id }) => (
                      <TextField
                        id={id}
                        {...register('externalLegalRepName')}
                        placeholder="Enter your legal representative's name"
                        className="w-full"
                      />
                    )}
                  </FormField>
                )}
              </div>
            )}
          </div>

          {/* Admin-only Financial Details Section */}
          {isAdmin && (
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-medium text-gray-900">Financial Details</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Pricing and payment information
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  name="askingPrice"
                  label="Asking Price (KES)"
                  error={errors.askingPrice?.message}
                >
                  {({ id }) => (
                    <TextField
                      id={id}
                      {...register('askingPrice', { valueAsNumber: true })}
                      type="number"
                      placeholder="Enter asking price"
                      className="w-full"
                    />
                  )}
                </FormField>

                <FormField
                  name="negotiatedPrice"
                  label="Negotiated Price (KES)"
                  error={errors.negotiatedPrice?.message}
                >
                  {({ id }) => (
                    <TextField
                      id={id}
                      {...register('negotiatedPrice', { valueAsNumber: true })}
                      type="number"
                      placeholder="Enter negotiated price"
                      className="w-full"
                    />
                  )}
                </FormField>

                <FormField
                  name="depositReceived"
                  label="Deposit Received (KES)"
                  error={errors.depositReceived?.message}
                >
                  {({ id }) => (
                    <TextField
                      id={id}
                      {...register('depositReceived', { valueAsNumber: true })}
                      type="number"
                      placeholder="Enter deposit amount"
                      className="w-full"
                    />
                  )}
                </FormField>
              </div>
            </div>
          )}

          {/* Admin-only Investment Analysis Section */}
          {isAdmin && (
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-medium text-gray-900">Investment Analysis</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Expected returns and risk assessment
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  name="expectedProfit"
                  label="Expected Profit (KES)"
                  error={errors.expectedProfit?.message}
                >
                  {({ id }) => (
                    <TextField
                      id={id}
                      {...register('expectedProfit', { valueAsNumber: true })}
                      type="number"
                      placeholder="Enter expected profit"
                      className="w-full"
                    />
                  )}
                </FormField>

                <FormField
                  name="expectedProfitPercentage"
                  label="Expected Profit (%)"
                  error={errors.expectedProfitPercentage?.message}
                >
                  {({ id }) => (
                    <TextField
                      id={id}
                      {...register('expectedProfitPercentage', { valueAsNumber: true })}
                      type="number"
                      placeholder="Enter expected profit percentage"
                      className="w-full"
                      min="0"
                      max="100"
                    />
                  )}
                </FormField>
              </div>

              <FormField
                name="riskAssessment"
                label="Risk Assessment"
                error={errors.riskAssessment?.message}
              >
                {({ id }) => (
                  <textarea
                    id={id}
                    {...register('riskAssessment')}
                    placeholder="Identify potential risks and mitigation strategies..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                  />
                )}
              </FormField>
            </div>
          )}

          {/* Property Condition Section */}
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-medium text-gray-900">Property Condition</h3>
              <p className="text-sm text-gray-600 mt-1">
                {isAdmin
                  ? 'Current condition and any notes about the property'
                  : 'Any observations or concerns about the property condition'
                }
              </p>
            </div>

            <FormField
              name="propertyConditionNotes"
              label="Property Condition Notes"
              error={errors.propertyConditionNotes?.message}
            >
              {({ id }) => (
                <textarea
                  id={id}
                  {...register('propertyConditionNotes')}
                  placeholder={isAdmin
                    ? "Enter property condition notes..."
                    : "Share any observations about the property condition..."
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                />
              )}
            </FormField>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="px-6 py-2"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="px-6 py-2"
            >
              {isSubmitting
                ? 'Saving...'
                : mode === 'start'
                  ? (isAdmin ? 'Start Handover' : 'Submit Details')
                  : 'Update Details'
              }
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
