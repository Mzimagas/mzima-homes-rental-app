// Financial requirements for each document stage
// Maps document stages to their required payments

export interface PaymentRequirement {
  id: string
  name: string
  description: string
  amount?: number
  currency: string
  isRequired: boolean
  category: 'fee' | 'payment' | 'deposit' | 'tax'
}

export interface StageFinancialStatus {
  stageNumber: number
  requiredPayments: PaymentRequirement[]
  optionalPayments: PaymentRequirement[]
  isFinanciallyComplete: boolean
  pendingAmount: number
  completedAmount: number
}

// Payment requirements for each document stage
export const STAGE_PAYMENT_REQUIREMENTS: Record<
  number,
  {
    required: PaymentRequirement[]
    optional: PaymentRequirement[]
  }
> = {
  1: {
    // Initial Search & Evaluation - No payments required
    required: [],
    optional: [],
  },
  2: {
    // Property Images - No payments required
    required: [],
    optional: [],
  },
  3: {
    // Search Certificate - Search certificate fee required
    required: [
      {
        id: 'search_fee',
        name: 'Search Certificate Fee',
        description: 'Official property search fee paid to Lands Registry',
        amount: 1000,
        currency: 'KES',
        isRequired: true,
        category: 'fee',
      },
    ],
    optional: [],
  },
  4: {
    // Minutes/Decision to Buy - No payments required
    required: [],
    optional: [],
  },
  5: {
    // Agreement & Documentation - Down payment required
    required: [
      {
        id: 'down_payment',
        name: 'Purchase Price Deposit',
        description: 'Initial deposit payment to secure the property purchase as per sales agreement',
        currency: 'KES',
        isRequired: true,
        category: 'payment',
      },
    ],
    optional: [
      {
        id: 'purchase_price_installment',
        name: 'Purchase Price Installment',
        description: 'Additional installment payment towards the total purchase price',
        currency: 'KES',
        isRequired: false,
        category: 'payment',
      },
    ],
  },
  6: {
    // LCB Consent - LCB fee required
    required: [
      {
        id: 'lcb_fee',
        name: 'Land Control Board Fee',
        description: 'Fee for Land Control Board consent processing',
        amount: 5000,
        currency: 'KES',
        isRequired: true,
        category: 'fee',
      },
    ],
    optional: [],
  },
  7: {
    // Valuation Report - Valuation fee
    required: [],
    optional: [
      {
        id: 'valuation_fee',
        name: 'Valuation Fee',
        description: 'Professional property valuation fee',
        amount: 15000,
        currency: 'KES',
        isRequired: false,
        category: 'fee',
      },
    ],
  },
  8: {
    // Assessment - No cost considerations
    required: [],
    optional: [],
  },
  9: {
    // Stamp Duty Payment - Stamp duty required
    required: [
      {
        id: 'stamp_duty_payment',
        name: 'Stamp Duty Payment',
        description: 'Government stamp duty for property transfer',
        currency: 'KES',
        isRequired: true,
        category: 'tax',
      },
    ],
    optional: [],
  },
  10: {
    // Registered Title - Registration fee required
    required: [
      {
        id: 'registration_fee',
        name: 'Title Registration / New Title Costs',
        description: 'Submission fees to land registry for title registration and new title processing',
        amount: 2000,
        currency: 'KES',
        isRequired: true,
        category: 'fee',
      },
    ],
    optional: [
      {
        id: 'final_purchase_payment',
        name: 'Final Purchase Price Payment',
        description: 'Final payment to complete the purchase price as per sales agreement',
        currency: 'KES',
        isRequired: false,
        category: 'payment',
      },
    ],
  },
  11: {
    // Minutes/Decision to Subdivide - No payments required
    required: [],
    optional: [],
  },
  12: {
    // Search Certificate (Subdivision) - Search fee required
    required: [
      {
        id: 'search_fee_subdivision',
        name: 'Search Fee (Subdivision)',
        description: 'Property search fee for subdivision',
        amount: 1050,
        currency: 'KES',
        isRequired: true,
        category: 'fee',
      },
    ],
    optional: [],
  },
  13: {
    // LCB Consent (Subdivision) - LCB consent fees required
    required: [
      {
        id: 'lcb_normal_fee_subdivision',
        name: 'Subdivision Consent (LCB Normal)',
        description: 'Land Control Board consent for subdivision',
        amount: 16000,
        currency: 'KES',
        isRequired: true,
        category: 'fee',
      },
    ],
    optional: [
      {
        id: 'lcb_special_fee_subdivision',
        name: 'Subdivision Consent (LCB Special)',
        description: 'Special Land Control Board consent for subdivision',
        amount: 20000,
        currency: 'KES',
        isRequired: false,
        category: 'fee',
      },
    ],
  },
  14: {
    // Mutation Forms - Mutation costs required
    required: [
      {
        id: 'mutation_costs',
        name: 'Mutation Costs',
        description: 'Drawing of mutation plans',
        amount: 5000,
        currency: 'KES',
        isRequired: true,
        category: 'fee',
      },
    ],
    optional: [],
  },
  15: {
    // Beaconing - Beaconing costs required
    required: [
      {
        id: 'beaconing_costs',
        name: 'Beaconing',
        description: 'Survey beaconing and demarcation costs',
        amount: 2500,
        currency: 'KES',
        isRequired: true,
        category: 'fee',
      },
    ],
    optional: [],
  },
  16: {
    // Title Registration (Subdivision) - Registration costs required
    required: [
      {
        id: 'title_registration_subdivision',
        name: 'Registration of Titles',
        description: 'Registration of new subdivision titles',
        amount: 5500,
        currency: 'KES',
        isRequired: true,
        category: 'fee',
      },
    ],
    optional: [],
  },
}

// Helper function to get financial requirements for a stage
export const getStageFinancialRequirements = (stageNumber: number) => {
  return STAGE_PAYMENT_REQUIREMENTS[stageNumber] || { required: [], optional: [] }
}

// Helper function to check if a stage has any financial requirements
export const stageHasFinancialRequirements = (stageNumber: number): boolean => {
  const requirements = getStageFinancialRequirements(stageNumber)
  return requirements.required.length > 0 || requirements.optional.length > 0
}

// Helper function to format currency
export const formatCurrency = (amount: number, currency: string = 'KES'): string => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
