import { NextRequest, NextResponse } from 'next/server'
import { TaxManagementService } from '../../../../../lib/services/tax-management.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const requiredFields = ['gross_amount', 'transaction_type']
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

    // Validate transaction type
    if (!['SALE', 'PURCHASE'].includes(body.transaction_type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid transaction type',
          message: 'Transaction type must be either SALE or PURCHASE',
        },
        { status: 400 }
      )
    }

    // Validate gross amount
    if (body.gross_amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Gross amount must be greater than zero',
        },
        { status: 400 }
      )
    }

    const vatCalculation = await TaxManagementService.calculateVAT(
      body.gross_amount,
      body.transaction_type,
      body.is_vat_registered !== false // Default to true if not specified
    )

    return NextResponse.json({
      success: true,
      data: {
        gross_amount: body.gross_amount,
        transaction_type: body.transaction_type,
        is_vat_registered: body.is_vat_registered !== false,
        ...vatCalculation,
      },
    })
  } catch (error) {
    console.error('Error calculating VAT:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calculate VAT',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
