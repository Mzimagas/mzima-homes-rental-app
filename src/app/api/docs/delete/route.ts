import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { filePath, documentId } = await req.json()

    if (!filePath || !documentId) {
      return NextResponse.json({ error: 'File path and document ID are required' }, { status: 400 })
    }

    // Validate file path format (should be: {pipeline}/{property_id}/{doc_type}/{filename})
    const pathParts = filePath.split('/')
    const validPipelines = ['direct_addition', 'purchase_pipeline', 'subdivision', 'handover']
    if (pathParts.length !== 4 || !validPipelines.includes(pathParts[0])) {
      return NextResponse.json(
        {
          error:
            'Invalid file path format. Expected: {pipeline}/{property_id}/{doc_type}/{filename}',
        },
        { status: 400 }
      )
    }

    // First, delete the file from storage
    const { error: storageError } = await supabase.storage.from('property-docs').remove([filePath])

    if (storageError) {
      console.error('Error deleting file from storage:', storageError)
      return NextResponse.json({ error: 'Failed to delete file from storage' }, { status: 500 })
    }

    // Then, delete the document record from database
    const { error: dbError } = await supabase
      .from('property_documents')
      .delete()
      .eq('id', documentId)

    if (dbError) {
      console.error('Error deleting document record:', dbError)
      return NextResponse.json({ error: 'Failed to delete document record' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'File and document record deleted successfully',
    })
  } catch (error) {
    console.error('Delete API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
