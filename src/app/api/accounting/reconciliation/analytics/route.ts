import { NextRequest, NextResponse } from 'next/server'
import { BankReconciliationService } from '../../../../../lib/services/bank-reconciliation.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const bankAccountId = searchParams.get('bankAccountId') || undefined

    const analytics = await BankReconciliationService.getReconciliationAnalytics(bankAccountId)

    return NextResponse.json({
      success: true,
      data: analytics,
      metadata: {
        generated_at: new Date().toISOString(),
        bank_account_id: bankAccountId,
        total_accounts: analytics.length,
      },
    })
  } catch (error) {
    console.error('Error fetching reconciliation analytics:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch reconciliation analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
