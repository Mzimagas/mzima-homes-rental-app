import { NextRequest, NextResponse } from 'next/server'
import { ExpenseManagementService } from '../../../../lib/services/expense-management.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const filters = {
      isActive: searchParams.get('isActive') ? searchParams.get('isActive') === 'true' : undefined,
      vendorType: searchParams.get('vendorType') || undefined,
      search: searchParams.get('search') || undefined,
    }

    const vendors = await ExpenseManagementService.getVendors(filters)

    return NextResponse.json({
      success: true,
      data: vendors,
      filters,
    })
  } catch (error) {
    console.error('Error fetching vendors:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch vendors',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
