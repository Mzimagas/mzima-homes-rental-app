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

      // Use pipeline-specific tables for financial data
      if (pipeline === 'handover') {
        // For handover pipeline, use handover-specific tables
        const [costsResult, receiptsResult] = await Promise.allSettled([
          supabase.from('property_handover_costs').select('*').eq('property_id', propertyId),
          supabase.from('property_payment_receipts').select('*').eq('property_id', propertyId),
        ])

        // Convert handover data to financial records format
        const costs = costsResult.status === 'fulfilled' ? costsResult.value.data || [] : []
        const receipts =
          receiptsResult.status === 'fulfilled' ? receiptsResult.value.data || [] : []

        // Transform to unified financial records format
        const financialRecords = [
          ...costs.map((cost: any) => ({
            id: cost.id,
            property_id: cost.property_id,
            pipeline: 'handover',
            payment_type: cost.cost_type_id,
            amount: cost.amount_kes,
            currency: 'KES',
            status: 'completed',
            description: cost.notes || `${cost.cost_type_id} cost`,
            created_at: cost.created_at,
            updated_at: cost.updated_at,
            category: 'cost',
          })),
          ...receipts.map((receipt: any) => ({
            id: receipt.id,
            property_id: receipt.property_id,
            pipeline: 'handover',
            payment_type: 'payment_receipt',
            amount: receipt.amount_kes,
            currency: 'KES',
            status: 'completed',
            description: receipt.notes || `Payment receipt #${receipt.receipt_number}`,
            created_at: receipt.created_at,
            updated_at: receipt.updated_at,
            category: 'payment',
          })),
        ]

        setFinancialRecords(financialRecords)
      } else if (pipeline === 'direct_addition' || pipeline === 'purchase_pipeline') {
        // For acquisition pipelines, use acquisition-specific tables
        const [costsResult, paymentsResult] = await Promise.allSettled([
          supabase.from('property_acquisition_costs').select('*').eq('property_id', propertyId),
          supabase.from('property_payment_installments').select('*').eq('property_id', propertyId),
        ])

        // Convert acquisition data to financial records format
        const costs = costsResult.status === 'fulfilled' ? costsResult.value.data || [] : []
        const payments = paymentsResult.status === 'fulfilled' ? paymentsResult.value.data || [] : []

        const financialRecords = [
          ...costs.map((cost: any) => ({
            id: cost.id,
            property_id: cost.property_id,
            pipeline: pipeline,
            payment_type: cost.cost_type_id,
            amount: cost.amount_kes,
            currency: 'KES',
            status: 'completed',
            description: cost.notes || `${cost.cost_type_id} cost`,
            created_at: cost.created_at,
            updated_at: cost.updated_at,
            category: 'cost',
          })),
          ...payments.map((payment: any) => ({
            id: payment.id,
            property_id: payment.property_id,
            pipeline: pipeline,
            payment_type: 'payment_installment',
            amount: payment.amount_kes,
            currency: 'KES',
            status: 'completed',
            description: payment.notes || `Payment installment #${payment.installment_number}`,
            created_at: payment.created_at,
            updated_at: payment.updated_at,
            category: 'payment',
          })),
        ]

        setFinancialRecords(financialRecords)
      } else {
        // For unknown pipelines, return empty data to avoid 404 errors
        console.warn(`[useFinancialStatus] Unknown pipeline: ${pipeline}, returning empty data`)
        setFinancialRecords([])
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
