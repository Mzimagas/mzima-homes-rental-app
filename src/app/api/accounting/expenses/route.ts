import { NextRequest, NextResponse } from 'next/server'
import { ExpenseManagementService } from '../../../../lib/services/expense-management.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const filters = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      status: searchParams.get('status') || undefined,
      propertyId: searchParams.get('propertyId') || undefined,
      vendorId: searchParams.get('vendorId') || undefined,
      requiresAllocation: searchParams.get('requiresAllocation')
        ? searchParams.get('requiresAllocation') === 'true'
        : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    }

    const result = await ExpenseManagementService.getExpenseTransactions(filters)

    return NextResponse.json({
      success: true,
      data: result.data,
      total: result.total,
      filters,
    })
  } catch (error) {
    console.error('Error fetching expense transactions:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch expense transactions',
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
    const requiredFields = ['category_id', 'amount_kes', 'transaction_date', 'description']
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

    // Validate amount
    if (body.amount_kes <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Amount must be greater than zero',
        },
        { status: 400 }
      )
    }

    const transaction = await ExpenseManagementService.createExpenseTransaction(body)

    return NextResponse.json(
      {
        success: true,
        data: transaction,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating expense transaction:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create expense transaction',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
