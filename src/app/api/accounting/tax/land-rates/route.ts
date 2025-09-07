import { NextRequest, NextResponse } from 'next/server'
// import { TaxManagementService } from '../../../../../lib/services/tax-management.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const filters = {
      propertyId: searchParams.get('propertyId') || undefined,
      financialYear: searchParams.get('financialYear') || undefined,
      status: searchParams.get('status') || undefined,
      county: searchParams.get('county') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    }

    const result = await TaxManagementService.getEnhancedLandRates(filters)

    return NextResponse.json({
      success: true,
      data: result.data,
      total: result.total,
      filters,
    })
  } catch (error) {
    console.error('Error fetching land rates:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch land rates',
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
    const requiredFields = ['property_id', 'financial_year', 'assessed_value_kes', 'county']
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

    // Calculate land rates if not provided
    if (!body.rate_percentage || !body.annual_rate_kes) {
      const calculation = await TaxManagementService.calculateLandRates(
        body.property_id,
        body.assessed_value_kes,
        body.county,
        body.financial_year
      )

      body.rate_percentage = calculation.rate_percentage
      body.annual_rate_kes = calculation.annual_rate_kes
      body.due_date = calculation.due_date
    }

    const landRate = await TaxManagementService.createLandRatesRecord(body)

    return NextResponse.json(
      {
        success: true,
        data: landRate,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating land rates record:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create land rates record',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
