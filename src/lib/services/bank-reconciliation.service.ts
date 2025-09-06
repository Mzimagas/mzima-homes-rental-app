import supabase from '../supabase-client'

// Types for Bank Reconciliation
export interface BankAccount {
  id: string
  account_name: string
  account_number: string
  bank_name: string
  bank_code?: string
  branch_name?: string
  branch_code?: string
  account_type: string
  currency: string
  opening_balance_kes: number
  current_balance_kes: number
  last_reconciled_balance_kes: number
  last_reconciled_date?: string
  is_active: boolean
  is_primary: boolean
  auto_import_enabled: boolean
  import_format?: string
  last_import_date?: string
  created_at: string
  updated_at: string
  created_by?: string
}

export interface BankTransaction {
  id: string
  bank_account_id: string
  transaction_date: string
  value_date?: string
  transaction_ref: string
  description: string
  amount_kes: number
  transaction_type: string
  payer_details?: string
  payee_details?: string
  channel?: string
  source: string
  source_reference?: string
  status: string
  matched_date?: string
  matched_by?: string
  variance_amount_kes: number
  variance_reason?: string
  raw_data?: any
  import_batch_id?: string
  notes?: string
  is_duplicate: boolean
  requires_attention: boolean
  created_at: string
  updated_at: string

  // Joined data
  bank_account?: BankAccount
  matches?: TransactionMatch[]
}

export interface TransactionMatch {
  id: string
  bank_transaction_id: string
  matched_entity_type: string
  matched_entity_id: string
  matched_amount_kes: number
  confidence: string
  matching_score?: number
  matching_criteria?: any
  auto_matched: boolean
  is_active: boolean
  verified_by?: string
  verified_at?: string
  created_at: string
  created_by?: string

  // Joined data
  matched_entity?: any
}

export interface ReconciliationPeriod {
  id: string
  bank_account_id: string
  period_name: string
  start_date: string
  end_date: string
  opening_balance_kes: number
  closing_balance_kes: number
  statement_balance_kes: number
  status: string
  reconciled_by?: string
  reconciled_at?: string
  reviewed_by?: string
  reviewed_at?: string
  total_transactions: number
  matched_transactions: number
  unmatched_transactions: number
  total_variance_kes: number
  notes?: string
  created_at: string
  updated_at: string

  // Joined data
  bank_account?: BankAccount
}

export interface ImportBatch {
  id: string
  bank_account_id: string
  import_type: string
  file_name?: string
  file_size?: number
  total_rows: number
  processed_rows: number
  successful_rows: number
  failed_rows: number
  duplicate_rows: number
  status: string
  error_message?: string
  transaction_date_from?: string
  transaction_date_to?: string
  processing_started_at?: string
  processing_completed_at?: string
  created_at: string
  imported_by?: string

  // Joined data
  bank_account?: BankAccount
}

export interface ReconciliationRule {
  id: string
  rule_name: string
  description?: string
  priority: number
  amount_tolerance_kes: number
  amount_tolerance_percentage: number
  date_tolerance_days: number
  description_keywords?: string[]
  reference_pattern?: string
  payer_keywords?: string[]
  target_entity_type: string
  min_confidence_score: number
  auto_match_enabled: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  created_by?: string
}

export interface ReconciliationAnalytics {
  bank_account_id: string
  account_name: string
  bank_name: string
  total_transactions: number
  matched_transactions: number
  unmatched_transactions: number
  disputed_transactions: number
  total_credits_kes: number
  total_debits_kes: number
  total_variance_kes: number
  auto_matched_count: number
  manual_matched_count: number
  average_matching_score: number
  total_exceptions: number
  open_exceptions: number
  last_reconciliation_date?: string
  last_reconciled_balance_kes: number
  current_balance_kes: number
  total_imports: number
  last_import_date?: string
}

export interface UnmatchedTransaction {
  id: string
  transaction_date: string
  transaction_ref: string
  description: string
  amount_kes: number
  transaction_type: string
  payer_details?: string
  payee_details?: string
  channel?: string
  source: string
  account_name: string
  bank_name: string
  potential_match_type: string
  days_unmatched: number
}

export class BankReconciliationService {
  // Get bank accounts
  static async getBankAccounts(
    filters: {
      isActive?: boolean
      accountType?: string
    } = {}
  ): Promise<BankAccount[]> {
    try {
      let query = supabase.from('bank_accounts').select('*')

      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive)
      }
      if (filters.accountType) {
        query = query.eq('account_type', filters.accountType)
      }

      query = query
        .order('is_primary', { ascending: false })
        .order('account_name', { ascending: true })

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching bank accounts:', error)
      throw new Error('Failed to load bank accounts')
    }
  }

  // Get bank transactions
  static async getBankTransactions(
    filters: {
      bankAccountId?: string
      startDate?: string
      endDate?: string
      status?: string
      transactionType?: string
      source?: string
      requiresAttention?: boolean
      limit?: number
      offset?: number
    } = {}
  ): Promise<{ data: BankTransaction[]; total: number }> {
    try {
      let query = supabase.from('bank_transactions').select(
        `
          *,
          bank_account:bank_accounts(account_name, bank_name)
        `,
        { count: 'exact' }
      )

      if (filters.bankAccountId) {
        query = query.eq('bank_account_id', filters.bankAccountId)
      }
      if (filters.startDate) {
        query = query.gte('transaction_date', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('transaction_date', filters.endDate)
      }
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.transactionType) {
        query = query.eq('transaction_type', filters.transactionType)
      }
      if (filters.source) {
        query = query.eq('source', filters.source)
      }
      if (filters.requiresAttention !== undefined) {
        query = query.eq('requires_attention', filters.requiresAttention)
      }

      if (filters.limit) {
        query = query.limit(filters.limit)
      }
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
      }

      query = query
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })

      const { data, error, count } = await query

      if (error) throw error

      return {
        data: data || [],
        total: count || 0,
      }
    } catch (error) {
      console.error('Error fetching bank transactions:', error)
      throw new Error('Failed to load bank transactions')
    }
  }

  // Get unmatched transactions
  static async getUnmatchedTransactions(
    filters: {
      bankAccountId?: string
      limit?: number
    } = {}
  ): Promise<UnmatchedTransaction[]> {
    try {
      let query = supabase.from('unmatched_transactions').select('*')

      if (filters.bankAccountId) {
        // Note: This would need to be added to the view if needed
        // For now, we'll filter in the application
      }

      if (filters.limit) {
        query = query.limit(filters.limit)
      }

      query = query
        .order('days_unmatched', { ascending: false })
        .order('amount_kes', { ascending: false })

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching unmatched transactions:', error)
      throw new Error('Failed to load unmatched transactions')
    }
  }

  // Get reconciliation analytics
  static async getReconciliationAnalytics(
    bankAccountId?: string
  ): Promise<ReconciliationAnalytics[]> {
    try {
      let query = supabase.from('reconciliation_analytics').select('*')

      if (bankAccountId) {
        query = query.eq('bank_account_id', bankAccountId)
      }

      query = query.order('account_name', { ascending: true })

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching reconciliation analytics:', error)
      throw new Error('Failed to load reconciliation analytics')
    }
  }

  // Create bank transaction
  static async createBankTransaction(
    transaction: Omit<BankTransaction, 'id' | 'created_at' | 'updated_at'>
  ): Promise<BankTransaction> {
    try {
      const { data, error } = await supabase
        .from('bank_transactions')
        .insert(transaction)
        .select(
          `
          *,
          bank_account:bank_accounts(account_name, bank_name)
        `
        )
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating bank transaction:', error)
      throw new Error('Failed to create bank transaction')
    }
  }

  // Import bank statement (CSV/Excel)
  static async importBankStatement(
    bankAccountId: string,
    file: File,
    importType: string = 'CSV'
  ): Promise<ImportBatch> {
    try {
      // Create import batch record
      const { data: batch, error: batchError } = await supabase
        .from('import_batches')
        .insert({
          bank_account_id: bankAccountId,
          import_type: importType,
          file_name: file.name,
          file_size: file.size,
          status: 'PROCESSING',
        })
        .select()
        .single()

      if (batchError) throw batchError

      // Parse file content
      const fileContent = await file.text()
      const transactions = this.parseStatementFile(fileContent, importType)

      // Process transactions
      let successfulRows = 0
      let failedRows = 0
      let duplicateRows = 0

      for (const transaction of transactions) {
        try {
          // Check for duplicates
          const { data: existing } = await supabase
            .from('bank_transactions')
            .select('id')
            .eq('bank_account_id', bankAccountId)
            .eq('transaction_ref', transaction.transaction_ref)
            .eq('transaction_date', transaction.transaction_date)
            .single()

          if (existing) {
            duplicateRows++
            continue
          }

          // Create transaction
          await this.createBankTransaction({
            ...transaction,
            bank_account_id: bankAccountId,
            source: 'BANK_STATEMENT',
            import_batch_id: batch.id,
            status: 'UNMATCHED',
            amount_kes: transaction.amount_kes || 0,
            transaction_date: transaction.transaction_date || new Date().toISOString(),
          })

          successfulRows++
        } catch (err) {
          console.error('Error processing transaction:', err)
          failedRows++
        }
      }

      // Update batch with results
      const { data: updatedBatch, error: updateError } = await supabase
        .from('import_batches')
        .update({
          total_rows: transactions.length,
          processed_rows: transactions.length,
          successful_rows: successfulRows,
          failed_rows: failedRows,
          duplicate_rows: duplicateRows,
          status: 'COMPLETED',
          processing_completed_at: new Date().toISOString(),
        })
        .eq('id', batch.id)
        .select()
        .single()

      if (updateError) throw updateError

      return updatedBatch
    } catch (error) {
      console.error('Error importing bank statement:', error)
      throw new Error('Failed to import bank statement')
    }
  }

  // Parse statement file content
  private static parseStatementFile(
    content: string,
    importType: string
  ): Partial<BankTransaction>[] {
    const transactions: Partial<BankTransaction>[] = []

    if (importType === 'CSV') {
      const lines = content.split('\n')
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',')
        if (values.length < headers.length) continue

        const transaction: Partial<BankTransaction> = {}

        headers.forEach((header, index) => {
          const value = values[index]?.trim().replace(/"/g, '')

          switch (header) {
            case 'date':
            case 'transaction_date':
            case 'trans_date':
              transaction.transaction_date = this.parseDate(value)
              break
            case 'reference':
            case 'ref':
            case 'transaction_ref':
              transaction.transaction_ref = value
              break
            case 'description':
            case 'details':
            case 'narration':
              transaction.description = value
              break
            case 'amount':
            case 'debit':
            case 'credit':
              const amount = parseFloat(value.replace(/,/g, ''))
              if (!isNaN(amount)) {
                transaction.amount_kes = Math.abs(amount)
                transaction.transaction_type = amount < 0 ? 'DEBIT' : 'CREDIT'
              }
              break
            case 'type':
            case 'transaction_type':
              transaction.transaction_type = value.toUpperCase()
              break
          }
        })

        if (transaction.transaction_date && transaction.transaction_ref && transaction.amount_kes) {
          transactions.push(transaction)
        }
      }
    }

    return transactions
  }

  // Parse date from various formats
  private static parseDate(dateStr: string): string {
    try {
      // Try common date formats
      const formats = [
        /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
        /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
        /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
      ]

      for (const format of formats) {
        if (format.test(dateStr)) {
          const date = new Date(dateStr)
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0]
          }
        }
      }

      // Fallback to current date
      return new Date().toISOString().split('T')[0]
    } catch (error) {
      return new Date().toISOString().split('T')[0]
    }
  }

  // Auto-match transactions using rules
  static async autoMatchTransactions(bankAccountId?: string): Promise<{
    matched: number
    potential_matches: number
    errors: string[]
  }> {
    try {
      let matched = 0
      let potentialMatches = 0
      const errors: string[] = []

      // Get unmatched transactions
      const { data: transactions } = await this.getBankTransactions({
        bankAccountId,
        status: 'UNMATCHED',
        limit: 100,
      })

      // Get active reconciliation rules
      const { data: rules, error: rulesError } = await supabase
        .from('reconciliation_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true })

      if (rulesError) throw rulesError

      for (const transaction of transactions) {
        try {
          const matchResult = await this.findBestMatch(transaction, rules || [])

          if (matchResult && matchResult.confidence_score >= 0.8) {
            // Auto-match high confidence matches
            await this.createTransactionMatch(
              transaction.id,
              matchResult.entity_type,
              matchResult.entity_id,
              matchResult.amount,
              'HIGH',
              matchResult.confidence_score,
              matchResult.criteria,
              true
            )
            matched++
          } else if (matchResult && matchResult.confidence_score >= 0.6) {
            // Flag as potential match for manual review
            await supabase
              .from('bank_transactions')
              .update({ requires_attention: true })
              .eq('id', transaction.id)
            potentialMatches++
          }
        } catch (err) {
          errors.push(`Error matching transaction ${transaction.transaction_ref}: ${err}`)
        }
      }

      return { matched, potential_matches: potentialMatches, errors }
    } catch (error) {
      console.error('Error auto-matching transactions:', error)
      throw new Error('Failed to auto-match transactions')
    }
  }

  // Find best match for a transaction
  private static async findBestMatch(
    transaction: BankTransaction,
    rules: ReconciliationRule[]
  ): Promise<{
    entity_type: string
    entity_id: string
    amount: number
    confidence_score: number
    criteria: any
  } | null> {
    let bestMatch: any = null
    let highestScore = 0

    for (const rule of rules) {
      try {
        const matches = await this.findMatchesByRule(transaction, rule)

        for (const match of matches) {
          if (
            match.confidence_score > highestScore &&
            match.confidence_score >= rule.min_confidence_score
          ) {
            bestMatch = match
            highestScore = match.confidence_score
          }
        }
      } catch (error) {
        console.error(`Error applying rule ${rule.rule_name}:`, error)
      }
    }

    return bestMatch
  }

  // Find matches by specific rule
  private static async findMatchesByRule(
    transaction: BankTransaction,
    rule: ReconciliationRule
  ): Promise<any[]> {
    const matches: any[] = []

    // Calculate date range
    const transactionDate = new Date(transaction.transaction_date)
    const startDate = new Date(transactionDate)
    startDate.setDate(startDate.getDate() - rule.date_tolerance_days)
    const endDate = new Date(transactionDate)
    endDate.setDate(endDate.getDate() + rule.date_tolerance_days)

    // Calculate amount range
    const amountTolerance = Math.max(
      rule.amount_tolerance_kes,
      Math.abs(transaction.amount_kes) * (rule.amount_tolerance_percentage / 100)
    )
    const minAmount = Math.abs(transaction.amount_kes) - amountTolerance
    const maxAmount = Math.abs(transaction.amount_kes) + amountTolerance

    let query: any

    // Search based on target entity type
    switch (rule.target_entity_type) {
      case 'PAYMENT':
        query = supabase
          .from('payments')
          .select('id, amount_kes, payment_date, tx_ref')
          .gte('payment_date', startDate.toISOString().split('T')[0])
          .lte('payment_date', endDate.toISOString().split('T')[0])
          .gte('amount_kes', minAmount)
          .lte('amount_kes', maxAmount)
        break

      case 'INCOME_TRANSACTION':
        query = supabase
          .from('income_transactions')
          .select('id, amount_kes, transaction_date, reference_number')
          .gte('transaction_date', startDate.toISOString().split('T')[0])
          .lte('transaction_date', endDate.toISOString().split('T')[0])
          .gte('amount_kes', minAmount)
          .lte('amount_kes', maxAmount)
        break

      case 'EXPENSE_TRANSACTION':
        query = supabase
          .from('expense_transactions')
          .select('id, amount_kes, transaction_date, reference_number')
          .gte('transaction_date', startDate.toISOString().split('T')[0])
          .lte('transaction_date', endDate.toISOString().split('T')[0])
          .gte('amount_kes', minAmount)
          .lte('amount_kes', maxAmount)
        break

      default:
        return matches
    }

    const { data: entities, error } = await query

    if (error || !entities) return matches

    // Score each potential match
    for (const entity of entities) {
      const score = this.calculateMatchingScore(transaction, entity, rule)

      if (score >= rule.min_confidence_score) {
        matches.push({
          entity_type: rule.target_entity_type,
          entity_id: entity.id,
          amount: entity.amount_kes,
          confidence_score: score,
          criteria: {
            rule_name: rule.rule_name,
            amount_match: Math.abs(transaction.amount_kes - entity.amount_kes) <= amountTolerance,
            date_match: true, // Already filtered by date
            reference_match: this.checkReferenceMatch(transaction, entity, rule),
          },
        })
      }
    }

    return matches
  }

  // Calculate matching score between transaction and entity
  private static calculateMatchingScore(
    transaction: BankTransaction,
    entity: any,
    rule: ReconciliationRule
  ): number {
    let score = 0

    // Amount matching (40% weight)
    const amountDiff = Math.abs(transaction.amount_kes - entity.amount_kes)
    const amountTolerance = Math.max(
      rule.amount_tolerance_kes,
      Math.abs(transaction.amount_kes) * (rule.amount_tolerance_percentage / 100)
    )
    const amountScore = Math.max(0, 1 - amountDiff / amountTolerance)
    score += amountScore * 0.4

    // Date matching (30% weight)
    const transactionDate = new Date(transaction.transaction_date)
    const entityDate = new Date(entity.payment_date || entity.transaction_date)
    const dateDiff =
      Math.abs(transactionDate.getTime() - entityDate.getTime()) / (1000 * 60 * 60 * 24)
    const dateScore = Math.max(0, 1 - dateDiff / rule.date_tolerance_days)
    score += dateScore * 0.3

    // Reference matching (30% weight)
    const referenceScore = this.checkReferenceMatch(transaction, entity, rule) ? 1 : 0
    score += referenceScore * 0.3

    return Math.min(1, score)
  }

  // Check reference matching
  private static checkReferenceMatch(
    transaction: BankTransaction,
    entity: any,
    rule: ReconciliationRule
  ): boolean {
    const transactionRef = transaction.transaction_ref?.toLowerCase() || ''
    const entityRef = (entity.tx_ref || entity.reference_number || '').toLowerCase()

    // Exact reference match
    if (transactionRef === entityRef && transactionRef.length > 0) {
      return true
    }

    // Pattern matching
    if (rule.reference_pattern) {
      try {
        const regex = new RegExp(rule.reference_pattern, 'i')
        return regex.test(transactionRef) || regex.test(entityRef)
      } catch (error) {
        console.error('Invalid regex pattern:', rule.reference_pattern)
      }
    }

    // Keyword matching
    if (rule.description_keywords && rule.description_keywords.length > 0) {
      const description = transaction.description?.toLowerCase() || ''
      return rule.description_keywords.some((keyword) =>
        description.includes(keyword.toLowerCase())
      )
    }

    return false
  }

  // Create transaction match
  static async createTransactionMatch(
    bankTransactionId: string,
    entityType: string,
    entityId: string,
    amount: number,
    confidence: string,
    matchingScore: number,
    criteria: any,
    autoMatched: boolean = false
  ): Promise<TransactionMatch> {
    try {
      const { data, error } = await supabase
        .from('transaction_matches')
        .insert({
          bank_transaction_id: bankTransactionId,
          matched_entity_type: entityType,
          matched_entity_id: entityId,
          matched_amount_kes: amount,
          confidence,
          matching_score: matchingScore,
          matching_criteria: criteria,
          auto_matched: autoMatched,
        })
        .select()
        .single()

      if (error) throw error

      // Update bank transaction status
      await supabase
        .from('bank_transactions')
        .update({
          status: 'MATCHED',
          matched_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', bankTransactionId)

      return data
    } catch (error) {
      console.error('Error creating transaction match:', error)
      throw new Error('Failed to create transaction match')
    }
  }

  // Manual match transaction
  static async manualMatchTransaction(
    bankTransactionId: string,
    entityType: string,
    entityId: string,
    amount: number,
    notes?: string
  ): Promise<TransactionMatch> {
    try {
      const match = await this.createTransactionMatch(
        bankTransactionId,
        entityType,
        entityId,
        amount,
        'MANUAL',
        1.0,
        { manual_match: true, notes },
        false
      )

      return match
    } catch (error) {
      console.error('Error manually matching transaction:', error)
      throw new Error('Failed to manually match transaction')
    }
  }

  // Unmatch transaction
  static async unmatchTransaction(bankTransactionId: string): Promise<void> {
    try {
      // Deactivate existing matches
      await supabase
        .from('transaction_matches')
        .update({ is_active: false })
        .eq('bank_transaction_id', bankTransactionId)

      // Update bank transaction status
      await supabase
        .from('bank_transactions')
        .update({
          status: 'UNMATCHED',
          matched_date: null,
          matched_by: null,
        })
        .eq('id', bankTransactionId)
    } catch (error) {
      console.error('Error unmatching transaction:', error)
      throw new Error('Failed to unmatch transaction')
    }
  }

  // Get reconciliation periods
  static async getReconciliationPeriods(bankAccountId?: string): Promise<ReconciliationPeriod[]> {
    try {
      let query = supabase.from('reconciliation_periods').select(`
          *,
          bank_account:bank_accounts(account_name, bank_name)
        `)

      if (bankAccountId) {
        query = query.eq('bank_account_id', bankAccountId)
      }

      query = query.order('start_date', { ascending: false })

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching reconciliation periods:', error)
      throw new Error('Failed to load reconciliation periods')
    }
  }

  // Start reconciliation period
  static async startReconciliationPeriod(
    bankAccountId: string,
    startDate: string,
    endDate: string,
    statementBalance: number
  ): Promise<ReconciliationPeriod> {
    try {
      // Get opening balance from previous period or account
      const { data: account } = await supabase
        .from('bank_accounts')
        .select('last_reconciled_balance_kes')
        .eq('id', bankAccountId)
        .single()

      const openingBalance = account?.last_reconciled_balance_kes || 0

      const { data, error } = await supabase
        .from('reconciliation_periods')
        .insert({
          bank_account_id: bankAccountId,
          period_name: `${startDate} to ${endDate}`,
          start_date: startDate,
          end_date: endDate,
          opening_balance_kes: openingBalance,
          closing_balance_kes: 0, // Will be calculated
          statement_balance_kes: statementBalance,
          status: 'IN_PROGRESS',
        })
        .select(
          `
          *,
          bank_account:bank_accounts(account_name, bank_name)
        `
        )
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error starting reconciliation period:', error)
      throw new Error('Failed to start reconciliation period')
    }
  }

  // Utility function to format currency
  static formatCurrency(amount: number): string {
    if (amount == null || isNaN(amount)) return 'KES 0'
    return `KES ${Number(amount).toLocaleString()}`
  }

  // Utility function to get status color
  static getStatusColor(status: string): string {
    switch (status) {
      case 'MATCHED':
        return 'text-green-600 bg-green-100'
      case 'UNMATCHED':
        return 'text-yellow-600 bg-yellow-100'
      case 'PARTIALLY_MATCHED':
        return 'text-blue-600 bg-blue-100'
      case 'DISPUTED':
        return 'text-red-600 bg-red-100'
      case 'IGNORED':
        return 'text-gray-600 bg-gray-100'
      case 'MANUAL_MATCH':
        return 'text-purple-600 bg-purple-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  // Utility function to get confidence color
  static getConfidenceColor(confidence: string): string {
    switch (confidence) {
      case 'HIGH':
        return 'text-green-600'
      case 'MEDIUM':
        return 'text-yellow-600'
      case 'LOW':
        return 'text-red-600'
      case 'MANUAL':
        return 'text-purple-600'
      default:
        return 'text-gray-600'
    }
  }

  // Import bank transactions from file
  static async importTransactions(
    bankAccountId: string,
    transactions: Array<{
      date: string
      description: string
      amount: number
      type: 'CREDIT' | 'DEBIT'
      reference: string
      balance?: number
    }>,
    duplicateHandling: 'SKIP' | 'UPDATE' | 'CREATE' = 'SKIP'
  ): Promise<{
    imported: number
    skipped: number
    errors: number
  }> {
    try {
      let imported = 0
      let skipped = 0
      let errors = 0

      for (const transaction of transactions) {
        try {
          // Check for duplicates if handling is SKIP or UPDATE
          if (duplicateHandling !== 'CREATE') {
            const { data: existing } = await supabase
              .from('bank_transactions')
              .select('id')
              .eq('bank_account_id', bankAccountId)
              .eq('transaction_date', transaction.date)
              .eq('amount_kes', Math.abs(transaction.amount))
              .eq('reference_number', transaction.reference)
              .single()

            if (existing) {
              if (duplicateHandling === 'SKIP') {
                skipped++
                continue
              }
              // For UPDATE, we would update the existing record here
            }
          }

          // Create new transaction
          const { error } = await supabase.from('bank_transactions').insert({
            bank_account_id: bankAccountId,
            transaction_date: transaction.date,
            description: transaction.description,
            amount_kes: Math.abs(transaction.amount),
            transaction_type: transaction.type,
            reference_number: transaction.reference,
            balance_kes: transaction.balance,
            status: 'UNMATCHED',
          })

          if (error) {
            console.error('Error importing transaction:', error)
            errors++
          } else {
            imported++
          }
        } catch (error) {
          console.error('Error processing transaction:', error)
          errors++
        }
      }

      return { imported, skipped, errors }
    } catch (error) {
      console.error('Error importing transactions:', error)
      throw new Error('Failed to import transactions')
    }
  }
}
