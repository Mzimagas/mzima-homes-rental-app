'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '../../../lib/export-utils'
import { useToast } from '../../../components/ui/Toast'

interface ReadOnlyHandoverFinancialsProps {
  propertyId: string
  handoverData: {
    id: string
    handover_status: string
    current_stage: number
    overall_progress: number
  }
  propertyPrice: number
}

interface AcquisitionCost {
  id: string
  property_id: string
  cost_type_id: string
  cost_category: string
  amount_kes: number
  payment_reference?: string
  payment_date?: string
  notes?: string
  created_at: string
}

interface PaymentInstallment {
  id: string
  property_id: string
  amount_kes: number
  payment_date: string
  payment_reference?: string
  payment_method?: string
  notes?: string
  created_at: string
}

interface CostType {
  id: string
  name: string
  category: string
  description?: string
}

const ACQUISITION_COST_TYPES: CostType[] = [
  { id: 'legal_fees', name: 'Legal Fees', category: 'AGREEMENT_LEGAL', description: 'Lawyer and legal documentation fees' },
  { id: 'valuation_fees', name: 'Valuation Fees', category: 'PRE_PURCHASE', description: 'Property valuation costs' },
  { id: 'survey_fees', name: 'Survey Fees', category: 'PRE_PURCHASE', description: 'Land survey and mapping costs' },
  { id: 'search_fees', name: 'Search Fees', category: 'PRE_PURCHASE', description: 'Official land search fees' },
  { id: 'stamp_duty', name: 'Stamp Duty', category: 'TRANSFER_REGISTRATION', description: 'Government stamp duty' },
  { id: 'registration_fees', name: 'Registration Fees', category: 'TRANSFER_REGISTRATION', description: 'Land registration fees' },
  { id: 'agent_commission', name: 'Agent Commission', category: 'OTHER', description: 'Real estate agent commission' },
  { id: 'other_costs', name: 'Other Costs', category: 'OTHER', description: 'Miscellaneous acquisition costs' },
]

export default function ReadOnlyHandoverFinancials({ propertyId, handoverData, propertyPrice }: ReadOnlyHandoverFinancialsProps) {
  const [acquisitionCosts, setAcquisitionCosts] = useState<AcquisitionCost[]>([])
  const [paymentInstallments, setPaymentInstallments] = useState<PaymentInstallment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [collapsedSections, setCollapsedSections] = useState({
    pricing: false,
    deposits: false,
    costs: false,
    summary: false,
  })
  const { showToast } = useToast()

  useEffect(() => {
    loadFinancialData()
  }, [propertyId])

  const loadFinancialData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [costsResponse, paymentsResponse] = await Promise.all([
        fetch(`/api/properties/${propertyId}/acquisition-costs`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        fetch(`/api/properties/${propertyId}/payment-installments`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      ])

      if (costsResponse.ok) {
        const costsData = await costsResponse.json()
        setAcquisitionCosts(costsData.data || [])
      } else {
        console.warn('Failed to load acquisition costs:', costsResponse.status)
      }

      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json()
        setPaymentInstallments(paymentsData.data || [])
      } else {
        console.warn('Failed to load payment installments:', paymentsResponse.status)
      }
    } catch (error) {
      console.error('Error loading financial data:', error)
      setError('Failed to load financial data')
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleDisabledAction = (action: string) => {
    showToast(`${action} is not available in read-only mode. Contact support for assistance.`, {
      variant: 'info'
    })
  }

  const getCostTypeName = (costTypeId: string) => {
    const costType = ACQUISITION_COST_TYPES.find(type => type.id === costTypeId)
    return costType?.name || costTypeId
  }

  const calculateTotals = () => {
    const totalCosts = acquisitionCosts.reduce((sum, cost) => sum + cost.amount_kes, 0)
    const totalPayments = paymentInstallments.reduce((sum, payment) => sum + payment.amount_kes, 0)
    const purchasePrice = propertyPrice || 0
    const remainingBalance = purchasePrice - totalPayments

    return {
      totalCosts,
      totalPayments,
      purchasePrice,
      remainingBalance,
      totalAcquisitionCost: totalCosts + purchasePrice,
    }
  }

  const totals = calculateTotals()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading financial data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-900">Financial Information</h4>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Read-only view</span>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-blue-600 text-xl">ℹ️</div>
          <div>
            <h5 className="font-medium text-blue-900">Financial Access Information</h5>
            <p className="text-sm text-blue-800 mt-1">
              You can view all financial information related to your property purchase. 
              Payment processing and cost management are handled by our team.
            </p>
          </div>
        </div>
      </div>

      {/* Purchase Price Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => toggleSection('pricing')}
            className="flex items-center space-x-2 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            <span aria-hidden="true">{collapsedSections.pricing ? '▶' : '▼'}</span>
            <h4 className="text-lg font-semibold text-gray-900">Purchase Price Information</h4>
          </button>
        </div>

        {!collapsedSections.pricing && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asking Price</label>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <span className="text-gray-900">
                    {handoverData.asking_price_kes ? formatCurrency(handoverData.asking_price_kes) : 'Not specified'}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Negotiated Price</label>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <span className="text-gray-900">
                    {handoverData.negotiated_price_kes ? formatCurrency(handoverData.negotiated_price_kes) : 'Not specified'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Purchase Price Deposits and Installments */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => toggleSection('deposits')}
            className="flex items-center space-x-2 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            <span aria-hidden="true">{collapsedSections.deposits ? '▶' : '▼'}</span>
            <h4 className="text-lg font-semibold text-gray-900">Purchase Price Deposits and Installments</h4>
          </button>
          {!collapsedSections.deposits && (
            <button
              onClick={() => handleDisabledAction('Add deposit/installment')}
              className="px-3 py-1 bg-gray-100 text-gray-400 rounded text-sm cursor-not-allowed"
              disabled
            >
              + Add Deposit/Installment
            </button>
          )}
        </div>

        {!collapsedSections.deposits && (
          <div className="mt-4 space-y-4">
            {paymentInstallments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reference
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paymentInstallments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(payment.amount_kes)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.payment_reference || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.payment_method || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {payment.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No payment installments recorded yet</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Acquisition Costs */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => toggleSection('costs')}
            className="flex items-center space-x-2 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            <span aria-hidden="true">{collapsedSections.costs ? '▶' : '▼'}</span>
            <h4 className="text-lg font-semibold text-gray-900">Acquisition Costs</h4>
          </button>
          {!collapsedSections.costs && (
            <button
              onClick={() => handleDisabledAction('Add acquisition cost')}
              className="px-3 py-1 bg-gray-100 text-gray-400 rounded text-sm cursor-not-allowed"
              disabled
            >
              + Add Cost
            </button>
          )}
        </div>

        {!collapsedSections.costs && (
          <div className="mt-4 space-y-4">
            {acquisitionCosts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cost Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reference
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {acquisitionCosts.map((cost) => (
                      <tr key={cost.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {getCostTypeName(cost.cost_type_id)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(cost.amount_kes)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {cost.payment_date ? new Date(cost.payment_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {cost.payment_reference || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {cost.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No acquisition costs recorded yet</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Financial Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => toggleSection('summary')}
            className="flex items-center space-x-2 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            <span aria-hidden="true">{collapsedSections.summary ? '▶' : '▼'}</span>
            <h4 className="text-lg font-semibold text-gray-900">Financial Summary</h4>
          </button>
        </div>

        {!collapsedSections.summary && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Purchase Price:</span>
                  <span className="font-medium">{formatCurrency(totals.purchasePrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Payments:</span>
                  <span className="font-medium text-green-600">{formatCurrency(totals.totalPayments)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Remaining Balance:</span>
                  <span className={`font-medium ${totals.remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(totals.remainingBalance)}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Acquisition Costs:</span>
                  <span className="font-medium">{formatCurrency(totals.totalCosts)}</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="text-gray-900 font-semibold">Total Investment:</span>
                  <span className="font-semibold text-lg">{formatCurrency(totals.totalAcquisitionCost)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
