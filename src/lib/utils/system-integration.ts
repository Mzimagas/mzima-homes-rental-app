// System Integration Utilities and Business Rules Engine
import { createClient } from '@supabase/supabase-js'
import { mpesaService } from '../services/mpesa'
import { documentService } from '../services/documents'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Business Rules Engine
export class BusinessRulesEngine {
  // Auto-allocate payments to invoices
  static async autoAllocatePayment(receiptId: string): Promise<void> {
    try {
      const { data: receipt } = await supabase
        .from('receipts')
        .select(`
          *,
          sale_agreements(
            *,
            invoices(*)
          )
        `)
        .eq('receipt_id', receiptId)
        .single()

      if (!receipt || !receipt.sale_agreements) return

      const invoices = receipt.sale_agreements.invoices || []
      let remainingAmount = receipt.amount

      // Sort invoices by due date (oldest first)
      const sortedInvoices = invoices
        .filter((inv: any) => inv.balance > 0)
        .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())

      for (const invoice of sortedInvoices) {
        if (remainingAmount <= 0) break

        const allocationAmount = Math.min(remainingAmount, invoice.balance)
        
        // Update invoice payment
        await supabase
          .from('invoices')
          .update({
            amount_paid: (invoice.amount_paid || 0) + allocationAmount
          })
          .eq('invoice_id', invoice.invoice_id)

        remainingAmount -= allocationAmount

        // Log allocation
        await supabase
          .from('payment_allocations')
          .insert({
            receipt_id: receiptId,
            invoice_id: invoice.invoice_id,
            amount: allocationAmount,
            created_at: new Date().toISOString()
          })
      }

      // Update sale agreement balance
      await this.updateSaleAgreementBalance(receipt.sale_agreements.sale_agreement_id)
    } catch (error) {
      console.error('Error auto-allocating payment:', error)
    }
  }

  // Update sale agreement balance and status
  static async updateSaleAgreementBalance(saleAgreementId: string): Promise<void> {
    try {
      const { data: agreement } = await supabase
        .from('sale_agreements')
        .select(`
          *,
          receipts(amount),
          invoices(amount_due)
        `)
        .eq('sale_agreement_id', saleAgreementId)
        .single()

      if (!agreement) return

      const totalPaid = agreement.receipts?.reduce((sum: number, r: any) => sum + r.amount, 0) || 0
      const totalDue = agreement.invoices?.reduce((sum: number, i: any) => sum + i.amount_due, 0) || agreement.price
      const balance = totalDue - totalPaid

      let status = agreement.status
      if (balance <= 0 && agreement.status === 'active') {
        status = 'settled'
      }

      await supabase
        .from('sale_agreements')
        .update({
          balance_due: balance,
          status: status,
          completion_date: status === 'settled' ? new Date().toISOString().split('T')[0] : null
        })
        .eq('sale_agreement_id', saleAgreementId)

      // Trigger title transfer process if settled
      if (status === 'settled') {
        await this.initiateTitleTransfer(saleAgreementId)
      }
    } catch (error) {
      console.error('Error updating sale agreement balance:', error)
    }
  }

  // Initiate title transfer process
  static async initiateTitleTransfer(saleAgreementId: string): Promise<void> {
    try {
      // Check if transfer already exists
      const { data: existingTransfer } = await supabase
        .from('transfers_titles')
        .select('transfer_id')
        .eq('sale_agreement_id', saleAgreementId)
        .single()

      if (existingTransfer) return

      // Create title transfer record
      await supabase
        .from('transfers_titles')
        .insert({
          sale_agreement_id: saleAgreementId,
          status: 'lodged',
          created_at: new Date().toISOString()
        })

      // Update plot status
      const { data: agreement } = await supabase
        .from('sale_agreements')
        .select('plot_id')
        .eq('sale_agreement_id', saleAgreementId)
        .single()

      if (agreement?.plot_id) {
        await supabase
          .from('plots')
          .update({ stage: 'transfer_complete' })
          .eq('plot_id', agreement.plot_id)
      }
    } catch (error) {
      console.error('Error initiating title transfer:', error)
    }
  }

  // Auto-generate invoices based on payment plan
  static async generateScheduledInvoices(saleAgreementId: string): Promise<void> {
    try {
      const { data: agreement } = await supabase
        .from('sale_agreements')
        .select(`
          *,
          payment_plans(*),
          invoices(*)
        `)
        .eq('sale_agreement_id', saleAgreementId)
        .single()

      if (!agreement || !agreement.payment_plans) return

      const plan = agreement.payment_plans
      const existingInvoices = agreement.invoices || []
      
      // Calculate installment amount
      const depositAmount = (agreement.price * plan.deposit_percent) / 100
      const remainingAmount = agreement.price - depositAmount
      const installmentAmount = remainingAmount / plan.num_installments

      // Generate invoices if not already created
      if (existingInvoices.length === 0) {
        const invoices = []
        
        // Deposit invoice
        invoices.push({
          sale_agreement_id: saleAgreementId,
          invoice_no: `INV-${agreement.agreement_no}-DEP`,
          due_date: agreement.agreement_date,
          amount_due: depositAmount,
          line_items: [{ description: 'Deposit', amount: depositAmount }],
          status: 'unpaid'
        })

        // Installment invoices
        for (let i = 1; i <= plan.num_installments; i++) {
          const dueDate = new Date(agreement.agreement_date)
          
          if (plan.installment_frequency === 'monthly') {
            dueDate.setMonth(dueDate.getMonth() + i)
          } else if (plan.installment_frequency === 'quarterly') {
            dueDate.setMonth(dueDate.getMonth() + (i * 3))
          }

          invoices.push({
            sale_agreement_id: saleAgreementId,
            invoice_no: `INV-${agreement.agreement_no}-${i.toString().padStart(2, '0')}`,
            due_date: dueDate.toISOString().split('T')[0],
            amount_due: installmentAmount,
            line_items: [{ description: `Installment ${i}`, amount: installmentAmount }],
            status: 'unpaid'
          })
        }

        await supabase
          .from('invoices')
          .insert(invoices)
      }
    } catch (error) {
      console.error('Error generating scheduled invoices:', error)
    }
  }

  // Calculate and create agent commission
  static async calculateAgentCommission(saleAgreementId: string): Promise<void> {
    try {
      const { data: agreement } = await supabase
        .from('sale_agreements')
        .select(`
          *,
          agents(commission_rate)
        `)
        .eq('sale_agreement_id', saleAgreementId)
        .single()

      if (!agreement || !agreement.agents || !agreement.agent_id) return

      // Check if commission already exists
      const { data: existingCommission } = await supabase
        .from('commissions')
        .select('commission_id')
        .eq('sale_agreement_id', saleAgreementId)
        .single()

      if (existingCommission) return

      // Calculate commission
      const commissionRate = agreement.agents.commission_rate
      const commissionAmount = (agreement.price * commissionRate) / 100

      // Create commission record
      await supabase
        .from('commissions')
        .insert({
          agent_id: agreement.agent_id,
          sale_agreement_id: saleAgreementId,
          base_amount: agreement.price,
          rate_applied: commissionRate,
          amount: commissionAmount,
          payable_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
          status: 'pending'
        })
    } catch (error) {
      console.error('Error calculating agent commission:', error)
    }
  }

  // Update overdue invoices
  static async updateOverdueInvoices(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      await supabase
        .from('invoices')
        .update({ status: 'overdue' })
        .lt('due_date', today)
        .in('status', ['unpaid', 'partly_paid'])
    } catch (error) {
      console.error('Error updating overdue invoices:', error)
    }
  }

  // Expire old reservations
  static async expireOldReservations(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      await supabase
        .from('offers_reservations')
        .update({ status: 'expired' })
        .lt('expiry_date', today)
        .eq('status', 'reserved')
    } catch (error) {
      console.error('Error expiring old reservations:', error)
    }
  }
}

// System Health Monitor
export class SystemHealthMonitor {
  static async checkSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical'
    checks: Array<{ name: string; status: 'pass' | 'fail'; message?: string }>
  }> {
    const checks = []

    // Database connectivity
    try {
      await supabase.from('parcels').select('count').limit(1)
      checks.push({ name: 'Database', status: 'pass' as const })
    } catch (error) {
      checks.push({ name: 'Database', status: 'fail' as const, message: 'Connection failed' })
    }

    // Storage connectivity
    try {
      await supabase.storage.from('documents').list('', { limit: 1 })
      checks.push({ name: 'Storage', status: 'pass' as const })
    } catch (error) {
      checks.push({ name: 'Storage', status: 'fail' as const, message: 'Storage access failed' })
    }

    // Check for unmatched transactions
    try {
      const { data: unmatched } = await supabase
        .from('bank_mpesa_recons')
        .select('count')
        .eq('status', 'unmatched')

      if (unmatched && unmatched.length > 10) {
        checks.push({ name: 'Reconciliation', status: 'fail' as const, message: 'Too many unmatched transactions' })
      } else {
        checks.push({ name: 'Reconciliation', status: 'pass' as const })
      }
    } catch (error) {
      checks.push({ name: 'Reconciliation', status: 'fail' as const, message: 'Check failed' })
    }

    // Check for overdue invoices
    try {
      const { data: overdue } = await supabase
        .from('invoices')
        .select('count')
        .eq('status', 'overdue')

      if (overdue && overdue.length > 20) {
        checks.push({ name: 'Collections', status: 'fail' as const, message: 'Too many overdue invoices' })
      } else {
        checks.push({ name: 'Collections', status: 'pass' as const })
      }
    } catch (error) {
      checks.push({ name: 'Collections', status: 'fail' as const, message: 'Check failed' })
    }

    const failedChecks = checks.filter(c => c.status === 'fail').length
    const status = failedChecks === 0 ? 'healthy' : failedChecks <= 2 ? 'warning' : 'critical'

    return { status, checks }
  }

  static async getSystemMetrics(): Promise<{
    totalParcels: number
    totalPlots: number
    activeAgreements: number
    totalRevenue: number
    pendingApprovals: number
    openDisputes: number
  }> {
    try {
      const [
        parcelsResult,
        plotsResult,
        agreementsResult,
        revenueResult,
        approvalsResult,
        disputesResult
      ] = await Promise.all([
        supabase.from('parcels').select('count'),
        supabase.from('plots').select('count'),
        supabase.from('sale_agreements').select('count').eq('status', 'active'),
        supabase.from('receipts').select('amount'),
        supabase.from('approvals').select('count').eq('status', 'pending'),
        supabase.from('disputes_logs').select('count').in('status', ['open', 'pending'])
      ])

      const totalRevenue = revenueResult.data?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0

      return {
        totalParcels: parcelsResult.data?.length || 0,
        totalPlots: plotsResult.data?.length || 0,
        activeAgreements: agreementsResult.data?.length || 0,
        totalRevenue,
        pendingApprovals: approvalsResult.data?.length || 0,
        openDisputes: disputesResult.data?.length || 0
      }
    } catch (error) {
      console.error('Error getting system metrics:', error)
      return {
        totalParcels: 0,
        totalPlots: 0,
        activeAgreements: 0,
        totalRevenue: 0,
        pendingApprovals: 0,
        openDisputes: 0
      }
    }
  }
}

// Automated Tasks Scheduler
export class TaskScheduler {
  static async runDailyTasks(): Promise<void> {
    console.log('Running daily tasks...')
    
    try {
      await Promise.all([
        BusinessRulesEngine.updateOverdueInvoices(),
        BusinessRulesEngine.expireOldReservations(),
        this.sendPaymentReminders(),
        this.generateDailyReports()
      ])
      
      console.log('Daily tasks completed successfully')
    } catch (error) {
      console.error('Error running daily tasks:', error)
    }
  }

  static async runWeeklyTasks(): Promise<void> {
    console.log('Running weekly tasks...')
    
    try {
      await Promise.all([
        this.generateWeeklyReports(),
        this.cleanupOldLogs(),
        this.backupCriticalData()
      ])
      
      console.log('Weekly tasks completed successfully')
    } catch (error) {
      console.error('Error running weekly tasks:', error)
    }
  }

  private static async sendPaymentReminders(): Promise<void> {
    // Implementation for sending payment reminders
    console.log('Sending payment reminders...')
  }

  private static async generateDailyReports(): Promise<void> {
    // Implementation for generating daily reports
    console.log('Generating daily reports...')
  }

  private static async generateWeeklyReports(): Promise<void> {
    // Implementation for generating weekly reports
    console.log('Generating weekly reports...')
  }

  private static async cleanupOldLogs(): Promise<void> {
    // Implementation for cleaning up old audit logs
    console.log('Cleaning up old logs...')
  }

  private static async backupCriticalData(): Promise<void> {
    // Implementation for backing up critical data
    console.log('Backing up critical data...')
  }
}

// Data Validation and Integrity Checks
export class DataIntegrityChecker {
  static async validateDataIntegrity(): Promise<{
    isValid: boolean
    issues: Array<{ type: string; description: string; severity: 'low' | 'medium' | 'high' }>
  }> {
    const issues = []

    try {
      // Check for orphaned records
      const orphanedPlots = await this.checkOrphanedPlots()
      if (orphanedPlots.length > 0) {
        issues.push({
          type: 'orphaned_plots',
          description: `Found ${orphanedPlots.length} plots without valid subdivisions`,
          severity: 'medium' as const
        })
      }

      // Check for duplicate LR numbers
      const duplicateLRNumbers = await this.checkDuplicateLRNumbers()
      if (duplicateLRNumbers.length > 0) {
        issues.push({
          type: 'duplicate_lr_numbers',
          description: `Found ${duplicateLRNumbers.length} duplicate LR numbers`,
          severity: 'high' as const
        })
      }

      // Check for negative balances
      const negativeBalances = await this.checkNegativeBalances()
      if (negativeBalances.length > 0) {
        issues.push({
          type: 'negative_balances',
          description: `Found ${negativeBalances.length} records with negative balances`,
          severity: 'medium' as const
        })
      }

      return {
        isValid: issues.filter(i => i.severity === 'high').length === 0,
        issues
      }
    } catch (error) {
      console.error('Error validating data integrity:', error)
      return {
        isValid: false,
        issues: [{
          type: 'validation_error',
          description: 'Failed to run integrity checks',
          severity: 'high' as const
        }]
      }
    }
  }

  private static async checkOrphanedPlots(): Promise<any[]> {
    const { data } = await supabase
      .from('plots')
      .select('plot_id, subdivision_id')
      .is('subdivisions.subdivision_id', null)
    
    return data || []
  }

  private static async checkDuplicateLRNumbers(): Promise<any[]> {
    const { data } = await supabase
      .rpc('find_duplicate_lr_numbers')
    
    return data || []
  }

  private static async checkNegativeBalances(): Promise<any[]> {
    const { data } = await supabase
      .from('sale_agreements')
      .select('sale_agreement_id, balance_due')
      .lt('balance_due', 0)
    
    return data || []
  }
}

// Export all utilities
export {
  BusinessRulesEngine,
  SystemHealthMonitor,
  TaskScheduler,
  DataIntegrityChecker
}
