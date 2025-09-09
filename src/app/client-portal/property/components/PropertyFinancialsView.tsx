'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '../../../../lib/export-utils'

interface FinancialRecord {
  id: string
  type: 'COST' | 'PAYMENT'
  category: string
  amount: number
  description: string
  date: string
  status: 'PENDING' | 'COMPLETED' | 'VERIFIED'
  reference?: string
}

interface PropertyFinancialsViewProps {
  propertyId: string
  handoverId: string
}

export default function PropertyFinancialsView({ propertyId, handoverId }: PropertyFinancialsViewProps) {
  const [financials, setFinancials] = useState<FinancialRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFinancials()
  }, [propertyId, handoverId])

  const loadFinancials = async () => {
    try {
      setLoading(true)
      
      // Mock data for now - replace with actual API call
      const mockFinancials: FinancialRecord[] = [
        {
          id: '1',
          type: 'COST',
          category: 'Legal Fees',
          amount: 150000,
          description: 'Legal documentation and processing fees',
          date: '2024-01-15T10:00:00Z',
          status: 'COMPLETED',
          reference: 'LF-2024-001'
        },
        {
          id: '2',
          type: 'COST',
          category: 'Survey Costs',
          amount: 75000,
          description: 'Property survey and valuation',
          date: '2024-01-18T14:30:00Z',
          status: 'COMPLETED',
          reference: 'SV-2024-001'
        },
        {
          id: '3',
          type: 'PAYMENT',
          category: 'Down Payment',
          amount: 2000000,
          description: 'Initial down payment',
          date: '2024-01-20T09:15:00Z',
          status: 'VERIFIED',
          reference: 'DP-2024-001'
        },
        {
          id: '4',
          type: 'COST',
          category: 'Registration Fees',
          amount: 200000,
          description: 'Property registration and stamp duty',
          date: '2024-01-25T11:00:00Z',
          status: 'PENDING',
          reference: 'RF-2024-001'
        }
      ]

      setFinancials(mockFinancials)
    } catch (error) {
      console.error('Error loading financials:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'VERIFIED':
        return 'bg-blue-100 text-blue-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PAYMENT':
        return 'text-green-600'
      case 'COST':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PAYMENT':
        return '💰'
      case 'COST':
        return '💸'
      default:
        return '💳'
    }
  }

  const totalCosts = financials
    .filter(f => f.type === 'COST')
    .reduce((sum, f) => sum + f.amount, 0)

  const totalPayments = financials
    .filter(f => f.type === 'PAYMENT')
    .reduce((sum, f) => sum + f.amount, 0)

  const balance = totalPayments - totalCosts

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Financial Summary */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Financial Summary</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPayments)}</div>
            <div className="text-sm text-green-700">Total Payments</div>
          </div>
          
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalCosts)}</div>
            <div className="text-sm text-red-700">Total Costs</div>
          </div>
          
          <div className={`text-center p-4 rounded-lg ${balance >= 0 ? 'bg-blue-50' : 'bg-yellow-50'}`}>
            <div className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-yellow-600'}`}>
              {formatCurrency(Math.abs(balance))}
            </div>
            <div className={`text-sm ${balance >= 0 ? 'text-blue-700' : 'text-yellow-700'}`}>
              {balance >= 0 ? 'Credit Balance' : 'Outstanding'}
            </div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">{financials.length}</div>
            <div className="text-sm text-gray-700">Total Transactions</div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction History</h3>
        
        {financials.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-6xl mb-4">💰</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Transactions Yet</h4>
            <p className="text-gray-600">Financial transactions will appear here as they are processed</p>
          </div>
        ) : (
          <div className="space-y-4">
            {financials
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((record) => (
                <div key={record.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">
                        {getTypeIcon(record.type)}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{record.description}</h4>
                        <p className="text-sm text-gray-600">Category: {record.category}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(record.date).toLocaleDateString()} • Ref: {record.reference}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getTypeColor(record.type)}`}>
                        {record.type === 'PAYMENT' ? '+' : '-'}{formatCurrency(record.amount)}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Payment Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Costs Breakdown */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Costs Breakdown</h3>
          
          {financials.filter(f => f.type === 'COST').length === 0 ? (
            <p className="text-gray-600 text-center py-4">No costs recorded yet</p>
          ) : (
            <div className="space-y-3">
              {financials
                .filter(f => f.type === 'COST')
                .reduce((acc, record) => {
                  const existing = acc.find(item => item.category === record.category)
                  if (existing) {
                    existing.amount += record.amount
                  } else {
                    acc.push({ category: record.category, amount: record.amount })
                  }
                  return acc
                }, [] as { category: string; amount: number }[])
                .map((item) => (
                  <div key={item.category} className="flex justify-between items-center">
                    <span className="text-gray-700">{item.category}</span>
                    <span className="font-medium text-red-600">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Payments Breakdown */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payments Breakdown</h3>
          
          {financials.filter(f => f.type === 'PAYMENT').length === 0 ? (
            <p className="text-gray-600 text-center py-4">No payments recorded yet</p>
          ) : (
            <div className="space-y-3">
              {financials
                .filter(f => f.type === 'PAYMENT')
                .reduce((acc, record) => {
                  const existing = acc.find(item => item.category === record.category)
                  if (existing) {
                    existing.amount += record.amount
                  } else {
                    acc.push({ category: record.category, amount: record.amount })
                  }
                  return acc
                }, [] as { category: string; amount: number }[])
                .map((item) => (
                  <div key={item.category} className="flex justify-between items-center">
                    <span className="text-gray-700">{item.category}</span>
                    <span className="font-medium text-green-600">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
