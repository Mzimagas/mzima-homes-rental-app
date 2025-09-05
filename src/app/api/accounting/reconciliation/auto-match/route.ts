import { NextRequest, NextResponse } from 'next/server'
import { BankReconciliationService } from '../../../../../lib/services/bank-reconciliation.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Parse parameters
    const bankAccountId = body.bankAccountId || undefined
    const maxTransactions = body.maxTransactions || 100

    // Validate maxTransactions
    if (maxTransactions < 1 || maxTransactions > 1000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid maxTransactions',
          message: 'maxTransactions must be between 1 and 1000',
        },
        { status: 400 }
      )
    }

    const result = await BankReconciliationService.autoMatchTransactions(bankAccountId)

    return NextResponse.json({
      success: true,
      data: result,
      message: `Auto-matching completed: ${result.matched} matched, ${result.potential_matches} potential matches`,
      metadata: {
        bank_account_id: bankAccountId,
        processed_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Error during auto-matching:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to auto-match transactions',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
