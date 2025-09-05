import { NextRequest, NextResponse } from 'next/server'
import { BankReconciliationService } from '../../../../../lib/services/bank-reconciliation.service'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // Extract form data
    const bankAccountId = formData.get('bankAccountId') as string
    const importType = (formData.get('importType') as string) || 'CSV'
    const file = formData.get('file') as File

    // Validate required fields
    if (!bankAccountId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing bank account ID',
        },
        { status: 400 }
      )
    }

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file provided',
        },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type',
          message: 'Only CSV and Excel files are supported',
        },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: 'File too large',
          message: 'File size must be less than 10MB',
        },
        { status: 400 }
      )
    }

    // Validate import type
    if (!['CSV', 'EXCEL'].includes(importType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid import type',
          message: 'Import type must be either CSV or EXCEL',
        },
        { status: 400 }
      )
    }

    const importBatch = await BankReconciliationService.importBankStatement(
      bankAccountId,
      file,
      importType
    )

    return NextResponse.json({
      success: true,
      data: importBatch,
      message: `Statement import completed: ${importBatch.successful_rows} transactions imported, ${importBatch.duplicate_rows} duplicates skipped, ${importBatch.failed_rows} failed`,
    })
  } catch (error) {
    console.error('Error importing bank statement:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to import bank statement',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
