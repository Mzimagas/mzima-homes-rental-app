import { NextRequest, NextResponse } from 'next/server'
import { TaxManagementService } from '../../../../../../lib/services/tax-management.service'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const landRateId = params.id

    // Validate required fields
    const requiredFields = ['payment_amount', 'payment_date', 'payment_reference']
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

    // Validate payment amount
    if (body.payment_amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment amount must be greater than zero',
        },
        { status: 400 }
      )
    }

    const updatedLandRate = await TaxManagementService.updateLandRatesPayment(
      landRateId,
      body.payment_amount,
      body.payment_date,
      body.payment_reference,
      body.receipt_number
    )

    return NextResponse.json({
      success: true,
      data: updatedLandRate,
      message: 'Land rates payment updated successfully',
    })
  } catch (error) {
    console.error('Error updating land rates payment:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update land rates payment',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
