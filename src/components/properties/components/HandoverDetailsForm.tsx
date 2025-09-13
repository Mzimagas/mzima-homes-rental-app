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
  buyerContact: z
    .string()
    .regex(phoneRegex, 'Enter a valid phone number')
    .optional()
    .or(z.literal('')),
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
  expectedProfitPercentage: z
    .number()
    .min(0)
    .max(100, 'Percentage must be between 0-100')
    .optional(),
})

// Client-specific schema (excludes pricing and investment fields)
const clientHandoverSchema = baseHandoverSchema.extend({
  preferredLegalRep: z.enum(['inhouse', 'external', 'undecided'], {
    required_error: 'Please select your legal representation preference',
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
  clientData,
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
      }),
    },
  })

  const watchPreferredLegalRep = watch('preferredLegalRep' as any)

  const handleFormSubmit = async (data: AdminHandoverFormValues | ClientHandoverFormValues) => {
    try {
      await onSubmit(data)
      reset()
      onClose()
    } catch (error) {
      // Form submission error
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      reset()
      onClose()
    }
  }

  const title =
    mode === 'start'
      ? isAdmin
        ? 'Start Handover Process'
        : 'Start Your Property Handover'
      : isAdmin
        ? 'Edit Handover Details'
        : 'Update Your Property Details'

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="xl">
      <div className="p-8 bg-gradient-to-br from-blue-50/30 via-white to-green-50/30">
        {/* Header Section */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-6a1 1 0 00-1-1H9a1 1 0 00-1 1v6a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600">
            {mode === 'start'
              ? isAdmin
                ? 'Initialize the handover process with buyer details and timeline'
                : 'Complete your details to begin the property handover process'
              : 'Update the handover information as needed'}
          </p>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
          {/* Property Information Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-6a1 1 0 00-1-1H9a1 1 0 00-1 1v6a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Property Information</h3>
                <p className="text-sm text-gray-600">
                  Details about the property being handed over
                </p>
              </div>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-start space-x-3">
                <div className="text-blue-500 mt-1">🏠</div>
                <div>
                  <h4 className="font-semibold text-gray-900">{property.name}</h4>
                  <p className="text-gray-600 text-sm">{property.physical_address}</p>
                  {property.asking_price_kes && (
                    <p className="text-green-700 font-semibold mt-1">
                      KES {property.asking_price_kes.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Buyer Information Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {isAdmin ? 'Buyer Information' : 'Your Information'}
                </h3>
                <p className="text-sm text-gray-600">
                  {isAdmin
                    ? 'Details about the property buyer'
                    : 'Please verify and update your contact information'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                name="buyerName"
                label={isAdmin ? 'Buyer Name' : 'Your Full Name'}
                error={errors.buyerName?.message}
                required
              >
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('buyerName')}
                    placeholder={isAdmin ? "Enter buyer's full name" : 'Enter your full name'}
                    className="w-full"
                  />
                )}
              </FormField>

              <FormField
                name="buyerContact"
                label={isAdmin ? 'Buyer Contact' : 'Your Phone Number'}
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
                label={isAdmin ? 'Buyer Email' : 'Your Email'}
                error={errors.buyerEmail?.message}
              >
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('buyerEmail')}
                    type="email"
                    placeholder={isAdmin ? "Enter buyer's email" : 'Enter your email'}
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
              label={isAdmin ? 'Buyer Address' : 'Your Address'}
              error={errors.buyerAddress?.message}
            >
              {({ id }) => (
                <textarea
                  id={id}
                  {...register('buyerAddress')}
                  placeholder={isAdmin ? "Enter buyer's address" : 'Enter your address'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  rows={3}
                />
              )}
            </FormField>
          </div>

          {/* Legal & Administrative Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Legal & Administrative</h3>
                <p className="text-sm text-gray-600">
                  Legal representation and administrative details
                </p>
              </div>
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                    >
                      <option value="undecided">I haven&apos;t decided yet</option>
                      <option value="inhouse">Use your in-house legal team</option>
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
                <p className="text-sm text-gray-600 mt-1">Pricing and payment information</p>
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
                <p className="text-sm text-gray-600 mt-1">Expected returns and risk assessment</p>
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
                  : 'Any observations or concerns about the property condition'}
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
                  placeholder={
                    isAdmin
                      ? 'Enter property condition notes...'
                      : 'Share any observations about the property condition...'
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                />
              )}
            </FormField>
          </div>

          {/* Action Buttons */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="px-8 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 font-medium rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>
                      {mode === 'start'
                        ? isAdmin
                          ? 'Start Handover Process'
                          : 'Begin Handover'
                        : 'Update Details'}
                    </span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  )
}
