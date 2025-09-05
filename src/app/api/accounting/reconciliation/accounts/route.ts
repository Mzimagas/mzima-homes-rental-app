import { NextRequest, NextResponse } from 'next/server'
import { BankReconciliationService } from '../../../../../lib/services/bank-reconciliation.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const filters = {
      isActive:
        searchParams.get('isActive') === 'true'
          ? true
          : searchParams.get('isActive') === 'false'
            ? false
            : undefined,
      accountType: searchParams.get('accountType') || undefined,
    }

    const bankAccounts = await BankReconciliationService.getBankAccounts(filters)

    return NextResponse.json({
      success: true,
      data: bankAccounts,
      total: bankAccounts.length,
    })
  } catch (error) {
    console.error('Error fetching bank accounts:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch bank accounts',
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
    const requiredFields = ['account_name', 'account_number', 'bank_name', 'account_type']
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

    // Create bank account (this would need to be implemented in the service)
    // For now, return a placeholder response
    return NextResponse.json(
      {
        success: true,
        message: 'Bank account creation endpoint ready for implementation',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating bank account:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create bank account',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
