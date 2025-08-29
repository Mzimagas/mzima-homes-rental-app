import { useState, useEffect, useCallback } from 'react'
import {
  StageFinancialStatus,
  PaymentRequirement,
  getStageFinancialRequirements,
  formatCurrency,
} from '../lib/constants/financial-stage-requirements'
import supabase from '../lib/supabase-client'

interface FinancialRecord {
  id: string
  property_id: string
  pipeline: string
  payment_type: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed'
  description: string
  created_at: string
  updated_at: string
}

export const useFinancialStatus = (propertyId: string, pipeline: string) => {
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load financial records for the property
  const loadFinancialRecords = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Validate propertyId format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(propertyId)) {
                setFinancialRecords([])
        setLoading(false)
        return
      }

      // For now, we'll simulate financial data since the financial table might not exist yet
      // In a real implementation, this would query the financial/payments table
      const { data, error } = await supabase
        .from('property_financials')
        .select('*')
        .eq('property_id', propertyId)
        .eq('pipeline', pipeline)

      if (error && error.code !== '42P01') {
        // 42P01 = relation does not exist
                setError(error.message)
        setFinancialRecords([])
      } else {
        // If table doesn't exist or no data, use empty array
        setFinancialRecords(data || [])
      }
    } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
      setFinancialRecords([])
    } finally {
      setLoading(false)
    }
  }, [propertyId, pipeline])

  // Get financial status for a specific stage
  const getStageFinancialStatus = useCallback(
    (stageNumber: number): StageFinancialStatus => {
      const requirements = getStageFinancialRequirements(stageNumber)

      // Check which payments are completed
      const completedPayments = financialRecords.filter(
        (record) =>
          record.status === 'completed' &&
          [...requirements.required, ...requirements.optional].some(
            (req) => req.id === record.payment_type
          )
      )

      const completedPaymentIds = completedPayments.map((p) => p.payment_type)

      // Calculate completion status
      const requiredPaymentsCompleted = requirements.required.filter((req) =>
        completedPaymentIds.includes(req.id)
      )

      const isFinanciallyComplete =
        requirements.required.length === 0 ||
        requiredPaymentsCompleted.length === requirements.required.length

      // Calculate amounts
      const completedAmount = completedPayments.reduce((sum, payment) => sum + payment.amount, 0)
      const pendingRequiredAmount = requirements.required
        .filter((req) => !completedPaymentIds.includes(req.id))
        .reduce((sum, req) => sum + (req.amount || 0), 0)

      return {
        stageNumber,
        requiredPayments: requirements.required,
        optionalPayments: requirements.optional,
        isFinanciallyComplete,
        pendingAmount: pendingRequiredAmount,
        completedAmount,
      }
    },
    [financialRecords]
  )

  // Get financial status summary for all stages
  const getAllStagesFinancialStatus = useCallback((): StageFinancialStatus[] => {
    const stages = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] // Document stages
    return stages.map((stageNumber) => getStageFinancialStatus(stageNumber))
  }, [getStageFinancialStatus])

  // Check if a payment is completed
  const isPaymentCompleted = useCallback(
    (paymentId: string): boolean => {
      return financialRecords.some(
        (record) => record.payment_type === paymentId && record.status === 'completed'
      )
    },
    [financialRecords]
  )

  // Get payment status for display
  const getPaymentStatus = useCallback(
    (payment: PaymentRequirement) => {
      const record = financialRecords.find((r) => r.payment_type === payment.id)

      if (!record) {
        return {
          status: 'pending' as const,
          amount: payment.amount,
          displayText: payment.amount
            ? formatCurrency(payment.amount, payment.currency)
            : 'Amount TBD',
          className: 'bg-yellow-100 text-yellow-800',
        }
      }

      switch (record.status) {
        case 'completed':
          return {
            status: 'completed' as const,
            amount: record.amount,
            displayText: `${formatCurrency(record.amount, record.currency)} ✓`,
            className: 'bg-green-100 text-green-800',
          }
        case 'pending':
          return {
            status: 'pending' as const,
            amount: record.amount,
            displayText: `${formatCurrency(record.amount, record.currency)} (Pending)`,
            className: 'bg-yellow-100 text-yellow-800',
          }
        case 'failed':
          return {
            status: 'failed' as const,
            amount: record.amount,
            displayText: `${formatCurrency(record.amount, record.currency)} (Failed)`,
            className: 'bg-red-100 text-red-800',
          }
        default:
          return {
            status: 'pending' as const,
            amount: payment.amount,
            displayText: payment.amount
              ? formatCurrency(payment.amount, payment.currency)
              : 'Amount TBD',
            className: 'bg-gray-100 text-gray-800',
          }
      }
    },
    [financialRecords]
  )

  useEffect(() => {
    if (propertyId && pipeline) {
      loadFinancialRecords()
    }
  }, [loadFinancialRecords, propertyId, pipeline])

  return {
    financialRecords,
    loading,
    error,
    getStageFinancialStatus,
    getAllStagesFinancialStatus,
    isPaymentCompleted,
    getPaymentStatus,
    refetch: loadFinancialRecords,
  }
}
