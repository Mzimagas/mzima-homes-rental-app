'use client'

import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, TextField, FormField, Select } from '../../ui'
import Modal from '../../ui/Modal'
import AddressAutocomplete from '../../location/AddressAutocomplete'
import { PropertyTypeEnum } from '../../../lib/validation/property'
import {
  PurchasePipelineFormValues,
  purchasePipelineSchema,
} from '../types/purchase-pipeline.types'
import {
  UserIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline'

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
  const [isBrokerInvolved, setIsBrokerInvolved] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    buyer: true,
    seller: true,
    broker: false,
    financial: true,
    legal: false,
    investment: false,
    succession: false,
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PurchasePipelineFormValues>({
    defaultValues: {
      isBrokerInvolved: false,
      isSuccessionPurchase: false,
    },
  })

  const handleFormSubmit = async (values: PurchasePipelineFormValues) => {
    try {
      await onSubmit(values)
      reset()
      onClose()
    } catch (error) {
      console.error('Error submitting form:', error)
    }
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const watchIsBrokerInvolved = watch('isBrokerInvolved')
  const watchIsSuccessionPurchase = watch('isSuccessionPurchase')

  // Update local state when form values change
  useState(() => {
    setIsBrokerInvolved(watchIsBrokerInvolved || false)
    setIsSuccessionProperty(watchIsSuccessionPurchase || false)
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Purchase Opportunity" size="xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6 rounded-xl mb-6 border border-blue-100">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="bg-blue-100 p-3 rounded-xl w-fit">
              <BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Create New Purchase Opportunity</h3>
              <p className="text-sm text-gray-600 mt-1">Track property acquisition from initial contact to completion</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 sm:space-y-6">
          {/* Property Type Selection */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 sm:p-6 rounded-xl border border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-blue-100 p-2 rounded-lg">
                <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Property Type</h4>
                <p className="text-sm text-gray-600">Choose whether this involves succession</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <label className={`relative flex cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 ${
                !isSuccessionProperty
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  {...register('isSuccessionPurchase')}
                  value="false"
                  checked={!isSuccessionProperty}
                  onChange={() => {
                    setIsSuccessionProperty(false)
                    setValue('isSuccessionPurchase', false)
                  }}
                  className="sr-only"
                />
                <div className="flex items-start space-x-3">
                  <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                    !isSuccessionProperty ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                  }`}>
                    {!isSuccessionProperty && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Standard Purchase</div>
                    <div className="text-sm text-gray-600 mt-1">Regular property acquisition</div>
                  </div>
                </div>
              </label>

              <label className={`relative flex cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 ${
                isSuccessionProperty
                  ? 'border-orange-500 bg-orange-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  {...register('isSuccessionPurchase')}
                  value="true"
                  checked={isSuccessionProperty}
                  onChange={() => {
                    setIsSuccessionProperty(true)
                    setValue('isSuccessionPurchase', true)
                  }}
                  className="sr-only"
                />
                <div className="flex items-start space-x-3">
                  <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                    isSuccessionProperty ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
                  }`}>
                    {isSuccessionProperty && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Succession Property</div>
                    <div className="text-sm text-gray-600 mt-1">Involves inheritance matters</div>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Succession Property Notice */}
          {isSuccessionProperty && (
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-l-4 border-orange-400 p-4 rounded-r-xl">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <DocumentTextIcon className="w-5 h-5 text-orange-600 mt-0.5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-orange-800">Succession Property Notice</h4>
                  <p className="text-sm text-orange-700 mt-1">
                    Additional legal documentation required: succession case numbers, court tracking, beneficiary information, and legal documents.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Basic Property Information */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <MapPinIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Property Details</h4>
                  <p className="text-sm text-gray-600">Basic property information</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <FormField
                name="propertyName"
                label="Property Name *"
                error={errors.propertyName?.message}
              >
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('propertyName')}
                    placeholder="Enter property name"
                    className="w-full"
                  />
                )}
              </FormField>

              <FormField
                name="propertyType"
                label="Property Type *"
                error={errors.propertyType?.message}
              >
                {({ id }) => (
                  <Select
                    id={id}
                    {...register('propertyType')}
                    className="w-full"
                  >
                    <option value="">Select property type</option>
                    <option value="LAND">Land</option>
                    <option value="HOUSE">House</option>
                    <option value="APARTMENT">Apartment</option>
                    <option value="COMMERCIAL">Commercial</option>
                    <option value="TOWNHOUSE">Townhouse</option>
                  </Select>
                )}
              </FormField>

              <div className="lg:col-span-2">
                <FormField
                  name="propertyAddress"
                  label="Property Address *"
                  error={errors.propertyAddress?.message}
                >
                  {({ id }) => (
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
                      label=""
                      allowCurrentLocation={true}
                      error={errors.propertyAddress?.message}
                    />
                  )}
                </FormField>
              </div>
            </div>
          </div>

          {/* Buyer Information Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <UserIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Buyer Information</h4>
                  <p className="text-sm text-gray-600">Details will transfer to registered title owner when complete</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <FormField
                name="buyerName"
                label="Buyer Full Name *"
                error={errors.buyerName?.message}
              >
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('buyerName')}
                    placeholder="Enter buyer's full legal name"
                    className="w-full"
                  />
                )}
              </FormField>

              <FormField
                name="buyerIdNumber"
                label="ID/Passport Number"
                error={errors.buyerIdNumber?.message}
              >
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('buyerIdNumber')}
                    placeholder="Enter ID or passport number"
                    className="w-full"
                  />
                )}
              </FormField>

              <FormField
                name="buyerPhone"
                label="Phone Number"
                error={errors.buyerPhone?.message}
              >
                {({ id }) => (
                  <div className="relative">
                    <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <TextField
                      id={id}
                      {...register('buyerPhone')}
                      placeholder="+254 700 000 000"
                      className="w-full pl-10"
                    />
                  </div>
                )}
              </FormField>

              <FormField
                name="buyerEmail"
                label="Email Address"
                error={errors.buyerEmail?.message}
              >
                {({ id }) => (
                  <div className="relative">
                    <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <TextField
                      id={id}
                      {...register('buyerEmail')}
                      placeholder="buyer@example.com"
                      className="w-full pl-10"
                    />
                  </div>
                )}
              </FormField>

              <div className="lg:col-span-2">
                <FormField
                  name="buyerAddress"
                  label="Buyer Address"
                  error={errors.buyerAddress?.message}
                >
                  {({ id }) => (
                    <textarea
                      id={id}
                      {...register('buyerAddress')}
                      placeholder="Enter buyer's physical address"
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                  )}
                </FormField>
              </div>
            </div>
          </div>

          {/* Seller Information Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <UserIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Seller Information</h4>
                  <p className="text-sm text-gray-600">Property owner contact details</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <FormField
                name="sellerName"
                label="Seller Full Name *"
                error={errors.sellerName?.message}
              >
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('sellerName')}
                    placeholder="Enter seller's full name"
                    className="w-full"
                  />
                )}
              </FormField>

              <FormField
                name="sellerIdNumber"
                label="National ID Number *"
                error={errors.sellerIdNumber?.message}
              >
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('sellerIdNumber')}
                    placeholder="National ID or Passport number"
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
                  <div className="relative">
                    <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <TextField
                      id={id}
                      {...register('sellerPhone')}
                      placeholder="+254 700 000 000"
                      className="w-full pl-10"
                    />
                  </div>
                )}
              </FormField>

              <FormField
                name="sellerEmail"
                label="Email Address"
                error={errors.sellerEmail?.message}
              >
                {({ id }) => (
                  <div className="relative">
                    <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <TextField
                      id={id}
                      {...register('sellerEmail')}
                      placeholder="seller@example.com"
                      className="w-full pl-10"
                    />
                  </div>
                )}
              </FormField>

              <div className="lg:col-span-1">
                <FormField
                  name="sellerAddress"
                  label="Seller Address"
                  error={errors.sellerAddress?.message}
                >
                  {({ id }) => (
                    <textarea
                      id={id}
                      {...register('sellerAddress')}
                      placeholder="Enter seller's address"
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                  )}
                </FormField>
              </div>
            </div>

            {/* Broker/Witness Toggle */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center space-x-3 mb-4">
                <input
                  type="checkbox"
                  id="isBrokerInvolved"
                  {...register('isBrokerInvolved')}
                  onChange={(e) => {
                    setIsBrokerInvolved(e.target.checked)
                    setValue('isBrokerInvolved', e.target.checked)
                  }}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <label htmlFor="isBrokerInvolved" className="text-sm font-medium text-gray-900">
                  Broker/Agent Involved or Witness Required
                </label>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Check this if there's a real estate broker/agent involved or if you need witness information
              </p>

              {(isBrokerInvolved || watchIsBrokerInvolved) && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h5 className="font-medium text-gray-900 mb-4">Broker/Agent/Witness Details</h5>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <FormField
                      name="brokerName"
                      label="Name"
                      error={errors.brokerName?.message}
                    >
                      {({ id }) => (
                        <TextField
                          id={id}
                          {...register('brokerName')}
                          placeholder="Broker/agent/witness name"
                          className="w-full"
                        />
                      )}
                    </FormField>

                    <FormField
                      name="brokerPhone"
                      label="Phone Number"
                      error={errors.brokerPhone?.message}
                    >
                      {({ id }) => (
                        <div className="relative">
                          <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <TextField
                            id={id}
                            {...register('brokerPhone')}
                            placeholder="+254 700 000 000"
                            className="w-full pl-10"
                          />
                        </div>
                      )}
                    </FormField>

                    <FormField
                      name="brokerEmail"
                      label="Email Address"
                      error={errors.brokerEmail?.message}
                    >
                      {({ id }) => (
                        <div className="relative">
                          <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <TextField
                            id={id}
                            {...register('brokerEmail')}
                            placeholder="broker@example.com"
                            className="w-full pl-10"
                          />
                        </div>
                      )}
                    </FormField>

                    <FormField
                      name="brokerCompany"
                      label="Company/Organization"
                      error={errors.brokerCompany?.message}
                    >
                      {({ id }) => (
                        <TextField
                          id={id}
                          {...register('brokerCompany')}
                          placeholder="Real estate company name"
                          className="w-full"
                        />
                      )}
                    </FormField>

                    <div className="lg:col-span-2">
                      <FormField
                        name="brokerIdNumber"
                        label="ID Number (if applicable)"
                        error={errors.brokerIdNumber?.message}
                      >
                        {({ id }) => (
                          <TextField
                            id={id}
                            {...register('brokerIdNumber')}
                            placeholder="National ID or other identification"
                            className="w-full"
                          />
                        )}
                      </FormField>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Financial Information Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Financial Information</h4>
                  <p className="text-sm text-gray-600">Pricing and payment details</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <FormField
                name="askingPrice"
                label="Asking Price (KES)"
                error={errors.askingPrice?.message}
              >
                {({ id }) => (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">KES</span>
                    <TextField
                      id={id}
                      {...register('askingPrice', { valueAsNumber: true })}
                      placeholder="1,000,000"
                      className="w-full pl-12"
                    />
                  </div>
                )}
              </FormField>

              <FormField
                name="negotiatedPrice"
                label="Negotiated Price (KES)"
                error={errors.negotiatedPrice?.message}
              >
                {({ id }) => (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">KES</span>
                    <TextField
                      id={id}
                      {...register('negotiatedPrice', { valueAsNumber: true })}
                      placeholder="950,000"
                      className="w-full pl-12"
                    />
                  </div>
                )}
              </FormField>

              <FormField
                name="depositPaid"
                label="Deposit Paid (KES)"
                error={errors.depositPaid?.message}
              >
                {({ id }) => (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">KES</span>
                    <TextField
                      id={id}
                      {...register('depositPaid', { valueAsNumber: true })}
                      placeholder="100,000"
                      className="w-full pl-12"
                    />
                  </div>
                )}
              </FormField>

              <div className="lg:col-span-2">
                <FormField
                  name="financingSource"
                  label="Financing Source"
                  error={errors.financingSource?.message}
                >
                  {({ id }) => (
                    <Select
                      id={id}
                      {...register('financingSource')}
                      className="w-full"
                    >
                      <option value="">Select financing source</option>
                      <option value="CASH">Cash Payment</option>
                      <option value="BANK_LOAN">Bank Loan</option>
                      <option value="SACCO_LOAN">SACCO Loan</option>
                      <option value="MORTGAGE">Mortgage</option>
                      <option value="MIXED">Mixed Sources</option>
                      <option value="OTHER">Other</option>
                    </Select>
                  )}
                </FormField>
              </div>

              <FormField
                name="targetCompletionDate"
                label="Target Completion Date"
                error={errors.targetCompletionDate?.message}
              >
                {({ id }) => (
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <TextField
                      id={id}
                      {...register('targetCompletionDate')}
                      type="date"
                      className="w-full pl-10"
                    />
                  </div>
                )}
              </FormField>
            </div>
          </div>
          {/* Investment Analysis Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <DocumentTextIcon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Investment Analysis</h4>
                  <p className="text-sm text-gray-600">Expected returns and property assessment</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <FormField
                name="expectedRentalIncome"
                label="Expected Monthly Rental Income (KES)"
                error={errors.expectedRentalIncome?.message}
              >
                {({ id }) => (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">KES</span>
                    <TextField
                      id={id}
                      {...register('expectedRentalIncome', { valueAsNumber: true })}
                      placeholder="50,000"
                      className="w-full pl-12"
                    />
                  </div>
                )}
              </FormField>

              <FormField
                name="expectedRoi"
                label="Expected ROI (%)"
                error={errors.expectedRoi?.message}
              >
                {({ id }) => (
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">%</span>
                    <TextField
                      id={id}
                      {...register('expectedRoi', { valueAsNumber: true })}
                      placeholder="12.5"
                      className="w-full pr-8"
                    />
                  </div>
                )}
              </FormField>

              <div className="lg:col-span-2">
                <FormField
                  name="riskAssessment"
                  label="Risk Assessment"
                  error={errors.riskAssessment?.message}
                >
                  {({ id }) => (
                    <textarea
                      id={id}
                      {...register('riskAssessment')}
                      placeholder="Describe potential risks and mitigation strategies..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                  )}
                </FormField>
              </div>

              <div className="lg:col-span-2">
                <FormField
                  name="propertyConditionNotes"
                  label="Property Condition Notes"
                  error={errors.propertyConditionNotes?.message}
                >
                  {({ id }) => (
                    <textarea
                      id={id}
                      {...register('propertyConditionNotes')}
                      placeholder="Describe the current condition of the property..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                  )}
                </FormField>
              </div>
            </div>
          </div>

          {/* Succession Fields - Only show if succession property */}
          {(isSuccessionProperty || watchIsSuccessionPurchase) && (
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <DocumentTextIcon className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Succession Information</h4>
                    <p className="text-sm text-gray-600">Legal details for inheritance property</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <FormField
                  name="deceasedOwnerName"
                  label="Deceased Owner Name"
                  error={errors.deceasedOwnerName?.message}
                >
                  {({ id }) => (
                    <TextField
                      id={id}
                      {...register('deceasedOwnerName')}
                      placeholder="Full name of deceased owner"
                      className="w-full"
                    />
                  )}
                </FormField>

                <FormField
                  name="deceasedOwnerId"
                  label="Deceased Owner ID Number"
                  error={errors.deceasedOwnerId?.message}
                >
                  {({ id }) => (
                    <TextField
                      id={id}
                      {...register('deceasedOwnerId')}
                      placeholder="ID number of deceased owner"
                      className="w-full"
                    />
                  )}
                </FormField>

                <FormField
                  name="dateOfDeath"
                  label="Date of Death"
                  error={errors.dateOfDeath?.message}
                >
                  {({ id }) => (
                    <div className="relative">
                      <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <TextField
                        id={id}
                        {...register('dateOfDeath')}
                        type="date"
                        className="w-full pl-10"
                      />
                    </div>
                  )}
                </FormField>

                <FormField
                  name="successionCourt"
                  label="Succession Court"
                  error={errors.successionCourt?.message}
                >
                  {({ id }) => (
                    <TextField
                      id={id}
                      {...register('successionCourt')}
                      placeholder="e.g., Nairobi High Court"
                      className="w-full"
                    />
                  )}
                </FormField>

                <FormField
                  name="successionCaseNumber"
                  label="Succession Case Number"
                  error={errors.successionCaseNumber?.message}
                >
                  {({ id }) => (
                    <TextField
                      id={id}
                      {...register('successionCaseNumber')}
                      placeholder="Court case reference number"
                      className="w-full"
                    />
                  )}
                </FormField>

                <div className="lg:col-span-1">
                  <FormField
                    name="successionNotes"
                    label="Succession Notes"
                    error={errors.successionNotes?.message}
                  >
                    {({ id }) => (
                      <textarea
                        id={id}
                        {...register('successionNotes')}
                        placeholder="Additional succession details..."
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      />
                    )}
                  </FormField>
                </div>
              </div>
            </div>
          )}

          {/* Legal & Administrative Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-gray-100 p-2 rounded-lg">
                  <DocumentTextIcon className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Legal & Administrative</h4>
                  <p className="text-sm text-gray-600">Documentation and legal details</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <FormField
                name="legalRepresentative"
                label="Legal Representative"
                error={errors.legalRepresentative?.message}
              >
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('legalRepresentative')}
                    placeholder="Law firm or advocate name"
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
                    placeholder="Contract or agreement reference"
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
                  <Select
                    id={id}
                    {...register('titleDeedStatus')}
                    className="w-full"
                  >
                    <option value="">Select status</option>
                    <option value="AVAILABLE">Available</option>
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROCESS">In Process</option>
                    <option value="ISSUES_FOUND">Issues Found</option>
                  </Select>
                )}
              </FormField>

              <FormField
                name="surveyStatus"
                label="Survey Status"
                error={errors.surveyStatus?.message}
              >
                {({ id }) => (
                  <Select
                    id={id}
                    {...register('surveyStatus')}
                    className="w-full"
                  >
                    <option value="">Select status</option>
                    <option value="NOT_STARTED">Not Started</option>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ISSUES_FOUND">Issues Found</option>
                  </Select>
                )}
              </FormField>
            </div>
          </div>

          {/* Hidden coordinate fields */}
          <input type="hidden" {...register('lat', { valueAsNumber: true })} />
          <input type="hidden" {...register('lng', { valueAsNumber: true })} />

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 disabled:opacity-50 transition-colors"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 py-3 text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Creating Purchase Opportunity...</span>
                </div>
              ) : (
                'Create Purchase Opportunity'
              )}
            </Button>
          </div>

        </form>
      </div>
    </Modal>
  )
}

