import { NextRequest, NextResponse } from 'next/server'
import { BankReconciliationService } from '../../../../../lib/services/bank-reconciliation.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const requiredFields = ['bankTransactionId', 'entityType', 'entityId', 'amount']
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

    // Validate entity type
    const validEntityTypes = ['PAYMENT', 'INCOME_TRANSACTION', 'EXPENSE_TRANSACTION', 'INVOICE']
    if (!validEntityTypes.includes(body.entityType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid entity type',
          message: `Entity type must be one of: ${validEntityTypes.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Validate amount
    if (body.amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid amount',
          message: 'Amount must be greater than zero',
        },
        { status: 400 }
      )
    }

    const match = await BankReconciliationService.manualMatchTransaction(
      body.bankTransactionId,
      body.entityType,
      body.entityId,
      body.amount,
      body.notes
    )

    return NextResponse.json({
      success: true,
      data: match,
      message: 'Transaction matched successfully',
    })
  } catch (error) {
    console.error('Error matching transaction:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to match transaction',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bankTransactionId = searchParams.get('bankTransactionId')

    if (!bankTransactionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing bank transaction ID',
        },
        { status: 400 }
      )
    }

    await BankReconciliationService.unmatchTransaction(bankTransactionId)

    return NextResponse.json({
      success: true,
      message: 'Transaction unmatched successfully',
    })
  } catch (error) {
    console.error('Error unmatching transaction:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to unmatch transaction',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
