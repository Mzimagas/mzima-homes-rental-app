import { NextRequest, NextResponse } from 'next/server'
import { IncomeManagementService } from '../../../../lib/services/income-management.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const filters = {
      memberId: searchParams.get('memberId') || undefined,
      contributionType: searchParams.get('contributionType') || undefined,
      status: searchParams.get('status') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    }

    const result = await IncomeManagementService.getMemberContributions(filters)

    return NextResponse.json({
      success: true,
      data: result.data,
      total: result.total,
      filters,
    })
  } catch (error) {
    console.error('Error fetching member contributions:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch member contributions',
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
    const requiredFields = ['member_id', 'contribution_type', 'amount_kes', 'due_date']
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

    const contribution = await IncomeManagementService.createMemberContribution(body)

    return NextResponse.json(
      {
        success: true,
        data: contribution,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating member contribution:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create member contribution',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
