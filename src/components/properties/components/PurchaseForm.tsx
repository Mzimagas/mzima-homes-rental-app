'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Button, TextField, FormField } from '../../ui'
import Modal from '../../ui/Modal'
import AddressAutocomplete from '../../location/AddressAutocomplete'
import { PropertyTypeEnum } from '../../../lib/validation/property'
import { PurchasePipelineService } from '../services/purchase-pipeline.service'
import {
  PurchaseFormProps,
  PurchasePipelineFormValues,
  purchasePipelineSchema,
} from '../types/purchase-pipeline.types'

export default function PurchaseForm({
  isOpen,
  onClose,
  editingPurchase,
  onPurchaseCreated,
}: PurchaseFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PurchasePipelineFormValues>({
    resolver: zodResolver(purchasePipelineSchema),
  })

  const propertyAddress = watch('propertyAddress')

  // Reset form when modal opens/closes or when editingPurchase changes
  useEffect(() => {
    if (isOpen) {
      if (editingPurchase) {
                        reset({
          propertyName: editingPurchase.property_name,
          propertyAddress: editingPurchase.property_address,
          propertyType: editingPurchase.property_type as any,
          sellerName: editingPurchase.seller_name || '',
          sellerPhone: editingPurchase.seller_contact || '',
          sellerEmail: editingPurchase.seller_email || '',
          askingPrice: editingPurchase.asking_price_kes || undefined,
          negotiatedPrice: editingPurchase.negotiated_price_kes || undefined,
          depositPaid: editingPurchase.deposit_paid_kes || undefined,
          targetCompletionDate: editingPurchase.target_completion_date || '',
          legalRepresentative: editingPurchase.legal_representative || '',
          financingSource: editingPurchase.financing_source || '',
          contractReference: editingPurchase.contract_reference || '',
          titleDeedStatus: editingPurchase.title_deed_status || '',
          surveyStatus: editingPurchase.survey_status || '',
          expectedRentalIncome: editingPurchase.expected_rental_income_kes || undefined,
          expectedRoi: editingPurchase.expected_roi_percentage || undefined,
          riskAssessment: editingPurchase.risk_assessment || '',
          propertyConditionNotes: editingPurchase.property_condition_notes || '',
        })
      } else {
        reset({
          propertyName: '',
          propertyAddress: '',
          propertyType: 'HOME' as any,
          sellerName: '',
          sellerPhone: '',
          sellerEmail: '',
          askingPrice: undefined,
          negotiatedPrice: undefined,
          depositPaid: undefined,
          targetCompletionDate: '',
          legalRepresentative: '',
          financingSource: '',
          contractReference: '',
          titleDeedStatus: '',
          surveyStatus: '',
          expectedRentalIncome: undefined,
          expectedRoi: undefined,
          riskAssessment: '',
          propertyConditionNotes: '',
        })
      }
    }
  }, [isOpen, editingPurchase, reset])

  const onSubmit = async (values: PurchasePipelineFormValues) => {
    try {
      if (editingPurchase) {
        await PurchasePipelineService.updatePurchase(editingPurchase.id, values)
      } else {
        await PurchasePipelineService.createPurchase(values)
      }

      reset()
      onClose()
      onPurchaseCreated()
    } catch (error) {
            alert('Failed to save purchase')
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editingPurchase ? 'Edit Purchase Opportunity' : 'New Purchase'}
      size="lg"
    >
      <div className="p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Property Information Section */}
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-medium text-gray-900">Property Information</h3>
              <p className="text-sm text-gray-600 mt-1">Basic details about the property you're considering for purchase</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <FormField name="propertyName" label="Property Name" error={errors.propertyName?.message}>
                  {({ id }) => (
                    <TextField
                      id={id}
                      {...register('propertyName')}
                      placeholder="Enter a descriptive name for the property"
                      className="w-full"
                    />
                  )}
                </FormField>
              </div>

              <div className="md:col-span-2">
                <FormField
                  name="propertyAddress"
                  label="Property Address"
                  error={errors.propertyAddress?.message}
                >
                  {({ id }) => (
                    <AddressAutocomplete
                      value={propertyAddress || ''}
                      onChange={(value) => setValue('propertyAddress', value)}
                      onSelect={(result) => {
                        setValue('propertyAddress', result.address)
                      }}
                      label=""
                      error={errors.propertyAddress?.message}
                      placeholder="Enter the property's physical address"
                    />
                  )}
                </FormField>
              </div>

              <FormField name="propertyType" label="Property Type" error={errors.propertyType?.message}>
                {({ id }) => (
                  <select
                    id={id}
                    {...register('propertyType')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select property type</option>
                    {PropertyTypeEnum.options.map((type) => (
                      <option key={type} value={type}>
                        {type.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                )}
              </FormField>
            </div>
          </div>

          {/* Seller Information Section */}
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-medium text-gray-900">Seller Information</h3>
              <p className="text-sm text-gray-600 mt-1">Contact details and information about the property seller</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <FormField name="sellerName" label="Seller Name" error={errors.sellerName?.message}>
                  {({ id }) => (
                    <TextField
                      id={id}
                      {...register('sellerName')}
                      placeholder="Enter seller's full name"
                      className="w-full"
                    />
                  )}
                </FormField>
              </div>

              <FormField name="sellerPhone" label="Seller Phone" error={errors.sellerPhone?.message}>
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('sellerPhone')}
                    placeholder="+254712345678"
                    className="w-full"
                  />
                )}
              </FormField>

              <FormField name="sellerEmail" label="Seller Email" error={errors.sellerEmail?.message}>
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('sellerEmail')}
                    type="email"
                    placeholder="seller@example.com"
                    className="w-full"
                  />
                )}
              </FormField>
            </div>
          </div>

          {/* Financial Information Section */}
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-medium text-gray-900">Financial Information</h3>
              <p className="text-sm text-gray-600 mt-1">Pricing details and financial terms for the purchase</p>
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
                name="depositPaid"
                label="Deposit Paid (KES)"
                error={errors.depositPaid?.message}
              >
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('depositPaid', { valueAsNumber: true })}
                    type="number"
                    placeholder="Enter deposit amount"
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
          </div>

          {/* Legal & Administrative Section */}
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-medium text-gray-900">Legal & Administrative</h3>
              <p className="text-sm text-gray-600 mt-1">Legal representation, documentation status, and administrative details</p>
            </div>

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
                    placeholder="Lawyer/Legal firm name"
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
                  <TextField
                    id={id}
                    {...register('financingSource')}
                    placeholder="Bank, personal funds, etc."
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
                    placeholder="Contract/Agreement number"
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
                  <TextField
                    id={id}
                    {...register('titleDeedStatus')}
                    placeholder="e.g., Verified, Pending, Issues"
                    className="w-full"
                  />
                )}
              </FormField>

              <FormField
                name="surveyStatus"
                label="Survey Status"
                error={errors.surveyStatus?.message}
              >
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('surveyStatus')}
                    placeholder="e.g., Completed, Scheduled, Pending"
                    className="w-full"
                  />
                )}
              </FormField>
            </div>
          </div>

          {/* Investment Analysis Section */}
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-medium text-gray-900">Investment Analysis</h3>
              <p className="text-sm text-gray-600 mt-1">Financial projections and investment viability assessment</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                name="expectedRentalIncome"
                label="Expected Rental Income (KES/month)"
                error={errors.expectedRentalIncome?.message}
              >
                {({ id }) => (
                  <TextField
                    id={id}
                    {...register('expectedRentalIncome', { valueAsNumber: true })}
                    type="number"
                    placeholder="Enter expected monthly rental income"
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
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Enter expected return on investment"
                    className="w-full"
                  />
                )}
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                name="riskAssessment"
                label="Risk Assessment"
                error={errors.riskAssessment?.message}
              >
                {({ id }) => (
                  <textarea
                    id={id}
                    {...register('riskAssessment')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={4}
                    placeholder="Identify potential risks and mitigation strategies..."
                  />
                )}
              </FormField>

              <FormField
                name="propertyConditionNotes"
                label="Property Condition Notes"
                error={errors.propertyConditionNotes?.message}
              >
                {({ id }) => (
                  <textarea
                    id={id}
                    {...register('propertyConditionNotes')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={4}
                    placeholder="Current condition and any required improvements..."
                  />
                )}
              </FormField>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="px-6 py-2"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="px-6 py-2"
            >
              {isSubmitting ? 'Saving...' : editingPurchase ? 'Update Purchase' : 'Create Purchase'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
