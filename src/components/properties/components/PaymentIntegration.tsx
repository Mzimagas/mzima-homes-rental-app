import React, { useState, useCallback, useEffect } from 'react'
import {
  CurrencyDollarIcon,
  CreditCardIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'
import {
  PaymentRequirement,
  formatCurrency,
} from '../../../lib/constants/financial-stage-requirements'
import { useTabNavigation } from '../../../hooks/useTabNavigation'
import supabase from '../../../lib/supabase-client'

interface PaymentIntegrationProps {
  propertyId: string
  stageNumber: number
  payment: PaymentRequirement
  currentStatus: 'pending' | 'completed' | 'failed'
  onPaymentUpdate?: (paymentId: string, status: 'pending' | 'completed' | 'failed') => void
  compact?: boolean
  pipeline?: string // Add pipeline prop to determine payment table
}

interface PaymentMethod {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  available: boolean
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'mpesa',
    name: 'M-Pesa',
    description: 'Pay via M-Pesa mobile money',
    icon: BanknotesIcon,
    available: true,
  },
  {
    id: 'bank_transfer',
    name: 'Bank Transfer',
    description: 'Direct bank transfer',
    icon: CreditCardIcon,
    available: true,
  },
  {
    id: 'card',
    name: 'Credit/Debit Card',
    description: 'Pay with card',
    icon: CreditCardIcon,
    available: false, // Placeholder for future implementation
  },
]

export const PaymentIntegration: React.FC<PaymentIntegrationProps> = ({
  propertyId,
  stageNumber,
  payment,
  currentStatus,
  onPaymentUpdate,
  compact = false,
  pipeline = 'purchase_pipeline',
}) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<string>('')
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentDetails, setPaymentDetails] = useState({
    phoneNumber: '',
    amount: payment.amount || 0,
    reference: `${propertyId}-stage${stageNumber}-${payment.id}`,
  })

  const { navigateToFinancial } = useTabNavigation()

  // Enhanced stage-to-payment mapping with support for different payment types
  const getPaymentNavigationConfig = (stage: number, payment: PaymentRequirement) => {
    // Stage-specific cost type mapping for handover costs (using current HANDOVER_COST_TYPES)
    const stageToHandoverCostMapping: Record<number, string> = {
      1: 'property_valuation', // Initial Handover Preparation
      2: 'property_inspection', // Property Documentation & Survey
      3: 'marketing_preparation', // Marketing & Buyer Identification
      4: 'contract_preparation', // Agreement Preparation
      5: 'lcb_application_fee', // LCB Process
      6: 'transfer_fee', // Transfer & Registration
      7: 'other_handover_expense', // Final Handover & Completion (updated to match current types)
    }

    // For subdivision stages 11-16, route to subdivision costs
    if (stage >= 11 && stage <= 16) {
      // Map payment IDs to subdivision cost type IDs
      const paymentToSubdivisionCostMap: Record<string, string> = {
        'search_fee_subdivision': 'search_fee',
        'lcb_normal_fee_subdivision': 'lcb_normal_fee',
        'lcb_special_fee_subdivision': 'lcb_special_fee',
        'mutation_costs': 'mutation_drawing',
        'beaconing_costs': 'beaconing',
        'title_registration_subdivision': 'new_title_registration',
      }

      const subdivisionCostTypeId = paymentToSubdivisionCostMap[payment.id] || payment.id

      return {
        subtab: 'subdivision_costs',
        costTypeId: subdivisionCostTypeId,
        amount: payment.amount,
        description: payment.description || `Stage ${stage} subdivision payment`,
        paymentType: 'subdivision_cost',
      }
    }

    // Determine payment type and navigation config for other stages
    if (payment.id === 'down_payment' || payment.category === 'payment') {
      // Purchase Price Deposit/Payment - navigate to payments section
      return {
        subtab: 'payments',
        costTypeId: undefined,
        amount: payment.amount,
        description: payment.description || 'Purchase price deposit payment',
        paymentType: payment.id === 'down_payment' ? 'deposit' : 'installment',
      }
    } else if (payment.category === 'fee' || payment.category === 'tax') {
      // Costs (fees, taxes) - navigate to acquisition costs section
      return {
        subtab: 'acquisition_costs',
        costTypeId: stageToHandoverCostMapping[stage],
        amount: payment.amount,
        description: payment.description || `Stage ${stage} ${payment.category} payment`,
        paymentType: payment.category === 'fee' ? 'fee' : 'tax',
      }
    } else {
      // Default to acquisition costs for handover pipeline
      return {
        subtab: 'acquisition_costs',
        costTypeId: stageToHandoverCostMapping[stage],
        amount: payment.amount,
        description: payment.description || `Stage ${stage} payment`,
        paymentType: 'handover_cost',
      }
    }
  }

  // Reset payment form state when property changes
  useEffect(() => {
    setIsProcessing(false)
    setSelectedMethod('')
    setShowPaymentForm(false)
    setPaymentDetails({
      phoneNumber: '',
      amount: payment.amount || 0,
      reference: `${propertyId}-stage${stageNumber}-${payment.id}`,
    })
  }, [propertyId, stageNumber, payment.amount, payment.id])

  // Simulate payment processing
  const processPayment = useCallback(
    async (method: string) => {
      setIsProcessing(true)

      try {
        // Simulate API call delay
        await new Promise((resolve) => setTimeout(resolve, 2000))

        // Create payment record in appropriate table based on payment type and pipeline
        // Note: This is a simplified implementation - in production, this should use the proper API endpoints
        let error = null

        if (payment.category === 'payment') {
          // For purchase price payments, use payment receipts table
          const { error: receiptError } = await supabase.from('property_payment_receipts').insert({
            property_id: propertyId,
            receipt_number: Math.floor(Math.random() * 10000), // Should be auto-generated
            amount_kes: paymentDetails.amount,
            payment_date: new Date().toISOString().split('T')[0],
            payment_reference: paymentDetails.reference,
            payment_method: method.toUpperCase(),
            notes: payment.description,
          })
          error = receiptError
        } else if (stageNumber >= 11 && stageNumber <= 16) {
          // For subdivision stages (11-16), use subdivision costs table
          // Map payment IDs to subdivision cost type IDs and their categories
          const paymentToSubdivisionCostMap: Record<string, { costTypeId: string; category: string }> = {
            'search_fee_subdivision': { costTypeId: 'search_fee', category: 'LEGAL_COMPLIANCE' },
            'lcb_normal_fee_subdivision': { costTypeId: 'lcb_normal_fee', category: 'STATUTORY_BOARD_FEES' },
            'lcb_special_fee_subdivision': { costTypeId: 'lcb_special_fee', category: 'STATUTORY_BOARD_FEES' },
            'mutation_costs': { costTypeId: 'mutation_drawing', category: 'SURVEY_PLANNING_FEES' },
            'beaconing_costs': { costTypeId: 'beaconing', category: 'SURVEY_PLANNING_FEES' },
            'title_registration_subdivision': { costTypeId: 'new_title_registration', category: 'REGISTRATION_TITLE_FEES' },
          }

          const subdivisionMapping = paymentToSubdivisionCostMap[payment.id]
          const subdivisionCostTypeId = subdivisionMapping?.costTypeId || payment.id
          const subdivisionCategory = subdivisionMapping?.category || 'OTHER_CHARGES'

          const { error: subdivisionError } = await supabase.from('property_subdivision_costs').insert({
            property_id: propertyId,
            cost_type_id: subdivisionCostTypeId,
            cost_category: subdivisionCategory,
            amount_kes: paymentDetails.amount,
            payment_status: 'PAID',
            payment_date: new Date().toISOString().split('T')[0],
            payment_reference: paymentDetails.reference,
            notes: payment.description,
          })
          error = subdivisionError
        } else {
          // For other fees/taxes, use handover costs table
          const { error: costError } = await supabase.from('property_handover_costs').insert({
            property_id: propertyId,
            cost_type_id: payment.id,
            cost_category: payment.category === 'fee' ? 'OTHER' : 'OTHER',
            amount_kes: paymentDetails.amount,
            payment_date: new Date().toISOString().split('T')[0],
            payment_reference: paymentDetails.reference,
            notes: payment.description,
          })
          error = costError
        }

        if (error) {
          // Log payment errors in development
          if (process.env.NODE_ENV === 'development') {
          }
          throw new Error('Failed to record payment')
        }

        // Notify parent component
        onPaymentUpdate?.(payment.id, 'completed')

        // Emit payment completion event
        const paymentEvent = new CustomEvent('paymentCompleted', {
          detail: {
            propertyId,
            stageNumber,
            paymentId: payment.id,
            amount: paymentDetails.amount,
            method,
            timestamp: new Date(),
          },
        })
        window.dispatchEvent(paymentEvent)

        setShowPaymentForm(false)
      } catch (error) {
        // Log payment processing errors in development
        if (process.env.NODE_ENV === 'development') {
        }
        onPaymentUpdate?.(payment.id, 'failed')
      } finally {
        setIsProcessing(false)
      }
    },
    [propertyId, stageNumber, payment, paymentDetails, onPaymentUpdate]
  )

  // Handle M-Pesa payment
  const handleMpesaPayment = useCallback(async () => {
    if (!paymentDetails.phoneNumber) {
      alert('Please enter your M-Pesa phone number')
      return
    }

    await processPayment('mpesa')
  }, [paymentDetails.phoneNumber, processPayment])

  // Handle bank transfer
  const handleBankTransfer = useCallback(async () => {
    await processPayment('bank_transfer')
  }, [processPayment])

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2">
        {currentStatus === 'completed' ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
            <CheckCircleIcon className="h-3 w-3" />
            Paid
          </span>
        ) : (
          <button
            onClick={() => {
              const paymentConfig = getPaymentNavigationConfig(stageNumber, payment)
              console.log('🔍 PaymentIntegration navigation config:', {
                stageNumber,
                payment: { id: payment.id, category: payment.category, amount: payment.amount },
                paymentConfig,
              })
              navigateToFinancial({
                propertyId,
                stageNumber,
                action: 'pay',
                subtab: paymentConfig.subtab,
                costTypeId: paymentConfig.costTypeId,
                amount: paymentConfig.amount,
                description: paymentConfig.description,
                pipeline: 'handover',
                paymentType: paymentConfig.paymentType,
              })
            }}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
          >
            <CurrencyDollarIcon className="h-3 w-3" />
            Pay Now
          </button>
        )}

        {/* Payment Modal */}
        {showPaymentForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Make Payment</h3>

              <div className="mb-4">
                <div className="font-medium">{payment.name}</div>
                <div className="text-sm text-gray-600">{payment.description}</div>
                <div className="text-lg font-bold text-green-600 mt-2">
                  {formatCurrency(payment.amount || 0, payment.currency)}
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-3 mb-6">
                {PAYMENT_METHODS.filter((method) => method.available).map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`w-full p-3 border rounded-lg text-left transition-colors ${
                      selectedMethod === method.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <method.icon className="h-5 w-5 text-gray-600" />
                      <div>
                        <div className="font-medium">{method.name}</div>
                        <div className="text-sm text-gray-600">{method.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* M-Pesa Form */}
              {selectedMethod === 'mpesa' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    M-Pesa Phone Number
                  </label>
                  <input
                    type="tel"
                    value={paymentDetails.phoneNumber}
                    onChange={(e) =>
                      setPaymentDetails((prev) => ({ ...prev, phoneNumber: e.target.value }))
                    }
                    placeholder="254712345678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {/* Bank Transfer Info */}
              {selectedMethod === 'bank_transfer' && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm">
                    <div className="font-medium mb-2">Bank Details:</div>
                    <div>Account: Mzima Homes Ltd</div>
                    <div>Bank: KCB Bank</div>
                    <div>Account No: 1234567890</div>
                    <div>Reference: {paymentDetails.reference}</div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPaymentForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={selectedMethod === 'mpesa' ? handleMpesaPayment : handleBankTransfer}
                  disabled={!selectedMethod || isProcessing}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center gap-2">
                      <ClockIcon className="h-4 w-4 animate-spin" />
                      Processing...
                    </div>
                  ) : (
                    'Pay Now'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Full payment integration view
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <CurrencyDollarIcon className="h-5 w-5 text-blue-600" />
          <div>
            <div className="font-medium text-gray-900">{payment.name}</div>
            <div className="text-sm text-gray-600">{payment.description}</div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">
            {formatCurrency(payment.amount || 0, payment.currency)}
          </div>
          <div
            className={`text-sm ${
              currentStatus === 'completed'
                ? 'text-green-600'
                : currentStatus === 'failed'
                  ? 'text-red-600'
                  : 'text-yellow-600'
            }`}
          >
            {currentStatus === 'completed'
              ? 'Completed'
              : currentStatus === 'failed'
                ? 'Failed'
                : 'Pending'}
          </div>
        </div>
      </div>

      {currentStatus !== 'completed' && (
        <div className="flex gap-2">
          <button
            onClick={() => {
              const paymentConfig = getPaymentNavigationConfig(stageNumber, payment)
              console.log('🔍 PaymentIntegration navigation config:', {
                stageNumber,
                payment: { id: payment.id, category: payment.category, amount: payment.amount },
                paymentConfig,
              })
              navigateToFinancial({
                propertyId,
                stageNumber,
                action: 'pay',
                subtab: paymentConfig.subtab,
                costTypeId: paymentConfig.costTypeId,
                amount: paymentConfig.amount,
                description: paymentConfig.description,
                pipeline: pipeline as 'direct_addition' | 'purchase_pipeline' | 'handover' | 'subdivision',
                paymentType: paymentConfig.paymentType,
              })
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <CurrencyDollarIcon className="h-4 w-4" />
            Make Payment
          </button>

          <button
            onClick={() => setShowPaymentForm(true)}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            title="Quick Payment Form"
          >
            <CreditCardIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

export default PaymentIntegration
