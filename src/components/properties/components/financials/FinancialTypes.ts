/**
 * Financial Management Types and Interfaces
 * 
 * Extracted from PropertyAcquisitionFinancials.tsx to improve maintainability.
 * Contains all type definitions for financial management components.
 */

import {
  AcquisitionCostEntry,
  PaymentInstallment,
  AcquisitionCostCategory,
  SubdivisionCostCategory,
} from '../../types/property-management.types'

export interface NewCostEntry {
  cost_type_id: string
  amount_kes: string
  payment_reference: string
  payment_date: string
  notes: string
}

export interface NewPaymentInstallment {
  amount_kes: string
  payment_date: string
  payment_reference: string
  payment_method: string
  notes: string
}

export interface FinancialTotals {
  totalCosts: number
  totalPayments: number
  purchasePrice: number
  remainingBalance: number
  costsByCategory: Record<AcquisitionCostCategory, number>
  subdivisionCostsByCategory: Record<SubdivisionCostCategory, number>
  totalSubdivisionCosts: number
  grandTotal: number
}

export interface CostEntryFormProps {
  newCost: NewCostEntry
  onCostChange: (cost: NewCostEntry) => void
  onSubmit: () => Promise<void>
  onCancel: () => void
  isLoading: boolean
  isAddDisabled: boolean
  financialsReadOnlyReason?: string
}

export interface PaymentInstallmentFormProps {
  newPayment: NewPaymentInstallment
  onPaymentChange: (payment: NewPaymentInstallment) => void
  onSubmit: () => Promise<void>
  onCancel: () => void
  isLoading: boolean
  isAddDisabled: boolean
  financialsReadOnlyReason?: string
}

export interface CostEntriesListProps {
  costEntries: AcquisitionCostEntry[]
  onDeleteCost: (costId: string) => Promise<void>
  isDeleteDisabled: boolean
  financialsReadOnlyReason?: string
  formatCurrency: (amount: number) => string
  getCostTypeLabel: (costTypeId: string) => string
}

export interface PaymentInstallmentsListProps {
  paymentInstallments: PaymentInstallment[]
  onDeletePayment: (paymentId: string) => Promise<void>
  isDeleteDisabled: boolean
  financialsReadOnlyReason?: string
  formatCurrency: (amount: number) => string
}

export interface FinancialSummaryProps {
  totals: FinancialTotals
  formatCurrency: (amount: number) => string
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export interface PurchasePriceManagerProps {
  propertyId: string
  totalPurchasePrice: string
  onPurchasePriceChange: (price: string) => void
  isReadOnly: boolean
  readOnlyReason?: string
}

export interface FinancialManagerProps {
  property: any // PropertyWithLifecycle
  onUpdate?: (propertyId: string) => void
}

// Local storage keys for collapsible states
export const LS_KEYS = {
  payments: 'acqfin:collapsed:payments',
  costs: 'acqfin:collapsed:costs',
  breakdown: 'acqfin:collapsed:breakdown',
}

// Utility functions
export const formatCurrency = (amount: number): string => {
  return `KES ${amount.toLocaleString()}`
}

export const parseAmount = (amountStr: string): number => {
  const parsed = parseFloat(amountStr)
  return isNaN(parsed) ? 0 : parsed
}

export const validateCostEntry = (cost: NewCostEntry): string[] => {
  const errors: string[] = []
  
  if (!cost.cost_type_id) {
    errors.push('Cost type is required')
  }
  
  if (!cost.amount_kes || parseAmount(cost.amount_kes) <= 0) {
    errors.push('Amount must be greater than 0')
  }
  
  if (!cost.payment_date) {
    errors.push('Payment date is required')
  }
  
  return errors
}

export const validatePaymentInstallment = (payment: NewPaymentInstallment): string[] => {
  const errors: string[] = []
  
  if (!payment.amount_kes || parseAmount(payment.amount_kes) <= 0) {
    errors.push('Amount must be greater than 0')
  }
  
  if (!payment.payment_date) {
    errors.push('Payment date is required')
  }
  
  if (!payment.payment_method) {
    errors.push('Payment method is required')
  }
  
  return errors
}

// Form state management helpers
export const createEmptyCostEntry = (): NewCostEntry => ({
  cost_type_id: '',
  amount_kes: '',
  payment_reference: '',
  payment_date: new Date().toISOString().slice(0, 10),
  notes: '',
})

export const createEmptyPaymentInstallment = (): NewPaymentInstallment => ({
  amount_kes: '',
  payment_date: new Date().toISOString().slice(0, 10),
  payment_reference: '',
  payment_method: '',
  notes: '',
})

// Cost type normalization
export const normalizeCostTypeId = (subtab: string | null, rawId: string | null): string => {
  if (!rawId) return ''
  const id = String(rawId).trim()
  
  // This would need to import the actual cost types
  // For now, return the ID as-is
  return id
}

// URL parameter management
export const clearFinancialUrlParams = () => {
  try {
    const url = new URL(window.location.href)
    url.searchParams.delete('subtab')
    url.searchParams.delete('cost_type_id')
    url.searchParams.delete('amount_kes')
    url.searchParams.delete('payment_date')
    url.searchParams.delete('notes')
    url.searchParams.delete('payment_amount_kes')
    url.searchParams.delete('payment_notes')
    
    window.history.replaceState({}, '', url.toString())
  } catch (error) {
    console.error('Error clearing URL params:', error)
  }
}

// Scroll utilities
export const scrollToSection = (sectionId: string) => {
  setTimeout(() => {
    const section = document.getElementById(sectionId)
    if (section && section.scrollIntoView) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, 100)
}
