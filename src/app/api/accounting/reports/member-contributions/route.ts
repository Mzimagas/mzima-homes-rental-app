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

    const memberContributionReport =
      await FinancialReportingService.generateMemberContributionReport(startDate, endDate)

    return NextResponse.json({
      success: true,
      data: memberContributionReport,
      metadata: {
        generated_at: new Date().toISOString(),
        period: `${startDate} to ${endDate}`,
        total_members: memberContributionReport.summary.total_members,
        active_members: memberContributionReport.summary.active_members,
      },
    })
  } catch (error) {
    console.error('Error generating member contribution report:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate Member Contribution report',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
