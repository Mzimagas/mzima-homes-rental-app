'use client'

import React from 'react'
import { useDashboardActions } from '../../hooks/useDashboardActions'
import { Button } from '../ui'

/**
 * Contextual header that shows current selections and provides quick actions
 */
export default function ContextualHeader() {
  const { state, getContextualActions, clearContext } = useDashboardActions()
  
  const contextualActions = getContextualActions()
  const hasContext = state.selectedProperty || state.selectedTenant || state.selectedUnit

  if (!hasContext) {
    return null
  }

  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Current Context Display */}
          <div className="flex items-center space-x-2">
            <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-blue-800">Current Context:</span>
          </div>
          
          <div className="flex items-center space-x-3">
            {state.selectedProperty && (
              <div className="flex items-center space-x-1">
                <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="text-sm text-blue-700 font-medium">{state.selectedProperty.name}</span>
              </div>
            )}
            
            {state.selectedTenant && (
              <div className="flex items-center space-x-1">
                <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm text-blue-700 font-medium">{state.selectedTenant.full_name}</span>
              </div>
            )}
            
            {state.selectedUnit && (
              <div className="flex items-center space-x-1">
                <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="text-sm text-blue-700 font-medium">Unit {state.selectedUnit.unit_number}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center space-x-2">
          {contextualActions.slice(0, 3).map((action) => (
            <Button
              key={action.id}
              variant="secondary"
              size="sm"
              className="text-blue-700 border-blue-300 hover:bg-blue-100"
            >
              <span className="mr-1">{action.icon}</span>
              {action.label}
            </Button>
          ))}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={clearContext}
            className="text-blue-600 hover:text-blue-800"
            title="Clear context"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  )
}
