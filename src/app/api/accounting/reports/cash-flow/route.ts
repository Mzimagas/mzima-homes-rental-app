import { NextRequest, NextResponse } from 'next/server'
import { FinancialReportingService } from '../../../../../lib/services/financial-reporting.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters',
          message: 'startDate and endDate are required',
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

    const cashFlowStatement = await FinancialReportingService.generateCashFlowStatement(
      startDate,
      endDate
    )

    return NextResponse.json({
      success: true,
      data: cashFlowStatement,
      metadata: {
        generated_at: new Date().toISOString(),
        period: `${startDate} to ${endDate}`,
      },
    })
  } catch (error) {
    console.error('Error generating cash flow statement:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate Cash Flow statement',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
