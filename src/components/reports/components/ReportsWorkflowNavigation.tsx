'use client'

export type ReportsTab = 'financial' | 'occupancy' | 'tenants' | 'properties'

interface ReportsWorkflowNavigationProps {
  activeTab: ReportsTab
  onTabChange: (tab: ReportsTab) => void
}

export default function ReportsWorkflowNavigation({ activeTab, onTabChange }: ReportsWorkflowNavigationProps) {
  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3">
      <h2 className="text-xl font-bold text-gray-900 mb-3 text-center">
        Reports & Analytics Workflows
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        {/* Financial Reports */}
        <button
          onClick={() => onTabChange('financial')}
          className={`bg-gradient-to-br rounded-lg py-3 px-3 transition-all duration-200 hover:scale-102 cursor-pointer border-2 ${
            activeTab === 'financial'
              ? 'from-green-100 to-emerald-100 border-green-400 shadow-md ring-2 ring-green-300 ring-opacity-50 scale-102'
              : 'from-green-50 to-emerald-50 border-green-200 hover:shadow-md hover:from-green-100 hover:to-emerald-100'
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${
                activeTab === 'financial' ? 'bg-green-200' : 'bg-green-100'
              }`}
            >
              💰
            </div>
            <div>
              <h3
                className={`font-bold text-base transition-colors ${
                  activeTab === 'financial' ? 'text-green-900' : 'text-green-800'
                }`}
              >
                Financial Reports
              </h3>
              <p
                className={`text-sm mt-1 transition-colors opacity-75 ${
                  activeTab === 'financial' ? 'text-green-700' : 'text-green-600'
                }`}
              >
                Revenue, expenses, profit & loss, and financial analytics
              </p>
            </div>
          </div>
        </button>

        {/* Occupancy Reports */}
        <button
          onClick={() => onTabChange('occupancy')}
          className={`bg-gradient-to-br rounded-lg py-3 px-3 transition-all duration-200 hover:scale-102 cursor-pointer border-2 ${
            activeTab === 'occupancy'
              ? 'from-blue-100 to-indigo-100 border-blue-400 shadow-md ring-2 ring-blue-300 ring-opacity-50 scale-102'
              : 'from-blue-50 to-indigo-50 border-blue-200 hover:shadow-md hover:from-blue-100 hover:to-indigo-100'
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${
                activeTab === 'occupancy' ? 'bg-blue-200' : 'bg-blue-100'
              }`}
            >
              🏘️
            </div>
            <div>
              <h3
                className={`font-bold text-base transition-colors ${
                  activeTab === 'occupancy' ? 'text-blue-900' : 'text-blue-800'
                }`}
              >
                Occupancy Reports
              </h3>
              <p
                className={`text-sm mt-1 transition-colors opacity-75 ${
                  activeTab === 'occupancy' ? 'text-blue-700' : 'text-blue-600'
                }`}
              >
                Vacancy rates, occupancy trends, and unit utilization
              </p>
            </div>
          </div>
        </button>

        {/* Tenant Analytics */}
        <button
          onClick={() => onTabChange('tenants')}
          className={`bg-gradient-to-br rounded-lg py-3 px-3 transition-all duration-200 hover:scale-102 cursor-pointer border-2 ${
            activeTab === 'tenants'
              ? 'from-purple-100 to-violet-100 border-purple-400 shadow-md ring-2 ring-purple-300 ring-opacity-50 scale-102'
              : 'from-purple-50 to-violet-50 border-purple-200 hover:shadow-md hover:from-purple-100 hover:to-violet-100'
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${
                activeTab === 'tenants' ? 'bg-purple-200' : 'bg-purple-100'
              }`}
            >
              📊
            </div>
            <div>
              <h3
                className={`font-bold text-base transition-colors ${
                  activeTab === 'tenants' ? 'text-purple-900' : 'text-purple-800'
                }`}
              >
                Tenant Analytics
              </h3>
              <p
                className={`text-sm mt-1 transition-colors opacity-75 ${
                  activeTab === 'tenants' ? 'text-purple-700' : 'text-purple-600'
                }`}
              >
                Tenant behavior, payment patterns, and demographics
              </p>
            </div>
          </div>
        </button>

        {/* Property Reports */}
        <button
          onClick={() => onTabChange('properties')}
          className={`bg-gradient-to-br rounded-lg py-3 px-3 transition-all duration-200 hover:scale-102 cursor-pointer border-2 ${
            activeTab === 'properties'
              ? 'from-orange-100 to-amber-100 border-orange-400 shadow-md ring-2 ring-orange-300 ring-opacity-50 scale-102'
              : 'from-orange-50 to-amber-50 border-orange-200 hover:shadow-md hover:from-orange-100 hover:to-amber-100'
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${
                activeTab === 'properties' ? 'bg-orange-200' : 'bg-orange-100'
              }`}
            >
              🏢
            </div>
            <div>
              <h3
                className={`font-bold text-base transition-colors ${
                  activeTab === 'properties' ? 'text-orange-900' : 'text-orange-800'
                }`}
              >
                Property Reports
              </h3>
              <p
                className={`text-sm mt-1 transition-colors opacity-75 ${
                  activeTab === 'properties' ? 'text-orange-700' : 'text-orange-600'
                }`}
              >
                Property performance, maintenance, and portfolio analysis
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
