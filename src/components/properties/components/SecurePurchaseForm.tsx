'use client'

import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { Button, TextField, FormField } from '../../ui'
import Modal from '../../ui/Modal'
import AddressAutocomplete from '../../location/AddressAutocomplete'
import { PropertyTypeEnum } from '../../../lib/validation/property'
import {
  PurchasePipelineFormValues,
} from '../types/purchase-pipeline.types'

interface SecurePurchaseFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (values: PurchasePipelineFormValues, changeRequests?: any[]) => Promise<void>
  editingPurchase?: any
  userRole?: string
}

export default function SecurePurchaseForm({
  isOpen,
  onClose,
  onSubmit,
  editingPurchase,
  userRole,
}: SecurePurchaseFormProps) {
  const [isSuccessionProperty, setIsSuccessionProperty] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PurchasePipelineFormValues>()

  const handleFormSubmit = async (values: PurchasePipelineFormValues) => {
    try {
      await onSubmit(values)
      reset()
      onClose()
    } catch (error) {
      console.error('Error submitting form:', error)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Purchase Opportunity" size="xl">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="bg-blue-50 p-6 rounded-lg mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Create New Purchase Opportunity</h3>
              <p className="text-sm text-gray-600">Add a new property to your purchase pipeline with comprehensive tracking</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Property Type Selection */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-blue-100 p-1 rounded">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="font-medium text-gray-900">Property Type</h4>
            </div>
            <p className="text-sm text-blue-600 mb-4">Choose whether this property involves succession or is a standard purchase</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                !isSuccessionProperty ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
              }`}>
                <input
                  type="radio"
                  name="propertyType"
                  value="without_succession"
                  checked={!isSuccessionProperty}
                  onChange={() => setIsSuccessionProperty(false)}
                  className="sr-only"
                />
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                    !isSuccessionProperty ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                  }`}>
                    {!isSuccessionProperty && (
                      <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Property without Succession</div>
                    <div className="text-sm text-gray-500">Standard property purchase without inheritance matters</div>
                  </div>
                </div>
              </label>

              <label className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                isSuccessionProperty ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
              }`}>
                <input
                  type="radio"
                  name="propertyType"
                  value="with_succession"
                  checked={isSuccessionProperty}
                  onChange={() => setIsSuccessionProperty(true)}
                  className="sr-only"
                />
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                    isSuccessionProperty ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                  }`}>
                    {isSuccessionProperty && (
                      <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Property with Succession</div>
                    <div className="text-sm text-gray-500">Property involving inheritance or succession matters</div>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Succession Property Notice */}
          {isSuccessionProperty && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-orange-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-orange-800">Succession Property Notice</h4>
                  <p className="text-sm text-orange-700 mt-1">
                    This property involves succession matters. Additional documentation and legal processes will be required, including succession case numbers, court tracking, beneficiary information, and required legal documents.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Basic Property Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              name="propertyName"
              label="Property Name"
              error={errors.propertyName?.message}
            >
              {({ id }) => (
                <TextField
                  id={id}
                  {...register('propertyName')}
                  placeholder="e.g., Westlands Apartment Block A"
                  className="w-full"
                />
              )}
            </FormField>

            <FormField
              name="propertyType"
              label="Property Type"
              error={errors.propertyType?.message}
            >
              {({ id }) => (
                <select
                  id={id}
                  {...register('propertyType')}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select property type</option>
                  {PropertyTypeEnum.options.map((type) => (
                    <option key={type} value={type}>
                      {type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
          </div>

          {/* Seller Information Section */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-blue-100 p-1 rounded">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h4 className="font-medium text-gray-900">Seller Information</h4>
            </div>
            <p className="text-sm text-gray-600 mb-4">Contact details and information about the property seller</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                name="sellerName"
                label="Seller Full Name"
                error={errors.sellerName?.message}
              >
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('sellerName')}
                    placeholder="e.g., John Doe or ABC Real Estate Ltd"
                    className="w-full"
                  />
                )}
              </FormField>

              <FormField
                name="sellerPhone"
                label="Phone Number"
                error={errors.sellerPhone?.message}
              >
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('sellerPhone')}
                    placeholder="+254 712 345 678"
                    className="w-full"
                  />
                )}
              </FormField>
            </div>
          </div>

          {/* Financial Information Section */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-blue-100 p-1 rounded">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h4 className="font-medium text-gray-900">Financial Information</h4>
            </div>
            <p className="text-sm text-gray-600 mb-4">Pricing details and financial terms for the purchase</p>

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
                    placeholder="KES10,000"
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
                    placeholder="KES10,000"
                    className="w-full"
                  />
                )}
              </FormField>

              <FormField
                name="depositPaid"
                label="Deposit Paid (KES)"
                error={errors.depositPaid?.message}
              >
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('depositPaid', { valueAsNumber: true })}
                    placeholder="KES6,000"
                    className="w-full"
                  />
                )}
              </FormField>

              <FormField
                name="financingSource"
                label="Financing Source"
                error={errors.financingSource?.message}
              >
                {({ id }) => (
                  <select
                    id={id}
                    {...register('financingSource')}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select financing source</option>
                    <option value="cash">Cash</option>
                    <option value="bank_loan">Bank Loan</option>
                    <option value="mortgage">Mortgage</option>
                    <option value="mixed">Mixed Financing</option>
                    <option value="other">Other</option>
                  </select>
                )}
              </FormField>
            </div>

            {/* Investment Analysis */}
            <div className="mt-6 bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-3">
                <div className="bg-blue-100 p-1 rounded">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h5 className="font-medium text-blue-900">Investment Analysis</h5>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  name="expectedRentalIncome"
                  label="Expected Monthly Rental Income (KES)"
                  error={errors.expectedRentalIncome?.message}
                >
                  {({ id }) => (
                    <TextField
                      id={id}
                      {...register('expectedRentalIncome', { valueAsNumber: true })}
                      placeholder="KES5,000"
                      className="w-full"
                    />
                  )}
                </FormField>

                <FormField
                  name="expectedRoi"
                  label="Expected ROI (%)"
                  error={errors.expectedRoi?.message}
                >
                  {({ id }) => (
                    <TextField
                      id={id}
                      {...register('expectedRoi', { valueAsNumber: true })}
                      placeholder="12.5"
                      className="w-full"
                    />
                  )}
                </FormField>
              </div>
            </div>
          </div>

          {/* Property Address */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Property Address</h4>
            <FormField
              name="propertyAddress"
              label="Physical Address *"
              error={errors.propertyAddress?.message}
            >
              {() => (
                <AddressAutocomplete
                  value={watch('propertyAddress') || ''}
                  onChange={(address) => setValue('propertyAddress', address)}
                  onSelect={(result) => {
                    setValue('propertyAddress', result.address)
                    if (typeof result.lat === 'number' && typeof result.lng === 'number') {
                      setValue('lat', result.lat)
                      setValue('lng', result.lng)
                    }
                  }}
                  allowCurrentLocation={true}
                  label=""
                />
              )}
            </FormField>

            <FormField
              name="coordinates"
              label="Manual coordinates"
              error={errors.lat?.message || errors.lng?.message}
            >
              {({ id }) => (
                <div>
                  <TextField
                    id={id}
                    placeholder="e.g., -1.2921, 36.8219"
                    className="w-full"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">Decimal degrees only, comma optional. Example: -1.2921, 36.8219</p>
                </div>
              )}
            </FormField>
          </div>

          {/* Legal & Administrative Section */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-blue-100 p-1 rounded">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="font-medium text-gray-900">Legal & Administrative</h4>
            </div>
            <p className="text-sm text-gray-600 mb-4">Legal representation, documentation status, and administrative details</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                name="legalRepresentative"
                label="Legal Representative"
                error={errors.legalRepresentative?.message}
              >
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('legalRepresentative')}
                    placeholder="e.g., Kiprotich & Associates Advocates"
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

              <FormField
                name="contractReference"
                label="Contract Reference"
                error={errors.contractReference?.message}
              >
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('contractReference')}
                    placeholder="e.g., SA/2024/001"
                    className="w-full"
                  />
                )}
              </FormField>

              <FormField
                name="titleDeedStatus"
                label="Title Deed Status"
                error={errors.titleDeedStatus?.message}
              >
                {({ id }) => (
                  <select
                    id={id}
                    {...register('titleDeedStatus')}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select status</option>
                    <option value="available">Available</option>
                    <option value="pending">Pending</option>
                    <option value="in_process">In Process</option>
                    <option value="issues_found">Issues Found</option>
                  </select>
                )}
              </FormField>

              <FormField
                name="surveyStatus"
                label="Survey Status"
                error={errors.surveyStatus?.message}
              >
                {({ id }) => (
                  <select
                    id={id}
                    {...register('surveyStatus')}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select status</option>
                    <option value="not_started">Not Started</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="issues_found">Issues Found</option>
                  </select>
                )}
              </FormField>
            </div>
          </div>

          {/* Risk Assessment & Notes Section */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-blue-100 p-1 rounded">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h4 className="font-medium text-gray-900">Risk Assessment & Notes</h4>
            </div>
            <p className="text-sm text-gray-600 mb-4">Property condition assessment and additional observations</p>

            {/* Investment Risk Assessment */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-center space-x-2 mb-3">
                <div className="bg-yellow-100 p-1 rounded">
                  <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h5 className="font-medium text-yellow-800">Investment Risk Assessment</h5>
              </div>

              <FormField
                name="riskAssessment"
                label="Overall Risk Level"
                error={errors.riskAssessment?.message}
              >
                {({ id }) => (
                  <select
                    id={id}
                    {...register('riskAssessment')}
                    className="w-full p-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white"
                  >
                    <option value="">Assess the investment risk level</option>
                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Risk</option>
                    <option value="very_high">Very High Risk</option>
                  </select>
                )}
              </FormField>
            </div>

            <FormField
              name="propertyConditionNotes"
              label="Property Condition & Additional Notes"
              error={errors.propertyConditionNotes?.message}
            >
              {({ id }) => (
                <textarea
                  id={id}
                  {...register('propertyConditionNotes')}
                  rows={4}
                  placeholder="Describe the property condition, any issues found, renovation needs, neighborhood analysis, or additional observations that might affect the investment decision..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              )}
            </FormField>
          </div>

          {/* Hidden coordinate fields */}
          <input type="hidden" {...register('lat', { valueAsNumber: true })} />
          <input type="hidden" {...register('lng', { valueAsNumber: true })} />
          <input type="hidden" {...register('isSuccessionPurchase')} value={isSuccessionProperty.toString()} />

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 disabled:opacity-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="px-6 py-2 text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Creating...</span>
                </div>
              ) : (
                'Create Purchase'
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

