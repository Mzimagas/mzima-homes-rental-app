import { NextRequest, NextResponse } from 'next/server'
import { memoryCache } from '../../../../lib/cache/memory-cache'

// GET /api/cache/stats - Get cache statistics
export async function GET(req: NextRequest) {
  try {
    // Only allow in development or with admin access
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    const stats = memoryCache.getStats()
    
    return NextResponse.json({
      ok: true,
      data: {
        ...stats,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      }
    })
  } catch (error) {
    console.error('Cache stats error:', error)
    return NextResponse.json(
      { error: 'Failed to get cache stats' },
      { status: 500 }
    )
  }
}

// DELETE /api/cache/stats - Clear cache
export async function DELETE(req: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    const statsBefore = memoryCache.getStats()
    memoryCache.clear()
    const statsAfter = memoryCache.getStats()
    
    return NextResponse.json({
      ok: true,
      message: 'Cache cleared successfully',
      data: {
        before: statsBefore,
        after: statsAfter,
      }
    })
  } catch (error) {
    console.error('Cache clear error:', error)
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    )
  }
}
