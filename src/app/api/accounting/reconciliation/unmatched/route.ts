import { NextRequest, NextResponse } from 'next/server'
import { BankReconciliationService } from '../../../../../lib/services/bank-reconciliation.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const filters = {
      bankAccountId: searchParams.get('bankAccountId') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
    }

    const unmatchedTransactions = await BankReconciliationService.getUnmatchedTransactions(filters)

    return NextResponse.json({
      success: true,
      data: unmatchedTransactions,
      total: unmatchedTransactions.length,
      filters,
    })
  } catch (error) {
    console.error('Error fetching unmatched transactions:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch unmatched transactions',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
