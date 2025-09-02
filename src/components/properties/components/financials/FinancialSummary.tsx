/**
 * Financial Summary Component
 * 
 * Extracted from PropertyAcquisitionFinancials.tsx to improve maintainability.
 * Displays financial totals and breakdown by category.
 */

'use client'

import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { FinancialSummaryProps } from './FinancialTypes'

export default function FinancialSummary({
  totals,
  formatCurrency,
  isCollapsed,
  onToggleCollapse,
}: FinancialSummaryProps) {
  const {
    totalCosts,
    totalPayments,
    purchasePrice,
    remainingBalance,
    costsByCategory,
    subdivisionCostsByCategory,
    totalSubdivisionCosts,
    grandTotal,
  } = totals

  const balanceColor = remainingBalance > 0 ? 'text-red-600' : 'text-green-600'

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={onToggleCollapse}
      >
        <h3 className="text-lg font-medium text-gray-900">Financial Summary</h3>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm text-gray-600">Total Outstanding</div>
            <div className={`text-lg font-semibold ${balanceColor}`}>
              {formatCurrency(Math.abs(remainingBalance))}
            </div>
          </div>
          {isCollapsed ? (
            <ChevronDownIcon className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronUpIcon className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {!isCollapsed && (
        <div className="border-t border-gray-200 p-4 space-y-6">
          {/* Main Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-blue-700">Purchase Price</div>
              <div className="text-xl font-bold text-blue-900">
                {formatCurrency(purchasePrice)}
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-green-700">Total Payments</div>
              <div className="text-xl font-bold text-green-900">
                {formatCurrency(totalPayments)}
              </div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-orange-700">Total Costs</div>
              <div className="text-xl font-bold text-orange-900">
                {formatCurrency(totalCosts)}
              </div>
            </div>
            
            <div className={`p-4 rounded-lg ${remainingBalance > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
              <div className={`text-sm font-medium ${remainingBalance > 0 ? 'text-red-700' : 'text-green-700'}`}>
                {remainingBalance > 0 ? 'Outstanding Balance' : 'Overpayment'}
              </div>
              <div className={`text-xl font-bold ${remainingBalance > 0 ? 'text-red-900' : 'text-green-900'}`}>
                {formatCurrency(Math.abs(remainingBalance))}
              </div>
            </div>
          </div>

          {/* Acquisition Costs Breakdown */}
          {totalCosts > 0 && (
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Acquisition Costs by Category</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(costsByCategory).map(([category, amount]) => (
                  amount > 0 && (
                    <div key={category} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">
                        {category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Subdivision Costs Breakdown */}
          {totalSubdivisionCosts > 0 && (
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Subdivision Costs by Category</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(subdivisionCostsByCategory).map(([category, amount]) => (
                  amount > 0 && (
                    <div key={category} className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                      <span className="text-sm font-medium text-purple-700">
                        {category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <span className="text-sm font-semibold text-purple-900">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Grand Total */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center p-4 bg-gray-100 rounded-lg">
              <span className="text-lg font-semibold text-gray-900">Grand Total (Purchase + Costs)</span>
              <span className="text-xl font-bold text-gray-900">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>

          {/* Payment Progress */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Payment Progress</span>
              <span className="text-sm text-gray-600">
                {purchasePrice > 0 ? Math.round((totalPayments / purchasePrice) * 100) : 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  remainingBalance <= 0 ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{
                  width: `${purchasePrice > 0 ? Math.min((totalPayments / purchasePrice) * 100, 100) : 0}%`
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
