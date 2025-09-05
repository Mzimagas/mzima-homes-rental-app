import { NextRequest, NextResponse } from 'next/server'
import { FinancialReportingService } from '../../../../../lib/services/financial-reporting.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const propertyId = searchParams.get('propertyId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Validate required parameters
    if (!propertyId || !startDate || !endDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters',
          message: 'propertyId, startDate, and endDate are required',
        },
        { status: 400 }
      )
    }

    // Validate date format
    const startDateObj = new Date(startDate)
    const endDateObj = new Date(endDate)

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid date format',
          message: 'Dates must be in YYYY-MM-DD format',
        },
        { status: 400 }
      )
    }

    if (startDateObj > endDateObj) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid date range',
          message: 'Start date must be before end date',
        },
        { status: 400 }
      )
    }

    const propertyPerformance = await FinancialReportingService.generatePropertyPerformance(
      propertyId,
      startDate,
      endDate
    )

    return NextResponse.json({
      success: true,
      data: propertyPerformance,
      metadata: {
        generated_at: new Date().toISOString(),
        property_id: propertyId,
        period: `${startDate} to ${endDate}`,
      },
    })
  } catch (error) {
    console.error('Error generating property performance report:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate Property Performance report',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
