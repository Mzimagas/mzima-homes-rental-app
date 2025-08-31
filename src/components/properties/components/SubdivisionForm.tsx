/**
 * Subdivision Form Component
 * Form for creating and editing subdivision plans
 */

'use client'

import React, { memo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { SubdivisionFormProps } from '../../../types/subdivision'
import { subdivisionSchema, SubdivisionFormValues } from '../../../lib/validation/subdivision'
import { Button, TextField, FormField } from '../../ui'
import Modal from '../../ui/Modal'

const SubdivisionForm: React.FC<SubdivisionFormProps> = memo(({
  isOpen,
  onClose,
  onSubmit,
  property,
  subdivision,
  isLoading = false,
  error
}) => {
  const isEditing = Boolean(subdivision)
  
  const form = useForm<SubdivisionFormValues>({
    resolver: zodResolver(subdivisionSchema),
    defaultValues: {
      subdivisionName: '',
      totalPlotsPlanned: 10,
      surveyorName: '',
      surveyorContact: '',
      approvalAuthority: '',
      surveyCost: 0,
      approvalFees: 0,
      expectedPlotValue: 0,
      targetCompletionDate: '',
      subdivisionNotes: '',
    }
  })

  // Reset form when modal opens/closes or subdivision changes
  useEffect(() => {
    if (isOpen && subdivision) {
      // Populate form with existing subdivision data
      form.reset({
        subdivisionName: subdivision.subdivision_name || '',
        totalPlotsPlanned: subdivision.total_plots_planned || 10,
        surveyorName: subdivision.surveyor_name || '',
        surveyorContact: subdivision.surveyor_contact || '',
        approvalAuthority: subdivision.approval_authority || '',
        surveyCost: subdivision.survey_cost_kes || 0,
        approvalFees: subdivision.approval_fees_kes || 0,
        expectedPlotValue: subdivision.expected_plot_value_kes || 0,
        targetCompletionDate: subdivision.target_completion_date || '',
        subdivisionNotes: subdivision.subdivision_notes || '',
      })
    } else if (isOpen && !subdivision) {
      // Reset to default values for new subdivision
      form.reset({
        subdivisionName: property ? `${property.name} Subdivision` : '',
        totalPlotsPlanned: 10,
        surveyorName: '',
        surveyorContact: '',
        approvalAuthority: '',
        surveyCost: 0,
        approvalFees: 0,
        expectedPlotValue: 0,
        targetCompletionDate: '',
        subdivisionNotes: '',
      })
    }
  }, [isOpen, subdivision, property, form])

  const handleSubmit = async (values: SubdivisionFormValues) => {
    try {
      await onSubmit(values)
      form.reset()
    } catch (error) {
      // Error handling is managed by parent component
      console.error('Form submission error:', error)
    }
  }

  const handleClose = () => {
    form.reset()
    onClose()
  }

  const title = isEditing 
    ? 'Edit Subdivision Plan'
    : 'Start Subdivision Pipeline'

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="lg"
    >
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex">
              <div className="text-red-400 text-sm">⚠️</div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Property Info */}
        {property && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <h4 className="text-sm font-medium text-blue-900">Property</h4>
            <p className="text-sm text-blue-700">{property.name}</p>
            <p className="text-xs text-blue-600">{property.physical_address}</p>
          </div>
        )}

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            name="subdivisionName"
            label="Subdivision Name *"
            error={form.formState.errors.subdivisionName?.message}
          >
            {({ id }) => (
              <TextField
                id={id}
                {...form.register('subdivisionName')}
                placeholder="e.g., Sunset Gardens Phase 1"
                disabled={isLoading}
              />
            )}
          </FormField>

          <FormField
            name="totalPlotsPlanned"
            label="Total Plots Planned *"
            error={form.formState.errors.totalPlotsPlanned?.message}
          >
            {({ id }) => (
              <TextField
                id={id}
                {...form.register('totalPlotsPlanned', { valueAsNumber: true })}
                type="number"
                min="1"
                placeholder="10"
                disabled={isLoading}
              />
            )}
          </FormField>
        </div>

        {/* Surveyor Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            name="surveyorName"
            label="Surveyor Name *"
            error={form.formState.errors.surveyorName?.message}
          >
            {({ id }) => (
              <TextField
                id={id}
                {...form.register('surveyorName')}
                placeholder="Licensed Surveyor Name"
                disabled={isLoading}
              />
            )}
          </FormField>

          <FormField
            name="surveyorContact"
            label="Surveyor Contact *"
            error={form.formState.errors.surveyorContact?.message}
          >
            {({ id }) => (
              <TextField
                id={id}
                {...form.register('surveyorContact')}
                placeholder="Phone or Email"
                disabled={isLoading}
              />
            )}
          </FormField>
        </div>

        {/* Financial Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            name="surveyCost"
            label="Survey Cost (KES) *"
            error={form.formState.errors.surveyCost?.message}
          >
            {({ id }) => (
              <TextField
                id={id}
                {...form.register('surveyCost', { valueAsNumber: true })}
                type="number"
                min="0"
                placeholder="0"
                disabled={isLoading}
              />
            )}
          </FormField>

          <FormField
            name="approvalFees"
            label="Approval Fees (KES)"
            error={form.formState.errors.approvalFees?.message}
          >
            {({ id }) => (
              <TextField
                id={id}
                {...form.register('approvalFees', { valueAsNumber: true })}
                type="number"
                min="0"
                placeholder="0"
                disabled={isLoading}
              />
            )}
          </FormField>

          <FormField
            name="expectedPlotValue"
            label="Expected Plot Value (KES) *"
            error={form.formState.errors.expectedPlotValue?.message}
          >
            {({ id }) => (
              <TextField
                id={id}
                {...form.register('expectedPlotValue', { valueAsNumber: true })}
                type="number"
                min="1"
                placeholder="500000"
                disabled={isLoading}
              />
            )}
          </FormField>
        </div>

        {/* Additional Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            name="approvalAuthority"
            label="Approval Authority"
            error={form.formState.errors.approvalAuthority?.message}
          >
            {({ id }) => (
              <TextField
                id={id}
                {...form.register('approvalAuthority')}
                placeholder="e.g., County Government"
                disabled={isLoading}
              />
            )}
          </FormField>

          <FormField
            name="targetCompletionDate"
            label="Target Completion Date *"
            error={form.formState.errors.targetCompletionDate?.message}
          >
            {({ id }) => (
              <TextField
                id={id}
                {...form.register('targetCompletionDate')}
                type="date"
                disabled={isLoading}
              />
            )}
          </FormField>
        </div>

        <FormField
          name="subdivisionNotes"
          label="Notes"
          error={form.formState.errors.subdivisionNotes?.message}
        >
          {({ id }) => (
            <textarea
              id={id}
              {...form.register('subdivisionNotes')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Additional notes about the subdivision..."
              disabled={isLoading}
            />
          )}
        </FormField>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading || !form.formState.isValid}
            loading={isLoading}
          >
            {isEditing ? 'Update Plan' : 'Start Subdivision'}
          </Button>
        </div>
      </form>
    </Modal>
  )
})

SubdivisionForm.displayName = 'SubdivisionForm'

export default SubdivisionForm
