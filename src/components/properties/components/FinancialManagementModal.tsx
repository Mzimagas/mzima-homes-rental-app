import React, { useState, useEffect } from 'react'
import {
  XMarkIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  BanknotesIcon,
  CreditCardIcon,
  DocumentTextIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline'
import { useFinancialStatus } from '../../../hooks/useFinancialStatus'
import { useEnhancedWorkflow } from '../../../hooks/useEnhancedWorkflow'
import {
  formatCurrency,
  getStageFinancialRequirements,
} from '../../../lib/constants/financial-stage-requirements'
import PaymentIntegration from './PaymentIntegration'

interface FinancialManagementModalProps {
  isOpen: boolean
  onClose: () => void
  propertyId: string
  stageNumber?: number
  pipeline: string
  documentStates: Record<string, any>
}

export const FinancialManagementModal: React.FC<FinancialManagementModalProps> = ({
  isOpen,
  onClose,
  propertyId,
  stageNumber,
  pipeline,
  documentStates,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'history'>('overview')
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null)

  const {
    getStageFinancialStatus,
    getPaymentStatus,
    financialRecords,
    loading: financialLoading,
  } = useFinancialStatus(propertyId, pipeline)

  const { workflowStages, getNextAction, criticalMilestones } = useEnhancedWorkflow({
    propertyId,
    pipeline,
    documentStates,
    enableIntegratedLogic: true,
  })

  const nextAction = getNextAction()
  const currentStageFinancials = stageNumber ? getStageFinancialStatus(stageNumber) : null

  // Calculate overall financial progress
  const allStageFinancials = workflowStages.map((stage) =>
    getStageFinancialStatus(stage.stageNumber)
  )
  const completedPayments = allStageFinancials.filter((stage) => stage.isFinanciallyComplete).length
  const totalStages = allStageFinancials.filter(
    (stage) => stage.requiredPayments.length > 0 || stage.optionalPayments.length > 0
  ).length
  const financialProgress = totalStages > 0 ? (completedPayments / totalStages) * 100 : 0

  // Get all pending payments
  const pendingPayments = allStageFinancials.flatMap((stage) =>
    stage.requiredPayments
      .filter((payment) => getPaymentStatus(payment).status !== 'completed')
      .map((payment) => ({
        ...payment,
        stageNumber: stage.stageNumber,
        stageName: `Stage ${stage.stageNumber}`,
        priority: criticalMilestones[stage.stageNumber] ? 'high' : 'medium',
      }))
  )

  // Get completed payments
  const completedPaymentsList = allStageFinancials.flatMap((stage) =>
    stage.requiredPayments
      .filter((payment) => getPaymentStatus(payment).status === 'completed')
      .map((payment) => ({
        ...payment,
        stageNumber: stage.stageNumber,
        stageName: `Stage ${stage.stageNumber}`,
        completedDate: new Date().toISOString(), // This would come from actual payment records
      }))
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Financial Management</h2>
            <p className="text-sm text-gray-600">
              Property financial overview and payment management
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Progress Overview */}
        <div className="p-6 bg-gradient-to-r from-blue-50 to-green-50 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Financial Progress</h3>
              <p className="text-sm text-gray-600">
                {completedPayments} of {totalStages} payment stages completed
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {financialProgress.toFixed(0)}%
              </div>
              <div className="text-xs text-gray-600">Complete</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${financialProgress}%` }}
            />
          </div>

          {/* Next Action */}
          {nextAction && nextAction.type === 'payment' && (
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-200">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CurrencyDollarIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">Next Payment Required</div>
                <div className="text-sm text-gray-600">{nextAction.description}</div>
              </div>
              <button
                onClick={() => {
                  setActiveTab('payments')
                  setSelectedPayment(pendingPayments[0]?.id || null)
                }}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Make Payment
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'overview', label: 'Overview', icon: DocumentTextIcon },
            { id: 'payments', label: 'Make Payments', icon: CurrencyDollarIcon },
            { id: 'history', label: 'Payment History', icon: CalendarIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Current Stage Financial Status */}
              {currentStageFinancials && stageNumber && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">
                    Stage {stageNumber} Financial Requirements
                  </h4>
                  <div className="space-y-2">
                    {currentStageFinancials.requiredPayments.map((payment) => {
                      const status = getPaymentStatus(payment)
                      return (
                        <div key={payment.id} className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{payment.name}</div>
                            <div className="text-sm text-gray-600">{payment.description}</div>
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

              {/* All Pending Payments */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Pending Payments</h4>
                {pendingPayments.length > 0 ? (
                  <div className="space-y-2">
                    {pendingPayments.map((payment) => (
                      <div
                        key={`${payment.stageNumber}-${payment.id}`}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              payment.priority === 'high'
                                ? 'bg-red-100 text-red-600'
                                : 'bg-yellow-100 text-yellow-600'
                            }`}
                          >
                            <CurrencyDollarIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{payment.name}</div>
                            <div className="text-sm text-gray-600">{payment.stageName}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">
                            {payment.amount
                              ? formatCurrency(payment.amount, payment.currency)
                              : 'Amount TBD'}
                          </div>
                          <div
                            className={`text-xs ${
                              payment.priority === 'high' ? 'text-red-600' : 'text-yellow-600'
                            }`}
                          >
                            {payment.priority === 'high' ? 'Critical' : 'Required'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircleIcon className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    <div className="font-medium">All payments up to date!</div>
                    <div className="text-sm">No pending payments at this time.</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Make Payments</h4>
              {pendingPayments.length > 0 ? (
                pendingPayments.map((payment) => (
                  <PaymentIntegration
                    key={`${payment.stageNumber}-${payment.id}`}
                    propertyId={propertyId}
                    stageNumber={payment.stageNumber}
                    payment={payment}
                    currentStatus="pending"
                    compact={false}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircleIcon className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <div className="font-medium">No payments required</div>
                  <div className="text-sm">All required payments have been completed.</div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Payment History</h4>
              {completedPaymentsList.length > 0 ? (
                <div className="space-y-2">
                  {completedPaymentsList.map((payment) => (
                    <div
                      key={`${payment.stageNumber}-${payment.id}`}
                      className="flex items-center justify-between p-3 border border-green-200 bg-green-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                          <CheckCircleIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{payment.name}</div>
                          <div className="text-sm text-gray-600">{payment.stageName}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">
                          {payment.amount
                            ? formatCurrency(payment.amount, payment.currency)
                            : 'Amount TBD'}
                        </div>
                        <div className="text-xs text-green-600">Completed</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ClockIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <div className="font-medium">No payment history</div>
                  <div className="text-sm">Completed payments will appear here.</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          {nextAction && nextAction.type === 'payment' && (
            <button
              onClick={() => {
                setActiveTab('payments')
                setSelectedPayment(pendingPayments[0]?.id || null)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Make Next Payment
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default FinancialManagementModal
