import React from 'react'
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
}

export const FinancialStatusIndicator: React.FC<FinancialStatusIndicatorProps> = ({
  propertyId,
  stageNumber,
  financialStatus,
  getPaymentStatus,
  onNavigateToFinancial,
  compact = false,
}) => {
  const { requiredPayments, optionalPayments, isFinanciallyComplete, pendingAmount } =
    financialStatus
  const { navigateToFinancial, navigateToPayment } = useTabNavigation()

  // If no financial requirements, don't show anything
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
              {/* View Financial Details */}
              <button
                onClick={() =>
                  navigateToFinancial({
                    propertyId,
                    stageNumber,
                    action: 'view',
                  })
                }
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-200 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <CurrencyDollarIcon className="h-4 w-4" />
                View Financial Details
                <ArrowTopRightOnSquareIcon className="h-3 w-3" />
              </button>

              {/* Quick Pay for Pending Payments */}
              {!isFinanciallyComplete && requiredPayments.length > 0 && (
                <button
                  onClick={() =>
                    navigateToPayment({
                      propertyId,
                      stageNumber,
                      paymentId: requiredPayments[0].id,
                      amount: requiredPayments[0].amount,
                    })
                  }
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 border border-green-200 rounded-lg hover:bg-green-200 transition-colors"
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
}

export default FinancialStatusIndicator
