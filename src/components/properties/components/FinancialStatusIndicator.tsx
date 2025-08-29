import React, { useState, memo, useMemo } from 'react'
import {
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'
import {
  StageFinancialStatus,
  PaymentRequirement,
  formatCurrency,
} from '../../../lib/constants/financial-stage-requirements'
import { useTabNavigation } from '../../../hooks/useTabNavigation'
import PaymentIntegration from './PaymentIntegration'

interface FinancialStatusIndicatorProps {
  propertyId: string
  stageNumber: number
  financialStatus: StageFinancialStatus
  getPaymentStatus: (payment: PaymentRequirement) => {
    status: 'pending' | 'completed' | 'failed'
    amount: number | undefined
    displayText: string
    className: string
  }
  onNavigateToFinancial?: () => void
  compact?: boolean
  pipeline?: string
  documentStates?: Record<string, any>
  layout?: 'vertical' | 'horizontal' // New prop for layout control
}

export const FinancialStatusIndicator: React.FC<FinancialStatusIndicatorProps> = ({
  propertyId,
  stageNumber,
  financialStatus,
  getPaymentStatus,
  onNavigateToFinancial,
  compact = false,
  pipeline = 'purchase_pipeline',
  documentStates = {},
  layout = 'vertical'
}) => {
  const { requiredPayments, optionalPayments, isFinanciallyComplete, pendingAmount } =
    financialStatus
  const { navigateToFinancial, navigateToPayment } = useTabNavigation()

  // Modal state management (payment only)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<PaymentRequirement | null>(null)

  // Removed debug logging for performance

  // Horizontal layout - return just the payment button for inline use
  if (layout === 'horizontal') {
    // If no financial requirements and no pending payments, don't show anything
    if (requiredPayments.length === 0 && optionalPayments.length === 0 && isFinanciallyComplete) {
      return null
    }

    // Enhanced stage-to-payment mapping with support for different payment types
    const getPaymentNavigationConfig = (stage: number, payment?: PaymentRequirement) => {
      // Stage-specific cost type mapping for acquisition costs
      const stageToAcquisitionCostMapping: Record<number, string> = {
        3: 'due_diligence_costs', // Property Search & Due Diligence
        6: 'lcb_application_fees', // LCB Process
        9: 'stamp_duty', // Stamp Duty
        10: 'registry_submission', // Title Registration / New Title Costs
      }

      // Handle case where payment is undefined
      if (!payment) {
        return {
          subtab: 'acquisition_costs',
          costTypeId: stageToAcquisitionCostMapping[stage],
          amount: undefined,
          description: `Stage ${stage} payment`,
          paymentType: 'acquisition_cost',
        }
      }

      // Determine payment type and navigation config
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
        // Acquisition costs (fees, taxes) - navigate to acquisition costs section
        return {
          subtab: 'acquisition_costs',
          costTypeId: stageToAcquisitionCostMapping[stage],
          amount: payment.amount,
          description: payment.description || `Stage ${stage} ${payment.category} payment`,
          paymentType: payment.category === 'fee' ? 'fee' : 'tax',
        }
      } else {
        // Default to acquisition costs
        return {
          subtab: 'acquisition_costs',
          costTypeId: stageToAcquisitionCostMapping[stage],
          amount: payment.amount,
          description: payment.description || `Stage ${stage} payment`,
          paymentType: 'acquisition_cost',
        }
      }
    }

    const payment = requiredPayments[0]
    const paymentConfig = getPaymentNavigationConfig(stageNumber, payment)

    return (
      <button
        onClick={() => {
          const today = new Date().toISOString().slice(0, 10)

          navigateToFinancial({
            propertyId,
            stageNumber,
            action: 'pay',
            subtab: paymentConfig.subtab,
            costTypeId: paymentConfig.costTypeId,
            amount: paymentConfig.amount,
            date: today,
            description: paymentConfig.description,
            pipeline: pipeline as 'direct_addition' | 'purchase_pipeline',
            paymentType: paymentConfig.paymentType as 'deposit' | 'installment' | 'fee' | 'tax' | 'acquisition_cost',
          })
        }}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-400 rounded-md hover:bg-emerald-100 hover:border-emerald-500 hover:shadow-sm transition-all duration-200"
      >
        <CurrencyDollarIcon className="h-3 w-3" />
        Make Payment
      </button>
    )
  }

  // If no financial requirements, return null for better performance
  if (requiredPayments.length === 0 && optionalPayments.length === 0) {
    return null
  }

  // Compact view for stage headers
  if (compact) {
    if (isFinanciallyComplete) {
      return (
        <div className="flex items-center gap-1 text-xs text-green-600">
          <CheckCircleIcon className="h-3 w-3" />
          <span>Payments Complete</span>
        </div>
      )
    }

    if (pendingAmount > 0) {
      return (
        <div className="flex items-center gap-1 text-xs text-yellow-600">
          <ExclamationTriangleIcon className="h-3 w-3" />
          <span>{formatCurrency(pendingAmount)} Pending</span>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-1 text-xs text-blue-600">
        <ClockIcon className="h-3 w-3" />
        <span>Payment Required</span>
      </div>
    )
  }

  // Full view for expanded sections
  return (
    <div className="border-t border-gray-200 bg-blue-50 p-3 rounded-b-lg">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <CurrencyDollarIcon className="h-5 w-5 text-blue-600 mt-0.5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-sm font-medium text-blue-900">Financial Requirements</h4>
            {isFinanciallyComplete ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                <CheckCircleIcon className="h-3 w-3" />
                Complete
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                <ExclamationTriangleIcon className="h-3 w-3" />
                Pending
              </span>
            )}
          </div>

          {/* Required Payments */}
          {requiredPayments.length > 0 && (
            <div className="space-y-2 mb-3">
              <h5 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                Required Payments
              </h5>
              <div className="space-y-1">
                {requiredPayments.map((payment) => {
                  const status = getPaymentStatus(payment)
                  return (
                    <div key={payment.id} className="flex items-center justify-between text-sm">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{payment.name}</div>
                        <div className="text-xs text-gray-600">{payment.description}</div>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${status.className}`}
                      >
                        {status.displayText}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Optional Payments */}
          {optionalPayments.length > 0 && (
            <div className="space-y-2 mb-3">
              <h5 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                Optional Payments
              </h5>
              <div className="space-y-1">
                {optionalPayments.map((payment) => {
                  const status = getPaymentStatus(payment)
                  return (
                    <div key={payment.id} className="flex items-center justify-between text-sm">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{payment.name}</div>
                        <div className="text-xs text-gray-600">{payment.description}</div>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${status.className}`}
                      >
                        {status.displayText}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Warning for pending payments */}
          {!isFinanciallyComplete && requiredPayments.length > 0 && (
            <div className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-yellow-800">
                <div className="font-medium">Payment Required</div>
                <div>Complete required payments to proceed with this stage.</div>
              </div>
            </div>
          )}

          {/* Enhanced Navigation Actions */}
          <div className="mt-3 pt-3 border-t border-blue-200">
            <div className="flex flex-wrap gap-2">
              {/* Quick Pay for Pending Payments */}
              {!isFinanciallyComplete && requiredPayments.length > 0 && (
                <button
                  onClick={() => {
                    const payment = requiredPayments[0]
                    const today = new Date().toISOString().slice(0, 10)

                    // Enhanced payment navigation logic
                    const getPaymentNavigationConfig = (stage: number, payment: PaymentRequirement) => {
                      const stageToAcquisitionCostMapping: Record<number, string> = {
                        3: 'due_diligence_costs',
                        6: 'lcb_application_fees',
                        9: 'stamp_duty',
                        10: 'registry_submission',
                      }

                      if (payment.id === 'down_payment' || payment.category === 'payment') {
                        return {
                          subtab: 'payments',
                          costTypeId: undefined,
                          amount: payment.amount,
                          description: payment.description || 'Purchase price deposit payment',
                        }
                      } else {
                        return {
                          subtab: 'acquisition_costs',
                          costTypeId: stageToAcquisitionCostMapping[stage],
                          amount: payment.amount,
                          description: payment.description || `Stage ${stage} ${payment.category} payment`,
                        }
                      }
                    }

                    const paymentConfig = getPaymentNavigationConfig(stageNumber, payment)

                    navigateToFinancial({
                      propertyId,
                      stageNumber,
                      action: 'pay',
                      subtab: paymentConfig.subtab,
                      costTypeId: paymentConfig.costTypeId,
                      amount: paymentConfig.amount,
                      date: today,
                      description: paymentConfig.description,
                    })
                  }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-400 rounded-lg hover:bg-emerald-100 hover:border-emerald-500 hover:shadow-md transition-all duration-200"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  Make Payment
                  <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                </button>
              )}

              {/* Legacy callback support */}
              {onNavigateToFinancial && (
                <button
                  onClick={onNavigateToFinancial}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <CurrencyDollarIcon className="h-4 w-4" />
                  Manage Payments
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // Return with modals
  return (
    <>
      {/* Main Financial Status Indicator */}
      <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CurrencyDollarIcon className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-blue-900">Financial Status</span>
          </div>
          <div className="text-right">
            <div className={`text-sm font-medium ${
              isFinanciallyComplete ? 'text-green-600' : 'text-yellow-600'
            }`}>
              {isFinanciallyComplete ? 'Complete' : `${formatCurrency(pendingAmount)} pending`}
            </div>
          </div>
        </div>

        {/* Payment Status Summary */}
        {!compact && (
          <div className="space-y-2 mb-4">
            {requiredPayments.map((payment) => {
              const status = getPaymentStatus(payment)
              return (
                <div key={payment.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{payment.name}</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.className}`}>
                    {status.displayText}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Warning for pending payments */}
        {!isFinanciallyComplete && requiredPayments.length > 0 && (
          <div className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg mb-3">
            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-yellow-800">
              <div className="font-medium">Payment Required</div>
              <div>Complete required payments to proceed with this stage.</div>
            </div>
          </div>
        )}

        {/* Enhanced Navigation Actions */}
        <div className="flex flex-wrap gap-2">
          {/* Quick Pay for Pending Payments */}
          {!isFinanciallyComplete && requiredPayments.length > 0 && (
            <button
              onClick={() => {
                const payment = requiredPayments[0]
                const today = new Date().toISOString().slice(0, 10)

                // Enhanced payment navigation logic
                const getPaymentNavigationConfig = (stage: number, payment?: PaymentRequirement) => {
                  const stageToAcquisitionCostMapping: Record<number, string> = {
                    3: 'due_diligence_costs',
                    6: 'lcb_application_fees',
                    9: 'stamp_duty',
                    10: 'registry_submission',
                  }

                  if (!payment) {
                    return {
                      subtab: 'acquisition_costs',
                      costTypeId: stageToAcquisitionCostMapping[stage],
                      amount: undefined,
                      description: `Stage ${stage} payment`,
                      paymentType: 'acquisition_cost',
                    }
                  }

                  if (payment.id === 'down_payment' || payment.category === 'payment') {
                    return {
                      subtab: 'payments',
                      costTypeId: undefined,
                      amount: payment.amount,
                      description: payment.description || 'Purchase price deposit payment',
                      paymentType: payment.id === 'down_payment' ? 'deposit' : 'installment',
                    }
                  } else {
                    return {
                      subtab: 'acquisition_costs',
                      costTypeId: stageToAcquisitionCostMapping[stage],
                      amount: payment.amount,
                      description: payment.description || `Stage ${stage} ${payment.category} payment`,
                      paymentType: payment.category === 'fee' ? 'fee' : 'tax',
                    }
                  }
                }

                const paymentConfig = getPaymentNavigationConfig(stageNumber, payment)

                navigateToFinancial({
                  propertyId,
                  stageNumber,
                  action: 'pay',
                  subtab: paymentConfig.subtab,
                  costTypeId: paymentConfig.costTypeId,
                  amount: paymentConfig.amount,
                  date: today,
                  description: paymentConfig.description,
                  pipeline: pipeline as 'direct_addition' | 'purchase_pipeline',
                  paymentType: paymentConfig.paymentType as 'deposit' | 'installment' | 'fee' | 'tax' | 'acquisition_cost',
                })
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-400 rounded-lg hover:bg-emerald-100 hover:border-emerald-500 hover:shadow-md transition-all duration-200"
            >
              <CheckCircleIcon className="h-4 w-4" />
              Make Payment
            </button>
          )}

          {/* Legacy callback support */}
          {onNavigateToFinancial && (
            <button
              onClick={onNavigateToFinancial}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <CurrencyDollarIcon className="h-4 w-4" />
              Manage Payments
            </button>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Make Payment</h3>
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  setSelectedPayment(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <PaymentIntegration
              propertyId={propertyId}
              stageNumber={stageNumber}
              payment={selectedPayment}
              currentStatus="pending"
              onPaymentUpdate={(paymentId, status) => {
                if (status === 'completed') {
                  setShowPaymentModal(false)
                  setSelectedPayment(null)
                  // Trigger a refresh of the financial status
                  window.dispatchEvent(
                    new CustomEvent('paymentCompleted', {
                      detail: { propertyId, stageNumber, paymentId },
                    })
                  )
                }
              }}
              compact={false}
            />
          </div>
        </div>
      )}
    </>
  )
}

export default memo(FinancialStatusIndicator)
