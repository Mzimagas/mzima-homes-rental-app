'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { usePropertyMutualExclusivity } from '../../../hooks/usePropertyMutualExclusivity'

interface ReadOnlyFinancialContextType {
  isReadOnly: boolean
  readOnlyReason: string | null
  canAdd: boolean
  canEdit: boolean
  canDelete: boolean
  checkAction: (action: 'add' | 'edit' | 'delete') => boolean
}

const ReadOnlyFinancialContext = createContext<ReadOnlyFinancialContextType | null>(null)

interface ReadOnlyFinancialWrapperProps {
  propertyId: string
  children: ReactNode
  showBanner?: boolean
}

/**
 * Wrapper component that provides read-only context for financial components
 * Automatically disables financial editing when property is completed
 */
export default function ReadOnlyFinancialWrapper({
  propertyId,
  children,
  showBanner = true,
}: ReadOnlyFinancialWrapperProps) {
  const {
    financialsReadOnly,
    financialsReadOnlyReason,
    canAddCosts,
    canEditCosts,
    canDeleteCosts,
    validateFinancialAction,
  } = usePropertyMutualExclusivity(propertyId)

  const checkAction = (action: 'add' | 'edit' | 'delete'): boolean => {
    const validation = validateFinancialAction(action)
    if (!validation.allowed) {
      alert(validation.reason)
      return false
    }
    return true
  }

  const contextValue: ReadOnlyFinancialContextType = {
    isReadOnly: financialsReadOnly,
    readOnlyReason: financialsReadOnlyReason,
    canAdd: canAddCosts,
    canEdit: canEditCosts,
    canDelete: canDeleteCosts,
    checkAction,
  }

  return (
    <ReadOnlyFinancialContext.Provider value={contextValue}>
      <div className={financialsReadOnly ? 'read-only-mode' : ''}>
        {/* Read-Only Banner */}
        {showBanner && financialsReadOnly && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-center">
              <span className="text-amber-600 mr-2">💰🔒</span>
              <span className="font-medium text-amber-800">Financial Data is Read-Only</span>
            </div>
            <p className="mt-1 text-sm text-amber-700">
              {financialsReadOnlyReason ||
                'Financial records can be viewed but cannot be modified.'}
            </p>
          </div>
        )}

        {/* Financial Content */}
        <div className="financial-content">{children}</div>

        {/* CSS for read-only styling */}
        <style jsx>{`
          .read-only-mode button:not([data-readonly-allowed]) {
            opacity: 0.5;
            cursor: not-allowed;
            pointer-events: auto;
          }

          .read-only-mode button:not([data-readonly-allowed]):hover {
            opacity: 0.5;
          }

          .read-only-mode input:not([readonly]),
          .read-only-mode select:not([readonly]),
          .read-only-mode textarea:not([readonly]) {
            background-color: #f9fafb;
            border-color: #d1d5db;
            color: #6b7280;
            cursor: not-allowed;
          }

          .read-only-mode .financial-form {
            opacity: 0.5;
            pointer-events: none;
          }

          .read-only-mode .cost-input {
            pointer-events: none;
          }
        `}</style>
      </div>
    </ReadOnlyFinancialContext.Provider>
  )
}

/**
 * Hook to access read-only financial context
 */
export function useFinancialReadOnlyStatus(propertyId?: string) {
  const context = useContext(ReadOnlyFinancialContext)

  // If no context, create a fallback using the hook directly
  const fallback = usePropertyMutualExclusivity(propertyId || '')

  if (context) {
    return context
  }

  // Fallback implementation
  return {
    isReadOnly: fallback.financialsReadOnly,
    readOnlyReason: fallback.financialsReadOnlyReason,
    canAdd: fallback.canAddCosts,
    canEdit: fallback.canEditCosts,
    canDelete: fallback.canDeleteCosts,
    checkAction: (action: 'add' | 'edit' | 'delete') => {
      const validation = fallback.validateFinancialAction(action)
      if (!validation.allowed) {
        alert(validation.reason)
        return false
      }
      return true
    },
  }
}

/**
 * Higher-order component for wrapping financial components with read-only functionality
 */
export function withReadOnlyFinancials<P extends object>(Component: React.ComponentType<P>) {
  return function ReadOnlyFinancialComponent(props: P & { propertyId: string }) {
    const { propertyId, ...componentProps } = props

    return (
      <ReadOnlyFinancialWrapper propertyId={propertyId}>
        <Component {...(componentProps as P)} />
      </ReadOnlyFinancialWrapper>
    )
  }
}

/**
 * Component for displaying read-only status information
 */
export function ReadOnlyFinancialStatus({ propertyId }: { propertyId: string }) {
  const { isReadOnly, readOnlyReason } = useFinancialReadOnlyStatus(propertyId)

  if (!isReadOnly) {
    return null
  }

  return (
    <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
      <div className="flex items-center">
        <span className="text-amber-600 mr-2">💰🔒</span>
        <span className="font-medium text-amber-800">Financial Data is Read-Only</span>
      </div>
      <p className="mt-1 text-sm text-amber-700">
        {readOnlyReason || 'Financial records can be viewed but cannot be modified.'}
      </p>
    </div>
  )
}

/**
 * Button component that respects read-only state for financial actions
 */
interface ReadOnlyAwareFinancialButtonProps {
  action: 'add' | 'edit' | 'delete'
  onClick: () => void
  children: ReactNode
  className?: string
  disabled?: boolean
  propertyId?: string
}

export function ReadOnlyAwareFinancialButton({
  action,
  onClick,
  children,
  className = '',
  disabled = false,
  propertyId,
}: ReadOnlyAwareFinancialButtonProps) {
  const { isReadOnly, checkAction } = useFinancialReadOnlyStatus(propertyId)

  const handleClick = () => {
    if (isReadOnly && !checkAction(action)) {
      return
    }
    onClick()
  }

  const isDisabled = disabled || isReadOnly

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`${className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      data-readonly-allowed={!isReadOnly}
    >
      {isReadOnly ? `🔒 ${children} (Disabled)` : children}
    </button>
  )
}

/**
 * Form component that respects read-only state for financial data
 */
interface ReadOnlyAwareFinancialFormProps {
  onSubmit: (data: any) => void
  children: ReactNode
  className?: string
  propertyId?: string
}

export function ReadOnlyAwareFinancialForm({
  onSubmit,
  children,
  className = '',
  propertyId,
}: ReadOnlyAwareFinancialFormProps) {
  const { isReadOnly, checkAction } = useFinancialReadOnlyStatus(propertyId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (isReadOnly && !checkAction('add')) {
      return
    }

    const formData = new FormData(e.target as HTMLFormElement)
    const data = Object.fromEntries(formData.entries())
    onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit} className={`${className} ${isReadOnly ? 'financial-form' : ''}`}>
      {children}
    </form>
  )
}

/**
 * Input component that respects read-only state for financial data
 */
interface ReadOnlyAwareFinancialInputProps {
  type?: string
  value: string | number
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  propertyId?: string
}

export function ReadOnlyAwareFinancialInput({
  type = 'text',
  value,
  onChange,
  placeholder,
  className = '',
  disabled = false,
  propertyId,
}: ReadOnlyAwareFinancialInputProps) {
  const { isReadOnly } = useFinancialReadOnlyStatus(propertyId)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) {
      return
    }
    onChange(e.target.value)
  }

  const isDisabled = disabled || isReadOnly

  return (
    <input
      type={type}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={isDisabled}
      className={`${className} ${isDisabled ? 'cursor-not-allowed' : ''} cost-input`}
      readOnly={isReadOnly}
    />
  )
}
