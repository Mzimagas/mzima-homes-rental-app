// Temporary in-memory storage for development
// This will be replaced with actual database operations

interface PaymentReceipt {
  id: string
  property_id: string
  receipt_number: number
  amount_kes: number
  payment_date?: string
  payment_reference?: string
  payment_method?: string
  notes?: string
  created_by: string
  created_at: string
  updated_at: string
}

interface HandoverCost {
  id: string
  property_id: string
  cost_type_id: string
  cost_category: string
  amount_kes: number
  payment_reference?: string
  payment_date?: string
  notes?: string
  created_by: string
  created_at: string
  updated_at: string
}

// Global in-memory storage that persists across API calls
declare global {
  var mockStorage:
    | {
        paymentReceipts: Map<string, PaymentReceipt[]>
        handoverCosts: Map<string, HandoverCost[]>
      }
    | undefined
}

// Initialize global storage if it doesn't exist
if (!global.mockStorage) {
  global.mockStorage = {
    paymentReceipts: new Map<string, PaymentReceipt[]>(),
    handoverCosts: new Map<string, HandoverCost[]>(),
  }
}

const mockStorage = global.mockStorage

export class MockStorageService {
  // Payment Receipts
  static getPaymentReceipts(propertyId: string): PaymentReceipt[] {
    console.log('🔍 Getting payment receipts for property:', propertyId)
    console.log('🔍 Current storage keys:', Array.from(mockStorage.paymentReceipts.keys()))
    console.log('🔍 Storage for this property:', mockStorage.paymentReceipts.get(propertyId))
    return mockStorage.paymentReceipts.get(propertyId) || []
  }

  static addPaymentReceipt(propertyId: string, receipt: PaymentReceipt): PaymentReceipt {
    console.log('💾 Adding payment receipt for property:', propertyId)
    const receipts = this.getPaymentReceipts(propertyId)
    receipts.push(receipt)
    mockStorage.paymentReceipts.set(propertyId, receipts)
    console.log('💾 After adding, storage now has:', mockStorage.paymentReceipts.get(propertyId))
    return receipt
  }

  static updatePaymentReceipt(
    propertyId: string,
    receiptId: string,
    updates: Partial<PaymentReceipt>
  ): PaymentReceipt | null {
    const receipts = this.getPaymentReceipts(propertyId)
    const index = receipts.findIndex((r) => r.id === receiptId)
    if (index === -1) return null

    receipts[index] = { ...receipts[index], ...updates, updated_at: new Date().toISOString() }
    mockStorage.paymentReceipts.set(propertyId, receipts)
    return receipts[index]
  }

  static deletePaymentReceipt(propertyId: string, receiptId: string): boolean {
    const receipts = this.getPaymentReceipts(propertyId)
    const index = receipts.findIndex((r) => r.id === receiptId)
    if (index === -1) return false

    receipts.splice(index, 1)
    mockStorage.paymentReceipts.set(propertyId, receipts)
    return true
  }

  // Handover Costs
  static getHandoverCosts(propertyId: string): HandoverCost[] {
    return mockStorage.handoverCosts.get(propertyId) || []
  }

  static addHandoverCost(propertyId: string, cost: HandoverCost): HandoverCost {
    const costs = this.getHandoverCosts(propertyId)
    costs.push(cost)
    mockStorage.handoverCosts.set(propertyId, costs)
    return cost
  }

  static updateHandoverCost(
    propertyId: string,
    costId: string,
    updates: Partial<HandoverCost>
  ): HandoverCost | null {
    const costs = this.getHandoverCosts(propertyId)
    const index = costs.findIndex((c) => c.id === costId)
    if (index === -1) return null

    costs[index] = { ...costs[index], ...updates, updated_at: new Date().toISOString() }
    mockStorage.handoverCosts.set(propertyId, costs)
    return costs[index]
  }

  static deleteHandoverCost(propertyId: string, costId: string): boolean {
    const costs = this.getHandoverCosts(propertyId)
    const index = costs.findIndex((c) => c.id === costId)
    if (index === -1) return false

    costs.splice(index, 1)
    mockStorage.handoverCosts.set(propertyId, costs)
    return true
  }

  // Utility methods
  static getTotalReceipts(propertyId: string): number {
    const receipts = this.getPaymentReceipts(propertyId)
    return receipts.reduce((total, receipt) => total + receipt.amount_kes, 0)
  }

  static getTotalCosts(propertyId: string): number {
    const costs = this.getHandoverCosts(propertyId)
    return costs.reduce((total, cost) => total + cost.amount_kes, 0)
  }

  static getCostsByCategory(propertyId: string): Record<string, number> {
    const costs = this.getHandoverCosts(propertyId)
    const breakdown: Record<string, number> = {
      CLIENT_ENGAGEMENT: 0,
      REGULATORY_LEGAL: 0,
      SURVEY_MAPPING: 0,
      ADMINISTRATIVE: 0,
      TOTAL_ACQUISITION: 0,
      OTHER: 0,
    }

    costs.forEach((cost) => {
      if (Object.hasOwn(breakdown, cost.cost_category)) {
        breakdown[cost.cost_category] += cost.amount_kes
      }
    })

    return breakdown
  }

  static getNextReceiptNumber(propertyId: string): number {
    const receipts = this.getPaymentReceipts(propertyId)
    if (receipts.length === 0) return 1

    const maxReceiptNumber = Math.max(...receipts.map((r) => r.receipt_number))
    return maxReceiptNumber + 1
  }
}

export type { PaymentReceipt, HandoverCost }
