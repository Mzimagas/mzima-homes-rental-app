'use client'

import { useEffect, useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { paymentSchema, type PaymentFormValues } from '../../lib/validation/payment'
import { PaymentService, PaymentResult } from '../../lib/services/payment-service'
import { getPaymentMethodOptions, getPaymentMethod } from '../../lib/config/payment-methods'
import { Button, TextField, Select } from '../ui'
import { ErrorMessage } from '../ui/error'
import PaymentConfirmationModal from './payment-confirmation'

interface EnhancedPaymentFormProps {
  onSuccess?: (paymentId?: string) => void
  onCancel?: () => void
  isOpen: boolean
  preselectedTenantId?: string
}

interface TenantOption {
  id: string
  full_name: string
  units: { unit_label: string; properties: { name: string }[] }[]
  balance?: number
}

interface FormStep {
  id: string
  title: string
  description: string
  isComplete: boolean
  isActive: boolean
}

export default function EnhancedPaymentForm({
  onSuccess,
  onCancel,
  isOpen,
  preselectedTenantId,
}: EnhancedPaymentFormProps) {
  const [tenants, setTenants] = useState<TenantOption[]>([])
  const [loading, setLoading] = useState(false)
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting, isValid },
    trigger,
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    mode: 'onChange',
    defaultValues: {
      tenantId: preselectedTenantId || '',
      amount: 0,
      paymentDate: new Date().toISOString().split('T')[0],
      method: 'MPESA',
      txRef: '',
      notes: '',
    },
  })

  const watchedValues = watch()
  const methodInfo = PaymentService.getPaymentMethodInfo(watchedValues.method)
  const processingFee = methodInfo
    ? PaymentService.calculateProcessingFee(watchedValues.method, watchedValues.amount || 0)
    : 0
  const totalAmount = (watchedValues.amount || 0) + processingFee

  const steps: FormStep[] = [
    {
      id: 'tenant',
      title: 'Select Tenant',
      description: 'Choose the tenant making the payment',
      isComplete: !!watchedValues.tenantId,
      isActive: currentStep === 0,
    },
    {
      id: 'amount',
      title: 'Payment Details',
      description: 'Enter payment amount and date',
      isComplete: !!watchedValues.amount && !!watchedValues.paymentDate,
      isActive: currentStep === 1,
    },
    {
      id: 'method',
      title: 'Payment Method',
      description: 'Select how the payment was made',
      isComplete: !!watchedValues.method,
      isActive: currentStep === 2,
    },
    {
      id: 'reference',
      title: 'Transaction Details',
      description: 'Enter transaction reference and notes',
      isComplete: !methodInfo?.requiresTxRef || !!watchedValues.txRef,
      isActive: currentStep === 3,
    },
    {
      id: 'review',
      title: 'Review & Submit',
      description: 'Confirm payment details',
      isComplete: false,
      isActive: currentStep === 4,
    },
  ]

  useEffect(() => {
    if (isOpen) {
      loadTenants()
    }
  }, [isOpen])

  const loadTenants = async () => {
    // Implementation similar to original payment form
    // ... tenant loading logic
  }

  const onSubmit: SubmitHandler<PaymentFormValues> = async (values) => {
    setLoading(true)
    setPaymentResult(null)

    try {
      // Get user context for security checks
      const userContext = {
        userId: 'current-user-id', // Get from auth context
        ipAddress: 'user-ip', // Get from request
        userAgent: navigator.userAgent,
      }

      const result = await PaymentService.processPayment(values, userContext)
      setPaymentResult(result)

      if (result.success) {
        setShowConfirmation(true)
        reset({
          tenantId: preselectedTenantId || '',
          amount: 0,
          paymentDate: new Date().toISOString().split('T')[0],
          method: 'MPESA',
          txRef: '',
          notes: '',
        })
        setCurrentStep(0)
        onSuccess?.(result.paymentId)
      }
    } catch (err) {
      console.error('Payment processing error:', err)
      setPaymentResult({
        success: false,
        error: 'An unexpected error occurred while processing the payment',
      })
    } finally {
      setLoading(false)
    }
  }

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep)
    const isStepValid = await trigger(fieldsToValidate)

    if (isStepValid && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const getFieldsForStep = (step: number): (keyof PaymentFormValues)[] => {
    switch (step) {
      case 0:
        return ['tenantId']
      case 1:
        return ['amount', 'paymentDate']
      case 2:
        return ['method']
      case 3:
        return ['txRef', 'notes']
      default:
        return []
    }
  }

  const handleCloseConfirmation = () => {
    setShowConfirmation(false)
    setPaymentResult(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Record Payment</h3>
          <button
            onClick={onCancel}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    step.isComplete
                      ? 'bg-green-500 border-green-500 text-white'
                      : step.isActive
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-gray-200 border-gray-300 text-gray-500'
                  }`}
                >
                  {step.isComplete ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-16 h-1 mx-2 ${step.isComplete ? 'bg-green-500' : 'bg-gray-200'}`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-900">{steps[currentStep].title}</h4>
            <p className="text-sm text-gray-500">{steps[currentStep].description}</p>
          </div>
        </div>

        {/* Payment Result Display */}
        {paymentResult && !paymentResult.success && (
          <div className="mb-6">
            <ErrorMessage
              title="Payment Failed"
              message={paymentResult.error || 'Unknown error occurred'}
            />
            {paymentResult.validationErrors && paymentResult.validationErrors.length > 0 && (
              <div className="mt-2 text-sm text-red-600">
                <ul className="list-disc list-inside">
                  {paymentResult.validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            {paymentResult.securityWarnings && paymentResult.securityWarnings.length > 0 && (
              <div className="mt-2 p-3 bg-yellow-50 rounded-md">
                <h4 className="text-sm font-medium text-yellow-800">Security Warnings:</h4>
                <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                  {paymentResult.securityWarnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Step Content */}
          <div className="min-h-[300px]">
            {currentStep === 0 && (
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">Select Tenant</h4>
                {/* Tenant selection implementation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tenant *</label>
                  {/* Tenant combobox implementation */}
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">Payment Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <TextField
                      label="Amount (KES) *"
                      type="number"
                      step="0.01"
                      placeholder="25000"
                      error={errors.amount?.message}
                      {...register('amount', { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <TextField
                      label="Payment Date *"
                      type="date"
                      error={errors.paymentDate?.message}
                      {...register('paymentDate')}
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">Payment Method</h4>
                <div>
                  <Select
                    label="Payment Method *"
                    error={errors.method?.message}
                    {...register('method')}
                    options={getPaymentMethodOptions()}
                  />
                  {methodInfo && (
                    <div className="mt-3 p-4 bg-blue-50 rounded-md">
                      <p className="text-sm text-blue-800 font-medium">{methodInfo.description}</p>
                      <p className="text-xs text-blue-600 mt-1">
                        Processing time: {methodInfo.processingTime}
                      </p>
                      {processingFee > 0 && (
                        <p className="text-xs text-blue-600">Processing fee: {processingFee} KES</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">Transaction Details</h4>
                <div>
                  <TextField
                    label={`${methodInfo?.txRefLabel || 'Transaction Reference'}${methodInfo?.requiresTxRef ? ' *' : ''}`}
                    placeholder={methodInfo?.txRefPlaceholder || 'Optional reference'}
                    error={errors.txRef?.message}
                    {...register('txRef')}
                  />
                </div>
                <div>
                  <TextField
                    label="Notes"
                    placeholder="Additional notes about this payment..."
                    error={errors.notes?.message}
                    {...register('notes')}
                  />
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">Review Payment</h4>
                {/* Payment summary component */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-gray-900 mb-3">Payment Summary</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span className="font-medium">
                        {(watchedValues.amount || 0).toLocaleString()} KES
                      </span>
                    </div>
                    {processingFee > 0 && (
                      <div className="flex justify-between">
                        <span>Processing Fee:</span>
                        <span className="font-medium">{processingFee.toLocaleString()} KES</span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>Total:</span>
                      <span className="text-green-600">{totalAmount.toLocaleString()} KES</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 0 || loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              {currentStep < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Next
                </button>
              ) : (
                <Button type="submit" disabled={loading || !isValid} className="px-6 py-2">
                  {loading ? (
                    <div className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Processing...
                    </div>
                  ) : (
                    'Record Payment'
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Payment Confirmation Modal */}
      {showConfirmation && paymentResult?.paymentId && (
        <PaymentConfirmationModal
          paymentId={paymentResult.paymentId}
          onClose={handleCloseConfirmation}
          isOpen={showConfirmation}
        />
      )}
    </div>
  )
}
