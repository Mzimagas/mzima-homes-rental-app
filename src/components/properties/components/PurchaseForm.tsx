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
        console.log('Editing purchase data:', editingPurchase)
        console.log('Property condition notes:', editingPurchase.property_condition_notes)
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
      console.error('Error saving purchase:', error)
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
      title={editingPurchase ? 'Edit Purchase Opportunity' : 'Add Purchase Opportunity'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Property Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Property Information</h3>

          <FormField name="propertyName" label="Property Name" error={errors.propertyName?.message}>
            {({ id }) => (
              <TextField id={id} {...register('propertyName')} placeholder="Enter property name" />
            )}
          </FormField>

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
              />
            )}
          </FormField>

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

        {/* Seller Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Seller Information</h3>

          <FormField name="sellerName" label="Seller Name" error={errors.sellerName?.message}>
            {({ id }) => (
              <TextField
                id={id}
                {...register('sellerName')}
                placeholder="Enter seller's full name"
              />
            )}
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField name="sellerPhone" label="Seller Phone" error={errors.sellerPhone?.message}>
              {({ id }) => (
                <TextField id={id} {...register('sellerPhone')} placeholder="Phone number" />
              )}
            </FormField>

            <FormField name="sellerEmail" label="Seller Email" error={errors.sellerEmail?.message}>
              {({ id }) => (
                <TextField
                  id={id}
                  {...register('sellerEmail')}
                  type="email"
                  placeholder="seller@example.com"
                />
              )}
            </FormField>
          </div>
        </div>

        {/* Financial Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Financial Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  placeholder="0"
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
                  placeholder="0"
                />
              )}
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  placeholder="0"
                />
              )}
            </FormField>

            <FormField
              name="targetCompletionDate"
              label="Target Completion Date"
              error={errors.targetCompletionDate?.message}
            >
              {({ id }) => <TextField id={id} {...register('targetCompletionDate')} type="date" />}
            </FormField>
          </div>
        </div>

        {/* Additional Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                />
              )}
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                />
              )}
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  placeholder="0"
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
                  placeholder="0"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Identify potential risks and mitigation strategies"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Current condition and any required improvements"
              />
            )}
          </FormField>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : editingPurchase ? 'Update Purchase' : 'Create Purchase'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
