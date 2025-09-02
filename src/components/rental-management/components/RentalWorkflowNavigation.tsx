'use client'

import { RentalManagementTab } from '../types/rental-management.types'

interface RentalWorkflowNavigationProps {
  activeTab: RentalManagementTab
  onTabChange: (tab: RentalManagementTab) => void
}

export default function RentalWorkflowNavigation({ activeTab, onTabChange }: RentalWorkflowNavigationProps) {
  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
      <h2 className="text-xl font-bold text-gray-900 mb-3 text-center">
        Rental Management Workflows
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* Properties */}
        <button
          onClick={() => onTabChange('properties')}
          className={`bg-gradient-to-br rounded-lg py-3 px-3 transition-all duration-200 hover:scale-102 cursor-pointer border-2 ${
            activeTab === 'properties'
              ? 'from-green-100 to-emerald-100 border-green-400 shadow-md ring-2 ring-green-300 ring-opacity-50 scale-102'
              : 'from-green-50 to-emerald-50 border-green-200 hover:shadow-md hover:from-green-100 hover:to-emerald-100'
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${
                activeTab === 'properties' ? 'bg-green-200' : 'bg-green-100'
              }`}
            >
              🏠
            </div>
            <div>
              <h3
                className={`font-bold text-base transition-colors ${
                  activeTab === 'properties' ? 'text-green-900' : 'text-green-800'
                }`}
              >
                Properties
              </h3>
              <p
                className={`text-sm mt-1 transition-colors opacity-75 ${
                  activeTab === 'properties' ? 'text-green-700' : 'text-green-600'
                }`}
              >
                Rental property portfolio and occupancy management
              </p>
            </div>
          </div>
        </button>

        {/* Tenants & Leases */}
        <button
          onClick={() => onTabChange('tenants')}
          className={`bg-gradient-to-br rounded-lg py-3 px-3 transition-all duration-200 hover:scale-102 cursor-pointer border-2 ${
            activeTab === 'tenants'
              ? 'from-blue-100 to-indigo-100 border-blue-400 shadow-md ring-2 ring-blue-300 ring-opacity-50 scale-102'
              : 'from-blue-50 to-indigo-50 border-blue-200 hover:shadow-md hover:from-blue-100 hover:to-indigo-100'
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${
                activeTab === 'tenants' ? 'bg-blue-200' : 'bg-blue-100'
              }`}
            >
              👥
            </div>
            <div>
              <h3
                className={`font-bold text-base transition-colors ${
                  activeTab === 'tenants' ? 'text-blue-900' : 'text-blue-800'
                }`}
              >
                Tenants & Leases
              </h3>
              <p
                className={`text-sm mt-1 transition-colors opacity-75 ${
                  activeTab === 'tenants' ? 'text-blue-700' : 'text-blue-600'
                }`}
              >
                Tenant relationships and lease agreement management
              </p>
            </div>
          </div>
        </button>

        {/* Payments */}
        <button
          onClick={() => onTabChange('payments')}
          className={`bg-gradient-to-br rounded-lg py-3 px-3 transition-all duration-200 hover:scale-102 cursor-pointer border-2 ${
            activeTab === 'payments'
              ? 'from-purple-100 to-violet-100 border-purple-400 shadow-md ring-2 ring-purple-300 ring-opacity-50 scale-102'
              : 'from-purple-50 to-violet-50 border-purple-200 hover:shadow-md hover:from-purple-100 hover:to-violet-100'
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${
                activeTab === 'payments' ? 'bg-purple-200' : 'bg-purple-100'
              }`}
            >
              💳
            </div>
            <div>
              <h3
                className={`font-bold text-base transition-colors ${
                  activeTab === 'payments' ? 'text-purple-900' : 'text-purple-800'
                }`}
              >
                Payments
              </h3>
              <p
                className={`text-sm mt-1 transition-colors opacity-75 ${
                  activeTab === 'payments' ? 'text-purple-700' : 'text-purple-600'
                }`}
              >
                Rent collection, payment tracking, and financial records
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
