import supabase, { callRPC, clientBusinessFunctions } from '../supabase-client'

export type UtilityAccountType =
  | 'ELECTRICITY_PREPAID'
  | 'ELECTRICITY_POSTPAID'
  | 'WATER_DIRECT_TAVEVO'
  | 'WATER_INTERNAL_SUBMETER'

export interface EnsureAccountParams {
  tenantId: string
  unitId: string
  type: UtilityAccountType
  lowThresholdKes?: number | null
  creditLimitKes?: number | null
}

export class UtilityBalanceService {
  static async ensureAccount(params: EnsureAccountParams) {
    return clientBusinessFunctions.ensureUtilityAccount(params)
  }

  static async getTenantSummary(tenantId: string) {
    return clientBusinessFunctions.getRentBalanceSummary(tenantId)
  }

  static async recordTopup(accountId: string, amountKes: number, paymentId?: string, description?: string) {
    return clientBusinessFunctions.recordUtilityTopup(accountId, amountKes, paymentId, description)
  }

  static async addCharge(params: {
    accountId: string
    amountKes: number
    txnType?: 'BILL' | 'CONSUMPTION' | 'ALLOCATION' | 'ADJUSTMENT'
    description?: string
    metadata?: any
  }) {
    return clientBusinessFunctions.addUtilityCharge(params)
  }

  static async listAccountsForUnit(unitId: string) {
    return supabase
      .from('utility_accounts')
      .select('*')
      .eq('unit_id', unitId)
      .eq('is_active', true)
  }

  static async getLedger(accountId: string, limit = 100) {
    return supabase
      .from('utility_ledger')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(limit)
  }
}

