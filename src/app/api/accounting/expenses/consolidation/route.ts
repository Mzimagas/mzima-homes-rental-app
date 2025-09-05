import { NextRequest, NextResponse } from 'next/server'
import { ExpenseManagementService } from '../../../../../lib/services/expense-management.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId') || undefined

    if (propertyId) {
      // Get detailed consolidation for specific property
      const consolidation = await ExpenseManagementService.consolidatePropertyExpenses(propertyId)

      return NextResponse.json({
        success: true,
        data: consolidation,
        propertyId,
      })
    } else {
      // Get consolidation summary for all properties
      const consolidation = await ExpenseManagementService.getPropertyExpenseConsolidation()

      return NextResponse.json({
        success: true,
        data: consolidation,
      })
    }
  } catch (error) {
    console.error('Error fetching expense consolidation:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch expense consolidation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
