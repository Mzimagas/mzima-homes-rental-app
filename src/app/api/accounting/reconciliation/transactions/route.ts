import { NextRequest, NextResponse } from 'next/server'
import { BankReconciliationService } from '../../../../../lib/services/bank-reconciliation.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const filters = {
      bankAccountId: searchParams.get('bankAccountId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      status: searchParams.get('status') || undefined,
      transactionType: searchParams.get('transactionType') || undefined,
      source: searchParams.get('source') || undefined,
      requiresAttention:
        searchParams.get('requiresAttention') === 'true'
          ? true
          : searchParams.get('requiresAttention') === 'false'
            ? false
            : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    }

    const result = await BankReconciliationService.getBankTransactions(filters)

    return NextResponse.json({
      success: true,
      data: result.data,
      total: result.total,
      filters,
    })
  } catch (error) {
    console.error('Error fetching bank transactions:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch bank transactions',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const requiredFields = [
      'bank_account_id',
      'transaction_date',
      'transaction_ref',
      'description',
      'amount_kes',
      'transaction_type',
    ]
    const missingFields = requiredFields.filter((field) => !body[field])

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          missingFields,
        },
        { status: 400 }
      )
    }

    // Validate transaction type
    if (!['DEBIT', 'CREDIT'].includes(body.transaction_type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid transaction type',
          message: 'Transaction type must be either DEBIT or CREDIT',
        },
        { status: 400 }
      )
    }

    // Validate amount
    if (body.amount_kes <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid amount',
          message: 'Amount must be greater than zero',
        },
        { status: 400 }
      )
    }

    const transaction = await BankReconciliationService.createBankTransaction({
      ...body,
      source: body.source || 'MANUAL_ENTRY',
      status: 'UNMATCHED',
      variance_amount_kes: 0,
      is_duplicate: false,
      requires_attention: false,
    })

    return NextResponse.json(
      {
        success: true,
        data: transaction,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating bank transaction:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create bank transaction',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
