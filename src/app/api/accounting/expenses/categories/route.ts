import { NextRequest, NextResponse } from 'next/server'
import { ExpenseManagementService } from '../../../../../lib/services/expense-management.service'

export async function GET(request: NextRequest) {
  try {
    const categories = await ExpenseManagementService.getExpenseCategories()

    return NextResponse.json({
      success: true,
      data: categories,
    })
  } catch (error) {
    console.error('Error fetching expense categories:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch expense categories',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
