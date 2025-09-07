import { NextRequest, NextResponse } from 'next/server'
import { queryAnalyzer } from '../../../../lib/database/query-analyzer'

// GET /api/database/performance - Get database performance metrics
export async function GET(req: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    const stats = queryAnalyzer.getStats()
    const slowQueries = queryAnalyzer.getSlowQueries()
    const recommendations = queryAnalyzer.getRecommendations()
    
    return NextResponse.json({
      ok: true,
      data: {
        stats,
        slowQueries: slowQueries.slice(0, 20), // Limit to top 20
        recommendations,
        timestamp: new Date().toISOString(),
      }
    })
  } catch (error) {
    console.error('Database performance error:', error)
    return NextResponse.json(
      { error: 'Failed to get database performance metrics' },
      { status: 500 }
    )
  }
}

// DELETE /api/database/performance - Clear performance metrics
export async function DELETE(req: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    const statsBefore = queryAnalyzer.getStats()
    queryAnalyzer.clear()
    const statsAfter = queryAnalyzer.getStats()
    
    return NextResponse.json({
      ok: true,
      message: 'Performance metrics cleared successfully',
      data: {
        before: statsBefore,
        after: statsAfter,
      }
    })
  } catch (error) {
    console.error('Performance metrics clear error:', error)
    return NextResponse.json(
      { error: 'Failed to clear performance metrics' },
      { status: 500 }
    )
  }
}
