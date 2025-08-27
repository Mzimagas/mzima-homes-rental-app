import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { filePath, expiresIn = 600 } = await req.json()

    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      )
    }

    // Validate file path format (should be: direct_addition/{property_id}/{doc_type}/{filename})
    const pathParts = filePath.split('/')
    if (pathParts.length !== 4 || pathParts[0] !== 'direct_addition') {
      return NextResponse.json(
        { error: 'Invalid file path format' },
        { status: 400 }
      )
    }

    // Generate signed URL for secure file access
    const { data, error } = await supabase.storage
      .from('property-docs')
      .createSignedUrl(filePath, expiresIn)

    if (error) {
      console.error('Error creating signed URL:', error)
      return NextResponse.json(
        { error: 'Failed to create signed URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      url: data.signedUrl,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
    })

  } catch (error) {
    console.error('Sign URL API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
