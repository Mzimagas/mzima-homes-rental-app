import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('Test API endpoint called')
  return NextResponse.json({ message: 'Test API working', timestamp: new Date().toISOString() })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Test POST API called with body:', body)
    return NextResponse.json({ 
      message: 'Test POST API working', 
      received: body,
      timestamp: new Date().toISOString() 
    })
  } catch (error) {
    console.error('Test POST API error:', error)
    return NextResponse.json(
      { error: 'Test POST API error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
