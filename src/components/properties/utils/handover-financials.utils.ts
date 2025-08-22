import { 
  HandoverCostType, 
  HandoverCostCategory, 
  HANDOVER_COST_TYPES, 
  HANDOVER_COST_CATEGORY_LABELS 
} from '../types/property-management.types'
import { HandoverCostEntry, PaymentReceipt } from '../services/handover-financials.service'

// Get handover cost type label by ID
export function getHandoverCostTypeLabel(costTypeId: string): string {
  const costType = HANDOVER_COST_TYPES.find(type => type.id === costTypeId)
  return costType?.label || costTypeId
}

// Get handover cost type by ID
export function getHandoverCostType(costTypeId: string): HandoverCostType | undefined {
  return HANDOVER_COST_TYPES.find(type => type.id === costTypeId)
}

// Get handover cost types by category
export function getHandoverCostTypesByCategory(category: HandoverCostCategory): HandoverCostType[] {
  return HANDOVER_COST_TYPES.filter(type => type.category === category)
}

// Get category label
export function getHandoverCostCategoryLabel(category: HandoverCostCategory): string {
  return HANDOVER_COST_CATEGORY_LABELS[category] || category
}

// Calculate total costs by category
export function calculateHandoverCostsByCategory(costs: HandoverCostEntry[]): Record<HandoverCostCategory, number> {
  const totals: Record<HandoverCostCategory, number> = {
    PRE_HANDOVER: 0,
    AGREEMENT_LEGAL: 0,
    LCB_PROCESS: 0,
    PAYMENT_TRACKING: 0,
    TRANSFER_REGISTRATION: 0,
    OTHER: 0
  }

  costs.forEach(cost => {
    if (totals.hasOwnProperty(cost.cost_category)) {
      totals[cost.cost_category] += cost.amount_kes || 0
    }
  })

  return totals
}

// Calculate total handover costs
export function calculateTotalHandoverCosts(costs: HandoverCostEntry[]): number {
  return costs.reduce((total, cost) => total + (cost.amount_kes || 0), 0)
}

// Calculate total payment receipts
export function calculateTotalPaymentReceipts(receipts: PaymentReceipt[]): number {
  return receipts.reduce((total, receipt) => total + (receipt.amount_kes || 0), 0)
}

// Calculate payment progress percentage
export function calculatePaymentProgress(totalReceipts: number, handoverPrice: number): number {
  if (handoverPrice <= 0) return 0
  return Math.round((totalReceipts / handoverPrice) * 100 * 100) / 100 // Round to 2 decimal places
}

// Calculate net income (handover price - costs)
export function calculateNetIncome(handoverPrice: number, totalCosts: number): number {
  return handoverPrice - totalCosts
}

// Calculate remaining balance (handover price - receipts)
export function calculateRemainingBalance(handoverPrice: number, totalReceipts: number): number {
  return handoverPrice - totalReceipts
}

// Format currency for display
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return 'KES 0'
  return `KES ${amount.toLocaleString()}`
}

// Validate handover cost entry
export function validateHandoverCostEntry(cost: Partial<HandoverCostEntry>): string[] {
  const errors: string[] = []

  if (!cost.cost_type_id) {
    errors.push('Cost type is required')
  }

  if (!cost.cost_category) {
    errors.push('Cost category is required')
  }

  if (!cost.amount_kes || cost.amount_kes <= 0) {
    errors.push('Amount must be greater than 0')
  }

  // Validate cost type exists
  if (cost.cost_type_id && !getHandoverCostType(cost.cost_type_id)) {
    errors.push('Invalid cost type')
  }

  // Validate category
  if (cost.cost_category && !HANDOVER_COST_CATEGORY_LABELS.hasOwnProperty(cost.cost_category)) {
    errors.push('Invalid cost category')
  }

  return errors
}

// Validate payment receipt entry
export function validatePaymentReceiptEntry(receipt: Partial<PaymentReceipt>): string[] {
  const errors: string[] = []

  if (!receipt.receipt_number || receipt.receipt_number <= 0) {
    errors.push('Receipt number must be greater than 0')
  }

  if (!receipt.amount_kes || receipt.amount_kes <= 0) {
    errors.push('Amount must be greater than 0')
  }

  // Validate payment method if provided
  const validPaymentMethods = ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'MOBILE_MONEY', 'OTHER']
  if (receipt.payment_method && !validPaymentMethods.includes(receipt.payment_method)) {
    errors.push('Invalid payment method')
  }

  return errors
}

// Get next receipt number
export function getNextReceiptNumber(existingReceipts: PaymentReceipt[]): number {
  if (existingReceipts.length === 0) return 1
  const maxReceiptNumber = Math.max(...existingReceipts.map(r => r.receipt_number))
  return maxReceiptNumber + 1
}

// Sort costs by category and creation date
export function sortHandoverCostsByCategory(costs: HandoverCostEntry[]): HandoverCostEntry[] {
  const categoryOrder: HandoverCostCategory[] = [
    'PRE_HANDOVER',
    'AGREEMENT_LEGAL', 
    'LCB_PROCESS',
    'PAYMENT_TRACKING',
    'TRANSFER_REGISTRATION',
    'OTHER'
  ]

  return costs.sort((a, b) => {
    const categoryIndexA = categoryOrder.indexOf(a.cost_category)
    const categoryIndexB = categoryOrder.indexOf(b.cost_category)
    
    if (categoryIndexA !== categoryIndexB) {
      return categoryIndexA - categoryIndexB
    }
    
    // If same category, sort by creation date
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

// Sort receipts by receipt number
export function sortPaymentReceiptsByNumber(receipts: PaymentReceipt[]): PaymentReceipt[] {
  return receipts.sort((a, b) => a.receipt_number - b.receipt_number)
}

// Get cost summary by category
export function getHandoverCostSummaryByCategory(costs: HandoverCostEntry[]): Array<{
  category: HandoverCostCategory
  label: string
  total: number
  count: number
  costs: HandoverCostEntry[]
}> {
  const categories: HandoverCostCategory[] = [
    'PRE_HANDOVER',
    'AGREEMENT_LEGAL',
    'LCB_PROCESS', 
    'PAYMENT_TRACKING',
    'TRANSFER_REGISTRATION',
    'OTHER'
  ]

  return categories.map(category => {
    const categoryCosts = costs.filter(cost => cost.cost_category === category)
    return {
      category,
      label: getHandoverCostCategoryLabel(category),
      total: categoryCosts.reduce((sum, cost) => sum + (cost.amount_kes || 0), 0),
      count: categoryCosts.length,
      costs: categoryCosts
    }
  }).filter(summary => summary.count > 0) // Only return categories with costs
}

// Calculate financial metrics
export function calculateHandoverFinancialMetrics(
  handoverPrice: number,
  costs: HandoverCostEntry[],
  receipts: PaymentReceipt[]
) {
  const totalCosts = calculateTotalHandoverCosts(costs)
  const totalReceipts = calculateTotalPaymentReceipts(receipts)
  const netIncome = calculateNetIncome(handoverPrice, totalCosts)
  const remainingBalance = calculateRemainingBalance(handoverPrice, totalReceipts)
  const paymentProgress = calculatePaymentProgress(totalReceipts, handoverPrice)
  const profitMargin = handoverPrice > 0 ? (netIncome / handoverPrice) * 100 : 0

  return {
    handoverPrice,
    totalCosts,
    totalReceipts,
    netIncome,
    remainingBalance,
    paymentProgress,
    profitMargin: Math.round(profitMargin * 100) / 100 // Round to 2 decimal places
  }
}
