import { NextRequest, NextResponse } from 'next/server'
import { IncomeManagementService } from '../../../../../lib/services/income-management.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters for analytics filters
    const filters = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      propertyId: searchParams.get('propertyId') || undefined,
    }

    const analytics = await IncomeManagementService.getIncomeAnalytics(filters)

    return NextResponse.json({
      success: true,
      data: analytics,
      filters,
    })
  } catch (error) {
    console.error('Error fetching income analytics:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch income analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
