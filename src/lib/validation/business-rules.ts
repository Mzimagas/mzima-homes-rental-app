// Business Rules and Data Validation Engine
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Validation result interface
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  field: string
  code: string
  message: string
  severity: 'error' | 'warning'
}

export interface ValidationWarning {
  field: string
  code: string
  message: string
  suggestion?: string
}

// Business Rules Engine
export class BusinessRulesValidator {
  // Validate parcel data
  static async validateParcel(parcelData: any): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Check for duplicate LR numbers
    if (parcelData.lr_number) {
      const { data: existingParcel } = await supabase
        .from('parcels')
        .select('parcel_id')
        .eq('lr_number', parcelData.lr_number)
        .neq('parcel_id', parcelData.parcel_id || '')
        .single()

      if (existingParcel) {
        errors.push({
          field: 'lr_number',
          code: 'DUPLICATE_LR_NUMBER',
          message: 'LR number already exists in the system',
          severity: 'error',
        })
      }
    }

    // Validate acreage constraints
    if (parcelData.acreage_ha) {
      if (parcelData.acreage_ha < 0.01) {
        errors.push({
          field: 'acreage_ha',
          code: 'MINIMUM_ACREAGE',
          message: 'Parcel must be at least 0.01 hectares',
          severity: 'error',
        })
      }

      if (parcelData.acreage_ha > 10000) {
        warnings.push({
          field: 'acreage_ha',
          code: 'LARGE_PARCEL',
          message: 'Parcel is unusually large (>10,000 hectares)',
          suggestion: 'Verify the acreage is correct',
        })
      }
    }

    // Validate acquisition cost
    if (parcelData.acquisition_cost_total && parcelData.acquisition_cost_total < 0) {
      errors.push({
        field: 'acquisition_cost_total',
        code: 'NEGATIVE_COST',
        message: 'Acquisition cost cannot be negative',
        severity: 'error',
      })
    }

    // Validate dates
    if (parcelData.acquisition_date) {
      const acquisitionDate = new Date(parcelData.acquisition_date)
      const today = new Date()

      if (acquisitionDate > today) {
        errors.push({
          field: 'acquisition_date',
          code: 'FUTURE_DATE',
          message: 'Acquisition date cannot be in the future',
          severity: 'error',
        })
      }

      if (acquisitionDate < new Date('1900-01-01')) {
        warnings.push({
          field: 'acquisition_date',
          code: 'OLD_DATE',
          message: 'Acquisition date is very old',
          suggestion: 'Verify the date is correct',
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  // Validate subdivision data
  static async validateSubdivision(subdivisionData: any): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Check if parcel exists and is available
    if (subdivisionData.parcel_id) {
      const { data: parcel } = await supabase
        .from('parcels')
        .select('parcel_id, acreage_ha')
        .eq('parcel_id', subdivisionData.parcel_id)
        .single()

      if (!parcel) {
        errors.push({
          field: 'parcel_id',
          code: 'PARCEL_NOT_FOUND',
          message: 'Referenced parcel does not exist',
          severity: 'error',
        })
      } else {
        // Check if parcel is already subdivided
        const { data: existingSubdivision } = await supabase
          .from('subdivisions')
          .select('subdivision_id')
          .eq('parcel_id', subdivisionData.parcel_id)
          .neq('subdivision_id', subdivisionData.subdivision_id || '')
          .single()

        if (existingSubdivision) {
          errors.push({
            field: 'parcel_id',
            code: 'PARCEL_ALREADY_SUBDIVIDED',
            message: 'Parcel is already subdivided',
            severity: 'error',
          })
        }

        // Validate plot density
        if (subdivisionData.total_plots_planned && parcel.acreage_ha) {
          const plotsPerHectare = subdivisionData.total_plots_planned / parcel.acreage_ha

          if (plotsPerHectare > 50) {
            warnings.push({
              field: 'total_plots_planned',
              code: 'HIGH_DENSITY',
              message: 'Plot density is very high (>50 plots per hectare)',
              suggestion: 'Consider reducing the number of plots or increasing plot sizes',
            })
          }

          if (plotsPerHectare < 1) {
            warnings.push({
              field: 'total_plots_planned',
              code: 'LOW_DENSITY',
              message: 'Plot density is very low (<1 plot per hectare)',
              suggestion: 'Consider increasing the number of plots to maximize land use',
            })
          }
        }
      }
    }

    // Validate budget estimates
    if (subdivisionData.budget_estimate && subdivisionData.budget_estimate < 0) {
      errors.push({
        field: 'budget_estimate',
        code: 'NEGATIVE_BUDGET',
        message: 'Budget estimate cannot be negative',
        severity: 'error',
      })
    }

    // Validate utility area percentage
    if (subdivisionData.public_utility_area_ha && subdivisionData.parcel_id) {
      const { data: parcel } = await supabase
        .from('parcels')
        .select('acreage_ha')
        .eq('parcel_id', subdivisionData.parcel_id)
        .single()

      if (parcel && subdivisionData.public_utility_area_ha > parcel.acreage_ha * 0.3) {
        warnings.push({
          field: 'public_utility_area_ha',
          code: 'HIGH_UTILITY_AREA',
          message: 'Utility area exceeds 30% of total parcel area',
          suggestion: 'Consider reducing utility area to maximize saleable plots',
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  // Validate plot data
  static async validatePlot(plotData: any): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Check for duplicate plot numbers within subdivision
    if (plotData.subdivision_id && plotData.plot_no) {
      const { data: existingPlot } = await supabase
        .from('plots')
        .select('plot_id')
        .eq('subdivision_id', plotData.subdivision_id)
        .eq('plot_no', plotData.plot_no)
        .neq('plot_id', plotData.plot_id || '')
        .single()

      if (existingPlot) {
        errors.push({
          field: 'plot_no',
          code: 'DUPLICATE_PLOT_NUMBER',
          message: 'Plot number already exists in this subdivision',
          severity: 'error',
        })
      }
    }

    // Validate plot size constraints
    if (plotData.size_sqm) {
      if (plotData.size_sqm < 100) {
        errors.push({
          field: 'size_sqm',
          code: 'MINIMUM_PLOT_SIZE',
          message: 'Plot must be at least 100 square meters',
          severity: 'error',
        })
      }

      if (plotData.size_sqm > 50000) {
        warnings.push({
          field: 'size_sqm',
          code: 'LARGE_PLOT',
          message: 'Plot is unusually large (>5 hectares)',
          suggestion: 'Consider subdividing into smaller plots',
        })
      }
    }

    // Validate frontage for corner plots
    if (plotData.corner_plot && plotData.frontage_meters && plotData.frontage_meters < 10) {
      warnings.push({
        field: 'frontage_meters',
        code: 'SMALL_FRONTAGE',
        message: 'Corner plot has small frontage (<10m)',
        suggestion: 'Ensure adequate access for corner plot',
      })
    }

    // Validate utility requirements
    if (plotData.utility_level === 'none' && plotData.premium_location) {
      warnings.push({
        field: 'utility_level',
        code: 'PREMIUM_NO_UTILITIES',
        message: 'Premium location plot has no utilities',
        suggestion: 'Consider adding utilities to justify premium pricing',
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  // Validate client data
  static async validateClient(clientData: any): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Check for duplicate ID numbers
    if (clientData.id_number) {
      const { data: existingClient } = await supabase
        .from('clients')
        .select('client_id')
        .eq('id_number', clientData.id_number)
        .neq('client_id', clientData.client_id || '')
        .single()

      if (existingClient) {
        errors.push({
          field: 'id_number',
          code: 'DUPLICATE_ID_NUMBER',
          message: 'ID number already exists in the system',
          severity: 'error',
        })
      }
    }

    // Validate phone number format
    if (clientData.phone) {
      const phoneRegex = /^(\+254|254|0)[17]\d{8}$/
      if (!phoneRegex.test(clientData.phone.replace(/\s/g, ''))) {
        errors.push({
          field: 'phone',
          code: 'INVALID_PHONE_FORMAT',
          message: 'Invalid Kenyan phone number format',
          severity: 'error',
        })
      }
    }

    // Validate email format
    if (clientData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(clientData.email)) {
        errors.push({
          field: 'email',
          code: 'INVALID_EMAIL_FORMAT',
          message: 'Invalid email format',
          severity: 'error',
        })
      }
    }

    // Validate KRA PIN format
    if (clientData.kra_pin) {
      const kraPinRegex = /^[A-Z]\d{9}[A-Z]$/
      if (!kraPinRegex.test(clientData.kra_pin)) {
        warnings.push({
          field: 'kra_pin',
          code: 'INVALID_KRA_PIN_FORMAT',
          message: 'KRA PIN format may be incorrect',
          suggestion: 'Verify KRA PIN follows format: A123456789B',
        })
      }
    }

    // Validate credit score range
    if (clientData.credit_score !== undefined) {
      if (clientData.credit_score < 300 || clientData.credit_score > 850) {
        errors.push({
          field: 'credit_score',
          code: 'INVALID_CREDIT_SCORE',
          message: 'Credit score must be between 300 and 850',
          severity: 'error',
        })
      }

      if (clientData.credit_score < 500) {
        warnings.push({
          field: 'credit_score',
          code: 'LOW_CREDIT_SCORE',
          message: 'Client has low credit score',
          suggestion: 'Consider requiring higher deposit or guarantor',
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  // Validate sale agreement data
  static async validateSaleAgreement(agreementData: any): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Check if plot is available for sale
    if (agreementData.plot_id) {
      const { data: plot } = await supabase
        .from('plots')
        .select('stage')
        .eq('plot_id', agreementData.plot_id)
        .single()

      if (!plot) {
        errors.push({
          field: 'plot_id',
          code: 'PLOT_NOT_FOUND',
          message: 'Referenced plot does not exist',
          severity: 'error',
        })
      } else if (plot.stage === 'sold') {
        errors.push({
          field: 'plot_id',
          code: 'PLOT_ALREADY_SOLD',
          message: 'Plot is already sold',
          severity: 'error',
        })
      } else if (plot.stage !== 'ready_for_sale') {
        warnings.push({
          field: 'plot_id',
          code: 'PLOT_NOT_READY',
          message: 'Plot may not be ready for sale',
          suggestion: 'Verify plot development status',
        })
      }

      // Check for existing active agreements on the same plot
      const { data: existingAgreement } = await supabase
        .from('sale_agreements')
        .select('sale_agreement_id')
        .eq('plot_id', agreementData.plot_id)
        .eq('status', 'active')
        .neq('sale_agreement_id', agreementData.sale_agreement_id || '')
        .single()

      if (existingAgreement) {
        errors.push({
          field: 'plot_id',
          code: 'PLOT_ALREADY_RESERVED',
          message: 'Plot already has an active sale agreement',
          severity: 'error',
        })
      }
    }

    // Validate price constraints
    if (agreementData.price && agreementData.price <= 0) {
      errors.push({
        field: 'price',
        code: 'INVALID_PRICE',
        message: 'Sale price must be positive',
        severity: 'error',
      })
    }

    // Validate deposit constraints
    if (agreementData.deposit_required && agreementData.price) {
      const depositPercentage = (agreementData.deposit_required / agreementData.price) * 100

      if (depositPercentage < 10) {
        warnings.push({
          field: 'deposit_required',
          code: 'LOW_DEPOSIT',
          message: 'Deposit is less than 10% of sale price',
          suggestion: 'Consider requiring higher deposit for security',
        })
      }

      if (depositPercentage > 50) {
        warnings.push({
          field: 'deposit_required',
          code: 'HIGH_DEPOSIT',
          message: 'Deposit exceeds 50% of sale price',
          suggestion: 'Consider reducing deposit requirement',
        })
      }
    }

    // Validate deposit paid vs required
    if (agreementData.deposit_paid && agreementData.deposit_required) {
      if (agreementData.deposit_paid > agreementData.deposit_required) {
        warnings.push({
          field: 'deposit_paid',
          code: 'EXCESS_DEPOSIT',
          message: 'Deposit paid exceeds required amount',
          suggestion: 'Apply excess to future payments',
        })
      }
    }

    // Validate agreement date
    if (agreementData.agreement_date) {
      const agreementDate = new Date(agreementData.agreement_date)
      const today = new Date()

      if (agreementDate > today) {
        errors.push({
          field: 'agreement_date',
          code: 'FUTURE_AGREEMENT_DATE',
          message: 'Agreement date cannot be in the future',
          severity: 'error',
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  // Validate payment/receipt data
  static async validatePayment(paymentData: any): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Validate amount
    if (paymentData.amount && paymentData.amount <= 0) {
      errors.push({
        field: 'amount',
        code: 'INVALID_AMOUNT',
        message: 'Payment amount must be positive',
        severity: 'error',
      })
    }

    // Check if payment exceeds outstanding balance
    if (paymentData.sale_agreement_id && paymentData.amount) {
      const { data: agreement } = await supabase
        .from('sale_agreements')
        .select('balance_due')
        .eq('sale_agreement_id', paymentData.sale_agreement_id)
        .single()

      if (agreement && paymentData.amount > agreement.balance_due) {
        warnings.push({
          field: 'amount',
          code: 'EXCESS_PAYMENT',
          message: 'Payment exceeds outstanding balance',
          suggestion: 'Confirm overpayment is intentional',
        })
      }
    }

    // Validate payment date
    if (paymentData.paid_date) {
      const paymentDate = new Date(paymentData.paid_date)
      const today = new Date()

      if (paymentDate > today) {
        errors.push({
          field: 'paid_date',
          code: 'FUTURE_PAYMENT_DATE',
          message: 'Payment date cannot be in the future',
          severity: 'error',
        })
      }

      // Check for very old payments
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

      if (paymentDate < oneYearAgo) {
        warnings.push({
          field: 'paid_date',
          code: 'OLD_PAYMENT',
          message: 'Payment date is more than one year old',
          suggestion: 'Verify the payment date is correct',
        })
      }
    }

    // Validate transaction reference for electronic payments
    if (
      ['mpesa', 'bank_eft'].includes(paymentData.payment_method) &&
      !paymentData.transaction_ref
    ) {
      warnings.push({
        field: 'transaction_ref',
        code: 'MISSING_TRANSACTION_REF',
        message: 'Electronic payment should have transaction reference',
        suggestion: 'Add transaction reference for audit trail',
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  // Comprehensive data integrity check
  static async performIntegrityCheck(): Promise<{
    isHealthy: boolean
    issues: Array<{
      type: string
      severity: 'critical' | 'warning' | 'info'
      description: string
      count: number
      affectedRecords?: string[]
    }>
  }> {
    const issues = []

    try {
      // Check for orphaned plots
      const { data: orphanedPlots } = await supabase.rpc('find_orphaned_plots')

      if (orphanedPlots && orphanedPlots.length > 0) {
        issues.push({
          type: 'orphaned_plots',
          severity: 'warning' as const,
          description: 'Plots without valid subdivision references',
          count: orphanedPlots.length,
          affectedRecords: orphanedPlots.map((p: any) => p.plot_id),
        })
      }

      // Check for duplicate LR numbers
      const { data: duplicateLRNumbers } = await supabase.rpc('find_duplicate_lr_numbers')

      if (duplicateLRNumbers && duplicateLRNumbers.length > 0) {
        issues.push({
          type: 'duplicate_lr_numbers',
          severity: 'critical' as const,
          description: 'Parcels with duplicate LR numbers',
          count: duplicateLRNumbers.length,
          affectedRecords: duplicateLRNumbers.map((p: any) => p.lr_number),
        })
      }

      // Check for negative balances
      const { data: negativeBalances } = await supabase
        .from('sale_agreements')
        .select('sale_agreement_id, agreement_no, balance_due')
        .lt('balance_due', 0)

      if (negativeBalances && negativeBalances.length > 0) {
        issues.push({
          type: 'negative_balances',
          severity: 'warning' as const,
          description: 'Sale agreements with negative balances',
          count: negativeBalances.length,
          affectedRecords: negativeBalances.map((a) => a.agreement_no),
        })
      }

      // Check for unmatched payments
      const { data: unmatchedPayments } = await supabase
        .from('bank_mpesa_recons')
        .select('recon_id, transaction_ref, amount')
        .eq('status', 'unmatched')

      if (unmatchedPayments && unmatchedPayments.length > 10) {
        issues.push({
          type: 'unmatched_payments',
          severity: 'warning' as const,
          description: 'High number of unmatched payment transactions',
          count: unmatchedPayments.length,
        })
      }

      // Check for overdue invoices
      const { data: overdueInvoices } = await supabase
        .from('invoices')
        .select('invoice_id, invoice_no')
        .eq('status', 'overdue')

      if (overdueInvoices && overdueInvoices.length > 20) {
        issues.push({
          type: 'overdue_invoices',
          severity: 'warning' as const,
          description: 'High number of overdue invoices',
          count: overdueInvoices.length,
        })
      }

      const criticalIssues = issues.filter((i) => i.severity === 'critical').length

      return {
        isHealthy: criticalIssues === 0,
        issues,
      }
    } catch (error) {
      console.error('Error performing integrity check:', error)
      return {
        isHealthy: false,
        issues: [
          {
            type: 'integrity_check_failed',
            severity: 'critical' as const,
            description: 'Failed to perform data integrity check',
            count: 1,
          },
        ],
      }
    }
  }
}

export default BusinessRulesValidator
