import { NextRequest, NextResponse } from 'next/server'
import { TaxManagementService } from '../../../../lib/services/tax-management.service'

export async function GET(request: NextRequest) {
  try {
    const complianceSummary = await TaxManagementService.getTaxComplianceSummary()

    return NextResponse.json({
      success: true,
      data: complianceSummary,
      metadata: {
        generated_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Error fetching tax compliance summary:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tax compliance summary',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
