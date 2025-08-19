'use client'

import { ActiveTab } from '../types/property-management.types'

interface WorkflowNavigationProps {
  activeTab: ActiveTab
  onTabChange: (tab: ActiveTab) => void
}

export default function WorkflowNavigation({ activeTab, onTabChange }: WorkflowNavigationProps) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
      <h2 className="text-xl font-bold text-gray-900 mb-3 text-center">Property Management Workflows</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        {/* Direct Addition */}
        <button
          onClick={() => onTabChange('properties')}
          className={`bg-gradient-to-br rounded-lg py-3 px-3 transition-all duration-200 hover:scale-102 cursor-pointer border-2 ${
            activeTab === 'properties'
              ? 'from-green-100 to-emerald-100 border-green-400 shadow-md ring-2 ring-green-300 ring-opacity-50 scale-102'
              : 'from-green-50 to-emerald-50 border-green-200 hover:shadow-md hover:from-green-100 hover:to-emerald-100'
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${activeTab === 'properties' ? 'bg-green-200' : 'bg-green-100'}`}>🏠</div>
            <div>
              <h3 className={`font-bold text-base transition-colors ${activeTab === 'properties' ? 'text-green-900' : 'text-green-800'}`}>Direct Addition</h3>
              <p className={`text-sm mt-1 transition-colors opacity-75 ${activeTab === 'properties' ? 'text-green-700' : 'text-green-600'}`}>Manually create properties with full details and coordinates</p>
            </div>
          </div>
        </button>

        {/* Purchase Pipeline */}
        <button
          onClick={() => onTabChange('purchase')}
          className={`bg-gradient-to-br rounded-lg py-3 px-3 transition-all duration-200 hover:scale-102 cursor-pointer border-2 ${
            activeTab === 'purchase'
              ? 'from-blue-100 to-cyan-100 border-blue-400 shadow-md ring-2 ring-blue-300 ring-opacity-50 scale-102'
              : 'from-blue-50 to-cyan-50 border-blue-200 hover:shadow-md hover:from-blue-100 hover:to-cyan-100'
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${activeTab === 'purchase' ? 'bg-blue-200' : 'bg-blue-100'}`}>🏢</div>
            <div>
              <h3 className={`font-bold text-base transition-colors ${activeTab === 'purchase' ? 'text-blue-900' : 'text-blue-800'}`}>Purchase Pipeline</h3>
              <p className={`text-sm mt-1 transition-colors opacity-75 ${activeTab === 'purchase' ? 'text-blue-700' : 'text-blue-600'}`}>Track acquisitions and transfer completed purchases to properties</p>
            </div>
          </div>
        </button>

        {/* Subdivision Process */}
        <button
          onClick={() => onTabChange('subdivision')}
          className={`bg-gradient-to-br rounded-lg py-3 px-3 transition-all duration-200 hover:scale-102 cursor-pointer border-2 ${
            activeTab === 'subdivision'
              ? 'from-orange-100 to-amber-100 border-orange-400 shadow-md ring-2 ring-orange-300 ring-opacity-50 scale-102'
              : 'from-orange-50 to-amber-50 border-orange-200 hover:shadow-md hover:from-orange-100 hover:to-amber-100'
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${activeTab === 'subdivision' ? 'bg-orange-200' : 'bg-orange-100'}`}>🏗️</div>
            <div>
              <h3 className={`font-bold text-base transition-colors ${activeTab === 'subdivision' ? 'text-orange-900' : 'text-orange-800'}`}>Subdivision Process</h3>
              <p className={`text-sm mt-1 transition-colors opacity-75 ${activeTab === 'subdivision' ? 'text-orange-700' : 'text-orange-600'}`}>Subdivide existing properties into individual manageable plots</p>
            </div>
          </div>
        </button>

        {/* Property Handover */}
        <button
          onClick={() => onTabChange('handover')}
          className={`bg-gradient-to-br rounded-lg py-3 px-3 transition-all duration-200 hover:scale-102 cursor-pointer border-2 ${
            activeTab === 'handover'
              ? 'from-purple-100 to-violet-100 border-purple-400 shadow-md ring-2 ring-purple-300 ring-opacity-50 scale-102'
              : 'from-purple-50 to-violet-50 border-purple-200 hover:shadow-md hover:from-purple-100 hover:to-violet-100'
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${activeTab === 'handover' ? 'bg-purple-200' : 'bg-purple-100'}`}>📋</div>
            <div>
              <h3 className={`font-bold text-base transition-colors ${activeTab === 'handover' ? 'text-purple-900' : 'text-purple-800'}`}>Property Handover</h3>
              <p className={`text-sm mt-1 transition-colors opacity-75 ${activeTab === 'handover' ? 'text-purple-700' : 'text-purple-600'}`}>Manage financial settlements and property handover processes</p>
            </div>
          </div>
        </button>


      </div>
    </div>
  )
}
