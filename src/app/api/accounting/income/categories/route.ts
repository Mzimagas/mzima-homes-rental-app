import { NextRequest, NextResponse } from 'next/server'
import { IncomeManagementService } from '../../../../../lib/services/income-management.service'

export async function GET(request: NextRequest) {
  try {
    const categories = await IncomeManagementService.getIncomeCategories()

    return NextResponse.json({
      success: true,
      data: categories,
    })
  } catch (error) {
    console.error('Error fetching income categories:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch income categories',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
