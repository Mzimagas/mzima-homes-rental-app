import { NextRequest, NextResponse } from 'next/server'
// import { TaxManagementService } from '../../../../../lib/services/tax-management.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const requiredFields = ['gross_payment', 'tax_category']
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

    // Validate tax category
    const validCategories = ['PROFESSIONAL_FEES', 'COMMISSIONS', 'RENT', 'MANAGEMENT_FEES']
    if (!validCategories.includes(body.tax_category)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid tax category',
          message: `Tax category must be one of: ${validCategories.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Validate gross payment
    if (body.gross_payment <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Gross payment must be greater than zero',
        },
        { status: 400 }
      )
    }

    const withholdingCalculation = await TaxManagementService.calculateWithholdingTax(
      body.gross_payment,
      body.tax_category,
      body.payee_pin
    )

    return NextResponse.json({
      success: true,
      data: {
        gross_payment: body.gross_payment,
        tax_category: body.tax_category,
        payee_pin: body.payee_pin,
        ...withholdingCalculation,
      },
    })
  } catch (error) {
    console.error('Error calculating withholding tax:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calculate withholding tax',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
